import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';
import { ADMIN_PRICING_NIGERIA } from '../../api/endpoints';
import { NIGERIA_DEFAULT_CITY, NIGERIA_VEHICLE_CATEGORIES, getRegion } from '../../config/regions';

type PricingFormValues = Record<string, unknown>;

const PricingNigeria = ({ initialData }: { initialData?: PricingFormValues }) => {
    const { register, handleSubmit, setValue, control } = useForm<PricingFormValues>();
    const activeCity = (useWatch({ control, name: 'city', defaultValue: NIGERIA_DEFAULT_CITY }) as string) || NIGERIA_DEFAULT_CITY;

    useEffect(() => {
        if (initialData) {
            Object.entries(initialData).forEach(([key, value]) => setValue(key, value));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get(ADMIN_PRICING_NIGERIA);
                if (response.data) {
                    Object.entries(response.data as PricingFormValues).forEach(([key, value]) => setValue(key, value));
                }
            } catch (error) {
                console.error('Failed to fetch Nigeria pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: PricingFormValues) => {
        try {
            await api.put(ADMIN_PRICING_NIGERIA, data);
            toast.success('Nigeria pricing updated');
        } catch {
            toast.error('Failed to update pricing');
        }
    };

    const ngRegion = getRegion('NG');
    const cs = ngRegion.currencySymbol;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex gap-4 mb-6">
                {ngRegion.cities?.map(city => (
                    <Button
                        key={city.code}
                        type="button"
                        variant={activeCity === city.code ? 'primary' : 'outline'}
                        onClick={() => setValue('city', city.code)}
                    >
                        {city.label}
                    </Button>
                ))}
                <input type="hidden" {...register('city')} value={activeCity} />
            </div>

            {/* Platform Settings */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Settings</h3>
                <Input
                    label="Platform Commission (0.0 - 1.0)"
                    type="number"
                    step="0.01"
                    {...register('platformCommission', { valueAsNumber: true })}
                />
                <p className="text-xs text-gray-500 mt-1">Example: 0.25 for 25%</p>
            </div>

            {/* Base Pricing */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">1. Base Pricing ({activeCity.toUpperCase()})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input key={`${activeCity}-baseFare`} label={`Base Fare (${cs})`} type="number" {...register(`pricing.${activeCity}.baseFare`)} />
                    <Input key={`${activeCity}-perMinute`} label={`Cost Per Minute (${cs})`} type="number" {...register(`pricing.${activeCity}.perMinute`)} />
                    <Input key={`${activeCity}-waitTimeFee`} label={`Wait Time Fee (${cs}/min)`} type="number" {...register(`pricing.${activeCity}.waitTimeFee`)} />
                </div>
            </div>

            {/* Vehicle Categories */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Vehicle Categories (Cost Per KM & Min Fare)</h3>
                <div className="space-y-4">
                    {NIGERIA_VEHICLE_CATEGORIES.map(cat => (
                        <div key={cat.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <span className="font-medium">{cat.label}</span>
                            <Input key={`${activeCity}-${cat.key}-perKm`} label={`Per KM (${cs})`} type="number" {...register(`categories.${activeCity}.${cat.key}.perKm`)} />
                            <Input key={`${activeCity}-${cat.key}-minFare`} label={`Min Fare (${cs})`} type="number" {...register(`categories.${activeCity}.${cat.key}.minFare`)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Cancellation Fees */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Cancellation & No-Show Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {NIGERIA_VEHICLE_CATEGORIES.map(cat => (
                        <Input key={`${activeCity}-cancel-${cat.key}`} label={`${cat.label} Cancel (${cs})`} type="number" {...register(`fees.${activeCity}.cancellation.${cat.key}`)} />
                    ))}
                    {NIGERIA_VEHICLE_CATEGORIES.map(cat => (
                        <Input key={`${activeCity}-noshow-${cat.key}`} label={`${cat.label} No-Show (${cs})`} type="number" {...register(`fees.${activeCity}.noShow.${cat.key}`)} />
                    ))}
                </div>
            </div>

            {/* Surge Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">4. Surge Multipliers</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input key={`${activeCity}-surge-peak`} label="Peak Hours (1.2x - 1.5x)" type="number" step="0.1" {...register(`surge.${activeCity}.peak`)} />
                    <Input key={`${activeCity}-surge-high`} label="High Demand (1.5x - 2.0x)" type="number" step="0.1" {...register(`surge.${activeCity}.high`)} />
                    <Input key={`${activeCity}-surge-extreme`} label="Extreme (2.0x - 3.0x)" type="number" step="0.1" {...register(`surge.${activeCity}.extreme`)} />
                    <div className="flex items-center mt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4" {...register(`surge.${activeCity}.forceActive`)} />
                            <span>Force Surge</span>
                        </label>
                    </div>
                </div>
            </div>

            <Button type="submit" className="w-full">
                <Save size={18} className="mr-2" /> Save Nigeria Pricing
            </Button>
        </form>
    );
};

export default PricingNigeria;
