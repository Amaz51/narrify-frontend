import { create } from 'zustand';

export type Speaker = {
    id: string;
    name: string;
    gender: 'male' | 'female' | 'neutral';
    voiceId?: string;
    emotion: number;
    speed: number;
};

export type WizardStep = 1 | 2 | 3 | 4;

interface NarrifyState {
    currentStep: WizardStep;
    file: File | null;
    sourceLanguage: string;
    targetLanguage: string;
    speakers: Speaker[];
    isProcessing: boolean;
    progress: number;
    taskId: string | null;

    // Backend response data
    fileId: string | null;
    djangoBookId: number | null;   // Django audiobook record ID (for dashboard save)
    processedData: any | null;     // Full /process/v2 response
    generationResult: any | null;  // Full /generate response
    audioUrl: string | null;

    // Actions
    setStep: (step: WizardStep) => void;
    setFile: (file: File | null) => void;
    setLanguages: (source: string, target: string) => void;
    setSpeakers: (speakers: Speaker[]) => void;
    updateSpeaker: (id: string, updates: Partial<Speaker>) => void;
    setIsProcessing: (isProcessing: boolean) => void;
    setProgress: (progress: number) => void;
    setTaskId: (taskId: string | null) => void;
    setFileId: (id: string | null) => void;
    setDjangoBookId: (id: number | null) => void;
    setProcessedData: (data: any) => void;
    setGenerationResult: (data: any) => void;
    setAudioUrl: (url: string | null) => void;
    resetWizard: () => void;
}

export const useNarrifyStore = create<NarrifyState>((set) => ({
    currentStep: 1,
    file: null,
    sourceLanguage: 'English',
    targetLanguage: 'English',
    speakers: [],
    isProcessing: false,
    progress: 0,
    taskId: null,

    // New backend fields
    fileId: null,
    djangoBookId: null,
    processedData: null,
    generationResult: null,
    audioUrl: null,

    setStep: (step) => set({ currentStep: step }),
    setFile: (file) => set({ file }),
    setLanguages: (source, target) => set({ sourceLanguage: source, targetLanguage: target }),
    setSpeakers: (speakers) => set({ speakers }),
    updateSpeaker: (id, updates) => set((state) => ({
        speakers: state.speakers.map((s) => s.id === id ? { ...s, ...updates } : s)
    })),
    setIsProcessing: (isProcessing) => set({ isProcessing }),
    setProgress: (progress) => set({ progress }),
    setTaskId: (taskId) => set({ taskId }),
    setFileId: (fileId) => set({ fileId }),
    setDjangoBookId: (djangoBookId) => set({ djangoBookId }),
    setProcessedData: (processedData) => set({ processedData }),
    setGenerationResult: (generationResult) => set({ generationResult }),
    setAudioUrl: (audioUrl) => set({ audioUrl }),
    resetWizard: () => set({
        currentStep: 1,
        file: null,
        sourceLanguage: 'English',
        targetLanguage: 'English',
        speakers: [],
        isProcessing: false,
        progress: 0,
        taskId: null,
        fileId: null,
        djangoBookId: null,
        processedData: null,
        generationResult: null,
        audioUrl: null,
    }),
}));
