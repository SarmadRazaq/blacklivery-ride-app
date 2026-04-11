import { useState } from 'react';
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
    Star,
    Menu,
    X,
    Map,
    UserCheck,
    CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';
import { APP_NAME, APP_SUBTITLE, SIDEBAR_WIDTH_CLASS } from '../config/constants';

const Sidebar = () => {
    const { logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close sidebar on navigation (mobile)
    const handleNavClick = () => setMobileOpen(false);

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
        { to: '/live-map', icon: Map, label: 'Live Map' },
        { to: '/driver-approvals', icon: UserCheck, label: 'Driver Approvals' },
        { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    ];

    const sidebarContent = (
        <>
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">{APP_NAME}</h1>
                    <p className="text-xs text-gray-400 mt-1">{APP_SUBTITLE}</p>
                </div>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden text-gray-400 hover:text-white"
                >
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={handleNavClick}
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
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar (slide-in) */}
            <div className={clsx(
                'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300',
                mobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                {sidebarContent}
            </div>

            {/* Desktop sidebar (always visible) */}
            <div className={`hidden lg:flex h-screen ${SIDEBAR_WIDTH_CLASS} bg-gray-900 text-white flex-col fixed left-0 top-0`}>
                {sidebarContent}
            </div>
        </>
    );
};

export default Sidebar;
