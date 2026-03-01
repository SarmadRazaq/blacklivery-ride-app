import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Search, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import DocumentReviewModal from '../components/DocumentReviewModal';
import { ADMIN_USERS, adminUserStatus, adminUserDocuments } from '../api/endpoints';
import { DEBOUNCE_MS } from '../config/constants';

interface User {
    id: string;
    email: string;
    displayName?: string;
    phoneNumber?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    documents?: {
        name: string;
        url: string;
        fileName?: string;
        mimeType?: string;
        status: 'pending' | 'approved' | 'rejected';
    }[];
    driverOnboarding?: { status: string };
}

type DocumentStatus = 'pending' | 'approved' | 'rejected';

type TimestampLike = string | { _seconds: number; _nanoseconds?: number };

const formatDate = (date: TimestampLike | null | undefined) => {
    if (!date) return 'N/A';
    // Handle Firestore Timestamp (seconds)
    if (date && typeof date === 'object' && '_seconds' in date) {
        return new Date(date._seconds * 1000).toLocaleDateString();
    }
    // Handle ISO string or Date object
    const d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [onboardingStatusFilter, setOnboardingStatusFilter] = useState('');

    // Modal State
    const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);

            const response = await api.get(`${ADMIN_USERS}?${params.toString()}`);
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchUsers();
        }, DEBOUNCE_MS);
        return () => clearTimeout(debounce);
    }, [fetchUsers]);

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await api.patch(adminUserStatus(userId), { isActive: !currentStatus });
            setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentStatus } : u));
            toast.success(`User ${!currentStatus ? 'activated' : 'suspended'} successfully`);
        } catch (error) {
            console.error('Failed to update user status', error);
            toast.error('Failed to update user status');
        }
    };

    const handleOpenReview = (user: User) => {
        if (!user.documents || user.documents.length === 0) {
            toast.info('No documents uploaded by this driver yet');
            return;
        }
        setSelectedDriver(user);
        setIsModalOpen(true);
    };

    const handleDocumentAction = async (docName: string, action: 'approve' | 'reject') => {
        if (!selectedDriver) return;

        try {
            await api.patch(adminUserDocuments(selectedDriver.id), {
                documentName: docName,
                status: action === 'approve' ? 'approved' : 'rejected'
            });

            const nextStatus: DocumentStatus = action === 'approve' ? 'approved' : 'rejected';
            const updatedDocs = selectedDriver.documents?.map(doc =>
                doc.name === docName ? { ...doc, status: nextStatus } : doc
            );

            setSelectedDriver({ ...selectedDriver, documents: updatedDocs });

            // Update the main list as well
            setUsers(users.map(u =>
                u.id === selectedDriver.id
                    ? { ...u, documents: updatedDocs }
                    : u
            ));

            toast.success(`Document ${action}d successfully`);
        } catch (error) {
            console.error('Failed to update document status', error);
            toast.error('Failed to update document status');
        }
    };

    const filteredUsers = users.filter((user) => {
        if (!onboardingStatusFilter) return true;
        if (user.role !== 'driver') return false;
        const status = (user.driverOnboarding?.status || '').toLowerCase();
        return status === onboardingStatusFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            placeholder="Search users..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">All Roles</option>
                        <option value="rider">Rider</option>
                        <option value="driver">Driver</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={onboardingStatusFilter}
                        onChange={(e) => setOnboardingStatusFilter(e.target.value)}
                    >
                        <option value="">All Onboarding</option>
                        <option value="pending_documents">Pending Documents</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="needs_resubmission">Needs Resubmission</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading users...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.displayName || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                <p className="text-xs text-gray-500">{user.phoneNumber}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="capitalize">{user.role}</span>
                                        </TableCell>
                                        <TableCell>
                                            {user.role === 'driver' && user.driverOnboarding?.status && user.driverOnboarding.status !== 'approved' ? (
                                                <Badge variant="warning">
                                                    {user.driverOnboarding.status.replace('_', ' ')}
                                                </Badge>
                                            ) : (
                                                <Badge variant={user.isActive ? 'success' : 'danger'}>
                                                    {user.isActive ? 'Active' : 'Suspended'}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.role === 'driver' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenReview(user)}
                                                        title="Review Documents"
                                                    >
                                                        <FileText size={16} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant={user.isActive ? 'danger' : 'primary'}
                                                    size="sm"
                                                    onClick={() => toggleUserStatus(user.id, user.isActive)}
                                                >
                                                    {user.isActive ? 'Suspend' : 'Activate'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {selectedDriver && (
                <DocumentReviewModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    driverName={selectedDriver.displayName || 'Driver'}
                    documents={selectedDriver.documents || []}
                    onApprove={(docName: string) => handleDocumentAction(docName, 'approve')}
                    onReject={(docName: string) => handleDocumentAction(docName, 'reject')}
                />
            )}
        </div>
    );
};

export default UsersPage;
