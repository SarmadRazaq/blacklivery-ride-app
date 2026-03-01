const mockBalanceDocGet = jest.fn();
const mockBalanceDocSet = jest.fn().mockResolvedValue(undefined);
const mockBalanceDoc = jest.fn().mockImplementation(() => ({
    get: mockBalanceDocGet,
    set: mockBalanceDocSet
}));

const mockLedgerWhere = jest.fn().mockReturnThis();
const mockLedgerOrderBy = jest.fn().mockReturnThis();
const mockLedgerLimit = jest.fn().mockReturnThis();
const mockLedgerStartAfter = jest.fn().mockReturnThis();
const mockLedgerGet = jest.fn();

jest.mock('../../src/config/firebase', () => ({
    db: {
        collection: jest.fn().mockImplementation((name: string) => {
            if (name === 'wallet_balances') {
                return { doc: mockBalanceDoc };
            }
            if (name === 'ledger') {
                return {
                    where: mockLedgerWhere,
                    orderBy: mockLedgerOrderBy,
                    limit: mockLedgerLimit,
                    startAfter: mockLedgerStartAfter,
                    get: mockLedgerGet
                };
            }
            return {};
        })
    }
}));
jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { ledgerService } from '../../src/services/LedgerService';

describe('LedgerService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset chain mocks — they return `this` in the real code
        mockLedgerWhere.mockReturnThis();
        mockLedgerOrderBy.mockReturnThis();
        mockLedgerLimit.mockReturnThis();
        mockLedgerStartAfter.mockReturnThis();
    });

    // ── getWalletBalance ──────────────────────────────────────────────────

    describe('getWalletBalance', () => {
        it('returns cached balance from wallet_balances (fast path)', async () => {
            mockBalanceDocGet.mockResolvedValue({
                exists: true,
                data: () => ({ available: 1500 })
            });

            const balance = await ledgerService.getWalletBalance('wallet-1');
            expect(balance).toBe(1500);
            expect(mockBalanceDoc).toHaveBeenCalledWith('wallet-1');
        });

        it('returns 0 when cached balance doc has no available field', async () => {
            mockBalanceDocGet.mockResolvedValue({
                exists: true,
                data: () => ({})
            });

            const balance = await ledgerService.getWalletBalance('wallet-empty');
            expect(balance).toBe(0);
        });

        it('computes from ledger when no cached balance exists (slow path)', async () => {
            // No cached balance
            mockBalanceDocGet.mockResolvedValue({ exists: false });

            // Ledger entries
            mockLedgerGet.mockResolvedValue({
                empty: false,
                docs: [
                    { data: () => ({ type: 'credit', amount: 1000 }) },
                    { data: () => ({ type: 'credit', amount: 500 }) },
                    { data: () => ({ type: 'debit', amount: 200 }) }
                ]
            });

            const balance = await ledgerService.getWalletBalance('wallet-computed');

            // 1000 + 500 - 200 = 1300
            expect(balance).toBe(1300);
            // Should persist computed balance
            expect(mockBalanceDocSet).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: 'wallet-computed', available: 1300 }),
                { merge: true }
            );
        });

        it('returns 0 when no cached balance and no ledger entries', async () => {
            mockBalanceDocGet.mockResolvedValue({ exists: false });
            mockLedgerGet.mockResolvedValue({ empty: true, docs: [] });

            const balance = await ledgerService.getWalletBalance('wallet-brand-new');
            expect(balance).toBe(0);
        });
    });

    // ── rebuildWalletSummary ──────────────────────────────────────────────

    describe('rebuildWalletSummary', () => {
        it('recomputes and persists the balance from ledger entries', async () => {
            mockLedgerGet.mockResolvedValue({
                empty: false,
                docs: [
                    { data: () => ({ type: 'credit', amount: 5000 }) },
                    { data: () => ({ type: 'debit', amount: 1500 }) }
                ]
            });

            await ledgerService.rebuildWalletSummary('wallet-rebuild');

            expect(mockBalanceDocSet).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: 'wallet-rebuild', available: 3500 }),
                { merge: true }
            );
        });

        it('sets balance to 0 when no ledger entries exist', async () => {
            mockLedgerGet.mockResolvedValue({ empty: true, docs: [] });

            await ledgerService.rebuildWalletSummary('wallet-zero');

            expect(mockBalanceDocSet).toHaveBeenCalledWith(
                expect.objectContaining({ walletId: 'wallet-zero', available: 0 }),
                { merge: true }
            );
        });
    });
});
