import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Search, Truck, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { ADMIN_USERS_DRIVERS, adminVehicleStatus } from '../api/endpoints';
import { DEBOUNCE_MS } from '../config/constants';
import { VEHICLE_CATEGORIES } from '../config/regions';

interface Vehicle {
    id: string;
    ownerId: string;
    ownerName?: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    category: string;
    status: 'active' | 'inactive' | 'pending';
    region?: string;
}

interface DriverVehicleDto {
    id: string;
    displayName?: string;
    isActive: boolean;
    region?: string;
    vehicle?: {
        id?: string;
        make?: string;
        model?: string;
        year?: number;
        color?: string;
        plateNumber?: string;
        category?: string;
    };
}

const VehiclesPage = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [updatingVehicles, setUpdatingVehicles] = useState<Set<string>>(new Set());

    const updateVehicleStatus = async (vehicleId: string, isApproved: boolean) => {
        const action = isApproved ? 'approve' : 'reject';
        if (!window.confirm(`Are you sure you want to ${action} this vehicle?`)) return;
        setUpdatingVehicles(prev => new Set(prev).add(vehicleId));
        try {
            await api.patch(adminVehicleStatus(vehicleId), {
                isApproved,
                ...(!isApproved && { rejectionReason: 'Rejected by admin' }),
            });
            setVehicles(prev => prev.map(v =>
                v.id === vehicleId ? { ...v, status: isApproved ? 'active' : 'inactive' } : v
            ));
            toast.success(`Vehicle ${action}d successfully`);
        } catch (error) {
            console.error(`Failed to ${action} vehicle`, error);
            toast.error(`Failed to ${action} vehicle`);
        } finally {
            setUpdatingVehicles(prev => { const s = new Set(prev); s.delete(vehicleId); return s; });
        }
    };

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (categoryFilter) params.append('category', categoryFilter);
            // Fetch drivers and extract vehicle info
            const response = await api.get(ADMIN_USERS_DRIVERS);
            const drivers = (response.data || []) as DriverVehicleDto[];
            const vehicleList: Vehicle[] = [];
            drivers.forEach((driver) => {
                if (driver.vehicle) {
                    vehicleList.push({
                        id: driver.vehicle.id || driver.id,
                        ownerId: driver.id,
                        ownerName: driver.displayName || 'N/A',
                        make: driver.vehicle.make || 'N/A',
                        model: driver.vehicle.model || 'N/A',
                        year: driver.vehicle.year || 0,
                        color: driver.vehicle.color || 'N/A',
                        plateNumber: driver.vehicle.plateNumber || 'N/A',
                        category: driver.vehicle.category || 'standard',
                        status: driver.isActive ? 'active' : 'inactive',
                        region: driver.region || 'N/A',
                    });
                }
            });
            
            let filtered = vehicleList;
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(v => 
                    v.plateNumber.toLowerCase().includes(s) ||
                    v.ownerName?.toLowerCase().includes(s) ||
                    v.make.toLowerCase().includes(s) ||
                    v.model.toLowerCase().includes(s)
                );
            }
            if (categoryFilter) {
                filtered = filtered.filter(v => v.category === categoryFilter);
            }
            setVehicles(filtered);
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
            toast.error('Failed to load vehicles');
        } finally {
            setLoading(false);
        }
    }, [search, categoryFilter]);

    useEffect(() => {
        const debounce = setTimeout(fetchVehicles, DEBOUNCE_MS);
        return () => clearTimeout(debounce);
    }, [fetchVehicles]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Vehicle Management</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            placeholder="Search vehicles..."
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {VEHICLE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                    <Truck size={24} className="mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold text-gray-900">{vehicles.length}</p>
                    <p className="text-sm text-gray-500">Total Vehicles</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                    <p className="text-2xl font-bold text-green-600">{vehicles.filter(v => v.status === 'active').length}</p>
                    <p className="text-sm text-gray-500">Active</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                    <p className="text-2xl font-bold text-gray-400">{vehicles.filter(v => v.status === 'inactive').length}</p>
                    <p className="text-sm text-gray-500">Inactive</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center">
                    <p className="text-2xl font-bold text-yellow-500">{vehicles.filter(v => v.status === 'pending').length}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Plate Number</TableHead>
                                <TableHead>Make & Model</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Region</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">No vehicles found</TableCell>
                                </TableRow>
                            ) : (
                                vehicles.map(vehicle => (
                                    <TableRow key={vehicle.id}>
                                        <TableCell className="font-mono font-medium">{vehicle.plateNumber}</TableCell>
                                        <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                                        <TableCell>{vehicle.year || 'N/A'}</TableCell>
                                        <TableCell className="capitalize">{vehicle.color}</TableCell>
                                        <TableCell>
                                            <Badge variant="info">{vehicle.category.replace('_', ' ')}</Badge>
                                        </TableCell>
                                        <TableCell>{vehicle.ownerName}</TableCell>
                                        <TableCell>{vehicle.region}</TableCell>
                                        <TableCell>
                                            <Badge variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'pending' ? 'warning' : 'danger'}>
                                                {vehicle.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {vehicle.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            title="Approve Vehicle"
                                                            onClick={() => updateVehicleStatus(vehicle.id, true)}
                                                            disabled={updatingVehicles.has(vehicle.id)}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            title="Reject Vehicle"
                                                            onClick={() => updateVehicleStatus(vehicle.id, false)}
                                                            disabled={updatingVehicles.has(vehicle.id)}
                                                        >
                                                            <XCircle size={16} />
                                                        </Button>
                                                    </>
                                                )}
                                                {vehicle.status === 'inactive' && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        title="Re-approve Vehicle"
                                                        onClick={() => updateVehicleStatus(vehicle.id, true)}
                                                        disabled={updatingVehicles.has(vehicle.id)}
                                                    >
                                                        <CheckCircle size={16} />
                                                    </Button>
                                                )}
                                            </div>
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

export default VehiclesPage;
