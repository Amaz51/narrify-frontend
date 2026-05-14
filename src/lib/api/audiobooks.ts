import { djangoApi } from './axios';

export interface Audiobook {
    id: number;
    title: string;
    author: string;
    full_name: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    source_language: string;
    target_language: string;
    total_chapters: number;
    total_duration: number;
    duration_minutes: number;
    file_id: string;
    created_at: string;
    completed_at: string | null;
    output_audio_path: string;
    thumbnail: string | null;
    thumbnail_url: string | null;
    is_public: boolean;
    chapter_titles: { chapter_number: number; title: string }[];
}

export interface AudiobookDetail extends Audiobook {
    chapters: any[];
    file_size: number;
    pages: number;
    emotion_intensity: number;
    base_speed: number;
    celery_task_id: string | null;
    error_message: string;
    total_segments: number;
    generation_time: number;
    output_audio_path: string;
    updated_at: string;
    user: number;
    username: string;
    full_name: string;
}

export interface PaginatedAudiobooks {
    count: number;
    next: string | null;
    previous: string | null;
    results: Audiobook[];
}

export const audiobookApi = {
    list: (): Promise<PaginatedAudiobooks> =>
        djangoApi.get('/audiobooks/books/').then((r) => r.data),

    getById: (id: number): Promise<AudiobookDetail> =>
        djangoApi.get(`/audiobooks/books/${id}/`).then((r) => r.data),

    create: (formData: FormData): Promise<AudiobookDetail> =>
        djangoApi
            .post('/audiobooks/books/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((r) => r.data),

    createRecord: (data: {
        file_id: string;
        title: string;
        author: string;
        source_language: string;
        target_language: string;
        emotion_intensity: number;
        base_speed: number;
        status?: string;
        is_public?: boolean;
    }): Promise<AudiobookDetail> =>
        djangoApi.post('/audiobooks/books/', data).then((r) => r.data),

    update: (id: number, data: Partial<AudiobookDetail>): Promise<AudiobookDetail> =>
        djangoApi.patch(`/audiobooks/books/${id}/`, data).then((r) => r.data),

    delete: (id: number): Promise<void> =>
        djangoApi.delete(`/audiobooks/books/${id}/`).then((r) => r.data),

    startProcessing: (id: number): Promise<{ task_id: string; status: string }> =>
        djangoApi
            .post(`/audiobooks/books/${id}/start_processing/`)
            .then((r) => r.data),

    getTaskStatus: (
        id: number
    ): Promise<{
        task_id: string;
        celery_state: string;
        progress: number;
        stage: string;
        book_status: string;
    }> => djangoApi.get(`/audiobooks/books/${id}/task_status/`).then((r) => r.data),

    retry: (id: number): Promise<{ task_id: string; status: string }> =>
        djangoApi.post(`/audiobooks/books/${id}/retry/`).then((r) => r.data),

    forceReset: (id: number): Promise<{ status: string }> =>
        djangoApi.post(`/audiobooks/books/${id}/force_reset/`).then((r) => r.data),

    downloadUrl: (id: number): string =>
        `${djangoApi.defaults.baseURL}/audiobooks/books/${id}/download/`,

    saveChapters: (id: number, chapters: { chapter_id: number; chapter_title: string; audio_url: string; duration: number }[]): Promise<{ saved: number }> =>
        djangoApi.post(`/audiobooks/books/${id}/save_chapters/`, { chapters }).then((r) => r.data),

    rename: (id: number, title: string): Promise<AudiobookDetail> =>
        djangoApi.patch(`/audiobooks/books/${id}/`, { title }).then((r) => r.data),

    uploadThumbnail: (id: number, file: File): Promise<Audiobook> => {
        const formData = new FormData();
        formData.append('thumbnail', file);
        return djangoApi
            .post(`/audiobooks/books/${id}/thumbnail/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((r) => r.data);
    },
};
