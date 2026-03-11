import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Sidebar />
            <main className="lg:ml-64 p-4 pt-16 lg:pt-8 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
