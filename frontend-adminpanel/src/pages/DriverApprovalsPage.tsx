import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { ADMIN_DRIVERS_PENDING, adminUserDocuments, adminUserStatus } from '../api/endpoints';
import Badge from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { RefreshCw, ChevronDown, ChevronUp, FileText, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

interface Document {
    type: string;
    url?: string;
    status: 'pending_review' | 'approved' | 'rejected';
    rejectionReason?: string;
}

interface PendingDriver {
    id: string;
    name: string;
    email: string;
    phone?: string;
    region?: string;
    createdAt?: unknown;
    driverOnboarding?: {
        status: string;
        documents?: Document[];
    };
}

const DOC_LABELS: Record<string, string> = {
    license: "Driver's License",
    insurance: 'Insurance',
    vehicle_registration: 'Vehicle Registration',
    profile_photo: 'Profile Photo',
    background_check: 'Background Check',
};

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

const DriverApprovalsPage = () => {
    const [drivers, setDrivers] = useState<PendingDriver[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => setExpandedRows(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    });

    const fetchDrivers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(ADMIN_DRIVERS_PENDING);
            const data: PendingDriver[] = Array.isArray(res.data?.users)
                ? res.data.users
                : Array.isArray(res.data)
                    ? res.data
                    : [];
            setDrivers(data);
        } catch {
            toast.error('Failed to load pending drivers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const handleDocumentAction = async (
        driverId: string,
        docType: string,
        action: 'approved' | 'rejected',
        rejectionReason?: string
    ) => {
        const key = `${driverId}-${docType}`;
        setActionLoading(prev => ({ ...prev, [key]: true }));
        try {
            await api.patch(adminUserDocuments(driverId), {
                documentType: docType,
                status: action,
                ...(rejectionReason ? { rejectionReason } : {}),
            });
            toast.success(`Document ${action}`);
            // Update local state optimistically
            setDrivers(prev => prev.map(d => {
                if (d.id !== driverId) return d;
                const docs = d.driverOnboarding?.documents?.map(doc =>
                    doc.type === docType
                        ? { ...doc, status: action as Document['status'], ...(rejectionReason ? { rejectionReason } : {}) }
                        : doc
                ) ?? [];
                return { ...d, driverOnboarding: { ...d.driverOnboarding, status: d.driverOnboarding?.status ?? '', documents: docs } };
            }));
        } catch {
            toast.error(`Failed to ${action} document`);
        } finally {
            setActionLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleReject = async (driverId: string, docType: string) => {
        const reason = window.prompt('Enter rejection reason (required):');
        if (!reason?.trim()) return;
        await handleDocumentAction(driverId, docType, 'rejected', reason.trim());
    };

    const handleApproveDriver = async (driverId: string) => {
        if (!window.confirm('Manually approve this driver account?')) return;
        setActionLoading(prev => ({ ...prev, [driverId]: true }));
        try {
            await api.patch(adminUserStatus(driverId), { status: 'active' });
            toast.success('Driver approved and activated');
            fetchDrivers();
        } catch {
            toast.error('Failed to approve driver');
        } finally {
            setActionLoading(prev => ({ ...prev, [driverId]: false }));
        }
    };

    const docStatusBadge = (status: Document['status']) => {
        if (status === 'approved') return <Badge variant="success">Approved</Badge>;
        if (status === 'rejected') return <Badge variant="danger">Rejected</Badge>;
        return <Badge variant="warning">Pending</Badge>;
    };

    const allDocsApproved = (driver: PendingDriver) =>
        (driver.driverOnboarding?.documents ?? []).length > 0 &&
        (driver.driverOnboarding?.documents ?? []).every(d => d.status === 'approved');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Driver Approvals</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Review and approve pending driver onboarding documents</p>
                </div>
                <button
                    onClick={fetchDrivers}
                    className="h-10 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm flex items-center gap-2"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pending Review', count: drivers.length, color: 'text-yellow-600' },
                    {
                        label: 'Docs All Approved',
                        count: drivers.filter(allDocsApproved).length,
                        color: 'text-green-600',
                    },
                    {
                        label: 'Has Rejections',
                        count: drivers.filter(d =>
                            (d.driverOnboarding?.documents ?? []).some(doc => doc.status === 'rejected')
                        ).length,
                        color: 'text-red-600',
                    },
                ].map(({ label, count, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-3xl font-bold mt-1 ${color}`}>{count}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Pending Drivers ({drivers.length})</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Applied</TableHead>
                                <TableHead>Doc Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drivers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No pending driver applications
                                    </TableCell>
                                </TableRow>
                            ) : (
                                drivers.map(driver => {
                                    const docs = driver.driverOnboarding?.documents ?? [];
                                    const pendingCount = docs.filter(d => d.status === 'pending_review').length;
                                    const rejectedCount = docs.filter(d => d.status === 'rejected').length;
                                    const approvedCount = docs.filter(d => d.status === 'approved').length;
                                    return (
                                        <React.Fragment key={driver.id}>
                                            <TableRow>
                                                <TableCell>
                                                    <button onClick={() => toggleRow(driver.id)} className="p-1 hover:bg-gray-100 rounded">
                                                        {expandedRows.has(driver.id)
                                                            ? <ChevronUp size={16} className="text-gray-500" />
                                                            : <ChevronDown size={16} className="text-gray-500" />}
                                                    </button>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-gray-900">{driver.name}</p>
                                                    <p className="text-xs text-gray-500">{driver.email}</p>
                                                    {driver.phone && <p className="text-xs text-gray-400">{driver.phone}</p>}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-gray-700">{driver.region ?? '—'}</span>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">{formatDate(driver.createdAt)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {pendingCount > 0 && <Badge variant="warning">{pendingCount} pending</Badge>}
                                                        {approvedCount > 0 && <Badge variant="success">{approvedCount} approved</Badge>}
                                                        {rejectedCount > 0 && <Badge variant="danger">{rejectedCount} rejected</Badge>}
                                                        {docs.length === 0 && <Badge variant="default">No docs</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {allDocsApproved(driver) && (
                                                        <button
                                                            onClick={() => handleApproveDriver(driver.id)}
                                                            disabled={actionLoading[driver.id]}
                                                            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200 disabled:opacity-50"
                                                        >
                                                            Activate Driver
                                                        </button>
                                                    )}
                                                </TableCell>
                                            </TableRow>

                                            {expandedRows.has(driver.id) && (
                                                <TableRow key={`${driver.id}-docs`}>
                                                    <TableCell colSpan={6} className="bg-gray-50 px-6 py-4">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                                            Documents
                                                        </p>
                                                        {docs.length === 0 ? (
                                                            <p className="text-sm text-gray-400">No documents uploaded yet.</p>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {docs.map(doc => {
                                                                    const actionKey = `${driver.id}-${doc.type}`;
                                                                    return (
                                                                        <div
                                                                            key={doc.type}
                                                                            className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <FileText size={18} className="text-gray-400 flex-shrink-0" />
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-800">
                                                                                        {DOC_LABELS[doc.type] ?? doc.type}
                                                                                    </p>
                                                                                    {doc.rejectionReason && (
                                                                                        <p className="text-xs text-red-500 mt-0.5">
                                                                                            Reason: {doc.rejectionReason}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                {doc.url && (
                                                                                    <a
                                                                                        href={doc.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="text-blue-500 hover:text-blue-700"
                                                                                        title="View document"
                                                                                    >
                                                                                        <ExternalLink size={15} />
                                                                                    </a>
                                                                                )}
                                                                                {docStatusBadge(doc.status)}
                                                                                {doc.status !== 'approved' && (
                                                                                    <button
                                                                                        onClick={() => handleDocumentAction(driver.id, doc.type, 'approved')}
                                                                                        disabled={actionLoading[actionKey]}
                                                                                        className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                                                                                        title="Approve"
                                                                                    >
                                                                                        <CheckCircle size={18} />
                                                                                    </button>
                                                                                )}
                                                                                {doc.status !== 'rejected' && (
                                                                                    <button
                                                                                        onClick={() => handleReject(driver.id, doc.type)}
                                                                                        disabled={actionLoading[actionKey]}
                                                                                        className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                                                                                        title="Reject"
                                                                                    >
                                                                                        <XCircle size={18} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
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

export default DriverApprovalsPage;
