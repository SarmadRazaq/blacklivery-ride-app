import { paymentService } from './src/services/payment/PaymentService';
import { RegionCode } from './src/config/region.config';

async function checkPayments() {
    console.log('Checking Payment Providers...');

    const providers = [
        { region: 'NG' as RegionCode, name: 'Default (Paystack)' },
        { region: 'NG' as RegionCode, provider: 'PAYSTACK', name: 'Explicit Paystack' },
        { region: 'NG' as RegionCode, provider: 'FLUTTERWAVE', name: 'Flutterwave' },
        { region: 'NG' as RegionCode, provider: 'MONNIFY', name: 'Monnify' },
        { region: 'US-CHI' as RegionCode, name: 'Stripe' }
    ];

    for (const p of providers) {
        try {
            console.log(`Testing ${p.name}...`);
            // We just want to see if it throws "provider not found" or similar initialization errors.
            // We won't actually call external APIs as we don't have valid keys/refs here, 
            // but we can check if the provider instance is retrieved.

            // Accessing private method via any cast to check internal state or just calling a public method 
            // that doesn't hit API immediately if possible? 
            // initializePayment hits API.

            // Let's just try to call initializePayment with dummy data and expect an API error (which means provider was found and tried to call API)
            // rather than a "provider not found" error.

            await paymentService.initializePayment(
                p.region,
                'test@example.com',
                1000,
                'NGN',
                `REF-${Date.now()}`,
                {},
                p.provider
            );
            console.log(`✅ ${p.name} initialized (Mock success)`);
        } catch (error: any) {
            if (error.message.includes('Payment initialization failed') || error.message.includes('API') || error.response) {
                console.log(`✅ ${p.name} provider active (API call attempted: ${error.message})`);
            } else {
                console.error(`❌ ${p.name} failed:`, error);
            }
        }
    }
}

checkPayments().catch(console.error);
