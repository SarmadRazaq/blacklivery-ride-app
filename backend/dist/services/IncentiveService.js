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
const firebase_1 = require("../config/firebase");
const WalletService_1 = require("./WalletService");
const WeatherService_1 = require("./WeatherService");
class IncentiveService {
    /**
     * Check and award daily incentives after a ride/delivery completion
     */
    checkAndAwardIncentives(driverId, region, rideType, pickupLat, pickupLng) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dateStr = today.toISOString().split('T')[0];
            const incentiveId = `${driverId}_${dateStr}`;
            const incentiveRef = firebase_1.db.collection('incentives').doc(incentiveId);
            const doc = yield incentiveRef.get();
            let incentive;
            if (!doc.exists) {
                incentive = {
                    driverId,
                    region,
                    date: today,
                    ridesCompleted: 0,
                    deliveriesCompleted: 0,
                    peakHourTrips: 0,
                    airportTrips: 0,
                    totalEarned: 0,
                    dailyBonus: 0,
                    weeklyBonus: 0,
                    peakHourBonus: 0,
                    weatherBonus: 0,
                    airportBonus: 0,
                    weatherBonusTrips: 0,
                    isPaid: false,
                    createdAt: new Date()
                };
            }
            else {
                incentive = doc.data();
            }
            // Update counts
            if (rideType === 'ride') {
                incentive.ridesCompleted += 1;
            }
            else {
                incentive.deliveriesCompleted += 1;
            }
            // Calculate bonuses
            const isPeakHour = this.isPeakHour();
            let bonusAwarded = 0;
            if (region === 'nigeria') {
                bonusAwarded = yield this.calculateNigeriaBonuses(incentive, rideType, isPeakHour, pickupLat, pickupLng);
            }
            else {
                // Placeholder for Chicago logic if needed, currently just basic
                bonusAwarded = this.calculateChicagoBonuses(incentive, isPeakHour, false);
            }
            // Save incentive record
            yield incentiveRef.set(incentive);
            // Credit wallet if bonus awarded
            if (bonusAwarded > 0) {
                yield WalletService_1.walletService.processTransaction(driverId, bonusAwarded, 'credit', 'driver_payout', // Using driver_payout as category for bonuses for now
                `Incentive bonus for ${rideType}`, `BONUS-${incentiveId}-${Date.now()}`);
            }
            return bonusAwarded;
        });
    }
    calculateNigeriaBonuses(incentive, rideType, isPeakHour, lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            let bonusAwarded = 0;
            // Daily Ride Bonuses
            if (rideType === 'ride') {
                if (incentive.ridesCompleted === 6) {
                    bonusAwarded += 3000;
                    incentive.dailyBonus += 3000;
                }
                else if (incentive.ridesCompleted === 10) {
                    bonusAwarded += 4000; // 7000 total - 3000 already given
                    incentive.dailyBonus += 4000;
                }
            }
            // Daily Delivery Bonuses
            if (rideType === 'delivery') {
                if (incentive.deliveriesCompleted === 10) {
                    bonusAwarded += 1000;
                    incentive.dailyBonus += 1000;
                }
                else if (incentive.deliveriesCompleted === 18) {
                    bonusAwarded += 1500; // 2500 total - 1000 already given
                    incentive.dailyBonus += 1500;
                }
            }
            // Peak Hour Boost (300-500 per trip)
            if (isPeakHour) {
                const peakBonus = 400; // Average
                bonusAwarded += peakBonus;
                incentive.peakHourBonus += peakBonus;
                incentive.peakHourTrips = (incentive.peakHourTrips || 0) + 1;
            }
            // Weather Bonus
            if (lat && lng) {
                const weatherInfo = yield WeatherService_1.weatherService.getWeather(lat, lng);
                if (weatherInfo.isExtreme) {
                    const weatherBonus = 200; // ₦200 extra for extreme weather
                    bonusAwarded += weatherBonus;
                    incentive.weatherBonus += weatherBonus;
                    incentive.weatherBonusTrips = (incentive.weatherBonusTrips || 0) + 1;
                }
            }
            incentive.totalEarned += bonusAwarded;
            return bonusAwarded;
        });
    }
    calculateChicagoBonuses(incentive, isPeakHour, isAirport) {
        let bonusAwarded = 0;
        // Peak Hour Boost
        if (isPeakHour) {
            bonusAwarded += 5;
            incentive.peakHourBonus += 5;
        }
        // Airport Bonus
        if (isAirport) {
            const airportBonus = 10;
            bonusAwarded += airportBonus;
            incentive.airportBonus += airportBonus;
        }
        incentive.totalEarned += bonusAwarded;
        return bonusAwarded;
    }
    // Check weekly incentives (run via cron job)
    checkWeeklyIncentives(driverId, region) {
        return __awaiter(this, void 0, void 0, function* () {
            const weekStart = this.getWeekStart();
            const weekEnd = this.getWeekEnd();
            // Get all incentives for this week to count rides
            const snapshot = yield firebase_1.db.collection('incentives')
                .where('driverId', '==', driverId)
                .where('date', '>=', weekStart)
                .where('date', '<=', weekEnd)
                .get();
            let totalRides = 0;
            let totalDeliveries = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                totalRides += data.ridesCompleted;
                totalDeliveries += data.deliveriesCompleted;
            });
            let weeklyBonus = 0;
            if (region === 'nigeria') {
                // 40 rides → +₦10,000
                if (totalRides >= 40)
                    weeklyBonus += 10000;
                // 60 deliveries → +₦5,000
                if (totalDeliveries >= 60)
                    weeklyBonus += 5000;
                // 100 deliveries → +₦12,000 (instead of 5000)
                if (totalDeliveries >= 100)
                    weeklyBonus = weeklyBonus - 5000 + 12000;
            }
            else {
                // Chicago: 20+ trips → $1,200 minimum guarantee
                if (totalRides >= 20) {
                    const currentEarnings = yield this.getWeeklyEarnings(driverId, weekStart, weekEnd);
                    const guaranteedAmount = 1200;
                    if (currentEarnings < guaranteedAmount) {
                        weeklyBonus += (guaranteedAmount - currentEarnings);
                    }
                }
            }
            if (weeklyBonus > 0) {
                const weeklyIncentive = {
                    driverId,
                    region,
                    weekStart,
                    weekEnd,
                    totalRides,
                    totalDeliveries,
                    weeklyBonus,
                    isPaid: false,
                    createdAt: new Date()
                };
                yield firebase_1.db.collection('weekly_incentives').add(weeklyIncentive);
                // Credit wallet
                yield WalletService_1.walletService.processTransaction(driverId, weeklyBonus, 'credit', 'driver_payout', `Weekly incentive bonus`, `WEEKLY-${driverId}-${Date.now()}`);
            }
        });
    }
    getWeeklyEarnings(driverId, start, end) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshot = yield firebase_1.db.collection('transactions')
                .where('userId', '==', driverId)
                .where('type', '==', 'credit')
                .where('category', '==', 'driver_payout')
                .where('createdAt', '>=', start)
                .where('createdAt', '<=', end)
                .get();
            let total = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                total += (data.amount || 0);
            });
            return total;
        });
    }
    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    }
    getWeekEnd() {
        const weekStart = this.getWeekStart();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
    }
    // Check if current time is peak hour
    isPeakHour() {
        const hour = new Date().getHours();
        const day = new Date().getDay();
        const isWeekday = day >= 1 && day <= 5;
        if (!isWeekday)
            return false;
        // Morning: 6-9am, Evening: 4-7pm
        return (hour >= 6 && hour < 9) || (hour >= 16 && hour < 19);
    }
}
exports.IncentiveService = IncentiveService;
exports.incentiveService = new IncentiveService();
//# sourceMappingURL=IncentiveService.js.map