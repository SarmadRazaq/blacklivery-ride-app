import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { incentiveService } from './driver/IncentiveService';
import { surgeService } from './pricing/SurgeService';
import { walletService } from './WalletService';

/**
 * Internal cron scheduler - runs background tasks without HTTP endpoints.
 * The HTTP cron.controller.ts endpoints remain available for manual/external triggers.
 */
class CronSchedulerService {
    private tasks: ScheduledTask[] = [];

    start(): void {
        if (process.env.DISABLE_CRON === 'true') {
            logger.info('Cron scheduler disabled via DISABLE_CRON env var');
            return;
        }

        logger.info('Starting cron scheduler...');

        // Clean up stale rides every 5 minutes
        this.tasks.push(
            cron.schedule('*/5 * * * *', () => this.cleanupStaleRides(), {
                name: 'cleanup-stale-rides'
            })
        );

        // Clean up inactive drivers every 5 minutes
        this.tasks.push(
            cron.schedule('*/5 * * * *', () => this.cleanupInactiveDrivers(), {
                name: 'cleanup-inactive-drivers'
            })
        );

        // Recalculate surge cache every 2 minutes
        this.tasks.push(
            cron.schedule('*/2 * * * *', () => this.recalculateSurge(), {
                name: 'recalculate-surge'
            })
        );

        // Dispatch scheduled rides every 60 seconds
        this.tasks.push(
            cron.schedule('* * * * *', () => this.dispatchScheduledRides(), {
                name: 'dispatch-scheduled-rides'
            })
        );

        // Process auto payouts daily at 2:00 AM
        this.tasks.push(
            cron.schedule('0 2 * * *', () => this.processAutoPayouts(), {
                name: 'auto-payouts'
            })
        );

        // Run daily settlement at midnight
        this.tasks.push(
            cron.schedule('0 0 * * *', () => this.runDailySettlement(), {
                name: 'daily-settlement'
            })
        );

        // Check for no-show riders every minute (Nigeria 5-min rule)
        this.tasks.push(
            cron.schedule('* * * * *', () => this.checkNoShowRides(), {
                name: 'no-show-check'
            })
        );

        // Renew driver subscriptions daily at 3:00 AM
        this.tasks.push(
            cron.schedule('0 3 * * *', () => this.renewSubscriptions(), {
                name: 'subscription-renewal'
            })
        );

        // Recalculate B2B delivery tiers on the 1st of each month at 1:00 AM
        this.tasks.push(
            cron.schedule('0 1 1 * *', () => this.recalculateB2BTiers(), {
                name: 'b2b-tier-recalculation'
            })
        );

        logger.info({ count: this.tasks.length }, 'Cron scheduler started');
    }

    stop(): void {
        this.tasks.forEach(task => task.stop());
        this.tasks = [];
        logger.info('Cron scheduler stopped');
    }

    private async cleanupStaleRides(): Promise<void> {
        try {
            const now = new Date();

            // Rides stuck in "finding_driver" for more than 10 min
            const findingCutoff = new Date(now.getTime() - 10 * 60 * 1000);
            const staleFindings = await db.collection('rides')
                .where('status', '==', 'finding_driver')
                .where('createdAt', '<', findingCutoff)
                .get();

            // Rides stuck in "accepted" for more than 30 min
            const acceptedCutoff = new Date(now.getTime() - 30 * 60 * 1000);
            const staleAccepted = await db.collection('rides')
                .where('status', '==', 'accepted')
                .where('updatedAt', '<', acceptedCutoff)
                .get();

            let cancelled = 0;
            const allDocs = [
                ...staleFindings.docs.map(d => ({ ref: d.ref, reason: 'system_timeout_no_driver' })),
                ...staleAccepted.docs.map(d => ({ ref: d.ref, reason: 'system_timeout_driver_no_show' }))
            ];

            // Chunk into batches of 499 to stay under Firestore 500-op limit
            const BATCH_LIMIT = 499;
            for (let i = 0; i < allDocs.length; i += BATCH_LIMIT) {
                const chunk = allDocs.slice(i, i + BATCH_LIMIT);
                const batch = db.batch();
                for (const item of chunk) {
                    batch.update(item.ref, {
                        status: 'cancelled',
                        cancellationReason: item.reason,
                        cancelledBy: 'system',
                        updatedAt: now
                    });
                    cancelled++;
                }
                await batch.commit();
            }

            logger.info({ cancelled }, '[cron] Stale ride cleanup completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Stale ride cleanup failed');
        }
    }

    private async cleanupInactiveDrivers(): Promise<void> {
        try {
            const cutoffTime = new Date(Date.now() - 15 * 60 * 1000);
            const inactiveDrivers = await db.collection('users')
                .where('role', '==', 'driver')
                .where('driverStatus.isOnline', '==', true)
                .where('driverStatus.lastHeartbeat', '<', cutoffTime)
                .get();

            let offlined = 0;
            const BATCH_LIMIT = 499;
            const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
            for (let i = 0; i < inactiveDrivers.docs.length; i += BATCH_LIMIT) {
                chunks.push(inactiveDrivers.docs.slice(i, i + BATCH_LIMIT));
            }

            for (const chunk of chunks) {
                const batch = db.batch();
                for (const doc of chunk) {
                    batch.update(doc.ref, {
                        'driverStatus.isOnline': false,
                        'driverStatus.offlineReason': 'heartbeat_timeout',
                        'driverStatus.updatedAt': new Date()
                    });
                    offlined++;
                }
                await batch.commit();
            }

            logger.info({ offlined }, '[cron] Inactive driver cleanup completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Inactive driver cleanup failed');
        }
    }

    private async recalculateSurge(): Promise<void> {
        try {
            // Clear the surge cache to force recalculation on next request
            surgeService.clearCache();

            // Pre-warm surge for zones with active rides
            const activeRides = await db.collection('rides')
                .where('status', 'in', ['finding_driver', 'accepted', 'in_progress'])
                .limit(50)
                .get();

            const processedZones = new Set<string>();
            let recalculated = 0;

            for (const doc of activeRides.docs) {
                const ride = doc.data();
                const lat = ride.pickupLocation?.lat ?? ride.pickup?.coordinates?.lat;
                const lng = ride.pickupLocation?.lng ?? ride.pickup?.coordinates?.lng;
                const region = ride.region || 'NG';
                if (!lat || !lng) continue;

                const zoneKey = `${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
                if (processedZones.has(zoneKey)) continue;
                processedZones.add(zoneKey);

                await surgeService.getMultiplier(lat, lng, region);
                recalculated++;
            }

            logger.info({ zones: recalculated }, '[cron] Surge recalculation completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Surge recalculation failed');
        }
    }

    /**
     * Dispatch scheduled rides whose scheduledAt time has arrived (or is within 5 min).
     * Transitions them from 'requested' to 'finding_driver' and starts matching.
     */
    private async dispatchScheduledRides(): Promise<void> {
        try {
            const now = new Date();
            const dispatchWindow = new Date(now.getTime() + 5 * 60 * 1000);
            const notOlderThan = new Date(now.getTime() - 30 * 60 * 1000);

            const scheduledRides = await db.collection('rides')
                .where('status', '==', 'scheduled')
                .where('scheduledAt', '<=', dispatchWindow)
                .where('scheduledAt', '>=', notOlderThan)
                .limit(50)
                .get();

            if (scheduledRides.empty) return;

            let dispatched = 0, failed = 0;

            for (const doc of scheduledRides.docs) {
                try {
                    const ride = doc.data();
                    if (ride.matchingStarted) continue;

                    await doc.ref.update({
                        status: 'finding_driver',
                        matchingStarted: true,
                        updatedAt: now
                    });

                    // Lazy-import to avoid circular dependency
                    const { rideService } = require('./RideService');
                    await rideService.startDriverMatching(doc.id);
                    dispatched++;
                } catch (error) {
                    failed++;
                    logger.error({ err: error, rideId: doc.id }, '[cron] Failed to dispatch scheduled ride');
                }
            }

            if (dispatched > 0 || failed > 0) {
                logger.info({ dispatched, failed }, '[cron] Scheduled ride dispatch completed');
            }
        } catch (error) {
            logger.error({ err: error }, '[cron] Scheduled ride dispatch failed');
        }
    }

    private async processAutoPayouts(): Promise<void> {
        try {
            const driversSnap = await db.collection('users')
                .where('role', '==', 'driver')
                .where('driverProfile.autoPayoutEnabled', '==', true)
                .get();

            let processed = 0, skipped = 0, failed = 0;

            for (const doc of driversSnap.docs) {
                try {
                    const driver = doc.data();
                    const threshold = driver.driverProfile?.autoPayoutThreshold || 10000;
                    
                    // Look up the driver's wallet by userId, not by doc.id directly
                    const walletSnap = await db.collection('wallets')
                        .where('userId', '==', doc.id)
                        .limit(1)
                        .get();
                    
                    if (walletSnap.empty) {
                        skipped++;
                        continue;
                    }
                    
                    const walletDoc = walletSnap.docs[0];
                    const balanceSnap = await db.collection('wallet_balances').doc(walletDoc.id).get();
                    const balance = balanceSnap.exists ? (balanceSnap.data()?.available || 0) : 0;

                    if (balance < threshold) {
                        skipped++;
                        continue;
                    }

                    const currency = driver.region === 'US-CHI' ? 'USD' : 'NGN';

                    // Create payout request & execute transfer
                    const payoutRef = await db.collection('payout_requests').add({
                        driverId: doc.id,
                        amount: balance,
                        currency,
                        status: 'processing',
                        type: 'auto',
                        bankDetails: driver.driverProfile?.bankDetails || null,
                        createdAt: new Date()
                    });

                    // Execute the actual transfer via payment provider
                    try {
                        if (currency === 'NGN') {
                            await this.executePaystackTransfer(doc.id, balance, driver.driverProfile?.bankDetails);
                        } else {
                            await this.executeStripeTransfer(doc.id, balance, driver.driverProfile?.stripeAccountId);
                        }
                        await payoutRef.update({ status: 'completed', completedAt: new Date() });

                        // Deduct from wallet atomically using increment
                        await db.collection('wallet_balances').doc(walletDoc.id).update({
                            available: FieldValue.increment(-balance),
                            lastPayoutAt: new Date()
                        });

                        processed++;
                    } catch (transferError: any) {
                        await payoutRef.update({ status: 'failed', error: transferError.message });
                        failed++;
                        logger.error({ err: transferError, driverId: doc.id }, '[cron] Auto-payout transfer failed');
                    }
                } catch (error: any) {
                    failed++;
                    logger.error({ err: error, driverId: doc.id }, '[cron] Auto-payout processing error');
                }
            }

            logger.info({ processed, skipped, failed }, '[cron] Auto payout processing completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Auto payout processing failed');
        }
    }

    private async executePaystackTransfer(driverId: string, amount: number, bankDetails: any): Promise<void> {
        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
        if (!PAYSTACK_SECRET) throw new Error('PAYSTACK_SECRET_KEY not configured');

        // Create transfer recipient
        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'nuban',
                name: bankDetails?.accountName,
                account_number: bankDetails?.accountNumber,
                bank_code: bankDetails?.bankCode,
                currency: 'NGN'
            })
        });
        const recipientData = await recipientRes.json() as any;
        if (!recipientData.status) throw new Error(`Paystack recipient error: ${recipientData.message}`);

        // Initiate transfer
        const transferRes = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: 'balance',
                amount: amount * 100, // Paystack uses kobo
                recipient: recipientData.data.recipient_code,
                reason: `BlackLivery auto-payout for driver ${driverId}`
            })
        });
        const transferData = await transferRes.json() as any;
        if (!transferData.status) throw new Error(`Paystack transfer error: ${transferData.message}`);
    }

    private async executeStripeTransfer(driverId: string, amount: number, stripeAccountId: string): Promise<void> {
        const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
        if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY not configured');
        if (!stripeAccountId) throw new Error('Driver has no Stripe Connect account');

        const res = await fetch('https://api.stripe.com/v1/transfers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_SECRET}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                amount: String(Math.round(amount * 100)), // cents
                currency: 'usd',
                destination: stripeAccountId,
                description: `BlackLivery auto-payout for driver ${driverId}`
            }).toString()
        });
        const data = await res.json() as any;
        if (data.error) throw new Error(`Stripe transfer error: ${data.error.message}`);
    }

    /**
     * Enforce the Nigeria 5-minute no-show rule.
     * When a driver has been in `arrived` status for >5 minutes without the ride
     * starting, auto-cancel and charge the rider the per-class no-show fee.
     */
    private async checkNoShowRides(): Promise<void> {
        try {
            const now = new Date();
            // 5-minute window — only applies to Nigeria (NG) rides
            const noShowCutoff = new Date(now.getTime() - 5 * 60 * 1000);

            const staleArrived = await db.collection('rides')
                .where('status', '==', 'arrived')
                .where('region', '==', 'NG')
                .where('arrivedAt', '<', noShowCutoff)
                .get();

            if (staleArrived.empty) return;

            // No-show fees by vehicle class (₦)
            const NO_SHOW_FEES: Record<string, number> = {
                sedan: 2000,
                suv: 3000,
                xl: 4000,
                motorbike: 2000 // delivery fallback
            };

            let cancelled = 0;
            for (const doc of staleArrived.docs) {
                try {
                    const ride = doc.data();
                    const vehicleClass = (ride.vehicleCategory ?? ride.vehicleClass ?? 'sedan').toLowerCase();
                    const noShowFee = NO_SHOW_FEES[vehicleClass] ?? 2000;

                    await doc.ref.update({
                        status: 'cancelled',
                        cancellationReason: 'system_no_show',
                        cancelledBy: 'system',
                        noShowFee,
                        updatedAt: now
                    });

                    // Charge no-show fee to the rider's wallet
                    if (ride.riderId) {
                        const feeRef = `NO-SHOW-${doc.id}`;
                        walletService.processTransaction(
                            ride.riderId,
                            noShowFee,
                            'debit',
                            'cancellation_fee',
                            `No-show fee — driver waited more than 5 minutes`,
                            feeRef,
                            { walletCurrency: 'NGN', metadata: { rideId: doc.id, reason: 'no_show' } }
                        ).catch(err => logger.error({ err, rideId: doc.id }, '[cron] Failed to charge no-show fee'));
                    }

                    cancelled++;
                } catch (err) {
                    logger.error({ err, rideId: doc.id }, '[cron] Failed to process no-show ride');
                }
            }

            if (cancelled > 0) {
                logger.info({ cancelled }, '[cron] No-show rides cancelled');
            }
        } catch (error) {
            logger.error({ err: error }, '[cron] No-show check failed');
        }
    }

    /**
     * Renew active driver subscriptions that are expiring within 24 hours.
     * Charges ₦30,000 from the driver's wallet.
     * On failure, marks the subscription expired (commission reverts to 25%).
     */
    private async renewSubscriptions(): Promise<void> {
        try {
            const now = new Date();
            const renewalWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // within 24h

            const driversSnap = await db.collection('users')
                .where('role', '==', 'driver')
                .where('subscription.status', '==', 'active')
                .get();

            let renewed = 0, expired = 0, skipped = 0;

            for (const doc of driversSnap.docs) {
                const driver = doc.data();
                const sub = driver.subscription;
                if (!sub) { skipped++; continue; }

                // Parse expiry
                const expiresAt: Date | null = sub.expiresAt?.toDate
                    ? sub.expiresAt.toDate()
                    : sub.expiresAt ? new Date(sub.expiresAt) : null;

                if (!expiresAt || expiresAt > renewalWindow) {
                    skipped++;
                    continue; // Not due yet
                }

                const currency = driver.region === 'US-CHI' ? 'USD' : 'NGN';
                const subscriptionFee = currency === 'NGN' ? 30000 : 300; // ₦30,000 or $300 USD

                try {
                    await walletService.processTransaction(
                        doc.id,
                        subscriptionFee,
                        'debit',
                        'subscription_fee',
                        `Monthly subscription renewal — BlackLivery Pro`,
                        `SUB-RENEW-${doc.id}-${now.getFullYear()}-${now.getMonth() + 1}`,
                        { walletCurrency: currency }
                    );

                    // Extend expiry by 30 days
                    const newExpiry = new Date(Math.max(expiresAt.getTime(), now.getTime()) + 30 * 24 * 60 * 60 * 1000);
                    await doc.ref.update({
                        'subscription.expiresAt': newExpiry,
                        'subscription.renewedAt': now,
                        'subscription.status': 'active'
                    });
                    renewed++;
                } catch (chargeError) {
                    // Insufficient funds or wallet error — expire the subscription
                    await doc.ref.update({
                        'subscription.status': 'expired',
                        'subscription.expiredAt': now,
                        'subscription.expiredReason': 'insufficient_funds'
                    });
                    expired++;
                    logger.warn({ driverId: doc.id }, '[cron] Subscription expired — insufficient funds for renewal');
                }
            }

            logger.info({ renewed, expired, skipped }, '[cron] Subscription renewal completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Subscription renewal failed');
        }
    }

    /**
     * Recalculate B2B delivery tiers for business accounts based on monthly delivery count.
     * Tiers: 0–200 → none, 200–500 → 10% discount, 500–2000 → 15%, 2000+ → custom.
     */
    private async recalculateB2BTiers(): Promise<void> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);

            // Find all business accounts
            const bizSnap = await db.collection('users')
                .where('role', '==', 'rider')
                .where('accountType', '==', 'business')
                .get();

            let updated = 0;
            for (const doc of bizSnap.docs) {
                try {
                    // Count completed deliveries in the previous calendar month
                    const deliveriesSnap = await db.collection('rides')
                        .where('riderId', '==', doc.id)
                        .where('bookingType', '==', 'delivery')
                        .where('status', 'in', ['completed', 'delivery_delivered'])
                        .where('completedAt', '>=', startOfMonth)
                        .where('completedAt', '<', endOfMonth)
                        .get();

                    const count = deliveriesSnap.size;

                    let tier: string;
                    let discountRate: number;
                    let commissionRate: number;

                    if (count >= 2000) {
                        tier = 'enterprise';
                        discountRate = 0.15;
                        commissionRate = 0.15;
                    } else if (count >= 500) {
                        tier = 'premium';
                        discountRate = 0.15;
                        commissionRate = 0.18;
                    } else if (count >= 200) {
                        tier = 'growth';
                        discountRate = 0.10;
                        commissionRate = 0.20;
                    } else {
                        tier = 'standard';
                        discountRate = 0;
                        commissionRate = 0.25;
                    }

                    await doc.ref.update({
                        'b2b.tier': tier,
                        'b2b.discountRate': discountRate,
                        'b2b.commissionRate': commissionRate,
                        'b2b.lastMonthDeliveries': count,
                        'b2b.recalculatedAt': now
                    });
                    updated++;
                } catch (err) {
                    logger.error({ err, userId: doc.id }, '[cron] Failed to recalculate B2B tier');
                }
            }

            logger.info({ updated, month: startOfMonth.toISOString().slice(0, 7) }, '[cron] B2B tier recalculation completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] B2B tier recalculation failed');
        }
    }

    private async runDailySettlement(): Promise<void> {
        try {
            const activeIncentives = await db.collection('incentives')
                .where('isPaid', '==', false)
                .where('totalEarned', '>', 0)
                .get();

            const driverIds = new Set<string>();
            activeIncentives.docs.forEach(doc => driverIds.add(doc.data().driverId));

            let success = 0, failed = 0;
            for (const driverId of Array.from(driverIds)) {
                try {
                    await incentiveService.settleIncentives(driverId);
                    success++;
                } catch (error) {
                    failed++;
                    logger.error({ err: error, driverId }, '[cron] Failed to settle incentives');
                }
            }

            logger.info({ success, failed }, '[cron] Daily settlement completed');
        } catch (error) {
            logger.error({ err: error }, '[cron] Daily settlement failed');
        }
    }
}

export const cronService = new CronSchedulerService();
