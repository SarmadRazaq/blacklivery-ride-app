import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { ADMIN_DISPUTES, resolveDispute as resolveDisputeEndpoint } from '../api/endpoints';
import { DEFAULT_LOCALE } from '../config/constants';

type TimestampLike = string | { _seconds: number; _nanoseconds?: number };

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

interface Dispute {
    id: string;
    rideId: string;
    reporterId: string;
    reporterRole?: string;
    reason: string;
    details?: string;
    status: 'open' | 'resolved' | 'rejected';
    createdAt: TimestampLike;
    resolvedAt?: TimestampLike;
    resolvedBy?: string;
    resolutionNotes?: string;
    rideInfo?: {
        id: string;
        status: string;
        pickupLocation?: { address?: string; lat?: number; lng?: number };
        dropoffLocation?: { address?: string; lat?: number; lng?: number };
        pricing?: { finalFare?: number; estimatedFare?: number; currency?: string };
        createdAt: TimestampLike;
        riderInfo?: { id: string; name: string; phone: string; email: string };
        driverInfo?: { id: string; name: string; phone: string; email: string };
        vehicleInfo?: { plateNumber: string; make: string; model: string; year: number; color: string; category: string };
    };
    reporterInfo?: { id: string; name: string; phone: string; email: string; role: string };
}

interface ResolveModalState {
    disputeId: string;
    defaultUserId: string;
    defaultAmount: number;
}

const DisputesPage = () => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [resolveModal, setResolveModal] = useState<ResolveModalState | null>(null);
    const [resolveForm, setResolveForm] = useState({
        resolutionType: 'dismissed',
        notes: '',
        refundUserId: '',
        refundAmount: '',
    });
    const [resolving, setResolving] = useState(false);

    const formatDate = (date: TimestampLike | null | undefined) => {
        if (!date) return 'N/A';
        if (date && typeof date === 'object' && '_seconds' in date) {
            return new Date(date._seconds * 1000).toLocaleDateString(DEFAULT_LOCALE);
        }
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(DEFAULT_LOCALE);
    };

    const formatDateTime = (date: TimestampLike | null | undefined) => {
        if (!date) return 'N/A';
        if (date && typeof date === 'object' && '_seconds' in date) {
            return new Date(date._seconds * 1000).toLocaleString(DEFAULT_LOCALE);
        }
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString(DEFAULT_LOCALE);
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

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const response = await api.get(ADMIN_DISPUTES);
            setDisputes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch disputes', error);
            toast.error('Failed to load disputes');
            setDisputes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisputes();
    }, []);

    const openResolveModal = (id: string) => {
        const dispute = disputes.find(d => d.id === id);
        setResolveForm({
            resolutionType: 'dismissed',
            notes: '',
            refundUserId: dispute?.rideInfo?.riderInfo?.id || '',
            refundAmount: String(dispute?.rideInfo?.pricing?.finalFare || ''),
        });
        setResolveModal({
            disputeId: id,
            defaultUserId: dispute?.rideInfo?.riderInfo?.id || '',
            defaultAmount: dispute?.rideInfo?.pricing?.finalFare || 0,
        });
    };

    const submitResolve = async () => {
        if (!resolveModal) return;
        if (!resolveForm.notes.trim()) {
            toast.error('Resolution notes are required');
            return;
        }
        if (resolveForm.resolutionType === 'refund') {
            if (!resolveForm.refundUserId.trim()) {
                toast.error('Refund user ID is required');
                return;
            }
            const amt = parseFloat(resolveForm.refundAmount);
            if (isNaN(amt) || amt <= 0) {
                toast.error('A positive refund amount is required');
                return;
            }
        }
        setResolving(true);
        try {
            await api.post(resolveDisputeEndpoint(resolveModal.disputeId), {
                resolutionNotes: resolveForm.notes.trim(),
                resolutionType: resolveForm.resolutionType,
                issueRefund: resolveForm.resolutionType === 'refund',
                ...(resolveForm.resolutionType === 'refund' && {
                    refundUserId: resolveForm.refundUserId.trim(),
                    refundAmount: parseFloat(resolveForm.refundAmount),
                }),
            });
            toast.success('Dispute resolved successfully');
            setResolveModal(null);
            fetchDisputes();
        } catch (error: unknown) {
            console.error('Failed to resolve dispute', error);
            const errorMessage = (error as ApiError).response?.data?.message || 'Failed to resolve dispute';
            toast.error(errorMessage);
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                    Loading disputes...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dispute Resolution</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {disputes.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No disputes found
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Ride ID</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {disputes.map((dispute) => {
                                const isExpanded = expandedRows.has(dispute.id);
                                return (
                                    <React.Fragment key={dispute.id}>
                                        <TableRow className="cursor-pointer hover:bg-gray-50">
                                            <TableCell>
                                                <button
                                                    onClick={() => toggleRow(dispute.id)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp size={16} className="text-gray-600" />
                                                    ) : (
                                                        <ChevronDown size={16} className="text-gray-600" />
                                                    )}
                                                </button>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{dispute.id.substring(0, 12)}...</TableCell>
                                            <TableCell className="font-mono text-xs">{dispute.rideId || 'N/A'}</TableCell>
                                            <TableCell>{dispute.reason || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={dispute.status === 'open' ? 'warning' : dispute.status === 'resolved' ? 'success' : 'danger'}>
                                                    {dispute.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDate(dispute.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        title="View Details"
                                                        onClick={() => toggleRow(dispute.id)}
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                    {dispute.status === 'open' && (
                                                        <Button size="sm" onClick={() => openResolveModal(dispute.id)}>
                                                            Resolve
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow key={`${dispute.id}-details`}>
                                                <TableCell colSpan={7} className="bg-gray-50 p-6">
                                                    <div className="space-y-6">
                                                        {/* Dispute Information */}
                                                        <div>
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dispute Information</h3>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Dispute ID</label>
                                                                    <p className="text-gray-900 font-mono text-sm">{dispute.id}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                                                    <div className="mt-1">
                                                                        <Badge variant={dispute.status === 'open' ? 'warning' : dispute.status === 'resolved' ? 'success' : 'danger'}>
                                                                            {dispute.status}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Reason</label>
                                                                    <p className="text-gray-900">{dispute.reason || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Details</label>
                                                                    <p className="text-gray-900">{dispute.details || 'N/A'}</p>
                                                                </div>
                                                                <div>
                                                                    <label className="text-sm font-medium text-gray-500">Created At</label>
                                                                    <p className="text-gray-900">{formatDateTime(dispute.createdAt)}</p>
                                                                </div>
                                                                {dispute.resolvedAt && (
                                                                    <>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Resolved At</label>
                                                                            <p className="text-gray-900">{formatDateTime(dispute.resolvedAt)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <label className="text-sm font-medium text-gray-500">Resolution Notes</label>
                                                                            <p className="text-gray-900">{dispute.resolutionNotes || 'N/A'}</p>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Reporter Information */}
                                                        {dispute.reporterInfo && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Reporter Information</h3>
                                                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Name</label>
                                                                        <p className="text-gray-900 font-medium">{dispute.reporterInfo.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Role</label>
                                                                        <p className="text-gray-900 capitalize">{dispute.reporterInfo.role}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                        <p className="text-gray-900">{dispute.reporterInfo.phone}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Email</label>
                                                                        <p className="text-gray-900">{dispute.reporterInfo.email}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Reporter ID</label>
                                                                        <p className="text-gray-900 font-mono text-xs">{dispute.reporterInfo.id}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Ride Information */}
                                                        {dispute.rideInfo && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Information</h3>
                                                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Ride ID</label>
                                                                        <p className="text-gray-900 font-mono text-sm">{dispute.rideInfo.id}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Ride Status</label>
                                                                        <p className="text-gray-900 capitalize">{dispute.rideInfo.status?.replace('_', ' ')}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Pickup Location</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.pickupLocation?.address || 'N/A'}</p>
                                                                        {dispute.rideInfo.pickupLocation?.lat && dispute.rideInfo.pickupLocation?.lng && (
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                {dispute.rideInfo.pickupLocation.lat.toFixed(6)}, {dispute.rideInfo.pickupLocation.lng.toFixed(6)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Dropoff Location</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.dropoffLocation?.address || 'N/A'}</p>
                                                                        {dispute.rideInfo.dropoffLocation?.lat && dispute.rideInfo.dropoffLocation?.lng && (
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                {dispute.rideInfo.dropoffLocation.lat.toFixed(6)}, {dispute.rideInfo.dropoffLocation.lng.toFixed(6)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Fare</label>
                                                                        <p className="text-gray-900">
                                                                            {dispute.rideInfo.pricing?.finalFare || dispute.rideInfo.pricing?.estimatedFare || 'N/A'}
                                                                            {dispute.rideInfo.pricing?.currency && ` ${dispute.rideInfo.pricing.currency}`}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Ride Created At</label>
                                                                        <p className="text-gray-900">{formatDateTime(dispute.rideInfo.createdAt)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Rider Information */}
                                                        {dispute.rideInfo?.riderInfo && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rider Information</h3>
                                                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Name</label>
                                                                        <p className="text-gray-900 font-medium">{dispute.rideInfo.riderInfo.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.riderInfo.phone}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Email</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.riderInfo.email}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Rider ID</label>
                                                                        <p className="text-gray-900 font-mono text-xs">{dispute.rideInfo.riderInfo.id}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Driver Information */}
                                                        {dispute.rideInfo?.driverInfo && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Information</h3>
                                                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Name</label>
                                                                        <p className="text-gray-900 font-medium">{dispute.rideInfo.driverInfo.name}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Phone</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.driverInfo.phone}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Email</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.driverInfo.email}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Driver ID</label>
                                                                        <p className="text-gray-900 font-mono text-xs">{dispute.rideInfo.driverInfo.id}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Vehicle Information */}
                                                        {dispute.rideInfo?.vehicleInfo && (
                                                            <div>
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                                                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg">
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Plate Number</label>
                                                                        <p className="text-gray-900 font-medium">{dispute.rideInfo.vehicleInfo.plateNumber}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Make & Model</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.vehicleInfo.make} {dispute.rideInfo.vehicleInfo.model}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Year</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.vehicleInfo.year}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Color</label>
                                                                        <p className="text-gray-900">{dispute.rideInfo.vehicleInfo.color}</p>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-sm font-medium text-gray-500">Category</label>
                                                                        <p className="text-gray-900 capitalize">{dispute.rideInfo.vehicleInfo.category}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>

            {/* Resolve Dispute Modal */}
            {resolveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900">Resolve Dispute</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Type</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={resolveForm.resolutionType}
                                onChange={(e) => setResolveForm(f => ({ ...f, resolutionType: e.target.value }))}
                            >
                                <option value="dismissed">Dismissed</option>
                                <option value="warning">Warning</option>
                                <option value="penalty">Penalty</option>
                                <option value="refund">Refund</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes <span className="text-red-500">*</span></label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="Describe the resolution..."
                                value={resolveForm.notes}
                                onChange={(e) => setResolveForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>

                        {resolveForm.resolutionType === 'refund' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Refund to User ID <span className="text-red-500">*</span></label>
                                    <input
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                        value={resolveForm.refundUserId}
                                        onChange={(e) => setResolveForm(f => ({ ...f, refundUserId: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={resolveForm.refundAmount}
                                        onChange={(e) => setResolveForm(f => ({ ...f, refundAmount: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={() => setResolveModal(null)} disabled={resolving}>Cancel</Button>
                            <Button onClick={submitResolve} disabled={resolving}>
                                {resolving ? 'Resolving...' : 'Confirm Resolution'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisputesPage;
