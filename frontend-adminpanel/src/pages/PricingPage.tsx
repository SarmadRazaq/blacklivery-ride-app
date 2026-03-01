import { useState } from 'react';
import PricingNigeria from './components/PricingNigeria';
import PricingChicago from './components/PricingChicago';
import PricingDelivery from './components/PricingDelivery';
import PricingHistory from './components/PricingHistory';

const PricingPage = () => {
    const [activeTab, setActiveTab] = useState<'nigeria' | 'chicago' | 'delivery' | 'history'>('nigeria');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Pricing & Surge Control</h1>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'nigeria' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('nigeria')}
                    >
                        Nigeria (Rides)
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'chicago' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('chicago')}
                    >
                        Chicago (Premium)
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'delivery' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('delivery')}
                    >
                        Delivery (NG)
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                {activeTab === 'nigeria' && <PricingNigeria />}
                {activeTab === 'chicago' && <PricingChicago />}
                {activeTab === 'delivery' && <PricingDelivery />}
                {activeTab === 'history' && <PricingHistory />}
            </div>
        </div>
    );
};

export default PricingPage;

