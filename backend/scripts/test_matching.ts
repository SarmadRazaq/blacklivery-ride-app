import { rideService } from '../src/services/RideService';
import { db } from '../src/config/firebase';
import * as fs from 'fs';

async function testMatching() {
    let output = 'Testing findNearbyDrivers...\n';

    // Parameters from the failed ride request
    const lat = 6.5244;
    const lng = 3.3792;
    const radiusKm = 5;
    const filters = {
        vehicleCategory: 'sedan',
        region: 'nigeria' as any
    };

    try {
        output += `Searching at ${lat}, ${lng} radius ${radiusKm}km\n`;
        output += `Filters: ${JSON.stringify(filters, null, 2)}\n`;

        const drivers = await rideService.findNearbyDrivers(lat, lng, radiusKm, filters);

        output += `Found ${drivers.length} drivers.\n`;
        drivers.forEach(d => {
            output += `- Driver ${d.id}: ${d.distanceKm.toFixed(2)}km away, Vehicle: ${d.profile.vehicleType}\n`;
        });

        if (drivers.length === 0) {
            output += 'No drivers found. Investigating potential candidates...\n';
            // Manually query to see what's in DB
            const snapshot = await db.collection('users')
                .where('role', '==', 'driver')
                .where('driverStatus.isOnline', '==', true)
                .get();

            output += `Total online drivers in DB: ${snapshot.size}\n`;
            snapshot.forEach(doc => {
                const data = doc.data();
                output += `Driver ${doc.id}:\n`;
                output += `  Region (countryCode): ${data.countryCode}\n`;
                output += `  Vehicle (Profile): ${data.driverProfile?.vehicleType}\n`;
                output += `  Vehicle (Onboarding): ${data.driverOnboarding?.vehicleType}\n`;
                output += `  Location: ${JSON.stringify(data.driverStatus?.lastKnownLocation)}\n`;
                output += `  Geohash5: ${data.driverStatus?.geohash5}\n`;
            });
        }

    } catch (error) {
        output += `Error running matching test: ${error}\n`;
    }

    fs.writeFileSync('matching_debug.log', output);
    console.log('Output written to matching_debug.log');
}

testMatching().catch(console.error);
