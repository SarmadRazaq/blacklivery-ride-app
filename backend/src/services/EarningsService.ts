import { db } from '../config/firebase';
import { IRide as Ride } from '../models/Ride';

interface EarningsConfig {
    earningGoalNGN: number;
    earningGoalUSD: number;
    inAppRatio: number;
}

let _earningsConfigCache: { data: EarningsConfig; expiresAt: number } | null = null;

const getEarningsConfig = async (): Promise<EarningsConfig> => {
    if (_earningsConfigCache && _earningsConfigCache.expiresAt > Date.now()) {
        return _earningsConfigCache.data;
    }
    const snap = await db.collection('config').doc('earnings').get();
    const data: EarningsConfig = { earningGoalNGN: 15000, earningGoalUSD: 200, inAppRatio: 0.8, ...(snap.data() ?? {}) };
    _earningsConfigCache = { data, expiresAt: Date.now() + 5 * 60 * 1000 };
    return data;
};

export class EarningsService {
    async getDriverDashboard(driverId: string) {
        const now = new Date();

        // Time ranges
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Mon start
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const config = await getEarningsConfig();

        // Fetch driver-specific earnings goal (falls back to global config)
        const driverDoc = await db.collection('users').doc(driverId).get();
        const driverData = driverDoc.data();
        const driverGoal = driverData?.earningsGoal ?? (driverData?.region === 'US' ? config.earningGoalUSD : config.earningGoalNGN);

        // Fetch completed rides in range (Max 365 days)
        // Optimization: In real app, aggregate this in a separate collection.
        // For now, query all rides this year.
        const ridesSnap = await db.collection('rides')
            .where('driverId', '==', driverId)
            .where('status', 'in', ['completed', 'delivery_delivered'])
            .where('completedAt', '>=', startOfYear)
            .get();

        const rides = ridesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride));

        // Calculate Stats
        const todayStats = this.calculateStats(rides, startOfDay, new Date(startOfDay.getTime() + 86400000));
        const weekStats = this.calculateStats(rides, startOfWeek, now);
        const monthStats = this.calculateStats(rides, startOfMonth, now); // Actual "This Month" stats
        const yearStats = this.calculateStats(rides, startOfYear, now);

        // Breakdowns
        const weeklyBreakdown = this.generateDailyBreakdown(rides, startOfWeek, 7);
        // "This Month" chart in UI design shows Jan-Dec, implying Yearly stats.
        // We will return Yearly breakdown for the "month" chart data.
        const monthlyBreakdown = this.generateMonthlyBreakdown(rides, startOfYear);

        // Fetch all payouts this year to correctly compute total paid out
        const allPayoutsSnap = await db.collection('payouts')
            .where('driverId', '==', driverId)
            .where('status', '==', 'completed')
            .where('createdAt', '>=', startOfYear)
            .orderBy('createdAt', 'desc')
            .get();

        const allPayouts = allPayoutsSnap.docs.map(d => d.data());
        const lastPayout = allPayouts.length > 0 ? allPayouts[0] : null;
        const totalPaidOut = allPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Calculate Next Payout (Assuming weekly on Wednesday)
        const nextPayoutDate = new Date();
        nextPayoutDate.setDate(now.getDate() + (3 + 7 - now.getDay()) % 7); // Wednesday
        if (nextPayoutDate <= now) nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);

        const inAppEarnings = yearStats.amount * config.inAppRatio;
        const pendingPayoutAmount = Math.max(0, inAppEarnings - totalPaidOut);

        return {
            today: {
                ...todayStats,
                onlineTime: 0,
                goal: driverGoal
            },
            week: {
                ...weekStats,
                dailyBreakdown: weeklyBreakdown
            },
            month: {
                amount: yearStats.amount,
                trips: yearStats.trips,
                tips: yearStats.tips,
                monthlyBreakdown: monthlyBreakdown
            },
            payouts: {
                inApp: inAppEarnings,
                cash: yearStats.amount * (1 - config.inAppRatio),
                lastPayout: lastPayout ? {
                    amount: lastPayout.amount,
                    date: lastPayout.createdAt
                } : null,
                nextPayout: {
                    amount: pendingPayoutAmount,
                    date: nextPayoutDate
                }
            }
        };
    }

    async updateEarningsGoal(driverId: string, goal: number): Promise<void> {
        await db.collection('users').doc(driverId).update({ earningsGoal: goal });
    }

    async getPayoutHistory(driverId: string) {
        const payoutsSnap = await db.collection('payout_requests')
            .where('userId', '==', driverId)
            .orderBy('createdAt', 'desc')
            .get();

        return payoutsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        }));
    }

    private calculateStats(rides: Ride[], start: Date, end: Date) {
        const rangeRides = rides.filter(r => {
            if (!r.completedAt) return false;
            // Handle both Firestore Timestamp objects and JS Date/string
            const raw = r.completedAt as any;
            const date = raw?.toDate ? raw.toDate() : new Date(raw);
            return date && !isNaN(date.getTime()) && date >= start && date < end;
        });

        const amount = rangeRides.reduce((sum, r) => sum + (r.payment?.settlement?.driverAmount || 0), 0);
        const tips = rangeRides.reduce((sum, r) => sum + ((r as any).tip || 0), 0);

        return {
            amount,
            tips,
            trips: rangeRides.length
        };
    }

    private generateDailyBreakdown(rides: Ride[], start: Date, days: number) {
        const breakdown = [];
        for (let i = 0; i < days; i++) {
            const dayStart = new Date(start);
            dayStart.setDate(start.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);

            const dayLabel = dayStart.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNumber = dayStart.getDate();

            const stats = this.calculateStats(rides, dayStart, dayEnd);
            breakdown.push({
                day: dayLabel,
                date: dayNumber,
                amount: stats.amount
            });
        }
        return breakdown;
    }

    private generateMonthlyBreakdown(rides: Ride[], startOfYear: Date) {
        const breakdown = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < 12; i++) {
            const monthStart = new Date(startOfYear.getFullYear(), i, 1);
            const monthEnd = new Date(startOfYear.getFullYear(), i + 1, 1);

            const stats = this.calculateStats(rides, monthStart, monthEnd);
            breakdown.push({
                day: months[i],
                date: i + 1,
                amount: stats.amount
            });
        }
        return breakdown;
    }
}

export const earningsService = new EarningsService();
