import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import RidesPage from './pages/RidesPage';
import PricingPage from './pages/PricingPage';
import DisputesPage from './pages/DisputesPage';
import PromotionsPage from './pages/PromotionsPage';
import SupportPage from './pages/SupportPage';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />

                        <Route path="/" element={
                            <ProtectedRoute>
                                <AdminLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<DashboardPage />} />
                            {/* Add other routes here later */}
                            <Route path="users" element={<UsersPage />} />
                            <Route path="rides" element={<RidesPage />} />
                            <Route path="pricing" element={<PricingPage />} />
                            <Route path="disputes" element={<DisputesPage />} />
                            <Route path="promotions" element={<PromotionsPage />} />
                            <Route path="support" element={<SupportPage />} />
                        </Route>
                    </Routes>
                    <ToastContainer position="top-right" autoClose={3000} />
                </BrowserRouter>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
