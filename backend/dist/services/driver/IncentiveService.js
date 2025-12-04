"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incentiveService = exports.IncentiveService = void 0;
const firebase_1 = require("../../config/firebase");
const WalletService_1 = require("../WalletService");
class IncentiveService {
    processTripCompletion(ride) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ride.driverId)
                return;
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dateStr = todayStart.toISOString().split('T')[0];
            // 1. Get or Create Daily Incentive Record
            const dailyRef = firebase_1.db.collection('incentives').doc(`${ride.driverId}_${dateStr}`);
            const dailyDoc = yield dailyRef.get();
            let dailyData;
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
            }
            else {
                dailyData = dailyDoc.data();
            }
            // 2. Update Counts
            if (ride.bookingType === 'delivery') {
                dailyData.deliveriesCompleted++;
            }
            else {
                dailyData.ridesCompleted++;
            }
            // Peak Hour Check (Simple hour check for now)
            // Nigeria: 7-9am, 4-8pm
            // Chicago: 6-9am, 4-7pm
            const hour = now.getHours();
            let isPeak = false;
            if (ride.region === 'NG') {
                if ((hour >= 7 && hour < 9) || (hour >= 16 && hour < 20))
                    isPeak = true;
            }
            else if (ride.region === 'US-CHI') {
                if ((hour >= 6 && hour < 9) || (hour >= 16 && hour < 19))
                    isPeak = true;
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
                }
                else if (totalTrips >= 6) {
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
            yield dailyRef.set(Object.assign(Object.assign({}, dailyData), { updatedAt: now }));
        });
    }
    settleIncentives(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield firebase_1.db.collection('incentives')
                .where('driverId', '==', driverId)
                .where('isPaid', '==', false)
                .where('totalEarned', '>', 0)
                .get();
            if (snapshot.empty)
                return;
            const batch = firebase_1.db.batch();
            let totalAmount = 0;
            const references = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                totalAmount += data.totalEarned;
                references.push(doc.id);
                batch.update(doc.ref, { isPaid: true, paidAt: new Date(), updatedAt: new Date() });
            });
            if (totalAmount > 0) {
                yield WalletService_1.walletService.processTransaction(driverId, totalAmount, 'credit', 'driver_payout', `Incentive Payout for ${references.length} days`, `BONUS-${Date.now()}-${driverId}`, { metadata: { incentiveIds: references } });
            }
            yield batch.commit();
        });
    }
}
exports.IncentiveService = IncentiveService;
exports.incentiveService = new IncentiveService();
//# sourceMappingURL=IncentiveService.js.map