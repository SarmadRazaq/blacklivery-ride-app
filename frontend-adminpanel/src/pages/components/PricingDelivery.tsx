import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';
import { ADMIN_PRICING_DELIVERY } from '../../api/endpoints';
import { DELIVERY_VEHICLE_CATEGORIES, getRegion } from '../../config/regions';

type PricingFormValues = Record<string, unknown>;

const PricingDelivery = ({ initialData }: { initialData?: PricingFormValues }) => {
    const { register, handleSubmit, setValue } = useForm<PricingFormValues>();

    useEffect(() => {
        if (initialData) {
            Object.entries(initialData).forEach(([key, value]) => setValue(key, value));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get(ADMIN_PRICING_DELIVERY);
                if (response.data) {
                    Object.entries(response.data as PricingFormValues).forEach(([key, value]) => setValue(key, value));
                }
            } catch (error) {
                console.error('Failed to fetch Delivery pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: PricingFormValues) => {
        try {
            await api.put(ADMIN_PRICING_DELIVERY, data);
            toast.success('Delivery pricing updated');
        } catch {
            toast.error('Failed to update pricing');
        }
    };

    const ngRegion = getRegion('NG');
    const cs = ngRegion.currencySymbol;

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

            {/* Vehicle Categories */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">1. Vehicle Categories (Base, KM, Min)</h3>
                <div className="space-y-6">
                    {DELIVERY_VEHICLE_CATEGORIES.map(cat => (
                        <div key={cat.key} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <span className="font-medium">{cat.label}</span>
                            <Input label={`Base (${cs})`} type="number" {...register(`rates.${cat.key}.base`)} />
                            <Input label={`Per KM (${cs})`} type="number" {...register(`rates.${cat.key}.perKm`)} />
                            <Input label={`Per Min (${cs})`} type="number" {...register(`rates.${cat.key}.perMin`)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Multipliers */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Service Multipliers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Instant (x)" type="number" step="0.1" {...register('multipliers.instant')} />
                    <Input label="Scheduled (x)" type="number" step="0.1" {...register('multipliers.scheduled')} />
                    <Input label={`Fragile Item (+${cs})`} type="number" {...register('fees.fragile')} />
                </div>
            </div>

            {/* Extra Fees */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Extra Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label={`Extra Stop (Bike) ${cs}`} type="number" {...register('fees.extraStop.bike')} />
                    <Input label={`Extra Stop (Car) ${cs}`} type="number" {...register('fees.extraStop.car')} />
                    <Input label="Return Trip (%)" type="number" {...register('fees.returnTripPercent')} />
                </div>
            </div>

            <Button type="submit" className="w-full">
                <Save size={18} className="mr-2" /> Save Delivery Pricing
            </Button>
        </form>
    );
};

export default PricingDelivery;
