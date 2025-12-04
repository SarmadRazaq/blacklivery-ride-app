import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { toast } from 'react-toastify';

const PricingChicago = ({ initialData }: { initialData?: any }) => {
    const { register, handleSubmit, setValue } = useForm();

    useEffect(() => {
        if (initialData) {
            Object.keys(initialData).forEach(key => setValue(key, initialData[key]));
            return;
        }

        const fetchPricing = async () => {
            try {
                const response = await api.get('/v1/admin/pricing/chicago');
                if (response.data) {
                    Object.keys(response.data).forEach(key => setValue(key, response.data[key]));
                }
            } catch (error) {
                console.error('Failed to fetch Chicago pricing', error);
            }
        };
        fetchPricing();
    }, [setValue, initialData]);

    const onSubmit = async (data: any) => {
        try {
            await api.put('/v1/admin/pricing/chicago', data);
            toast.success('Chicago pricing updated');
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

            {/* Standard Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">1. Standard Rates (Per Mile / Minute)</h3>
                <div className="space-y-4">
                    {/* Business Sedan */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">Business Sedan</span>
                        <Input label="Base ($)" type="number" step="0.01" {...register('rates.business_sedan.base')} />
                        <Input label="Per Mile ($)" type="number" step="0.01" {...register('rates.business_sedan.perMile')} />
                        <Input label="Per Min ($)" type="number" step="0.01" {...register('rates.business_sedan.perMin')} />
                    </div>
                    {/* Business SUV */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">Business SUV</span>
                        <Input label="Base ($)" type="number" step="0.01" {...register('rates.business_suv.base')} />
                        <Input label="Per Mile ($)" type="number" step="0.01" {...register('rates.business_suv.perMile')} />
                        <Input label="Per Min ($)" type="number" step="0.01" {...register('rates.business_suv.perMin')} />
                    </div>
                    {/* First Class */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <span className="font-medium">First Class</span>
                        <Input label="Base ($)" type="number" step="0.01" {...register('rates.first_class.base')} />
                        <Input label="Per Mile ($)" type="number" step="0.01" {...register('rates.first_class.perMile')} />
                        <Input label="Per Min ($)" type="number" step="0.01" {...register('rates.first_class.perMin')} />
                    </div>
                </div>
            </div>

            {/* Airport Fixed Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">2. Airport Fixed Rates (City ↔ Airport)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">O'Hare (ORD)</h4>
                        <Input label="Sedan ($)" type="number" {...register('airport.ORD.business_sedan')} />
                        <Input label="SUV ($)" type="number" {...register('airport.ORD.business_suv')} />
                        <Input label="First Class ($)" type="number" {...register('airport.ORD.first_class')} />
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">Midway (MDW)</h4>
                        <Input label="Sedan ($)" type="number" {...register('airport.MDW.business_sedan')} />
                        <Input label="SUV ($)" type="number" {...register('airport.MDW.business_suv')} />
                        <Input label="First Class ($)" type="number" {...register('airport.MDW.first_class')} />
                    </div>
                </div>
            </div>

            {/* Hourly Rates */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">3. Hourly Chauffeur Rates ($/hr)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input label="Sedan ($/hr)" type="number" {...register('hourly.business_sedan')} />
                    <Input label="SUV ($/hr)" type="number" {...register('hourly.business_suv')} />
                    <Input label="First Class ($/hr)" type="number" {...register('hourly.first_class')} />
                </div>
            </div>

            <Button type="submit" className="w-full">
                <Save size={18} className="mr-2" /> Save Chicago Pricing
            </Button>
        </form>
    );
};

export default PricingChicago;
