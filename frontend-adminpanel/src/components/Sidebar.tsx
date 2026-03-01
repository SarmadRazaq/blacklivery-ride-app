import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Car,
    DollarSign,
    AlertCircle,
    Gift,
    Headphones,
    LogOut,
    Package,
    Truck,
    BarChart3,
    Wallet,
    Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { APP_NAME, APP_SUBTITLE, SIDEBAR_WIDTH_CLASS } from '../config/constants';

const Sidebar = () => {
    const { logout } = useAuth();

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/rides', icon: Car, label: 'Rides' },
        { to: '/deliveries', icon: Package, label: 'Deliveries' },
        { to: '/vehicles', icon: Truck, label: 'Vehicles' },
        { to: '/pricing', icon: DollarSign, label: 'Pricing & Surge' },
        { to: '/disputes', icon: AlertCircle, label: 'Disputes' },
        { to: '/promotions', icon: Gift, label: 'Promotions' },
        { to: '/loyalty', icon: Star, label: 'Loyalty' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/payouts', icon: Wallet, label: 'Payouts' },
        { to: '/support', icon: Headphones, label: 'Support' },
    ];

    return (
        <div className={`h-screen ${SIDEBAR_WIDTH_CLASS} bg-gray-900 text-white flex flex-col fixed left-0 top-0`}>
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-2xl font-bold text-blue-500">{APP_NAME}</h1>
                <p className="text-xs text-gray-400 mt-1">{APP_SUBTITLE}</p>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )
                        }
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
