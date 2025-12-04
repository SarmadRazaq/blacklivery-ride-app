import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import LiveMap from '../components/LiveMap';
import api from '../api/client';

const DashboardPage = () => {
    const { socket } = useSocket();
    const [stats, setStats] = useState({
        revenue: 0,
        activeDrivers: 0,
        activeRides: 0
    });

    // NEW: Fetch initial stats on load
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Run these in parallel
                const [earningsRes, ridesRes, usersRes] = await Promise.all([
                    api.get('/v1/admin/analytics/earnings'),
                    api.get('/v1/admin/rides/active'),
                    api.get('/v1/admin/users?role=driver&status=active')
                ]);

                setStats({
                    revenue: earningsRes.data.net || 0,
                    activeRides: ridesRes.data.length || 0,
                    activeDrivers: usersRes.data.length || 0
                });
            } catch (error) {
                console.error('Failed to load dashboard stats:', error);
            }
        };

        fetchStats();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('ride:created', () => {
            console.log('Dashboard: New ride created');
            setStats(prev => ({ ...prev, activeRides: prev.activeRides + 1 }));
        });

        socket.on('ride:updated', (ride: any) => {
            if (['completed', 'cancelled'].includes(ride.status)) {
                setStats(prev => ({ ...prev, activeRides: Math.max(0, prev.activeRides - 1) }));
            }
        });

        return () => {
            socket.off('ride:created');
            socket.off('ride:updated');
        };
    }, [socket]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${stats.revenue.toLocaleString()}</p>
                    <span className="text-green-500 text-sm font-medium mt-2 inline-block">+12% from last month</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Active Drivers</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeDrivers}</p>
                    <span className="text-green-500 text-sm font-medium mt-2 inline-block">+4 new today</span>
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
