// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockWhere = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockStartAfter = jest.fn().mockReturnThis();
const mockQueryGet = jest.fn();
const mockDocGet = jest.fn();
const mockDocSet = jest.fn().mockResolvedValue(undefined);
const mockDocUpdate = jest.fn().mockResolvedValue(undefined);
const mockDocDelete = jest.fn().mockResolvedValue(undefined);
const mockAdd = jest.fn();
const mockDoc = jest.fn().mockImplementation((id?: string) => ({
    id: id || 'auto-id',
    get: mockDocGet,
    set: mockDocSet,
    update: mockDocUpdate,
    delete: mockDocDelete
}));

const mockCollection = jest.fn().mockImplementation(() => ({
    doc: mockDoc,
    add: mockAdd,
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    startAfter: mockStartAfter,
    get: mockQueryGet
}));

const mockTxGet = jest.fn();
const mockTxSet = jest.fn();
const mockTxUpdate = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('../../src/config/firebase', () => ({
    db: {
        collection: (...args: any[]) => mockCollection(...args),
        runTransaction: (fn: any) => mockRunTransaction(fn)
    }
}));
jest.mock('../../src/services/LedgerService', () => ({
    ledgerService: {
        getWalletBalance: jest.fn().mockResolvedValue(500)
    }
}));
jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock('firebase-admin', () => ({
    __esModule: true,
    default: {
        firestore: {
            FieldValue: {
                serverTimestamp: () => new Date(),
                increment: (n: number) => n,
                delete: () => '__DELETE__'
            }
        }
    }
}));
jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => new Date(),
        increment: (n: number) => n,
        delete: () => '__DELETE__'
    }
}));

import { walletService } from '../../src/services/WalletService';
import { ledgerService } from '../../src/services/LedgerService';

describe('WalletService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Default: query returns empty (no existing wallet)
        mockQueryGet.mockResolvedValue({ empty: true, docs: [] });
        mockAdd.mockResolvedValue({ id: 'wallet-new-123' });
        mockDocGet.mockResolvedValue({ exists: false });
        mockDocSet.mockResolvedValue(undefined);
    });

    // ── getWallet ─────────────────────────────────────────────────────────

    describe('getWallet', () => {
        it('creates a new wallet when user has no wallet', async () => {
            // First call: check if any wallet exists → empty
            mockQueryGet.mockResolvedValue({ empty: true, docs: [] });

            const result = await walletService.getWallet('user1', 'NGN');

            expect(result).toMatchObject({
                id: 'wallet-new-123',
                userId: 'user1',
                currency: 'NGN',
                balance: { amount: 0, currency: 'NGN' }
            });
            expect(mockAdd).toHaveBeenCalled();
        });

        it('returns existing wallet with balance from ledger', async () => {
            const walletDoc = {
                id: 'wallet-abc',
                data: () => ({ userId: 'user1', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() })
            };

            // First query: any wallet for user → found
            mockQueryGet
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] })
                // Second query: wallet with preferred currency
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] });

            (ledgerService.getWalletBalance as jest.Mock).mockResolvedValue(1500);

            const result = await walletService.getWallet('user1', 'NGN');

            expect(result.balance.amount).toBe(1500);
            expect(ledgerService.getWalletBalance).toHaveBeenCalledWith('wallet-abc');
        });

        it('defaults to NGN when no currency is specified', async () => {
            mockQueryGet.mockResolvedValue({ empty: true, docs: [] });

            const result = await walletService.getWallet('user2');

            expect(result.currency).toBe('NGN');
        });
    });

    // ── createWallet ──────────────────────────────────────────────────────

    describe('createWallet', () => {
        it('creates wallet with zero balance', async () => {
            mockAdd.mockResolvedValue({ id: 'wallet-xyz' });

            const result = await walletService.createWallet('user3', 'USD');

            expect(result.id).toBe('wallet-xyz');
            expect(result.userId).toBe('user3');
            expect(result.currency).toBe('USD');
            expect(result.balance).toEqual({ amount: 0, currency: 'USD' });
            expect(mockDocSet).toHaveBeenCalled(); // wallet_balances set
        });
    });

    // ── processTransaction ────────────────────────────────────────────────

    describe('processTransaction', () => {
        it('processes a credit transaction successfully', async () => {
            // getWallet → existing wallet
            const walletDoc = {
                id: 'wallet-tx',
                data: () => ({ userId: 'user4', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() })
            };
            mockQueryGet
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] })
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] });
            (ledgerService.getWalletBalance as jest.Mock).mockResolvedValue(1000);

            // Transaction mocks — tx.get is called 3 times:
            // 1. duplicate ledger check (query) → empty
            // 2. walletBalanceRef (doc) → exists with balance
            // 3. counterpartyBalanceRef (doc) → exists with balance
            mockRunTransaction.mockImplementation(async (fn: any) => {
                const tx = {
                    get: jest.fn()
                        .mockResolvedValueOnce({ empty: true, docs: [] })
                        .mockResolvedValueOnce({ exists: true, data: () => ({ available: 1000 }) })
                        .mockResolvedValueOnce({ exists: true, data: () => ({ available: 5000 }) }),
                    set: jest.fn(),
                    update: jest.fn(),
                    create: jest.fn()
                };
                return fn(tx);
            });

            await expect(
                walletService.processTransaction(
                    'user4', 500, 'credit', 'wallet_topup',
                    'Top up via Paystack', 'ref-topup-001'
                )
            ).resolves.not.toThrow();
        });

        it('rejects debit when insufficient funds', async () => {
            const walletDoc = {
                id: 'wallet-low',
                data: () => ({ userId: 'user5', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() })
            };
            mockQueryGet
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] })
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] });
            (ledgerService.getWalletBalance as jest.Mock).mockResolvedValue(100);

            mockRunTransaction.mockImplementation(async (fn: any) => {
                const tx = {
                    get: jest.fn()
                        .mockResolvedValueOnce({ empty: true, docs: [] })
                        .mockResolvedValueOnce({ exists: true, data: () => ({ available: 100 }) })
                        .mockResolvedValueOnce({ exists: true, data: () => ({ available: 5000 }) }),
                    set: jest.fn(),
                    update: jest.fn(),
                    create: jest.fn()
                };
                return fn(tx);
            });

            await expect(
                walletService.processTransaction(
                    'user5', 500, 'debit', 'ride_payment',
                    'Ride payment', 'ref-ride-001'
                )
            ).rejects.toThrow('Insufficient funds');
        });

        it('skips duplicate transaction references', async () => {
            const walletDoc = {
                id: 'wallet-dup',
                data: () => ({ userId: 'user6', currency: 'NGN', createdAt: new Date(), updatedAt: new Date() })
            };
            mockQueryGet
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] })
                .mockResolvedValueOnce({ empty: false, docs: [walletDoc] });
            (ledgerService.getWalletBalance as jest.Mock).mockResolvedValue(1000);

            const txSetSpy = jest.fn();
            mockRunTransaction.mockImplementation(async (fn: any) => {
                const tx = {
                    get: jest.fn()
                        // Duplicate exists!
                        .mockResolvedValueOnce({ empty: false, docs: [{ id: 'existing-entry' }] }),
                    set: txSetSpy,
                    update: jest.fn(),
                    create: jest.fn()
                };
                return fn(tx);
            });

            await walletService.processTransaction(
                'user6', 500, 'credit', 'wallet_topup',
                'Duplicate top up', 'ref-duplicate-001'
            );

            // Should not have set any new balance (skipped)
            expect(txSetSpy).not.toHaveBeenCalled();
        });
    });
});
