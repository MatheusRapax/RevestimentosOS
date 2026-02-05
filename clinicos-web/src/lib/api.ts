import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.moa.software',
});

// Request interceptor
api.interceptors.request.use((config) => {
    // Add auth token
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const clinicId = localStorage.getItem('clinicId');

        console.log('🔵 API Request Interceptor:', {
            url: config.url,
            method: config.method,
            hasToken: !!token,
            clinicId: clinicId,
            headers: config.headers
        });

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add clinic header
        if (clinicId) {
            config.headers['X-Clinic-Id'] = clinicId;
            console.log('✅ X-Clinic-Id header added:', clinicId);
        } else {
            console.warn('⚠️ No clinicId in localStorage!');
        }

        console.log('📤 Final headers:', config.headers);
    }

    return config;
});

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log('✅ API Response:', response.status, response.config.url);
        return response;
    },
    (error) => {
        console.error('❌ API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.response?.data?.message || 'No message',
            data: error.response?.data ? JSON.stringify(error.response.data) : 'No data',
            fullError: error.toJSON ? error.toJSON() : error
        });

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
