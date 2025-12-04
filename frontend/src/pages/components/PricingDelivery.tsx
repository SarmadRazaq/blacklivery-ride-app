import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';

const PricingDelivery = ({ initialData }: { initialData?: any }) => {
    const { register, handleSubmit, setValue } = useForm();

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get('/v1/admin/pricing/nigeria_delivery');
                if (response.data) {
                    Object.keys(response.data).forEach(key => setValue(key, response.data[key]));
                }
            } catch (error) {
                console.error('Failed to fetch Delivery pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: any) => {
        try {
            await api.put('/v1/admin/pricing/nigeria_delivery', data);
            toast.success('Delivery pricing updated');
        } catch (error) {
            toast.error('Failed to update pricing');
        }
    };

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
                    {/* Motorbike */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">Motorbike</span>
                        <Input label="Base (₦)" type="number" {...register('rates.motorbike.base')} />
                        <Input label="Per KM (₦)" type="number" {...register('rates.motorbike.perKm')} />
                        <Input label="Per Min (₦)" type="number" {...register('rates.motorbike.perMin')} />
                    </div>
                    {/* Sedan */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">Sedan</span>
                        <Input label="Base (₦)" type="number" {...register('rates.sedan.base')} />
                        <Input label="Per KM (₦)" type="number" {...register('rates.sedan.perKm')} />
                        <Input label="Per Min (₦)" type="number" {...register('rates.sedan.perMin')} />
                    </div>
                    {/* SUV */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">SUV</span>
                        <Input label="Base (₦)" type="number" {...register('rates.suv.base')} />
                        <Input label="Per KM (₦)" type="number" {...register('rates.suv.perKm')} />
                        <Input label="Per Min (₦)" type="number" {...register('rates.suv.perMin')} />
                    </div>
                    {/* Van */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">Van / Truck</span>
                        <Input label="Base (₦)" type="number" {...register('rates.van.base')} />
                        <Input label="Per KM (₦)" type="number" {...register('rates.van.perKm')} />
                        <Input label="Per Min (₦)" type="number" {...register('rates.van.perMin')} />
                    </div>
                </div>
            </div>

            {/* Multipliers */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Service Multipliers</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Instant (x)" type="number" step="0.1" {...register('multipliers.instant')} />
                    <Input label="Scheduled (x)" type="number" step="0.1" {...register('multipliers.scheduled')} />
                    <Input label="Fragile Item (+₦)" type="number" {...register('fees.fragile')} />
                </div>
            </div>

            {/* Extra Fees */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Extra Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Extra Stop (Bike) ₦" type="number" {...register('fees.extraStop.bike')} />
                    <Input label="Extra Stop (Car) ₦" type="number" {...register('fees.extraStop.car')} />
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
