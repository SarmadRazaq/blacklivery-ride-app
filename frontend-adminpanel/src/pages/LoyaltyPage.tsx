import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Search, Star, Gift } from 'lucide-react';
import { toast } from 'react-toastify';
import { ADMIN_USERS } from '../api/endpoints';
import { ADMIN_LOYALTY_AWARD } from '../api/endpoints';
import { DEBOUNCE_MS } from '../config/constants';
import { LOYALTY_TIERS, TIER_BADGE_VARIANTS } from '../config/regions';

interface LoyaltyAccount {
    userId: string;
    displayName?: string;
    email?: string;
    points: number;
    tier: string;
    totalEarned: number;
    totalRedeemed: number;
}

interface LoyaltyUserDto {
    id: string;
    displayName?: string;
    email?: string;
    loyaltyPoints?: number;
    loyaltyTier?: string;
    loyaltyTotalEarned?: number;
    loyaltyTotalRedeemed?: number;
}

const tierColors = TIER_BADGE_VARIANTS;

const LoyaltyPage = () => {
    const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            const response = await api.get(`${ADMIN_USERS}?${params.toString()}`);
            // Map users to loyalty accounts (backend enriches user data with loyalty info)
            const users = (response.data || []) as LoyaltyUserDto[];
            const loyaltyAccounts: LoyaltyAccount[] = users.map((u) => ({
                userId: u.id,
                displayName: u.displayName || 'N/A',
                email: u.email,
                points: u.loyaltyPoints || 0,
                tier: u.loyaltyTier || 'bronze',
                totalEarned: u.loyaltyTotalEarned || 0,
                totalRedeemed: u.loyaltyTotalRedeemed || 0,
            }));
            setAccounts(loyaltyAccounts);
        } catch (error) {
            console.error('Failed to fetch loyalty accounts', error);
            toast.error('Failed to load loyalty data');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const debounce = setTimeout(fetchAccounts, DEBOUNCE_MS);
        return () => clearTimeout(debounce);
    }, [fetchAccounts]);

    const awardBonus = async (userId: string) => {
        const pointsStr = prompt('Enter bonus points to award:');
        if (!pointsStr) return;
        const points = parseInt(pointsStr, 10);
        if (isNaN(points) || points <= 0) {
            toast.error('Invalid points amount');
            return;
        }
        try {
            await api.post(ADMIN_LOYALTY_AWARD, { userId, type: 'loyalty_bonus', amount: points });
            toast.success(`Awarded ${points} bonus points`);
            fetchAccounts();
        } catch (error) {
            console.error('Failed to award bonus', error);
            toast.error('Failed to award bonus points');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Loyalty & Rewards</h1>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        placeholder="Search users..."
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tier Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {LOYALTY_TIERS.map(({ key, label, colorClass }) => {
                    const count = accounts.filter(a => a.tier === key).length;
                    return (
                        <div key={key} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                            <Star size={24} className={`mx-auto mb-2 ${colorClass}`} />
                            <p className="text-2xl font-bold text-gray-900">{count}</p>
                            <p className="text-sm text-gray-500 capitalize">{label} Members</p>
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
                                <TableHead>User</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Points</TableHead>
                                <TableHead>Total Earned</TableHead>
                                <TableHead>Total Redeemed</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">No users found</TableCell>
                                </TableRow>
                            ) : (
                                accounts.map(account => (
                                    <TableRow key={account.userId}>
                                        <TableCell>
                                            <p className="font-medium text-gray-900">{account.displayName}</p>
                                            <p className="text-xs text-gray-500">{account.email}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tierColors[account.tier] || 'default'}>
                                                {account.tier}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold">{account.points.toLocaleString()}</TableCell>
                                        <TableCell>{account.totalEarned.toLocaleString()}</TableCell>
                                        <TableCell>{account.totalRedeemed.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => awardBonus(account.userId)}>
                                                <Gift size={16} className="mr-1" /> Award Bonus
                                            </Button>
                                        </TableCell>
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

export default LoyaltyPage;
