import { djangoApi } from './axios';

export interface LoginPayload {
    username: string;
    password: string;
}

export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    password2: string;
    full_name?: string;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone_number: string;
    subscription_plan: string;
    audiobooks_created: number;
    total_minutes_generated: number;
    created_at: string;
    is_staff: boolean;
}

export interface AuthResponse {
    access: string;
    refresh: string;
    user: UserProfile;
}

export interface UpdateProfilePayload {
    full_name?: string;
    email?: string;
    phone_number?: string;
}

export interface ChangePasswordPayload {
    current_password: string;
    new_password: string;
}

export const authApi = {
    login: (payload: LoginPayload): Promise<AuthResponse> =>
        djangoApi.post('/auth/login/', payload).then((r) => r.data),

    register: (payload: RegisterPayload): Promise<AuthResponse> =>
        djangoApi.post('/auth/register/', payload).then((r) => r.data),

    logout: (refreshToken: string): Promise<void> =>
        djangoApi.post('/auth/logout/', { refresh: refreshToken }).then((r) => r.data),

    getProfile: (): Promise<UserProfile> =>
        djangoApi.get('/auth/profile/').then((r) => r.data),

    updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
        djangoApi.patch('/auth/profile/', payload).then((r) => r.data),

    changePassword: (payload: ChangePasswordPayload): Promise<void> =>
        djangoApi.post('/auth/change-password/', payload).then((r) => r.data),

    refreshToken: (refreshToken: string): Promise<{ access: string }> =>
        djangoApi
            .post('/auth/token/refresh/', { refresh: refreshToken })
            .then((r) => r.data),

    googleAuth: (credential: string): Promise<AuthResponse> =>
        djangoApi.post('/auth/google/', { credential }).then((r) => r.data),
};
