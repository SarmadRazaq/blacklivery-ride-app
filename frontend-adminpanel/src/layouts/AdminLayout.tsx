import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { MAIN_CONTENT_MARGIN_CLASS } from '../config/constants';

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <Sidebar />
            <main className={`${MAIN_CONTENT_MARGIN_CLASS} p-8`}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
