import admin from 'firebase-admin';
import { db } from '../config/firebase';
import { IWallet, IWalletWithBalance } from '../models/Wallet';
import { ledgerService } from './LedgerService';
import { logger } from '../utils/logger';

type PaymentGateway = 'paystack' | 'flutterwave' | 'stripe' | 'monnify' | 'wallet';
type WalletEntryType = 'credit' | 'debit';
type WalletCategory =
    | 'ride_payment'
    | 'driver_payout'
    | 'wallet_topup'
    | 'withdrawal'
    | 'commission_deduction'
    | 'refund'
    | 'escrow_deposit'
    | 'escrow_release'
    | 'micro_deduction'
    | 'subscription_fee'
    | 'cancellation_fee';

const PLATFORM_ESCROW_USERS = {
    NGN: 'PLATFORM_ESCROW_NGN',
    USD: 'PLATFORM_ESCROW_USD'
} as const;

const EXTERNAL_PROCESSOR_WALLET_ID = 'EXTERNAL_PROCESSOR_POOL';

interface ProcessTransactionOptions {
    counterpartyWalletId?: string;
    counterpartyCurrency?: 'NGN' | 'USD';
    metadata?: Record<string, unknown>;
    walletCurrency?: 'NGN' | 'USD';
    transaction?: FirebaseFirestore.Transaction;
}

type EscrowPurpose = 'ride_payment' | 'delivery_payment';

interface EscrowHoldInput {
    reference: string;
    amount: number;
    currency: 'NGN' | 'USD';
    riderId: string;
    driverId?: string;
    rideId?: string;
    purpose: EscrowPurpose;
    gateway: PaymentGateway;
    commissionRate?: number;
    captureMode?: 'manual' | 'auto';
    metadata?: Record<string, unknown>;
}

interface MicroDeductionInput {
    flatFee?: number;
    percentage?: number;
    label?: string;
}

export interface CaptureEscrowOptions {
    driverId?: string;
    commissionRate?: number;
    metadata?: Record<string, unknown>;
    rideId?: string;
    microDeductions?: MicroDeductionInput;
    subscriptionSnapshot?: {
        planId?: string;
        discountRate?: number;
        activeUntil?: Date;
        status?: string;
    };
}

interface EscrowHoldRecord extends EscrowHoldInput {
    status: 'held' | 'released' | 'captured';
    platformWalletId: string;
    split?: { driverAmount: number; commissionAmount: number; microAmount?: number };
    capturedAt?: Date;
    releasedAt?: Date;
    releaseReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class WalletService {
    private readonly walletsCollection = db.collection('wallets');
    private readonly walletBalancesCollection = db.collection('wallet_balances');
    private readonly transactionsCollection = db.collection('transactions');
    private readonly ledgerCollection = db.collection('ledger');
    private readonly walletHoldsCollection = db.collection('wallet_holds');

    async getWallet(userId: string, preferredCurrency: 'NGN' | 'USD' = 'NGN'): Promise<IWalletWithBalance> {
        const snapshot = await this.walletsCollection.where('userId', '==', userId).limit(1).get();
        if (snapshot.empty) {
            return this.createWallet(userId, preferredCurrency);
        }

        const byCurrency = await this.walletsCollection
            .where('userId', '==', userId)
            .where('currency', '==', preferredCurrency)
            .limit(1)
            .get();

        let walletDoc = byCurrency.docs[0];
        if (!walletDoc) {
            const fallback = await this.walletsCollection.where('userId', '==', userId).limit(1).get();
            walletDoc = fallback.docs[0];
        }

        if (!walletDoc) {
            return this.createWallet(userId, preferredCurrency);
        }

        const wallet = { id: walletDoc.id, ...(walletDoc.data() as IWallet) };
        const balanceAmount = await ledgerService.getWalletBalance(wallet.id!);

        return {
            ...wallet,
            balance: {
                amount: balanceAmount,
                currency: wallet.currency
            }
        };
    }

    async createWallet(userId: string, currency: 'NGN' | 'USD' = 'NGN'): Promise<IWalletWithBalance> {
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const wallet: IWallet = {
            userId,
            currency,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const ref = await this.walletsCollection.add({
            ...wallet,
            createdAt: timestamp,
            updatedAt: timestamp
        });

        await this.walletBalancesCollection.doc(ref.id).set({
            walletId: ref.id,
            currency,
            available: 0,
            updatedAt: timestamp
        });

        return {
            id: ref.id,
            ...wallet,
            balance: { amount: 0, currency }
        };
    }

    async processTransaction(
        userId: string,
        amount: number,
        type: WalletEntryType,
        category: WalletCategory,
        description: string,
        reference: string,
        options: ProcessTransactionOptions = {}
    ): Promise<void> {
        const wallet = await this.getWallet(userId, options.walletCurrency ?? 'NGN');
        const counterpartyWalletId = options.counterpartyWalletId ?? EXTERNAL_PROCESSOR_WALLET_ID;
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        const runTx = async (transaction: FirebaseFirestore.Transaction) => {
            // Defence-in-depth: guard against duplicate reference for this wallet
            const existingLedger = await transaction.get(
                this.ledgerCollection
                    .where('walletId', '==', wallet.id)
                    .where('reference', '==', reference)
                    .limit(1)
            );
            if (!existingLedger.empty) {
                logger.warn({ walletId: wallet.id, reference }, 'Duplicate transaction reference — skipping');
                return;
            }

            const walletBalanceRef = this.walletBalancesCollection.doc(wallet.id!);
            const walletBalanceSnapshot = await transaction.get(walletBalanceRef);
            const currentBalance = walletBalanceSnapshot.exists
                ? (walletBalanceSnapshot.data()?.available as number) ?? 0
                : 0;

            if (type === 'debit' && currentBalance < amount) {
                throw new Error('Insufficient funds');
            }

            // Use absolute value based on read to ensure balance check + update are consistent
            const newBalance = type === 'credit' ? currentBalance + amount : currentBalance - amount;

            transaction.set(
                walletBalanceRef,
                {
                    walletId: wallet.id,
                    currency: wallet.currency,
                    available: newBalance,
                    updatedAt: timestamp
                },
                { merge: true }
            );

            const counterpartyCurrency = options.counterpartyCurrency ?? wallet.currency;
            const counterpartyBalanceRef = this.walletBalancesCollection.doc(counterpartyWalletId);
            const counterpartySnapshot = await transaction.get(counterpartyBalanceRef);
            const counterpartyBalance = counterpartySnapshot.exists
                ? (counterpartySnapshot.data()?.available as number) ?? 0
                : 0;
            const newCounterpartyBalance = type === 'credit'
                ? counterpartyBalance - amount
                : counterpartyBalance + amount;

            transaction.set(
                counterpartyBalanceRef,
                {
                    walletId: counterpartyWalletId,
                    currency: counterpartyCurrency,
                    available: newCounterpartyBalance,
                    updatedAt: timestamp
                },
                { merge: true }
            );

            const transactionId = this.transactionsCollection.doc().id;
            transaction.set(this.transactionsCollection.doc(transactionId), {
                walletId: wallet.id,
                userId,
                amount,
                type,
                status: 'success',
                category,
                reference,
                description,
                metadata: options.metadata ?? {},
                createdAt: timestamp
            });

            [
                {
                    transactionId,
                    walletId: wallet.id!,
                    type,
                    amount,
                    currency: wallet.currency,
                    category,
                    description,
                    reference,
                    metadata: options.metadata ?? {},
                    createdAt: timestamp
                },
                {
                    transactionId,
                    walletId: counterpartyWalletId,
                    type: type === 'credit' ? 'debit' : 'credit',
                    amount,
                    currency: counterpartyCurrency,
                    category,
                    description: `Counter-entry for ${description}`,
                    reference,
                    metadata: options.metadata ?? {},
                    createdAt: timestamp
                }
            ].forEach((entry) => {
                const ledgerRef = this.ledgerCollection.doc();
                transaction.set(ledgerRef, entry);
            });
        };

        if (options.transaction) {
            await runTx(options.transaction);
        } else {
            await db.runTransaction(runTx);
        }
    }

    async recordEscrowDeposit(input: EscrowHoldInput): Promise<void> {
        const platformWallet = await this.ensurePlatformWallet(input.currency);

        await db.runTransaction(async (transaction) => {
            const holdRef = this.walletHoldsCollection.doc(input.reference);
            const existing = await transaction.get(holdRef);
            if (existing.exists) {
                return; // Already recorded — idempotent
            }

            await this.processTransaction(
                platformWallet.userId,
                input.amount,
                'credit',
                'escrow_deposit',
                `Escrow deposit (${input.purpose})`,
                input.reference,
                {
                    counterpartyWalletId: EXTERNAL_PROCESSOR_WALLET_ID,
                    metadata: { gateway: input.gateway, ...input.metadata },
                    transaction
                }
            );

            transaction.set(holdRef, {
                ...input,
                status: 'held',
                platformWalletId: platformWallet.id,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        });
    }

    async captureEscrowHold(
        reference: string,
        options: CaptureEscrowOptions = {}
    ): Promise<{ driverAmount: number; commissionAmount: number; microAmount?: number }> {
        return db.runTransaction(async (transaction) => {
            const holdRef = this.walletHoldsCollection.doc(reference);
            const holdSnap = await transaction.get(holdRef);
            if (!holdSnap.exists) {
                throw new Error('Escrow hold not found');
            }

            const hold = holdSnap.data() as EscrowHoldRecord;
            if (hold.status !== 'held') {
                return hold.split ?? { driverAmount: 0, commissionAmount: hold.amount };
            }

            const driverId = options.driverId ?? hold.driverId;
            if (!driverId) {
                throw new Error('DriverId required to capture escrow');
            }

            const micro = (options.microDeductions ?? hold.metadata?.microDeductions) as MicroDeductionInput | undefined;
            const microFlat = micro?.flatFee ?? 0;
            const microPercent = micro?.percentage ?? 0;
            let microAmount = this.roundCurrency(microFlat + hold.amount * microPercent);
            if (microAmount > hold.amount) {
                microAmount = hold.amount;
            }

            const netAfterMicro = this.roundCurrency(hold.amount - microAmount);
            const commissionRate = options.commissionRate ?? hold.commissionRate ?? 0.25;
            const commissionAmount = this.roundCurrency(netAfterMicro * commissionRate);
            const driverAmount = this.roundCurrency(netAfterMicro - commissionAmount);

            if (driverAmount < 0) {
                throw new Error('Driver amount cannot be negative after deductions');
            }

            const platformWallet = await this.ensurePlatformWallet(hold.currency);

            await this.processTransaction(
                driverId,
                driverAmount,
                'credit',
                'driver_payout',
                `Ride payout ${options.rideId ?? hold.rideId ?? reference}`,
                reference,
                {
                    counterpartyWalletId: platformWallet.id!,
                    metadata: {
                        holdReference: reference,
                        microDeductions: micro,
                        subscription: options.subscriptionSnapshot,
                        ...hold.metadata,
                        ...options.metadata
                    },
                    transaction // Pass the transaction!
                }
            );

            transaction.update(holdRef, {
                status: 'captured',
                capturedAt: new Date(),
                split: { driverAmount, commissionAmount, microAmount },
                updatedAt: new Date()
            });

            return { driverAmount, commissionAmount, microAmount };
        });
    }

    async releaseEscrowHold(reference: string, reason?: string, metadata?: Record<string, unknown>): Promise<void> {
        if (!reference) return;

        const platformWalletPromise = this.ensurePlatformWallet('NGN'); // Pre-fetch; overridden inside tx

        await db.runTransaction(async (transaction) => {
            const holdRef = this.walletHoldsCollection.doc(reference);
            const holdSnap = await transaction.get(holdRef);
            if (!holdSnap.exists) {
                return;
            }

            const hold = holdSnap.data() as EscrowHoldRecord;
            if (hold.status !== 'held') {
                return;
            }

            const platformWallet = await this.ensurePlatformWallet(hold.currency);
            await this.processTransaction(
                platformWallet.userId,
                hold.amount,
                'debit',
                'escrow_release',
                reason ?? `Escrow release for ${reference}`,
                reference,
                {
                    counterpartyWalletId: EXTERNAL_PROCESSOR_WALLET_ID,
                    metadata: { ...hold.metadata, ...metadata, releaseReason: reason },
                    transaction
                }
            );

            transaction.update(holdRef, {
                status: 'released',
                releasedAt: new Date(),
                releaseReason: reason ?? 'refunded',
                updatedAt: new Date()
            });
        });
    }

    /**
     * Charge the rider's on-platform wallet for a completed ride.
     *
     * This is the wallet-as-payment counterpart to `recordEscrowDeposit`.
     * Instead of money arriving from an external gateway, the rider's existing
     * wallet balance is debited and the same amount is credited to the platform
     * escrow wallet.  A `wallet_holds` document is created so the normal
     * `captureEscrowHold` → driver credit flow can proceed unchanged.
     *
     * The method is idempotent: a second call with the same reference is a no-op.
     *
     * @throws Error('Insufficient funds') if rider balance < amount (from processTransaction)
     */
    async chargeWalletForRide(input: {
        riderId: string;
        rideId: string;
        amount: number;
        currency: 'NGN' | 'USD';
        reference: string;
    }): Promise<void> {
        const platformWallet = await this.ensurePlatformWallet(input.currency);

        await db.runTransaction(async (transaction) => {
            // Idempotency: skip silently if already processed
            const holdRef = this.walletHoldsCollection.doc(input.reference);
            const existing = await transaction.get(holdRef);
            if (existing.exists) {
                logger.warn({ reference: input.reference }, 'Wallet ride charge already recorded — skipping');
                return;
            }

            // Debit rider wallet; credit platform escrow (double-entry)
            await this.processTransaction(
                input.riderId,
                input.amount,
                'debit',
                'ride_payment',
                `Wallet payment for ride ${input.rideId}`,
                input.reference,
                {
                    counterpartyWalletId: platformWallet.id!,
                    walletCurrency: input.currency,
                    metadata: { rideId: input.rideId, purpose: 'ride_payment' },
                    transaction,
                }
            );

            // Create escrow hold so captureEscrowHold() can pay the driver
            transaction.set(holdRef, {
                reference: input.reference,
                amount: input.amount,
                currency: input.currency,
                riderId: input.riderId,
                rideId: input.rideId,
                purpose: 'ride_payment' as EscrowPurpose,
                gateway: 'wallet' as PaymentGateway,
                status: 'held',
                platformWalletId: platformWallet.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });
    }

    private async ensurePlatformWallet(currency: 'NGN' | 'USD'): Promise<IWalletWithBalance> {
        const userId = PLATFORM_ESCROW_USERS[currency];
        return this.getWallet(userId, currency);
    }

    private roundCurrency(amount: number): number {
        return Math.round(amount * 100) / 100;
    }
}

export const walletService = new WalletService();
