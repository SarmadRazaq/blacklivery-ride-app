import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { ADMIN_SUBSCRIPTIONS, adminUserSubscription } from '../api/endpoints';
import Badge from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { RefreshCw, CreditCard, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'react-toastify';
import { DEFAULT_CURRENCY } from '../config/regions';

interface Subscription {
    status: 'active' | 'expired' | 'cancelled' | 'pending';
    plan?: string;
    expiresAt?: unknown;
    startedAt?: unknown;
    commissionRate?: number;
}

interface SubscribedDriver {
    id: string;
    name: string;
    email: string;
    phone?: string;
    region?: string;
    subscription?: Subscription;
}

const SUBSCRIPTION_PRICE_NGN = 30000;
const SUBSCRIPTION_PRICE_USD = 300;

const formatDate = (date: unknown) => {
    if (!date) return 'N/A';
    if (date && typeof date === 'object' && '_seconds' in date) {
        const s = (date as { _seconds?: number })._seconds;
        if (typeof s === 'number') return new Date(s * 1000).toLocaleDateString();
    }
    if (typeof date !== 'string' && typeof date !== 'number' && !(date instanceof Date)) return 'N/A';
    const d = new Date(date as string | number | Date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

const isExpiringSoon = (date: unknown): boolean => {
    if (!date) return false;
    let ts: number | null = null;
    if (date && typeof date === 'object' && '_seconds' in date) {
        const s = (date as { _seconds?: number })._seconds;
        if (typeof s === 'number') ts = s * 1000;
    } else if (typeof date === 'string' || typeof date === 'number') {
        ts = new Date(date).getTime();
    }
    if (ts === null) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return ts - Date.now() < sevenDays && ts > Date.now();
};

const subStatusBadge = (status?: Subscription['status']) => {
    if (status === 'active') return <Badge variant="success">Active</Badge>;
    if (status === 'expired') return <Badge variant="danger">Expired</Badge>;
    if (status === 'cancelled') return <Badge variant="danger">Cancelled</Badge>;
    if (status === 'pending') return <Badge variant="warning">Pending</Badge>;
    return <Badge variant="default">None</Badge>;
};

const SubscriptionsPage = () => {
    const [drivers, setDrivers] = useState<SubscribedDriver[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(ADMIN_SUBSCRIPTIONS);
            const data: SubscribedDriver[] = Array.isArray(res.data?.users)
                ? res.data.users
                : Array.isArray(res.data)
                    ? res.data
                    : [];
            setDrivers(data);
        } catch {
            toast.error('Failed to load subscription data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const grantSubscription = async (driver: SubscribedDriver) => {
        const price = driver.region === 'NG'
            ? `₦${SUBSCRIPTION_PRICE_NGN.toLocaleString()}`
            : `$${SUBSCRIPTION_PRICE_USD.toLocaleString()} USD`;
        if (!window.confirm(`Grant 30-day subscription to ${driver.name}?\n\nThis will set their commission rate to 15% (from 25%).\nNo charge will be made — manual override.`)) return;
        setActionLoading(prev => ({ ...prev, [driver.id]: true }));
        try {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            await api.patch(adminUserSubscription(driver.id), {
                action: 'grant',
                expiresAt,
                commissionRate: 0.15,
                plan: 'monthly',
            });
            toast.success(`Subscription granted to ${driver.name}`);
            fetchDrivers();
        } catch {
            toast.error('Failed to grant subscription');
        } finally {
            setActionLoading(prev => ({ ...prev, [driver.id]: false }));
        }
    };

    const revokeSubscription = async (driver: SubscribedDriver) => {
        if (!window.confirm(`Revoke subscription for ${driver.name}?\n\nTheir commission rate will revert to 25%.`)) return;
        setActionLoading(prev => ({ ...prev, [driver.id]: true }));
        try {
            await api.patch(adminUserSubscription(driver.id), {
                action: 'revoke',
                commissionRate: 0.25,
            });
            toast.success(`Subscription revoked for ${driver.name}`);
            fetchDrivers();
        } catch {
            toast.error('Failed to revoke subscription');
        } finally {
            setActionLoading(prev => ({ ...prev, [driver.id]: false }));
        }
    };

    const counts = {
        active: drivers.filter(d => d.subscription?.status === 'active').length,
        expiringSoon: drivers.filter(d => isExpiringSoon(d.subscription?.expiresAt)).length,
        expired: drivers.filter(d => d.subscription?.status === 'expired').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Driver Subscriptions</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Manage monthly subscriptions — active subscribers pay {DEFAULT_CURRENCY === 'NGN' ? '₦30,000/mo' : '$300/mo'} and receive 15% commission
                    </p>
                </div>
                <button
                    onClick={fetchDrivers}
                    className="h-10 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active', count: counts.active, color: 'text-green-600', icon: ShieldCheck },
                    { label: 'Expiring in 7 Days', count: counts.expiringSoon, color: 'text-yellow-600', icon: CreditCard },
                    { label: 'Expired', count: counts.expired, color: 'text-red-600', icon: ShieldOff },
                ].map(({ label, count, color, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
                        <Icon size={28} className={color} />
                        <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className={`text-3xl font-bold ${color}`}>{count}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Drivers ({drivers.length})</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Driver</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Commission</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drivers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No drivers with subscriptions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                drivers.map(driver => {
                                    const sub = driver.subscription;
                                    const expiringSoon = isExpiringSoon(sub?.expiresAt);
                                    return (
                                        <TableRow key={driver.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{driver.name}</p>
                                                <p className="text-xs text-gray-500">{driver.email}</p>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-700">{driver.region ?? '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {subStatusBadge(sub?.status)}
                                                    {expiringSoon && (
                                                        <span className="text-xs text-yellow-600 font-medium">Expiring soon</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-gray-700">
                                                {sub?.commissionRate != null
                                                    ? `${(sub.commissionRate * 100).toFixed(0)}%`
                                                    : '25%'}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {formatDate(sub?.expiresAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {sub?.status !== 'active' && (
                                                        <button
                                                            onClick={() => grantSubscription(driver)}
                                                            disabled={actionLoading[driver.id]}
                                                            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 disabled:opacity-50"
                                                        >
                                                            Grant
                                                        </button>
                                                    )}
                                                    {sub?.status === 'active' && (
                                                        <button
                                                            onClick={() => revokeSubscription(driver)}
                                                            disabled={actionLoading[driver.id]}
                                                            className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-md hover:bg-red-100 border border-red-200 disabled:opacity-50"
                                                        >
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
};

export default SubscriptionsPage;
