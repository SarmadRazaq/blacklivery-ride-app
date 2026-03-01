import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TOAST_AUTO_CLOSE_MS } from './config/constants';

import AdminLayout from './layouts/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages for code-splitting
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const RidesPage = React.lazy(() => import('./pages/RidesPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const DisputesPage = React.lazy(() => import('./pages/DisputesPage'));
const PromotionsPage = React.lazy(() => import('./pages/PromotionsPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const LoyaltyPage = React.lazy(() => import('./pages/LoyaltyPage'));
const VehiclesPage = React.lazy(() => import('./pages/VehiclesPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const PayoutsPage = React.lazy(() => import('./pages/PayoutsPage'));
const DeliveriesPage = React.lazy(() => import('./pages/DeliveriesPage'));

// Protected Route Component — requires admin role
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'admin') {
        return <div className="flex items-center justify-center h-screen text-red-600">
            Access Denied. Admin role required.
        </div>;
    }

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <BrowserRouter>
                    <ErrorBoundary>
                        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                            <Routes>
                                <Route path="/login" element={<LoginPage />} />

                                <Route path="/" element={
                                    <ProtectedRoute>
                                        <AdminLayout />
                                    </ProtectedRoute>
                                }>
                                    <Route index element={<DashboardPage />} />
                                    <Route path="users" element={<UsersPage />} />
                                    <Route path="rides" element={<RidesPage />} />
                                    <Route path="deliveries" element={<DeliveriesPage />} />
                                    <Route path="vehicles" element={<VehiclesPage />} />
                                    <Route path="pricing" element={<PricingPage />} />
                                    <Route path="disputes" element={<DisputesPage />} />
                                    <Route path="promotions" element={<PromotionsPage />} />
                                    <Route path="loyalty" element={<LoyaltyPage />} />
                                    <Route path="analytics" element={<AnalyticsPage />} />
                                    <Route path="payouts" element={<PayoutsPage />} />
                                    <Route path="support" element={<SupportPage />} />
                                </Route>

                                {/* Catch-all: redirect unknown routes to dashboard */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                    </ErrorBoundary>
                    <ToastContainer position="top-right" autoClose={TOAST_AUTO_CLOSE_MS} />
                </BrowserRouter>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
