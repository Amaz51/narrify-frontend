import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 300000, // 5 minutes for long TTS generation
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add JWT token here if auth is implemented later
        // const token = localStorage.getItem('auth_token');
        // if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — global error handling
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            window.location.href = '/auth/login';
        }
        return Promise.reject(error);
    }
);

export const apiService = {
    // Health check
    health: () => api.get('/health'),

    // PDF Upload
    uploadPDF: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    // Get detected chapters
    getChapters: (fileId: string) => api.get(`/chapters/${fileId}`),

    // Process PDF for speakers & emotions
    processPDF: (fileId: string, detectEmotions = true) =>
        api.post('/process/v2', { file_id: fileId, detect_emotions: detectEmotions }),

    // Generate audiobook
    generateAudiobook: (data: {
        file_id: string;
        chapters: any[];
        emotion_intensity: number;
        base_speed: number;
        source_language: string;
        target_language: string;
    }) => api.post('/generate/from-processing', data),

    // Download audio file
    downloadAudio: (filename: string) =>
        api.get(`/outputs/${filename}`, { responseType: 'blob' }),

    // List available voices
    listVoices: () => api.get('/voices'),

    // Clone a voice
    cloneVoice: (data: { voice_name: string; gender: string; audio_file: File }) => {
        const formData = new FormData();
        formData.append('voice_name', data.voice_name);
        formData.append('gender', data.gender);
        formData.append('audio_file', data.audio_file);
        return api.post('/voices/clone', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};
