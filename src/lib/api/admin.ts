import { djangoApi } from './axios';

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone_number: string;
    subscription_plan: string;
    audiobooks_created: number;
    total_minutes_generated: number;
    is_active: boolean;
    is_staff: boolean;
    created_at: string;
    audiobook_count: number;
}

export interface AdminBook {
    id: number;
    title: string;
    author: string;
    status: string;
    source_language: string;
    target_language: string;
    total_duration: number;
    total_chapters: number;
    total_segments: number;
    generation_time: number;
    created_at: string;
    completed_at: string | null;
    username: string;
    user_email: string;
    user_id: number;
}

export interface AdminStats {
    users: {
        total: number;
        new_last_30_days: number;
        new_last_7_days: number;
    };
    books: {
        total: number;
        by_status: Record<string, number>;
        total_minutes_generated: number;
        avg_generation_time_seconds: number;
    };
    recent_books: AdminBook[];
}

export interface PaginatedResult<T> {
    count: number;
    results: T[];
}

export const adminApi = {
    getStats: (): Promise<AdminStats> =>
        djangoApi.get('/admin/stats/').then((r) => r.data),

    getUsers: (params?: {
        search?: string;
        subscription_plan?: string;
        is_active?: boolean;
        ordering?: string;
    }): Promise<PaginatedResult<AdminUser>> =>
        djangoApi.get('/admin/users/', { params }).then((r) => r.data),

    getUser: (id: number): Promise<AdminUser> =>
        djangoApi.get(`/admin/users/${id}/`).then((r) => r.data),

    updateUser: (id: number, data: Partial<Pick<AdminUser, 'is_active' | 'is_staff' | 'subscription_plan'>>): Promise<AdminUser> =>
        djangoApi.patch(`/admin/users/${id}/`, data).then((r) => r.data),

    deleteUser: (id: number): Promise<void> =>
        djangoApi.delete(`/admin/users/${id}/`).then((r) => r.data),

    getBooks: (params?: {
        search?: string;
        status?: string;
        user_id?: number;
        ordering?: string;
    }): Promise<PaginatedResult<AdminBook>> =>
        djangoApi.get('/admin/books/', { params }).then((r) => r.data),

    getBook: (id: number): Promise<AdminBook> =>
        djangoApi.get(`/admin/books/${id}/`).then((r) => r.data),

    updateBook: (id: number, data: Partial<Pick<AdminBook, 'status' | 'title' | 'author'>>): Promise<AdminBook> =>
        djangoApi.patch(`/admin/books/${id}/`, data).then((r) => r.data),

    deleteBook: (id: number): Promise<void> =>
        djangoApi.delete(`/admin/books/${id}/`).then((r) => r.data),
};
