import { db } from '../src/config/firebase';
import { encodeGeohash } from '../src/utils/geohash';
import * as fs from 'fs';

async function checkDrivers() {
    let output = 'Checking drivers...\n';
    const snapshot = await db.collection('users')
        .where('role', '==', 'driver')
        .get();

    if (snapshot.empty) {
        output += 'No drivers found in DB.\n';
    } else {
        snapshot.forEach(doc => {
            const data = doc.data();
            output += `\nDriver ID: ${doc.id}\n`;
            output += `Email: ${data.email}\n`;
            output += `Name: ${data.displayName}\n`;
            output += `Vehicle Type: ${data.driverProfile?.vehicleType || data.driverOnboarding?.vehicleType}\n`;

            const status = data.driverStatus || {};
            output += `Status: ${JSON.stringify({
                isOnline: status.isOnline,
                state: status.state,
                currentRideId: status.currentRideId,
                lastKnownLocation: status.lastKnownLocation
            }, null, 2)}\n`;

            if (status.lastKnownLocation) {
                const hash = encodeGeohash(status.lastKnownLocation.lat, status.lastKnownLocation.lng, 5);
                output += `Calculated Geohash (len 5): ${hash}\n`;
                output += `Stored Geohash4: ${status.geohash4}\n`;
                output += `Stored Geohash5: ${status.geohash5}\n`;
            }
        });
    }

    fs.writeFileSync('driver_debug.log', output);
    console.log('Debug info written to driver_debug.log');
}

checkDrivers().catch(console.error);
