import { nigeriaPricingStrategy } from '../../src/services/pricing/NigeriaPricingStrategy';

describe('NigeriaPricingStrategy', () => {
    it('enforces minimum fare per vehicle', async () => {
        const fare = await nigeriaPricingStrategy.calculatePrice({
            distanceKm: 1,
            durationMinutes: 2,
            vehicleCategory: 'sedan',
            bookingType: 'on_demand',
            region: 'nigeria',
            city: 'lagos'
        } as any);
        expect(fare).toBeGreaterThanOrEqual(5000);
    });
});