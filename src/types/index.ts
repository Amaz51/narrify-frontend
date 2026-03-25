export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    plan: 'free' | 'pro' | 'enterprise';
}

export interface Voice {
    id: string;
    name: string;
    type: 'studio' | 'natural' | 'neural' | 'cloned';
    gender: 'male' | 'female' | 'neutral';
    mood: string;
    previewUrl: string;
}

export interface Audiobook {
    id: string;
    title: string;
    author: string;
    duration: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    speakersCount: number;
    originalFileUrl: string;
    audioUrls: {
        mp3: string;
        wav?: string;
        m4b?: string;
    };
}

export interface Task {
    id: string;
    type: 'analysis' | 'synthesis';
    progress: number;
    message: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
}
