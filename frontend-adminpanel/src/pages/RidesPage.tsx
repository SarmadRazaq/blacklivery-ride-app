import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Eye, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../context/SocketContext';
import { ADMIN_RIDES, ADMIN_RIDES_ACTIVE, adminRideCancel, adminRideDetail } from '../api/endpoints';
import { SHORT_ID_LENGTH, ADMIN_CANCEL_REASON } from '../config/constants';
import { RIDE_STATUS_BADGE } from '../config/regions';

interface Ride {
    id: string;
    riderId: string;
    driverId?: string;
    status: string;
    pickupLocation: { lat?: number; lng?: number; address?: string };
    dropoffLocation: { lat?: number; lng?: number; address?: string };
    fare?: number;
    pricing?: {
        finalFare?: number;
        estimatedFare?: number;
        currency?: string;
        breakdown?: {
            baseFare?: number;
            distanceFare?: number;
            timeFare?: number;
            trafficSurcharge?: number;
            tollFee?: number;
            surgeMultiplier?: number;
            platformFee?: number;
        };
    };
    payment?: {
        method?: string;
        gateway?: string;
        reference?: string;
        settlement?: {
            driverAmount?: number;
            commissionAmount?: number;
            commissionRate?: number;
        };
    };
    rating?: { rider?: number; driver?: number; feedback?: string };
    createdAt: unknown;
    driverLocation?: { lat?: number; lng?: number } | null;
    riderInfo?: { name: string; phone: string; email: string };
    driverInfo?: { name: string; phone: string; email: string };
    vehicleInfo?: { plateNumber: string; make: string; model: string; year: number; color: string; category: string };
}

const toShortId = (id?: string) => (id ? `${id.substring(0, SHORT_ID_LENGTH)}...` : 'N/A');

const formatRideStatus = (status?: string) => (status ? status.replace(/_/g, ' ') : 'unknown');

const resolveFare = (ride: Ride): string => {
    const fare =
        typeof ride.pricing?.finalFare === 'number'
            ? ride.pricing.finalFare
            : typeof ride.pricing?.estimatedFare === 'number'
                ? ride.pricing.estimatedFare
                : typeof ride.fare === 'number'
                    ? ride.fare
                    : null;

    if (fare === null) return 'N/A';
    return `${fare}${ride.pricing?.currency ? ` ${ride.pricing.currency}` : ''}`;
};

const RidesPage = () => {
    const [rides, setRides] = useState<Ride[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const { socket } = useSocket();

    const formatDate = (date: unknown) => {
        if (!date) return 'N/A';
        if (date && typeof date === 'object' && '_seconds' in date) {
            const seconds = (date as { _seconds?: number })._seconds;
            if (typeof seconds === 'number') {
                return new Date(seconds * 1000).toLocaleString();
            }
        }
        if (typeof date !== 'string' && typeof date !== 'number' && !(date instanceof Date)) {
            return 'N/A';
        }
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const fetchRides = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'active' ? ADMIN_RIDES_ACTIVE : ADMIN_RIDES;
            const response = await api.get(endpoint);
            const raw = activeTab === 'all' ? response.data?.rides : response.data;
            const data = Array.isArray(raw) ? raw : [];
            setRides(data);
        } catch (error) {
            console.error('Failed to fetch rides', error);
            toast.error('Failed to load rides');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchRides();
    }, [fetchRides]);

    useEffect(() => {
        if (!socket) return;

        const handleRideUpdate = (updatedRide: Ride) => {
            if (!updatedRide?.id) return;
            if (activeTab === 'active') {
                if (['completed', 'cancelled'].includes(updatedRide.status)) {
                    setRides(prev => prev.filter(r => r.id !== updatedRide.id));
                } else {
                    setRides(prev => {
                        const exists = prev.find(r => r.id === updatedRide.id);
                        if (exists) {
                            return prev.map(r => r.id === updatedRide.id ? updatedRide : r);
                        }
                        return [updatedRide, ...prev];
                    });
                }
            } else {
                setRides(prev => {
                    const exists = prev.find(r => r.id === updatedRide.id);
                    if (exists) {
                        return prev.map(r => r.id === updatedRide.id ? updatedRide : r);
                    }
                    return [updatedRide, ...prev];
                });
            }
        };

        const handleNewRide = (newRide: Ride) => {
            if (!newRide?.id) return;
            if (activeTab === 'active') {
                setRides(prev => {
                    const exists = prev.some(r => r.id === newRide.id);
                    return exists ? prev : [newRide, ...prev];
                });
            }
        };

        socket.on('ride:updated', handleRideUpdate);
        socket.on('ride:created', handleNewRide);

        return () => {
            socket.off('ride:updated', handleRideUpdate);
            socket.off('ride:created', handleNewRide);
        };
    }, [socket, activeTab]);

    const cancelRide = async (rideId: string) => {
        if (!window.confirm('Are you sure you want to cancel this ride?')) return;

        try {
            await api.post(adminRideCancel(rideId), { reason: ADMIN_CANCEL_REASON });
            toast.success('Ride cancelled successfully');
            fetchRides();
        } catch (error) {
            console.error('Failed to cancel ride', error);
            toast.error('Failed to cancel ride');
        }
    };

    const getStatusColor = (status: string) => {
        return RIDE_STATUS_BADGE[status] || 'default';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Ride Management</h1>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Active Rides
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All History
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading rides...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Rider</TableHead>
                                    <TableHead>Driver</TableHead>
                                    <TableHead>Vehicle</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Pickup</TableHead>
                                    <TableHead>Dropoff</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rides.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                                            No rides found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rides.map((ride) => {
                                        const isExpanded = expandedRows.has(ride.id);
                                        return (
                                            <React.Fragment key={ride.id}>
                                                <TableRow className="cursor-pointer hover:bg-gray-50">
                                                    <TableCell>
                                                        <button
                                                            onClick={() => toggleRow(ride.id)}
                                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronUp size={16} className="text-gray-600" />
                                                            ) : (
                                                                <ChevronDown size={16} className="text-gray-600" />
                                                            )}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{toShortId(ride.id)}</TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{ride.riderInfo?.name || 'N/A'}</p>
                                                            <p className="text-xs text-gray-500">{toShortId(ride.riderId)}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {ride.driverInfo ? (
                                                            <div>
                                                                <p className="font-medium text-gray-900">{ride.driverInfo.name}</p>
                                                                <p className="text-xs text-gray-500">{toShortId(ride.driverId)}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">No driver</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {ride.vehicleInfo ? (
                                                            <div>
                                                                <p className="font-medium text-gray-900">{ride.vehicleInfo.plateNumber}</p>
                                                                <p className="text-xs text-gray-500">{ride.vehicleInfo.make} {ride.vehicleInfo.model}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">N/A</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(ride.status)}>
                                                            {formatRideStatus(ride.status)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate" title={ride.pickupLocation?.address}>
                                                        {ride.pickupLocation?.address || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate" title={ride.dropoffLocation?.address}>
                                                        {ride.dropoffLocation?.address || 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {formatDate(ride.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                title="View Details"
                                                                onClick={() => toggleRow(ride.id)}
                                                            >
                                                                <Eye size={16} />
                                                            </Button>
                                                            {['accepted', 'arrived', 'in_progress', 'finding_driver'].includes(ride.status) && (
                                                                <Button
                                                                    variant="danger"
                                                                    size="sm"
                                                                    title="Cancel Ride"
                                                                    onClick={() => cancelRide(ride.id)}
                                                                >
                                                                    <XCircle size={16} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && (
                                                    <TableRow key={`${ride.id}-details`}>
                                                        <TableCell colSpan={10} className="bg-gray-50 p-6">
                                                            <div className="space-y-6">
                                                                {/* Ride Details */}
                                                                <div>
                                                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Details</h3>
                                                                    <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Ride ID</label>
                                                                            <p className="text-gray-900 font-mono text-sm">{ride.id}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Status</label>
                                                                            <div className="mt-1">
                                                                                <Badge variant={getStatusColor(ride.status)}>
                                                                                    {formatRideStatus(ride.status)}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Pickup Location</label>
                                                                            <p className="text-gray-900">{ride.pickupLocation?.address || 'N/A'}</p>
                                                                            {typeof ride.pickupLocation?.lat === 'number' && typeof ride.pickupLocation?.lng === 'number' && (
                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                    {ride.pickupLocation.lat.toFixed(6)}, {ride.pickupLocation.lng.toFixed(6)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Dropoff Location</label>
                                                                            <p className="text-gray-900">{ride.dropoffLocation?.address || 'N/A'}</p>
                                                                            {typeof ride.dropoffLocation?.lat === 'number' && typeof ride.dropoffLocation?.lng === 'number' && (
                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                    {ride.dropoffLocation.lat.toFixed(6)}, {ride.dropoffLocation.lng.toFixed(6)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Fare</label>
                                                                            <p className="text-gray-900">{resolveFare(ride)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Created At</label>
                                                                            <p className="text-gray-900">{formatDate(ride.createdAt)}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Rider Info */}
                                                                {ride.riderInfo && (
                                                                    <div>
                                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rider Information</h3>
                                                                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Name</label>
                                                                                <p className="text-gray-900 font-medium">{ride.riderInfo.name}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                                <p className="text-gray-900">{ride.riderInfo.phone}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Email</label>
                                                                                <p className="text-gray-900">{ride.riderInfo.email}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Rider ID</label>
                                                                                <p className="text-gray-900 font-mono text-xs">{ride.riderId}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Driver Info */}
                                                                {ride.driverInfo && (
                                                                    <div>
                                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Information</h3>
                                                                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Name</label>
                                                                                <p className="text-gray-900 font-medium">{ride.driverInfo.name}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                                <p className="text-gray-900">{ride.driverInfo.phone}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Email</label>
                                                                                <p className="text-gray-900">{ride.driverInfo.email}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Driver ID</label>
                                                                                <p className="text-gray-900 font-mono text-xs">{String(ride.driverId ?? 'N/A')}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Vehicle Info */}
                                                                {ride.vehicleInfo && (
                                                                    <div>
                                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                                                                        <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Plate Number</label>
                                                                                <p className="text-gray-900 font-medium">{ride.vehicleInfo.plateNumber}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Make & Model</label>
                                                                                <p className="text-gray-900">{ride.vehicleInfo.make} {ride.vehicleInfo.model}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Year</label>
                                                                                <p className="text-gray-900">{ride.vehicleInfo.year}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Color</label>
                                                                                <p className="text-gray-900">{ride.vehicleInfo.color}</p>
                                                                            </div>
                                                                            <div>
                                                                                <label className="text-sm font-medium text-gray-500">Category</label>
                                                                                <p className="text-gray-900 capitalize">{ride.vehicleInfo.category}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Driver Location (Live) */}
                                                                {ride.driverLocation && (
                                                                    <div>
                                                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Location</h3>
                                                                        <div className="bg-white p-4 rounded-lg">
                                                                            <p className="text-gray-900">
                                                                                {typeof ride.driverLocation.lat === 'number' && typeof ride.driverLocation.lng === 'number'
                                                                                    ? `${ride.driverLocation.lat.toFixed(6)}, ${ride.driverLocation.lng.toFixed(6)}`
                                                                                    : 'N/A'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RidesPage;
