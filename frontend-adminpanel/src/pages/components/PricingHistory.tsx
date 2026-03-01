import { useEffect, useState } from 'react';
import api from '../../api/client';
import { format } from 'date-fns';
import PricingNigeria from './PricingNigeria';
import PricingChicago from './PricingChicago';
import PricingDelivery from './PricingDelivery';
import Button from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { ADMIN_PRICING_HISTORY } from '../../api/endpoints';
import { PRICING_REGIONS } from '../../config/regions';

interface HistoryItem {
    id: string;
    type: 'pricing' | 'surge';
    region: string;
    data: Record<string, unknown>;
    updatedAt: { _seconds: number; _nanoseconds: number } | string;
    updatedBy: string;
    adminName: string;
}

const PricingHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get(ADMIN_PRICING_HISTORY);
                setHistory(response.data);
            } catch (error) {
                console.error('Failed to fetch pricing history', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading history...</div>;
    }

    if (selectedItem) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => setSelectedItem(null)}>
                        <ArrowLeft size={16} className="mr-2" /> Back to History
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold">
                            Viewing {selectedItem.type} config for {selectedItem.region}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Updated by {selectedItem.adminName} on {format(new Date(typeof selectedItem.updatedAt === 'string' ? selectedItem.updatedAt : selectedItem.updatedAt._seconds * 1000), 'MMM d, yyyy HH:mm')}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                        You are viewing a historical configuration. Clicking "Save" below will apply these settings as the current active configuration.
                    </div>

                    {selectedItem.region === 'nigeria' && <PricingNigeria initialData={selectedItem.data} />}
                    {selectedItem.region === 'chicago' && <PricingChicago initialData={selectedItem.data} />}
                    {selectedItem.region === 'nigeria_delivery' && <PricingDelivery initialData={selectedItem.data} />}
                    {/* Fallback for unknown regions or surge config visualization if needed */}
                    {!(PRICING_REGIONS as readonly string[]).includes(selectedItem.region) && (
                        <pre className="bg-gray-50 p-4 rounded overflow-auto">
                            {JSON.stringify(selectedItem.data, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return <div className="p-8 text-center text-gray-500">No history available.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Admin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Region
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((item) => {
                        const date = typeof item.updatedAt === 'string'
                            ? new Date(item.updatedAt)
                            : new Date(item.updatedAt._seconds * 1000);

                        return (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {format(date, 'MMM d, yyyy HH:mm')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.adminName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.type === 'pricing' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {item.type.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.region.toUpperCase()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        View & Edit
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PricingHistory;
