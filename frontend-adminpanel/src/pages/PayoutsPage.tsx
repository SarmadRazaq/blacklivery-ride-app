import React, { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { ADMIN_PAYOUTS, ADMIN_ANALYTICS_EARNINGS, approvePayout as approvePayoutEndpoint, retryPayout as retryPayoutEndpoint } from '../api/endpoints';
import { DEFAULT_PAGE_SIZE } from '../config/constants';
import { DEFAULT_CURRENCY } from '../config/regions';

interface PayoutRecord {
    id: string;
    userId: string;
    driverInfo?: { name: string; phone: string; email: string; id?: string };
    amount: number;
    currency?: string;
    status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';
    method?: string;
    bankCode?: string;
    accountNumber?: string;
    createdAt: unknown;
}

const asNumber = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const formatMoney = (amount: number, currency?: string) => {
    const safeAmount = asNumber(amount);
    const safeCurrency = currency || DEFAULT_CURRENCY;
    return `${safeCurrency} ${safeAmount.toLocaleString()}`;
};

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

const PayoutsPage = () => {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [summary, setSummary] = useState({ total: 0, pending: 0, completed: 0, failed: 0 });
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => setExpandedRows(prev => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
    });

    const fetchPayouts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', DEFAULT_PAGE_SIZE);
            if (statusFilter) params.append('status', statusFilter);

            const [payoutsRes, earningsRes] = await Promise.all([
                api.get(`${ADMIN_PAYOUTS}?${params.toString()}`),
                api.get(ADMIN_ANALYTICS_EARNINGS),
            ]);

            const payoutData = Array.isArray(payoutsRes.data?.data) ? payoutsRes.data.data : [];
            setPayouts(payoutData);
            setPagination(payoutsRes.data?.pagination || { total: 0, totalPages: 1 });

            // Compute summary from payout data + earnings
            const pending = payoutData
                .filter((p: PayoutRecord) => p.status === 'pending')
                .reduce((sum: number, p: PayoutRecord) => sum + asNumber(p.amount), 0);
            const failed = payoutData.filter((p: PayoutRecord) => p.status === 'failed').length;

            setSummary({
                total: asNumber(earningsRes.data?.rideRevenue),
                pending,
                completed: asNumber(earningsRes.data?.driverPayouts),
                failed,
            });
        } catch (error) {
            console.error('Failed to fetch payouts', error);
            toast.error('Failed to load payout data');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    const approvePayout = async (payoutId: string, amount: number, currency?: string) => {
        const confirmed = window.confirm(
            `Approve payout of ${formatMoney(amount, currency)} for payout ID ${payoutId.substring(0, 8)}…?\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;
        try {
            await api.post(approvePayoutEndpoint(payoutId), { approved: true });
            toast.success('Payout approved');
            if (page !== 1) {
                setPage(1);
            } else {
                fetchPayouts();
            }
        } catch (error) {
            console.error('Failed to approve payout', error);
            toast.error('Failed to approve payout');
        }
    };

    const retryPayout = async (payoutId: string, amount: number, currency?: string) => {
        const confirmed = window.confirm(
            `Retry failed payout of ${formatMoney(amount, currency)} for payout ID ${payoutId.substring(0, 8)}…?`
        );
        if (!confirmed) return;
        try {
            await api.post(retryPayoutEndpoint(payoutId));
            toast.success('Payout retry initiated');
            fetchPayouts();
        } catch (error) {
            console.error('Failed to retry payout', error);
            toast.error('Failed to retry payout');
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
                <div className="flex gap-2">
                    <select
                        className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <button
                        onClick={fetchPayouts}
                        className="h-10 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet size={20} className="text-blue-500" />
                        <p className="text-sm text-gray-500">Gross Revenue</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatMoney(summary.total)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpCircle size={20} className="text-green-500" />
                        <p className="text-sm text-gray-500">Paid Out</p>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{formatMoney(summary.completed)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownCircle size={20} className="text-yellow-500" />
                        <p className="text-sm text-gray-500">Pending Payouts</p>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600">{formatMoney(summary.pending)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 mb-2">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                </div>
            </div>

            {/* Payout History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Payout Requests</h2>
                    <p className="text-sm text-gray-500">{pagination.total} total</p>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No payout records found</TableCell>
                                </TableRow>
                            ) : (
                                payouts.map(payout => (
                                    <React.Fragment key={payout.id}>
                                        <TableRow>
                                            <TableCell>
                                                <button onClick={() => toggleRow(payout.id)} className="p-1 hover:bg-gray-100 rounded">
                                                    {expandedRows.has(payout.id) ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                                </button>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{payout.driverInfo?.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{payout.driverInfo?.email || payout.userId?.substring(0, 12)}</p>
                                            </TableCell>
                                            <TableCell className="font-semibold">{formatMoney(payout.amount, payout.currency)}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    payout.status === 'completed' ? 'success' :
                                                        payout.status === 'approved' || payout.status === 'processing' ? 'info' :
                                                            payout.status === 'pending' ? 'warning' :
                                                                payout.status === 'failed' || payout.status === 'rejected' ? 'danger' : 'default'
                                                }>
                                                    {payout.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{formatDate(payout.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {payout.status === 'pending' && (
                                                        <button
                                                            onClick={() => approvePayout(payout.id, payout.amount, payout.currency)}
                                                            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    {payout.status === 'failed' && (
                                                        <button
                                                            onClick={() => retryPayout(payout.id, payout.amount, payout.currency)}
                                                            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 border border-blue-200"
                                                        >
                                                            Retry
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(payout.id) && (
                                            <TableRow key={`${payout.id}-details`}>
                                                <TableCell colSpan={6} className="bg-gray-50 px-6 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Payout ID</p>
                                                            <p className="font-mono text-gray-900 break-all">{payout.id}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Driver ID</p>
                                                            <p className="font-mono text-gray-900 break-all">{payout.userId || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                                                            <p className="text-gray-900">{payout.driverInfo?.phone || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Method</p>
                                                            <p className="text-gray-900 capitalize">{payout.method || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Bank Code</p>
                                                            <p className="text-gray-900">{payout.bankCode || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-medium text-gray-500 mb-1">Account Number</p>
                                                            <p className="text-gray-900">{payout.accountNumber || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
                {/* Pagination */}
                {(pagination.totalPages || 1) > 1 && (
                    <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">Page {page} of {pagination.totalPages || 1}</span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
                            disabled={page >= (pagination.totalPages || 1)}
                            className="px-3 py-1 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayoutsPage;
