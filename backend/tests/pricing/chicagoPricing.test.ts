import { ChicagoPricingStrategy } from '../../src/services/pricing/ChicagoPricingStrategy';
import { PricingRequest } from '../../src/services/pricing/PricingStrategy';

describe('ChicagoPricingStrategy', () => {
    const strategy = new ChicagoPricingStrategy();

    const baseRequest: Partial<PricingRequest> = {
        distanceKm: 16.09, // ~10 miles
        durationMinutes: 25,
        vehicleCategory: 'business_sedan',
        surgeMultiplier: 1.0
    };

    // ── Airport pricing ───────────────────────────────────────────────────

    describe('Airport pricing', () => {
        it('returns ORD flat rate for business_sedan', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                isAirport: true,
                airportCode: 'ORD',
                vehicleCategory: 'business_sedan'
            } as PricingRequest);

            expect(price).toBe(95);
        });

        it('returns ORD flat rate for business_suv', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                isAirport: true,
                airportCode: 'ORD',
                vehicleCategory: 'business_suv'
            } as PricingRequest);

            expect(price).toBe(125);
        });

        it('returns ORD flat rate for first_class', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                isAirport: true,
                airportCode: 'ORD',
                vehicleCategory: 'first_class'
            } as PricingRequest);

            expect(price).toBe(150);
        });

        it('returns MDW flat rate for business_sedan', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                isAirport: true,
                airportCode: 'MDW',
                vehicleCategory: 'business_sedan'
            } as PricingRequest);

            expect(price).toBe(85);
        });

        it('adds add-ons to airport rate', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                isAirport: true,
                airportCode: 'ORD',
                vehicleCategory: 'business_sedan',
                addOns: { childSeat: 1, meetAndGreet: true }
            } as PricingRequest);

            // 95 base + 10 childSeat + 10 meetAndGreet = 115
            expect(price).toBe(115);
        });
    });

    // ── Hourly pricing ────────────────────────────────────────────────────

    describe('Hourly pricing', () => {
        it('calculates hourly rate for business_sedan (min 2h)', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                bookingType: 'hourly',
                hoursBooked: 3,
                vehicleCategory: 'business_sedan'
            } as PricingRequest);

            // 3 hours * $80/hr = $240
            expect(price).toBe(240);
        });

        it('enforces minimum hours (2h)', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                bookingType: 'hourly',
                hoursBooked: 1,
                vehicleCategory: 'business_sedan'
            } as PricingRequest);

            // min(1, 2) = 2 hours * $80/hr = $160
            expect(price).toBe(160);
        });

        it('calculates hourly rate for first_class', async () => {
            const price = await strategy.calculatePrice({
                ...baseRequest,
                bookingType: 'hourly',
                hoursBooked: 4,
                vehicleCategory: 'first_class'
            } as PricingRequest);

            // 4 hours * $140/hr = $560
            expect(price).toBe(560);
        });
    });

    // ── Standard pricing ──────────────────────────────────────────────────

    describe('Standard pricing', () => {
        it('calculates fare with base + distance + time', async () => {
            const price = await strategy.calculatePrice({
                distanceKm: 16.09, // ~10 miles
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 1.0
            } as PricingRequest);

            // baseFare(35) + 10miles * 3.0 + 25min * 0.5 = 35 + 30 + 12.5 = 77.5
            // Should be at least minimumFare (55)
            expect(price).toBeGreaterThanOrEqual(55);
            expect(price).toBeCloseTo(77.5, 0);
        });

        it('enforces minimum fare', async () => {
            const price = await strategy.calculatePrice({
                distanceKm: 1.6, // ~1 mile
                durationMinutes: 3,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 1.0
            } as PricingRequest);

            // baseFare(35) + 1mile * 3.0 + 3min * 0.5 = 35 + 3 + 1.5 = 39.5 < 55 min
            expect(price).toBe(55);
        });

        it('applies surge multiplier', async () => {
            const normalPrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 1.0
            } as PricingRequest);

            const surgePrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 2.0
            } as PricingRequest);

            expect(surgePrice).toBeGreaterThan(normalPrice);
        });

        it('adds addOns (childSeat, extraStops, meetAndGreet, afterHours)', async () => {
            const basePrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 1.0
            } as PricingRequest);

            const priceWithAddOns = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                surgeMultiplier: 1.0,
                addOns: {
                    childSeat: 2,    // 2 * $10 = $20
                    extraStops: 1,   // 1 * $15 = $15
                    meetAndGreet: true, // $10
                    afterHours: true    // $10
                }
            } as PricingRequest);

            // Total add-ons = $55
            expect(priceWithAddOns - basePrice).toBeCloseTo(55, 0);
        });
    });

    // ── Delivery pricing ──────────────────────────────────────────────────

    describe('Delivery pricing', () => {
        it('calculates delivery fare', async () => {
            const price = await strategy.calculatePrice({
                distanceKm: 8.04, // ~5 miles
                durationMinutes: 15,
                vehicleCategory: 'business_sedan',
                bookingType: 'delivery',
                surgeMultiplier: 1.0
            } as PricingRequest);

            // baseFare(40) + 5mi * 2.2 + 15min * 0.45 = 40 + 11 + 6.75 = 57.75
            expect(price).toBeGreaterThanOrEqual(57);
        });

        it('applies instant delivery surcharge (15%)', async () => {
            const normalPrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                bookingType: 'delivery',
                surgeMultiplier: 1.0
            } as PricingRequest);

            const instantPrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                bookingType: 'delivery',
                surgeMultiplier: 1.0,
                deliveryDetails: { serviceType: 'instant' }
            } as PricingRequest);

            expect(instantPrice).toBeGreaterThan(normalPrice);
        });

        it('applies scheduled delivery discount (10%)', async () => {
            const normalPrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                bookingType: 'delivery',
                surgeMultiplier: 1.0
            } as PricingRequest);

            const scheduledPrice = await strategy.calculatePrice({
                distanceKm: 16.09,
                durationMinutes: 25,
                vehicleCategory: 'business_sedan',
                bookingType: 'delivery',
                surgeMultiplier: 1.0,
                deliveryDetails: { serviceType: 'scheduled' }
            } as PricingRequest);

            expect(scheduledPrice).toBeLessThan(normalPrice);
        });
    });

    // ── Cancellation fees ─────────────────────────────────────────────────

    describe('Cancellation fees', () => {
        it('returns $25 default cancellation fee', () => {
            const fee = strategy.calculateCancellationFee({
                vehicleCategory: 'business_sedan',
                isAirport: false
            } as any);
            expect(fee).toBe(25);
        });

        it('returns hourly rate for hourly booking cancellation', () => {
            const fee = strategy.calculateCancellationFee({
                vehicleCategory: 'business_sedan',
                bookingType: 'hourly',
                hoursBooked: 3
            } as any);
            expect(fee).toBe(80); // hourly rate for business_sedan
        });

        it('returns 50% of airport fare (min $25)', () => {
            const fee = strategy.calculateCancellationFee({
                vehicleCategory: 'business_sedan',
                isAirport: true,
                fareEstimate: 95
            } as any);
            expect(fee).toBe(47.5); // max(25, 95 * 0.5) = 47.5
        });
    });

    // ── Wait time fees ────────────────────────────────────────────────────

    describe('Wait time fees', () => {
        it('returns 0 for no wait time', () => {
            const fee = strategy.calculateWaitTimeFee({ waitMinutes: 0, isAirport: false } as any);
            expect(fee).toBe(0);
        });

        it('gives 5 free minutes for standard rides', () => {
            const fee = strategy.calculateWaitTimeFee({ waitMinutes: 5, isAirport: false } as any);
            expect(fee).toBe(0);
        });

        it('charges $1/min after 5 free minutes', () => {
            const fee = strategy.calculateWaitTimeFee({ waitMinutes: 10, isAirport: false } as any);
            expect(fee).toBe(5);
        });

        it('gives 60 free minutes for airport pickups', () => {
            const fee = strategy.calculateWaitTimeFee({ waitMinutes: 60, isAirport: true } as any);
            expect(fee).toBe(0);
        });

        it('charges $1/min after 60 free minutes at airport', () => {
            const fee = strategy.calculateWaitTimeFee({ waitMinutes: 75, isAirport: true } as any);
            expect(fee).toBe(15);
        });
    });
});
