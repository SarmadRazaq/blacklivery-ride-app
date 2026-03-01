import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { auth } from '../firebase/config';
import { getHttpErrorMessage } from '../utils/httpError';
import { ENV } from '../config/env';
import { STORAGE_KEYS, ROUTES } from '../config/constants';

const api = axios.create({
    baseURL: ENV.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor — always refresh Firebase token before requests
api.interceptors.request.use(
    async (config) => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                // getIdToken() automatically refreshes if within 5 min of expiry
                const token = await currentUser.getIdToken();
                config.headers.Authorization = `Bearer ${token}`;
                localStorage.setItem(STORAGE_KEYS.TOKEN, token);
            }
        } catch (error) {
            console.error('Token refresh failed', error);
        }

        // Add Idempotency-Key for state-changing methods (only if not already set by caller)
        if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')
            && !config.headers['Idempotency-Key']) {
            config.headers['Idempotency-Key'] = uuidv4();
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Handle unauthorized access — sign out Firebase and let AuthContext handle redirect
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            auth.signOut().catch(() => {});
            // Only hard-redirect if not already on login page
            if (window.location.pathname !== ROUTES.LOGIN) {
                window.location.href = ROUTES.LOGIN;
            }
            return Promise.reject(error);
        }

        const suppressGlobalError = error?.config?.headers?.['X-Suppress-Global-Error'] === 'true';
        if (!suppressGlobalError) {
            toast.error(getHttpErrorMessage(error));
        }

        return Promise.reject(error);
    }
);

export default api;
