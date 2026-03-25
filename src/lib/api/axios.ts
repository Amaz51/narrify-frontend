import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const DJANGO_API_URL =
    process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8002/api';

// Django API instance (auth + audiobooks)
export const djangoApi = axios.create({
    baseURL: DJANGO_API_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
djangoApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = Cookies.get('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Auto-refresh access token on 401
djangoApi.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refreshToken = Cookies.get('refresh_token');

            if (refreshToken) {
                try {
                    const res = await axios.post(
                        `${DJANGO_API_URL}/auth/token/refresh/`,
                        { refresh: refreshToken }
                    );
                    const newAccess: string = res.data.access;
                    Cookies.set('access_token', newAccess, { expires: 1 });
                    if (original.headers) {
                        original.headers.Authorization = `Bearer ${newAccess}`;
                    }
                    return djangoApi(original);
                } catch {
                    Cookies.remove('access_token');
                    Cookies.remove('refresh_token');
                    if (typeof window !== 'undefined') {
                        window.location.href = '/auth/login';
                    }
                }
            } else {
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default djangoApi;
