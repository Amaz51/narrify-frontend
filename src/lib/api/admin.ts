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
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface EvaluationResult {
    id: number;
    book_id: number;
    book_title: string;
    book_author: string;
    evaluated_by_username: string | null;
    evaluated_at: string;
    status: 'pending' | 'completed' | 'failed';
    error_message: string;
    audio_url: string;
    wer: number | null;
    cer: number | null;
    transcribed_text: string;
    utmos_score: number | null;
    utmos_method: string;
    snr_db: number | null;
    intended_emotion: string;
    detected_emotion: string;
    emotion_match: boolean | null;
    ser_confidence: number | null;
    secs_score: number | null;
    overall_score: number | null;
    raw_results: Record<string, unknown>;
}

export interface EvaluationRequest {
    audio_url?: string;
    reference_url?: string;
    intended_emotion?: string;
    original_text?: string;
}

export const adminApi = {
    getStats: (): Promise<AdminStats> =>
        djangoApi.get('/admin/stats/').then((r) => r.data),

    getUsers: (params?: {
        search?: string;
        subscription_plan?: string;
        is_active?: boolean;
        ordering?: string;
        page?: number;
        page_size?: number;
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
        page?: number;
        page_size?: number;
    }): Promise<PaginatedResult<AdminBook>> =>
        djangoApi.get('/admin/books/', { params }).then((r) => r.data),

    getBook: (id: number): Promise<AdminBook> =>
        djangoApi.get(`/admin/books/${id}/`).then((r) => r.data),

    updateBook: (id: number, data: Partial<Pick<AdminBook, 'status' | 'title' | 'author'>>): Promise<AdminBook> =>
        djangoApi.patch(`/admin/books/${id}/`, data).then((r) => r.data),

    deleteBook: (id: number): Promise<void> =>
        djangoApi.delete(`/admin/books/${id}/`).then((r) => r.data),

    // ── Evaluation ────────────────────────────────────────────────────────────
    // 5-minute timeout — evaluation loads ML models and runs inference
    evaluateBook: (bookId: number, payload: EvaluationRequest): Promise<EvaluationResult> =>
        djangoApi.post(`/admin/books/${bookId}/evaluate/`, payload, { timeout: 300_000 }).then((r) => r.data),

    getEvaluations: (params?: {
        book_id?: number;
        page?: number;
        page_size?: number;
    }): Promise<{ count: number; results: EvaluationResult[] }> =>
        djangoApi.get('/admin/evaluations/', { params }).then((r) => r.data),

    getEvaluation: (id: number): Promise<EvaluationResult> =>
        djangoApi.get(`/admin/evaluations/${id}/`).then((r) => r.data),

    deleteEvaluation: (id: number): Promise<void> =>
        djangoApi.delete(`/admin/evaluations/${id}/`).then((r) => r.data),
};
