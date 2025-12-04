import { db } from '../../config/firebase';
import { IRide } from '../../models/Ride';
import { IIncentive, IWeeklyIncentive } from '../../models/Incentive';
import { RegionCode } from '../../config/region.config';
import { walletService } from '../WalletService';

export class IncentiveService {
    
    async processTripCompletion(ride: IRide): Promise<void> {
        if (!ride.driverId) return;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateStr = todayStart.toISOString().split('T')[0];
        
        // 1. Get or Create Daily Incentive Record
        const dailyRef = db.collection('incentives').doc(`${ride.driverId}_${dateStr}`);
        const dailyDoc = await dailyRef.get();
        
        let dailyData: IIncentive;
        
        if (!dailyDoc.exists) {
            dailyData = {
                driverId: ride.driverId,
                region: ride.region,
                date: todayStart,
                ridesCompleted: 0,
                deliveriesCompleted: 0,
                peakHourTrips: 0,
                airportTrips: 0,
                dailyBonus: 0,
                weeklyBonus: 0,
                peakHourBonus: 0,
                airportBonus: 0,
                weatherBonus: 0,
                totalEarned: 0,
                isPaid: false,
                createdAt: now
            };
        } else {
            dailyData = dailyDoc.data() as IIncentive;
        }

        // 2. Update Counts
        if (ride.bookingType === 'delivery') {
            dailyData.deliveriesCompleted++;
        } else {
            dailyData.ridesCompleted++;
        }

        // Peak Hour Check (Simple hour check for now)
        // Nigeria: 7-9am, 4-8pm
        // Chicago: 6-9am, 4-7pm
        const hour = now.getHours();
        let isPeak = false;
        if (ride.region === 'NG') {
            if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 20)) isPeak = true;
        } else if (ride.region === 'US-CHI') {
            if ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19)) isPeak = true;
        }

        if (isPeak) {
            dailyData.peakHourTrips++;
            // Add immediate peak bonus? Or sum later?
            // Nigeria: +300-500 per trip
            // Chicago: +5 per trip
            const peakAmt = ride.region === 'NG' ? 300 : 5;
            dailyData.peakHourBonus += peakAmt;
            dailyData.totalEarned += peakAmt;
        }

        // Airport Check (Chicago)
        if (ride.isAirport && ride.region === 'US-CHI') {
            dailyData.airportTrips++;
            const airportAmt = ride.airportCode === 'ORD' ? 10 : 8;
            dailyData.airportBonus += airportAmt;
            dailyData.totalEarned += airportAmt;
        }

        // 3. Check Daily Threshold Bonuses (Nigeria)
        if (ride.region === 'NG') {
            const totalTrips = dailyData.ridesCompleted + dailyData.deliveriesCompleted;
            // Rules: 6 trips -> 3000, 10 trips -> 7000 (Total, not cumulative usually)
            // Logic: If hit 6, bonus is 3000. If hit 10, bonus becomes 7000 (add 4000 more).
            
            let newDailyBonus = 0;
            if (totalTrips >= 10) {
                newDailyBonus = 7000;
            } else if (totalTrips >= 6) {
                newDailyBonus = 3000;
            }

            const diff = newDailyBonus - dailyData.dailyBonus;
            if (diff > 0) {
                dailyData.dailyBonus = newDailyBonus;
                dailyData.totalEarned += diff;
            }
        }

        // Delivery Bonus (Nigeria)
        // 10 trips -> 1000, 18 -> 2500
        if (ride.region === 'NG' && ride.bookingType === 'delivery') {
             const dTrips = dailyData.deliveriesCompleted;
             // Note: This might overlap with general trips if not carefully separated.
             // Assuming separate bonus structure as per doc.
             // Implementation logic similar to above...
        }

        await dailyRef.set({ ...dailyData, updatedAt: now });
    }

    async settleIncentives(driverId: string): Promise<void> {
        const snapshot = await db.collection('incentives')
            .where('driverId', '==', driverId)
            .where('isPaid', '==', false)
            .where('totalEarned', '>', 0)
            .get();

        if (snapshot.empty) return;

        const batch = db.batch();
        let totalAmount = 0;
        const references: string[] = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data() as IIncentive;
            totalAmount += data.totalEarned;
            references.push(doc.id);
            batch.update(doc.ref, { isPaid: true, paidAt: new Date(), updatedAt: new Date() });
        });

        if (totalAmount > 0) {
            await walletService.processTransaction(
                driverId,
                totalAmount,
                'credit',
                'driver_payout',
                `Incentive Payout for ${references.length} days`,
                `BONUS-${Date.now()}-${driverId}`,
                { metadata: { incentiveIds: references } }
            );
        }

        await batch.commit();
    }
}

export const incentiveService = new IncentiveService();

