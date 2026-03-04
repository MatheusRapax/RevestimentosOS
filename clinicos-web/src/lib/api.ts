import axios from 'axios';

const isServer = typeof window === 'undefined';

const api = axios.create({
    // If running on Next.js Server (SSR), talk directly via Docker network.
    // If running on the user's browser, fetch `/api` via NGINX Proxy.
    baseURL: isServer ? (process.env.INTERNAL_API_URL || 'http://backend:3000') : '/api',
});

// Request interceptor
api.interceptors.request.use((config) => {
    // Add auth token
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const clinicId = localStorage.getItem('clinicId');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add clinic header
        if (clinicId) {
            config.headers['X-Clinic-Id'] = clinicId;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Only log actual API errors, not cancelled requests
        if (error?.response?.status) {
            try {
                const status = error.response.status;
                const url = error.config?.url;
                const data = error.response.data;
                const message = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'No message';

                console.error(`❌ API Error [${status}] ${url}:`, message);
            } catch (loggingError) {
                console.error('❌ API Error (Raw):', error.message);
            }
        }

        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('clinicId');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
