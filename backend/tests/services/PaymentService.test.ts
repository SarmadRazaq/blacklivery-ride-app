// Mock payment providers
const mockPaystackInit = jest.fn().mockResolvedValue({
    authorizationUrl: 'https://paystack.com/pay/test',
    reference: 'ref_ng_123',
    accessCode: 'ac_123'
});
const mockPaystackVerify = jest.fn().mockResolvedValue({ status: true, reference: 'ref_ng_123', amount: 5000 });
const mockPaystackWebhook = jest.fn().mockResolvedValue({ status: true, reference: 'ref_ng_123' });
const mockPaystackCreateRecipient = jest.fn().mockResolvedValue('RCP_123');
const mockPaystackTransfer = jest.fn().mockResolvedValue('TRF_123');

const mockStripeInit = jest.fn().mockResolvedValue({
    authorizationUrl: 'https://checkout.stripe.com/test',
    reference: 'ref_us_123',
    accessCode: 'cs_123'
});
const mockStripeVerify = jest.fn().mockResolvedValue({ status: true, reference: 'ref_us_123', amount: 100 });

jest.mock('../../src/services/payment/providers/PaystackProvider', () => ({
    PaystackProvider: jest.fn().mockImplementation(() => ({
        initializeTransaction: mockPaystackInit,
        verifyTransaction: mockPaystackVerify,
        verifyWebhook: mockPaystackWebhook,
        createRecipient: mockPaystackCreateRecipient,
        transfer: mockPaystackTransfer
    }))
}));

jest.mock('../../src/services/payment/providers/StripeProvider', () => ({
    StripeProvider: jest.fn().mockImplementation(() => ({
        initializeTransaction: mockStripeInit,
        verifyTransaction: mockStripeVerify,
        verifyWebhook: jest.fn(),
        createRecipient: jest.fn().mockResolvedValue('acct_123'),
        transfer: jest.fn().mockResolvedValue('tr_123'),
        generateOnboardingLink: jest.fn().mockResolvedValue('https://connect.stripe.com/onboarding')
    }))
}));

jest.mock('../../src/services/payment/providers/FlutterwaveProvider', () => ({
    FlutterwaveProvider: jest.fn().mockImplementation(() => ({
        initializeTransaction: jest.fn().mockResolvedValue({ authorization_url: 'https://fw.com/pay', reference: 'ref_fw', access_code: 'fw_ac' }),
        verifyTransaction: jest.fn(),
        verifyWebhook: jest.fn(),
        createRecipient: jest.fn(),
        transfer: jest.fn()
    }))
}));

jest.mock('../../src/services/payment/providers/MonnifyProvider', () => ({
    MonnifyProvider: jest.fn().mockImplementation(() => ({
        initializeTransaction: jest.fn(),
        verifyTransaction: jest.fn(),
        verifyWebhook: jest.fn(),
        createRecipient: jest.fn(),
        transfer: jest.fn()
    }))
}));

jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

import { PaymentService } from '../../src/services/payment/PaymentService';

describe('PaymentService', () => {
    let service: PaymentService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PaymentService();
    });

    // ── Provider selection by region ──────────────────────────────────────

    describe('initializePayment', () => {
        it('uses Paystack for NG region', async () => {
            const result = await service.initializePayment('NG', 'test@ng.com', 5000, 'NGN', 'ref_ng_1');
            expect(mockPaystackInit).toHaveBeenCalledWith('test@ng.com', 5000, 'NGN', 'ref_ng_1', undefined);
            expect(result.authorizationUrl).toContain('paystack');
        });

        it('uses Stripe for US-CHI region', async () => {
            const result = await service.initializePayment('US-CHI', 'test@us.com', 100, 'USD', 'ref_us_1');
            expect(mockStripeInit).toHaveBeenCalledWith('test@us.com', 100, 'USD', 'ref_us_1', undefined);
            expect(result.authorizationUrl).toContain('stripe');
        });

        it('passes metadata to provider', async () => {
            const metadata = { rideId: 'ride_123', type: 'ride_payment' };
            await service.initializePayment('NG', 'test@ng.com', 3000, 'NGN', 'ref_meta_1', metadata);
            expect(mockPaystackInit).toHaveBeenCalledWith('test@ng.com', 3000, 'NGN', 'ref_meta_1', metadata);
        });
    });

    // ── Verify payment ────────────────────────────────────────────────────

    describe('verifyPayment', () => {
        it('verifies via Paystack for NG region', async () => {
            const result = await service.verifyPayment('NG', 'ref_verify_ng');
            expect(mockPaystackVerify).toHaveBeenCalledWith('ref_verify_ng');
            expect(result.status).toBe(true);
        });

        it('verifies via Stripe for US-CHI region', async () => {
            const result = await service.verifyPayment('US-CHI', 'ref_verify_us');
            expect(mockStripeVerify).toHaveBeenCalledWith('ref_verify_us');
            expect(result.status).toBe(true);
        });
    });

    // ── Webhook ───────────────────────────────────────────────────────────

    describe('verifyWebhook', () => {
        it('routes paystack webhooks correctly', async () => {
            await service.verifyWebhook('paystack', { event: 'charge.success' }, 'sig_123');
            expect(mockPaystackWebhook).toHaveBeenCalledWith({ event: 'charge.success' }, 'sig_123');
        });

        it('throws for unknown gateway', async () => {
            await expect(
                service.verifyWebhook('unknown-gw' as any, {}, 'sig')
            ).rejects.toThrow('Unknown gateway');
        });
    });

    // ── Payouts ───────────────────────────────────────────────────────────

    describe('createRecipient', () => {
        it('creates recipient via region provider', async () => {
            const result = await service.createRecipient('NG', 'John Doe', '0123456789', '058');
            expect(mockPaystackCreateRecipient).toHaveBeenCalledWith('John Doe', '0123456789', '058');
            expect(result).toBe('RCP_123');
        });
    });

    describe('transferFunds', () => {
        it('transfers via Paystack for NG region', async () => {
            const result = await service.transferFunds('NG', 'RCP_123', 5000, 'NGN', 'Driver payout');
            expect(mockPaystackTransfer).toHaveBeenCalledWith('RCP_123', 5000, 'NGN', 'Driver payout', undefined);
            expect(result).toBe('TRF_123');
        });
    });

    // ── Fallback behavior ─────────────────────────────────────────────────

    describe('provider fallback', () => {
        it('falls back to NG provider when region is not found', async () => {
            // Any region that doesn't have a dedicated provider
            const result = await service.initializePayment('NG' as any, 'test@fallback.com', 1000, 'NGN', 'ref_fallback');
            expect(mockPaystackInit).toHaveBeenCalled();
        });
    });
});
