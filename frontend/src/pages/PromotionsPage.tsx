import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toast } from 'react-toastify';
import { Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface Promotion {
    id: string;
    code: string;
    discountType: 'percentage' | 'flat';
    amount: number;
    maxRedemptions: number;
    startsAt: string;
    endsAt: string;
    active: boolean;
    regions?: string[];
    description?: string;
}

const EditPromotionForm = ({ promotion, onCancel, onSuccess }: { promotion: Promotion; onCancel: () => void; onSuccess: () => void }) => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            ...promotion,
            startsAt: promotion.startsAt ? new Date(promotion.startsAt).toISOString().split('T')[0] : '',
            endsAt: promotion.endsAt ? new Date(promotion.endsAt).toISOString().split('T')[0] : '',
            regions: promotion.regions && promotion.regions.length > 0 ? promotion.regions[0] : 'NG'
        }
    });

    const onSubmit = async (data: any) => {
        try {
            const payload = {
                description: data.description || undefined,
                discountType: data.discountType,
                amount: parseFloat(data.amount),
                maxRedemptions: parseInt(data.maxRedemptions),
                regions: [data.regions],
                startsAt: new Date(data.startsAt).toISOString(),
                endsAt: data.endsAt ? new Date(data.endsAt).toISOString() : null,
                active: data.active === 'true' || data.active === true
            };

            await api.put(`/v1/admin/promotions/${promotion.id}`, payload);
            toast.success('Promotion updated successfully');
            onSuccess();
        } catch (error: any) {
            console.error('Update promotion error:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to update promotion');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Promo Code"
                    {...register('code', { required: 'Code is required' })}
                    error={errors.code?.message as string}
                    disabled
                />
                <Input
                    label="Description"
                    {...register('description')}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        {...register('discountType')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="percentage">Percentage</option>
                        <option value="flat">Flat Amount</option>
                    </select>
                </div>
                <Input
                    label="Amount"
                    type="number"
                    {...register('amount', { required: true })}
                />
                <Input
                    label="Max Redemptions"
                    type="number"
                    {...register('maxRedemptions', { required: true })}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        {...register('active')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                    label="Start Date"
                    type="date"
                    {...register('startsAt', { required: true })}
                />
                <Input
                    label="End Date"
                    type="date"
                    {...register('endsAt')}
                />
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                        {...register('regions')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="NG">Nigeria</option>
                        <option value="US-CHI">Chicago</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
            </div>
        </form>
    );
};

const PromotionsPage = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedPromoId, setExpandedPromoId] = useState<string | null>(null);
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/v1/admin/promotions');
            setPromotions(response.data || []);
        } catch (error) {
            console.error('Failed to fetch promotions', error);
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions();
    }, []);

    const onSubmit = async (data: any) => {
        try {
            const payload = {
                ...data,
                amount: parseFloat(data.amount),
                maxRedemptions: parseInt(data.maxRedemptions),
                regions: data.regions ? [data.regions] : ['NG'], // Simplified region select
                startsAt: new Date(data.startsAt).toISOString(),
                endsAt: new Date(data.endsAt).toISOString()
            };

            await api.post('/v1/admin/promotions', payload);
            toast.success('Promotion created successfully');
            setShowCreateModal(false);
            reset();
            fetchPromotions();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create promotion');
        }
    };

    const toggleStatus = async (promo: Promotion) => {
        try {
            await api.put(`/v1/admin/promotions/${promo.id}`, {
                active: !promo.active
            });
            toast.success(`Promotion ${promo.active ? 'suspended' : 'activated'}`);
            fetchPromotions();
        } catch (error) {
            toast.error('Failed to update promotion status');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} className="mr-2" />
                    Create Promotion
                </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Usage Limit</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {promotions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No promotions found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                promotions.map((promo) => (
                                    <React.Fragment key={promo.id}>
                                        <TableRow className={expandedPromoId === promo.id ? 'bg-blue-50' : ''}>
                                            <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                                            <TableCell className="capitalize">{promo.discountType}</TableCell>
                                            <TableCell>
                                                {promo.discountType === 'percentage' ? `${promo.amount}%` : `₦${promo.amount}`}
                                            </TableCell>
                                            <TableCell>{promo.maxRedemptions}</TableCell>
                                            <TableCell>
                                                <Badge variant={promo.active ? 'success' : 'default'}>
                                                    {promo.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : 'No Expiry'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant={promo.active ? 'danger' : 'primary'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleStatus(promo);
                                                        }}
                                                    >
                                                        {promo.active ? 'Suspend' : 'Activate'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={expandedPromoId === promo.id ? 'primary' : 'outline'}
                                                        onClick={() => setExpandedPromoId(expandedPromoId === promo.id ? null : promo.id)}
                                                    >
                                                        {expandedPromoId === promo.id ? 'Close' : 'Edit'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedPromoId === promo.id && (
                                            <TableRow key={`${promo.id}-edit`}>
                                                <TableCell colSpan={7} className="p-4 bg-gray-50">
                                                    <EditPromotionForm
                                                        promotion={promo}
                                                        onCancel={() => setExpandedPromoId(null)}
                                                        onSuccess={() => {
                                                            setExpandedPromoId(null);
                                                            fetchPromotions();
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h2 className="text-xl font-bold">Create Promotion</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <Input
                                label="Promo Code"
                                {...register('code', { required: 'Code is required' })}
                                error={errors.code?.message as string}
                            />
                            <Input
                                label="Description"
                                {...register('description', { required: 'Description is required' })}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        {...register('discountType')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="flat">Flat Amount</option>
                                    </select>
                                </div>
                                <Input
                                    label="Amount"
                                    type="number"
                                    {...register('amount', { required: true })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Start Date"
                                    type="date"
                                    {...register('startsAt', { required: true })}
                                />
                                <Input
                                    label="End Date"
                                    type="date"
                                    {...register('endsAt')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Max Redemptions"
                                    type="number"
                                    {...register('maxRedemptions', { required: true })}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                                    <select
                                        {...register('regions')}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="NG">Nigeria</option>
                                        <option value="US-CHI">Chicago</option>
                                    </select>
                                </div>
                            </div>

                            <Button type="submit" className="w-full mt-4">Create Promotion</Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionsPage;
