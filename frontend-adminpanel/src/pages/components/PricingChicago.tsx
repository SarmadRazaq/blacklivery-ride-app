import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';
import { ADMIN_PRICING_CHICAGO } from '../../api/endpoints';
import { CHICAGO_VEHICLE_CATEGORIES, CHICAGO_AIRPORTS, getRegion } from '../../config/regions';

type PricingFormValues = Record<string, unknown>;

const PricingChicago = ({ initialData }: { initialData?: PricingFormValues }) => {
    const { register, handleSubmit, setValue } = useForm<PricingFormValues>();

    useEffect(() => {
        if (initialData) {
            Object.entries(initialData).forEach(([key, value]) => setValue(key, value));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get(ADMIN_PRICING_CHICAGO);
                if (response.data) {
                    Object.entries(response.data as PricingFormValues).forEach(([key, value]) => setValue(key, value));
                }
            } catch (error) {
                console.error('Failed to fetch Chicago pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: PricingFormValues) => {
        try {
            await api.put(ADMIN_PRICING_CHICAGO, data);
            toast.success('Chicago pricing updated');
        } catch {
            toast.error('Failed to update pricing');
        }
    };

    const chiRegion = getRegion('US-CHI');
    const cs = chiRegion.currencySymbol;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Platform Settings */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Settings</h3>
                <Input
                    label="Platform Commission (0.0 - 1.0)"
                    type="number"
                    step="0.01"
                    {...register('platformCommission', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500 mt-1">Example: 0.25 for 25%</p>
            </div>

            {/* Standard Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">1. Standard Rates (Per Mile / Minute)</h3>
                <div className="space-y-4">
                    {CHICAGO_VEHICLE_CATEGORIES.map(cat => (
                        <div key={cat.key} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <span className="font-medium">{cat.label}</span>
                            <Input label={`Base (${cs})`} type="number" step="0.01" {...register(`rates.${cat.key}.base`)} />
                            <Input label={`Per Mile (${cs})`} type="number" step="0.01" {...register(`rates.${cat.key}.perMile`)} />
                            <Input label={`Per Min (${cs})`} type="number" step="0.01" {...register(`rates.${cat.key}.perMin`)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Airport Fixed Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Airport Fixed Rates (City ↔ Airport)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {CHICAGO_AIRPORTS.map(airport => (
                        <div key={airport.code} className="space-y-4">
                            <h4 className="font-medium text-gray-700">{airport.label} ({airport.code})</h4>
                            {CHICAGO_VEHICLE_CATEGORIES.map(cat => (
                                <Input key={`${airport.code}-${cat.key}`} label={`${cat.label} (${cs})`} type="number" {...register(`airport.${airport.code}.${cat.key}`)} />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hourly Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Hourly Chauffeur Rates ({cs}/hr)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CHICAGO_VEHICLE_CATEGORIES.map(cat => (
                        <Input key={cat.key} label={`${cat.label} (${cs}/hr)`} type="number" {...register(`hourly.${cat.key}`)} />
                    ))}
                </div>
            </div>

            <Button type="submit" className="w-full">
                <Save size={18} className="mr-2" /> Save Chicago Pricing
            </Button>
        </form>
    );
};

export default PricingChicago;
