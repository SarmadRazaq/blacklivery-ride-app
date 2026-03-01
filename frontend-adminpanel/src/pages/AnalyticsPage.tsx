import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { toast } from 'react-toastify';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ADMIN_ANALYTICS_EARNINGS, ADMIN_ANALYTICS_TIMESERIES, ADMIN_ANALYTICS_COUNTS } from '../api/endpoints';
import { formatCurrency } from '../config/regions';
import { CHART_COLORS } from '../config/theme';
import { ANALYTICS_TIMESERIES_DAYS, CHART_X_AXIS_INTERVAL, CHART_LOCALE } from '../config/constants';

interface EarningsData {
    rideRevenue: number;
    platformCommission: number;
    net: number;
    driverPayouts: number;
    period?: string;
}

interface TimeSeriesPoint {
    date: string;
    revenue: number;
    rides: number;
    payouts: number;
}

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'all';

const AnalyticsPage = () => {
    const [earnings, setEarnings] = useState<EarningsData | null>(null);
    const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
    const [period, setPeriod] = useState<AnalyticsPeriod>('month');
    const [rideStats, setRideStats] = useState({ total: 0, completed: 0, cancelled: 0, active: 0 });
    const [userStats, setUserStats] = useState({ totalRiders: 0, totalDrivers: 0, activeDrivers: 0 });
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const [earningsRes, timeSeriesRes, countsRes] = await Promise.all([
                api.get(`${ADMIN_ANALYTICS_EARNINGS}?period=${period}`),
                api.get(`${ADMIN_ANALYTICS_TIMESERIES}?days=${ANALYTICS_TIMESERIES_DAYS}`),
                api.get(ADMIN_ANALYTICS_COUNTS),
            ]);

            setEarnings(earningsRes.data);
            setTimeSeries(timeSeriesRes.data?.data || []);

            const counts = countsRes.data;
            setRideStats({
                total: counts.rides?.total || 0,
                completed: counts.rides?.completed || 0,
                cancelled: counts.rides?.cancelled || 0,
                active: counts.rides?.active || 0,
            });

            setUserStats({
                totalRiders: counts.users?.riders || 0,
                totalDrivers: counts.users?.drivers || 0,
                activeDrivers: counts.users?.activeDrivers || 0,
            });
        } catch (error) {
            console.error('Failed to fetch analytics', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <div className="p-8 text-center text-gray-500">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <select
                    className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)}
                >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            {/* Revenue Cards */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Revenue</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Gross Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(earnings?.rideRevenue || 0)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Commission</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(earnings?.platformCommission || 0)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Net Revenue</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(earnings?.net || 0)}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Driver Payouts</p>
                        <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(earnings?.driverPayouts || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Revenue Chart */}
            {timeSeries.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-base font-semibold text-gray-800 mb-4">Daily Revenue (Last 30 Days)</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={timeSeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID_STROKE} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(v) => new Date(v).toLocaleDateString(CHART_LOCALE, { month: 'short', day: 'numeric' })}
                                    tick={{ fontSize: 11, fill: CHART_COLORS.AXIS_TICK }}
                                    interval={CHART_X_AXIS_INTERVAL}
                                />
                                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.AXIS_TICK }} />
                                <Tooltip
                                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString(CHART_LOCALE, { weekday: 'short', month: 'short', day: 'numeric' })}
                                />
                                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.REVENUE_LINE} strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-base font-semibold text-gray-800 mb-4">Daily Rides (Last 30 Days)</h3>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={timeSeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.GRID_STROKE} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(v) => new Date(v).toLocaleDateString(CHART_LOCALE, { month: 'short', day: 'numeric' })}
                                    tick={{ fontSize: 11, fill: CHART_COLORS.AXIS_TICK }}
                                    interval={CHART_X_AXIS_INTERVAL}
                                />
                                <YAxis tick={{ fontSize: 11, fill: CHART_COLORS.AXIS_TICK }} allowDecimals={false} />
                                <Tooltip
                                    formatter={(value: number) => [value, 'Rides']}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString(CHART_LOCALE, { weekday: 'short', month: 'short', day: 'numeric' })}
                                />
                                <Bar dataKey="rides" fill={CHART_COLORS.RIDES_BAR} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Ride Stats */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Rides</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Total Rides</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{rideStats.total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{rideStats.completed.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Cancelled</p>
                        <p className="text-2xl font-bold text-red-600 mt-1">{rideStats.cancelled.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Active Now</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{rideStats.active}</p>
                    </div>
                </div>
            </div>

            {/* User Stats */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Users</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Total Riders</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.totalRiders.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Total Drivers</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{userStats.totalDrivers.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                        <p className="text-sm text-gray-500">Active Drivers</p>
                        <p className="text-2xl font-bold text-green-600 mt-1">{userStats.activeDrivers}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
