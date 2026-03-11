import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import api from '../api/client';
import { ADMIN_ANALYTICS_EARNINGS, ADMIN_RIDES_ACTIVE, ADMIN_USERS } from '../api/endpoints';
import { formatCurrency } from '../config/regions';
import { AlertTriangle, X, MapPin } from 'lucide-react';

const DashboardPage = () => {
    const { socket, sosAlerts, dismissSosAlert } = useSocket();
    const [stats, setStats] = useState({
        revenue: 0,
        activeDrivers: 0,
        activeRides: 0
    });

    const getArrayLength = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

    const refreshStats = useCallback(async () => {
        try {
            const [earningsRes, ridesRes, usersRes] = await Promise.all([
                api.get(ADMIN_ANALYTICS_EARNINGS),
                api.get(ADMIN_RIDES_ACTIVE),
                api.get(`${ADMIN_USERS}?role=driver&status=active`)
            ]);

            setStats({
                revenue: typeof earningsRes.data?.rideRevenue === 'number' ? earningsRes.data.rideRevenue : 0,
                activeRides: getArrayLength(ridesRes.data),
                activeDrivers: getArrayLength(usersRes.data)
            });
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }, []);

    // Fetch initial stats on load + poll every 30s as socket fallback
    useEffect(() => {
        void refreshStats();
        const interval = window.setInterval(() => { void refreshStats(); }, 30_000);
        return () => window.clearInterval(interval);
    }, [refreshStats]);

    useEffect(() => {
        if (!socket) return;

        const handleRideCreated = () => {
            refreshStats();
        };

        const handleRideUpdated = (ride: { status?: string }) => {
            if (!ride?.status) return;
            if (['completed', 'cancelled', 'in_progress', 'accepted', 'arrived', 'finding_driver'].includes(ride.status)) {
                refreshStats();
            }
        };

        socket.on('ride:created', handleRideCreated);
        socket.on('ride:updated', handleRideUpdated);

        return () => {
            socket.off('ride:created', handleRideCreated);
            socket.off('ride:updated', handleRideUpdated);
        };
    }, [socket, refreshStats]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* SOS Alert Banner */}
            {sosAlerts.length > 0 && (
                <div className="mb-6 space-y-3">
                    {sosAlerts.map(alert => (
                        <div key={alert.id} className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex items-start gap-4 animate-pulse">
                            <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-red-800 font-bold text-lg">SOS Emergency Alert</h3>
                                <p className="text-red-700 text-sm mt-1">
                                    <span className="font-semibold">{alert.userName || alert.userId}</span>
                                    {alert.role && <span className="capitalize"> ({alert.role})</span>}
                                    {alert.rideId && <span> &mdash; Ride: <span className="font-mono">{alert.rideId.substring(0, 8)}...</span></span>}
                                </p>
                                {alert.message && <p className="text-red-600 text-sm mt-1">{alert.message}</p>}
                                {alert.location && (
                                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                                        <MapPin size={14} />
                                        {alert.location.lat.toFixed(6)}, {alert.location.lng.toFixed(6)}
                                    </p>
                                )}
                                <p className="text-red-400 text-xs mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => dismissSosAlert(alert.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                                title="Dismiss alert"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats.revenue)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Active Drivers</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeDrivers}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Active Rides</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeRides}</p>
                    <span className="text-gray-500 text-sm font-medium mt-2 inline-block">Currently ongoing</span>
                </div>
            </div>

            {/* Live Map Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Live Fleet Tracking</h2>
                <LiveMap />
            </div>
        </div>
    );
};

export default DashboardPage;
