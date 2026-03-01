import { useState, useEffect } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { ADMIN_RIDES } from '../api/endpoints';
import { SHORT_ID_LENGTH } from '../config/constants';
import { DELIVERY_STATUSES } from '../config/regions';

type TimestampLike = string | { _seconds: number; _nanoseconds?: number };

interface Delivery {
    id: string;
    riderId: string;
    driverId?: string;
    status: string;
    type: string;
    pickupLocation: { address?: string };
    dropoffLocation: { address?: string };
    pricing?: { estimatedFare?: number; finalFare?: number; currency?: string };
    packageDetails?: { description?: string; weight?: number };
    createdAt: TimestampLike;
    riderInfo?: { name: string };
    driverInfo?: { name: string };
    rideType?: string;
}

const formatDate = (date: TimestampLike | null | undefined) => {
    if (!date) return 'N/A';
    if (date && typeof date === 'object' && '_seconds' in date) {
        return new Date(date._seconds * 1000).toLocaleString();
    }
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
};

const DeliveriesPage = () => {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchDeliveries = async () => {
        setLoading(true);
        try {
            const response = await api.get(ADMIN_RIDES);
            const allRides = (response.data?.rides || []) as Delivery[];
            // Filter for delivery-type rides
            const deliveryRides = allRides.filter((r) => r.type === 'delivery' || r.rideType === 'delivery');
            setDeliveries(deliveryRides);
        } catch (error) {
            console.error('Failed to fetch deliveries', error);
            toast.error('Failed to load deliveries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('ride:updated', (ride: Delivery) => {
            if (ride.type === 'delivery' || ride.rideType === 'delivery') {
                setDeliveries(prev => {
                    const exists = prev.find(d => d.id === ride.id);
                    if (exists) return prev.map(d => d.id === ride.id ? ride : d);
                    return [ride, ...prev];
                });
            }
        });
        return () => { socket.off('ride:updated'); };
    }, [socket]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered': case 'completed': return 'success';
            case 'cancelled': return 'danger';
            case 'in_transit': case 'in_progress': return 'info';
            case 'picked_up': return 'warning';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Delivery Tracking</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Package size={18} />
                    <span>{deliveries.length} deliveries</span>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {DELIVERY_STATUSES.map(status => {
                    const count = deliveries.filter(d => d.status === status).length;
                    return (
                        <div key={status} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                            <p className="text-2xl font-bold text-gray-900">{count}</p>
                            <p className="text-xs text-gray-500 capitalize">{status.replace('_', ' ')}</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Sender</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Pickup</TableHead>
                                <TableHead>Dropoff</TableHead>
                                <TableHead>Package</TableHead>
                                <TableHead>Fare</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deliveries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">No deliveries found</TableCell>
                                </TableRow>
                            ) : (
                                deliveries.map(delivery => (
                                    <TableRow key={delivery.id}>
                                        <TableCell className="font-mono text-xs">{delivery.id.substring(0, SHORT_ID_LENGTH)}...</TableCell>
                                        <TableCell>{delivery.riderInfo?.name || delivery.riderId?.substring(0, SHORT_ID_LENGTH) || 'N/A'}</TableCell>
                                        <TableCell>{delivery.driverInfo?.name || (delivery.driverId ? delivery.driverId.substring(0, SHORT_ID_LENGTH) + '...' : 'Unassigned')}</TableCell>
                                        <TableCell className="max-w-xs truncate">{delivery.pickupLocation?.address || 'N/A'}</TableCell>
                                        <TableCell className="max-w-xs truncate">{delivery.dropoffLocation?.address || 'N/A'}</TableCell>
                                        <TableCell>{delivery.packageDetails?.description || 'N/A'}</TableCell>
                                        <TableCell>
                                            {delivery.pricing?.finalFare || delivery.pricing?.estimatedFare || 'N/A'}
                                            {delivery.pricing?.currency && ` ${delivery.pricing.currency}`}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(delivery.status)}>
                                                {delivery.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(delivery.createdAt)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
};

export default DeliveriesPage;
