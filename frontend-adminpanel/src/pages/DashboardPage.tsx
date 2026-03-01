import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import api from '../api/client';
import { ADMIN_ANALYTICS_EARNINGS, ADMIN_RIDES_ACTIVE, ADMIN_USERS } from '../api/endpoints';
import { formatCurrency } from '../config/regions';

const DashboardPage = () => {
    const { socket } = useSocket();
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

    // NEW: Fetch initial stats on load
    useEffect(() => {
        const timer = window.setTimeout(() => {
            void refreshStats();
        }, 0);

        return () => window.clearTimeout(timer);
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
