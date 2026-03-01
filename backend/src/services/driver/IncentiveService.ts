import { db } from '../../config/firebase';
import { IRide } from '../../models/Ride';
import { IIncentive, IWeeklyIncentive } from '../../models/Incentive';
import { RegionCode } from '../../config/region.config';
import { walletService } from '../WalletService';
import { weatherService } from '../WeatherService';
import { logger } from '../../utils/logger';

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
                deliveryBonus: 0,
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

        // Peak Hour Check
        const hour = now.getHours();
        let isPeak = false;
        if (ride.region === 'NG') {
            if ((hour >= 7 && hour < 10) || (hour >= 16 && hour < 20)) isPeak = true;
        } else if (ride.region === 'US-CHI') {
            if ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19)) isPeak = true;
        }

        if (isPeak) {
            dailyData.peakHourTrips++;
            let peakAmt: number;
            if (ride.region === 'NG') {
                // ₦300-500 range based on number of peak trips today
                // Higher bonus for sustained peak-hour driving
                if (dailyData.peakHourTrips >= 8) peakAmt = 500;
                else if (dailyData.peakHourTrips >= 5) peakAmt = 400;
                else peakAmt = 300;
            } else {
                peakAmt = 5; // $5/trip Chicago
            }
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
        if (ride.region === 'NG' && ride.bookingType === 'delivery') {
            const dTrips = dailyData.deliveriesCompleted;
            let newDeliveryBonus = 0;
            if (dTrips >= 18) {
                newDeliveryBonus = 2500;
            } else if (dTrips >= 10) {
                newDeliveryBonus = 1000;
            }

            const diff = newDeliveryBonus - (dailyData.deliveryBonus || 0);
            if (diff > 0) {
                dailyData.deliveryBonus = newDeliveryBonus;
                dailyData.totalEarned += diff;
            }
        }

        // Weather Bonus — reward drivers for operating in bad weather
        try {
            const pickupLat = ride.pickupLocation?.lat ?? ride.pickup?.coordinates?.lat;
            const pickupLng = ride.pickupLocation?.lng ?? ride.pickup?.coordinates?.lng;
            if (pickupLat && pickupLng) {
                const weather = await weatherService.getWeather(pickupLat, pickupLng);
                if (weather.surgeMultiplier > 1.0) {
                    // Bad weather detected — award bonus per trip
                    let weatherAmt = 0;
                    if (ride.region === 'NG') {
                        weatherAmt = ride.bookingType === 'delivery'
                            ? 200
                            : weather.surgeMultiplier >= 1.3 ? 500 : 250; // ₦200 delivery; ₦250-500 ride
                    } else {
                        weatherAmt = weather.surgeMultiplier >= 1.3 ? 8 : 4; // $4-8
                    }
                    dailyData.weatherBonus = (dailyData.weatherBonus || 0) + weatherAmt;
                    dailyData.totalEarned += weatherAmt;
                }
            }
        } catch (err) {
            logger.warn({ err, rideId: ride.id }, 'Weather bonus check failed, skipping');
        }

        // Weekly Bonus Logic
        const weekStart = this.getWeekStart(now);
        const weekId = `${ride.driverId}_${weekStart.toISOString().split('T')[0]}`;
        const weeklyRef = db.collection('incentives_weekly').doc(weekId);

        const weeklySnap = await weeklyRef.get();
        let weeklyData: IWeeklyIncentive;

        if (!weeklySnap.exists) {
            weeklyData = {
                driverId: ride.driverId,
                region: ride.region,
                weekStart,
                weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
                totalRides: 0,
                totalDeliveries: 0,
                weeklyBonus: 0,
                weeklyEarnings: 0,
                isPaid: false,
                createdAt: now
            };
        } else {
            weeklyData = weeklySnap.data() as IWeeklyIncentive;
        }

        if (ride.bookingType === 'delivery') weeklyData.totalDeliveries++;
        else weeklyData.totalRides++;

        // Track weekly earnings for Chicago guarantee
        const tripEarning = ride.pricing?.estimatedFare ? ride.pricing.estimatedFare * 0.75 : 0; // 75% driver share
        weeklyData.weeklyEarnings = (weeklyData.weeklyEarnings || 0) + tripEarning;

        const totalWeeklyTrips = weeklyData.totalRides + weeklyData.totalDeliveries;

        if (ride.region === 'NG') {
            // Nigeria: 40 trips -> ₦10,000 bonus
            if (totalWeeklyTrips >= 40 && weeklyData.weeklyBonus === 0) {
                weeklyData.weeklyBonus = 10000;
                dailyData.weeklyBonus += 10000;
                dailyData.totalEarned += 10000;
            }
        } else if (ride.region === 'US-CHI') {
            // Chicago: 20+ trips -> $1,200 minimum weekly guarantee
            // If driver earned less than $1,200 this week with 20+ trips, top up the difference
            if (totalWeeklyTrips >= 20 && weeklyData.weeklyBonus === 0) {
                const weeklyGuarantee = 1200;
                const currentEarnings = weeklyData.weeklyEarnings || 0;
                if (currentEarnings < weeklyGuarantee) {
                    const topUp = Math.round((weeklyGuarantee - currentEarnings) * 100) / 100;
                    weeklyData.weeklyBonus = topUp;
                    dailyData.weeklyBonus += topUp;
                    dailyData.totalEarned += topUp;
                }
            }
        }

        await weeklyRef.set(weeklyData);

        await dailyRef.set({ ...dailyData, updatedAt: now });
    }

    async settleIncentives(driverId: string): Promise<void> {
        const snapshot = await db.collection('incentives')
            .where('driverId', '==', driverId)
            .where('isPaid', '==', false)
            .where('totalEarned', '>', 0)
            .get();

        if (snapshot.empty) return;

        // Use transaction to prevent double-payment
        await db.runTransaction(async (transaction) => {
            // Re-read all docs inside transaction to ensure they're still unpaid
            let totalAmount = 0;
            const validDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

            for (const doc of snapshot.docs) {
                const freshDoc = await transaction.get(doc.ref);
                if (!freshDoc.exists) continue;
                const data = freshDoc.data() as IIncentive;
                if (data.isPaid || data.totalEarned <= 0) continue;
                totalAmount += data.totalEarned;
                validDocs.push(freshDoc as FirebaseFirestore.QueryDocumentSnapshot);
            }

            if (totalAmount <= 0 || validDocs.length === 0) return;

            const references = validDocs.map(d => d.id);

            // Mark all as paid within transaction
            for (const doc of validDocs) {
                transaction.update(doc.ref, { isPaid: true, paidAt: new Date(), updatedAt: new Date() });
            }

            // Credit wallet within same transaction
            await walletService.processTransaction(
                driverId,
                totalAmount,
                'credit',
                'driver_payout',
                `Incentive Payout for ${references.length} days`,
                `BONUS-${Date.now()}-${driverId}`,
                { metadata: { incentiveIds: references }, transaction }
            );
        });
    }

    private getWeekStart(date: Date): Date {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }
}

export const incentiveService = new IncentiveService();
