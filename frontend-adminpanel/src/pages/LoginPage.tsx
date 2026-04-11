import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { APP_NAME, APP_LOGIN_SUBTITLE, APP_LOGIN_PLACEHOLDER_EMAIL } from '../config/constants';

interface LoginFormData {
    email: string;
    password: string;
}

const LoginPage = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>();
    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user?.role === 'admin') {
            navigate('/', { replace: true });
        }
    }, [loading, user, navigate]);

    const onSubmit = async (data: LoginFormData) => {
        try {
            await login(data.email, data.password);
            toast.success('Welcome back!');
        } catch (error: unknown) {
            console.error(error);
            // Show the actual error from Firebase (e.g. "Wrong password")
            const message = error instanceof Error ? error.message : 'Login failed';
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-blue-500">{APP_NAME}</h1>
                    <p className="text-gray-400 mt-2">{APP_LOGIN_SUBTITLE}</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                        <input
                            {...register('email', { required: 'Email is required' })}
                            type="email"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            placeholder={APP_LOGIN_PLACEHOLDER_EMAIL}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{String(errors.email.message)}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <input
                            {...register('password', { required: 'Password is required' })}
                            type="password"
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            placeholder="••••••••"
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{String(errors.password.message)}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
