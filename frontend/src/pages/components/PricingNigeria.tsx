import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';

const PricingNigeria = ({ initialData }: { initialData?: any }) => {
    const { register, handleSubmit, setValue, watch } = useForm();
    const activeCity = watch('city', 'lagos');

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get('/v1/admin/pricing/nigeria');
                if (response.data) {
                    Object.keys(response.data).forEach(key => setValue(key, response.data[key]));
                }
            } catch (error) {
                console.error('Failed to fetch Nigeria pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: any) => {
        try {
            await api.put('/v1/admin/pricing/nigeria', data);
            toast.success('Nigeria pricing updated');
        } catch (error) {
            toast.error('Failed to update pricing');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex gap-4 mb-6">
                <Button
                    type="button"
                    variant={activeCity === 'lagos' ? 'primary' : 'outline'}
                    onClick={() => setValue('city', 'lagos')}
                >
                    Lagos
                </Button>
                <Button
                    type="button"
                    variant={activeCity === 'abuja' ? 'primary' : 'outline'}
                    onClick={() => setValue('city', 'abuja')}
                >
                    Abuja
                </Button>
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
                    <Input key={`${activeCity}-baseFare`} label="Base Fare (₦)" type="number" {...register(`pricing.${activeCity}.baseFare`)} />
                    <Input key={`${activeCity}-perMinute`} label="Cost Per Minute (₦)" type="number" {...register(`pricing.${activeCity}.perMinute`)} />
                    <Input key={`${activeCity}-waitTimeFee`} label="Wait Time Fee (₦/min)" type="number" {...register(`pricing.${activeCity}.waitTimeFee`)} />
                </div>
            </div>

            {/* Vehicle Categories */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Vehicle Categories (Cost Per KM & Min Fare)</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <span className="font-medium">Sedan (Luxury)</span>
                        <Input key={`${activeCity}-sedan-perKm`} label="Per KM (₦)" type="number" {...register(`categories.${activeCity}.sedan.perKm`)} />
                        <Input key={`${activeCity}-sedan-minFare`} label="Min Fare (₦)" type="number" {...register(`categories.${activeCity}.sedan.minFare`)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <span className="font-medium">SUV (Premium)</span>
                        <Input key={`${activeCity}-suv-perKm`} label="Per KM (₦)" type="number" {...register(`categories.${activeCity}.suv.perKm`)} />
                        <Input key={`${activeCity}-suv-minFare`} label="Min Fare (₦)" type="number" {...register(`categories.${activeCity}.suv.minFare`)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <span className="font-medium">XL (7-Seater)</span>
                        <Input key={`${activeCity}-xl-perKm`} label="Per KM (₦)" type="number" {...register(`categories.${activeCity}.xl.perKm`)} />
                        <Input key={`${activeCity}-xl-minFare`} label="Min Fare (₦)" type="number" {...register(`categories.${activeCity}.xl.minFare`)} />
                    </div>
                </div>
            </div>

            {/* Cancellation Fees */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Cancellation & No-Show Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input key={`${activeCity}-cancel-sedan`} label="Sedan Cancel (₦)" type="number" {...register(`fees.${activeCity}.cancellation.sedan`)} />
                    <Input key={`${activeCity}-cancel-suv`} label="SUV Cancel (₦)" type="number" {...register(`fees.${activeCity}.cancellation.suv`)} />
                    <Input key={`${activeCity}-cancel-xl`} label="XL Cancel (₦)" type="number" {...register(`fees.${activeCity}.cancellation.xl`)} />
                    <Input key={`${activeCity}-noshow-sedan`} label="Sedan No-Show (₦)" type="number" {...register(`fees.${activeCity}.noShow.sedan`)} />
                    <Input key={`${activeCity}-noshow-suv`} label="SUV No-Show (₦)" type="number" {...register(`fees.${activeCity}.noShow.suv`)} />
                    <Input key={`${activeCity}-noshow-xl`} label="XL No-Show (₦)" type="number" {...register(`fees.${activeCity}.noShow.xl`)} />
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
