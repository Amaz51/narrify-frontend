"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNarrifyStore } from '@/stores/useNarrifyStore';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
    Download, Play, Pause, RotateCcw, Clock, Share2, Headphones,
    FileAudio, FileBadge, CheckCircle2, Sparkles, SkipBack, SkipForward,
    Volume2, VolumeX, Settings, AlertTriangle, AlertCircle, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Progress } from './Step1Upload';
import Link from 'next/link';
import { audiobookApi } from '@/lib/api/audiobooks';
import { djangoApi } from '@/lib/api/axios';
import { useAppDispatch } from '@/store/hooks';
import { fetchAudiobooks, updateAudiobook } from '@/store/slices/audiobookSlice';

const GENERATION_STEPS = [
    { label: "Preparing request...", pct: 3 },
    { label: "Translating content (NLLB-200)...", pct: 12 },
    { label: "Running speaker segmentation...", pct: 22 },
    { label: "Synthesizing speaker voices...", pct: 38 },
    { label: "Applying emotion profiles & prosody...", pct: 62 },
    { label: "Merging audio segments...", pct: 80 },
    { label: "Encoding audio formats...", pct: 92 },
    { label: "Finalizing audiobook...", pct: 98 },
];

const DOWNLOAD_FORMATS = [
    { label: 'MP3 High Quality', format: '320kbps · Stereo', icon: FileAudio, key: 'mp3', available: true },
    { label: 'WAV Lossless', format: 'Coming Soon', icon: FileBadge, key: 'wav', available: false },
    { label: 'M4B Audiobook', format: 'Coming Soon', icon: Headphones, key: 'm4b', available: false },
];

// Stable waveform bars
const WAVEFORM = Array.from({ length: 100 }, (_, i) => {
    const heights = [30, 60, 45, 80, 35, 70, 50, 90, 40, 65, 55, 85, 42, 72, 38, 78, 52, 88, 48, 68];
    return heights[i % heights.length];
});

// Safely resolve audio URL regardless of whether it's relative or absolute.
function resolveAudioUrl(rawUrl: string | null): string | null {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    // Relative path — prepend FastAPI base (strip trailing /api if present, then re-add full path)
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api')
        .replace(/\/api\/?$/, '');
    const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    return `${apiBase}${path}`;
}

export const Step4Generation = () => {
    const dispatch = useAppDispatch();
    const {
        setStep, isProcessing, setIsProcessing, progress, setProgress, resetWizard,
        speakers, file, fileId, processedData, sourceLanguage, targetLanguage,
        generationResult, audioUrl, setGenerationResult, setAudioUrl,
        djangoBookId, setDjangoBookId, selectedChapterIds,
    } = useNarrifyStore();

    const [isGenerated, setIsGenerated] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false); // visibility setting for the generated audiobook
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [playPosition, setPlayPosition] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [generationTime, setGenerationTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Store bookId in a ref so the poll callback can access the latest value
    const bookIdRef = useRef<number | null>(null);

    const TASK_ID_KEY = 'narrify_task_id';
    const BOOK_ID_KEY = 'narrify_pending_book_id';

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const handleGenerationDone = async (data: any, resolvedBookId: number | null) => {
        stopPolling();
        localStorage.removeItem(TASK_ID_KEY);
        localStorage.removeItem(BOOK_ID_KEY);

        setGenerationResult(data);
        setAudioUrl(data.audio_url);
        setProgress(100);
        setCurrentStep(GENERATION_STEPS.length - 1);
        setIsProcessing(false);
        setIsGenerated(true);

        if (resolvedBookId) {
            try {
                const audioPath = (() => {
                    const u = data.audio_url ?? '';
                    if (!u.startsWith('http')) return u;
                    try { return new URL(u).pathname; } catch { return u; }
                })();
                await dispatch(updateAudiobook({
                    id: resolvedBookId,
                    data: {
                        status: 'completed',
                        output_audio_path: audioPath,
                        total_duration: Math.round(data.duration ?? 0),
                        generation_time: Math.round(data.generation_time ?? 0),
                        total_segments: data.segments_processed ?? 0,
                    },
                }));
                if (data.chapters?.length > 0) {
                    await audiobookApi.saveChapters(resolvedBookId, data.chapters);
                }
                dispatch(fetchAudiobooks());
            } catch (e) {
                console.warn('Could not update Django audiobook record:', e);
            }
        }
    };

    const handleGenerationError = async (errMsg: string, resolvedBookId: number | null) => {
        stopPolling();
        localStorage.removeItem(TASK_ID_KEY);
        localStorage.removeItem(BOOK_ID_KEY);
        setGenerationError(errMsg);
        setIsProcessing(false);
        if (resolvedBookId) {
            try {
                await dispatch(updateAudiobook({
                    id: resolvedBookId,
                    data: { status: 'failed', error_message: errMsg },
                }));
                dispatch(fetchAudiobooks());
            } catch { /* non-fatal */ }
        }
    };

    const startPolling = (taskId: string, resolvedBookId: number | null) => {
        stopPolling();
        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await apiService.getTaskStatus(taskId);
                const task = res.data;

                // Update progress from real server data
                if (typeof task.progress === 'number') {
                    setProgress(task.progress);
                    const nextStep = GENERATION_STEPS.findIndex(s => s.pct > task.progress);
                    setCurrentStep(nextStep === -1 ? GENERATION_STEPS.length - 1 : Math.max(0, nextStep - 1));
                }

                if (task.status === 'done') {
                    await handleGenerationDone(task.result, resolvedBookId);
                } else if (task.status === 'error') {
                    await handleGenerationError(task.error || 'Generation failed on server.', resolvedBookId);
                }
            } catch (e: any) {
                const httpStatus = e?.response?.status;
                if (httpStatus === 404) {
                    // Task missing from server — FastAPI restarted and lost the task
                    await handleGenerationError(
                        'The generation task was lost (server restarted). Please retry.',
                        bookIdRef.current
                    );
                } else {
                    console.warn('Poll error (will retry):', e);
                }
            }
        }, 3000);
    };

    // Auto-start generation on mount (or resume if tab was switched)
    useEffect(() => {
        if (generationResult) {
            setIsGenerated(true);
            return;
        }

        // Resume polling if a task is already running (e.g. user switched tabs)
        const savedTaskId = localStorage.getItem(TASK_ID_KEY);
        const savedBookId = localStorage.getItem(BOOK_ID_KEY);
        if (savedTaskId) {
            const resumedBookId = savedBookId ? parseInt(savedBookId, 10) : null;
            bookIdRef.current = resumedBookId;
            setIsProcessing(true);
            startPolling(savedTaskId, resumedBookId);
            return;
        }

        startGeneration();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopPolling();
        };
    }, []);

    // Elapsed time counter
    useEffect(() => {
        if (isProcessing) {
            timerRef.current = setInterval(() => {
                setGenerationTime(t => t + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isProcessing]);

    const startGeneration = async () => {
        setIsProcessing(true);
        setProgress(0);
        setGenerationError(null);

        let resolvedBookId: number | null = null;

        try {
            const avgEmotion = speakers.length > 0
                ? speakers.reduce((sum, s) => sum + s.emotion, 0) / speakers.length
                : 0.5;
            const avgSpeed = speakers.length > 0
                ? speakers.reduce((sum, s) => sum + s.speed, 0) / speakers.length
                : 1.0;

            const emotionIntensity = parseFloat((avgEmotion * 3).toFixed(2));
            const baseSpeed = parseFloat(avgSpeed.toFixed(2));

            // Create Django record before generation
            let bookId = djangoBookId;
            if (!bookId && fileId) {
                try {
                    const title = file?.name.replace(/\.pdf$/i, '') ?? 'Untitled Audiobook';
                    const record = await audiobookApi.createRecord({
                        file_id: fileId,
                        title,
                        author: 'Unknown',
                        source_language: sourceLanguage,
                        target_language: targetLanguage,
                        emotion_intensity: emotionIntensity,
                        base_speed: baseSpeed,
                        status: 'processing',
                        is_public: isPublic,
                    });
                    bookId = record.id;
                    setDjangoBookId(record.id);
                } catch (e) {
                    console.warn('Could not create Django audiobook record:', e);
                }
            }
            resolvedBookId = bookId;
            bookIdRef.current = bookId;

            const allChapters = processedData?.chapters ?? [];
            const chaptersToGenerate = selectedChapterIds.length > 0
                ? allChapters.filter((ch: any) => selectedChapterIds.includes(ch.chapter_id))
                : allChapters;

            const payload = {
                file_id: fileId!,
                chapters: chaptersToGenerate,
                emotion_intensity: emotionIntensity,
                base_speed: baseSpeed,
                source_language: sourceLanguage.toLowerCase(),
                target_language: targetLanguage.toLowerCase(),
            };

            // Fire the async endpoint — returns immediately with a task_id
            const response = await apiService.generateAudiobookAsync(payload);
            const { task_id } = response.data;

            // Persist so the user can switch tabs and come back
            localStorage.setItem(TASK_ID_KEY, task_id);
            if (resolvedBookId) localStorage.setItem(BOOK_ID_KEY, String(resolvedBookId));

            // Start polling for progress
            startPolling(task_id, resolvedBookId);

        } catch (err: any) {
            console.error('Generation failed:', err);
            const errMsg = err.response?.data?.detail || 'Generation failed. Please check the backend is running.';
            await handleGenerationError(errMsg, resolvedBookId);
        }
    };

    // Sync custom player state FROM the real audio element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
            if (audio.duration) {
                setPlayPosition((audio.currentTime / audio.duration) * 100);
            }
        };
        const onEnded = () => { setIsPlaying(false); setPlayPosition(0); };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('play', () => setIsPlaying(true));
            audio.removeEventListener('pause', () => setIsPlaying(false));
            audio.removeEventListener('ended', onEnded);
        };
    }, [isGenerated]);

    // Audio element mute sync
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
    }, [isMuted]);

    const estimatedRemaining = Math.round(((100 - progress) / 100) * 3 * 60);
    const remainingMins = Math.floor(estimatedRemaining / 60);
    const remainingSecs = estimatedRemaining % 60;

    const fullAudioUrl = resolveAudioUrl(audioUrl);

    const handleDownload = async (format: string) => {
        if (format !== 'mp3') return; // WAV / M4B not yet supported

        // Prefer the Django-proxied download (enforces ownership)
        if (djangoBookId) {
            try {
                // Use djangoApi so the axios interceptor adds Authorization: Bearer <token>
                const response = await djangoApi.get(
                    `/audiobooks/books/${djangoBookId}/download/`,
                    { responseType: 'blob' }
                );
                const blob = new Blob([response.data]);
                const objectUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                const disposition = (response.headers['content-disposition'] as string) || '';
                const match = disposition.match(/filename="([^"]+)"/);
                a.download = match?.[1] || `narrify_audiobook_${djangoBookId}.mp3`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(objectUrl);
            } catch {
                window.open(audiobookApi.downloadUrl(djangoBookId), '_blank');
            }
            return;
        }

        // Fallback when Django record wasn't saved (rare): direct FastAPI link
        const rawUrl = generationResult?.audio_url;
        if (!rawUrl) return;
        const directUrl = resolveAudioUrl(rawUrl);
        if (directUrl) {
            const a = document.createElement('a');
            a.href = directUrl;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    if (!isGenerated) {
        return (
            <div className="max-w-2xl mx-auto space-y-10 min-h-[500px] flex flex-col justify-center">
                {/* Error state */}
                {generationError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-5 bg-red-50 rounded-2xl border border-red-200"
                    >
                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-red-700">Generation Failed</p>
                            <p className="text-sm text-red-600 mt-1">{generationError}</p>
                        </div>
                        <button
                            onClick={startGeneration}
                            className="flex-shrink-0 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors"
                        >
                            Retry
                        </button>
                    </motion.div>
                )}

                {!generationError && (
                    <>
                        <div className="space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black">Synthesizing Audiobook</h3>
                                    <p className="text-muted-foreground font-medium">
                                        Processing with XTTS v2 neural voices
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-5xl font-black narrify-text-gradient">{progress}%</span>
                                </div>
                            </div>

                            <Progress value={progress} className="h-3" />

                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Clock size={13} />
                                    <span>
                                        {progress >= 100 ? "Complete!" : `~${remainingMins}m ${remainingSecs}s remaining`}
                                    </span>
                                </div>
                                <span className="font-mono">{Math.floor(generationTime / 60)}:{String(generationTime % 60).padStart(2, "0")} elapsed</span>
                            </div>
                        </div>

                        {/* Step log / live feed */}
                        <div className="bg-slate-900 rounded-2xl p-5 font-mono text-xs space-y-2 border border-slate-800">
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-3">Processing Log</p>
                            {GENERATION_STEPS.slice(0, currentStep + 1).map((s, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-2"
                                >
                                    {i < currentStep ? (
                                        <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full border-2 border-narrify-blue border-t-transparent animate-spin flex-shrink-0" />
                                    )}
                                    <span className={i < currentStep ? "text-slate-400" : "text-white"}>{s.label}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Speaker progress */}
                        <div className="grid gap-3">
                            {speakers.slice(0, 3).map((speaker, i) => {
                                const spkProgress = Math.max(0, Math.min(100, (progress - i * 20)));
                                return (
                                    <div key={speaker.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
                                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", spkProgress >= 100 ? "bg-green-400" : spkProgress > 0 ? "bg-narrify-blue animate-pulse" : "bg-slate-200")} />
                                        <span className="flex-1 text-sm font-bold text-foreground">{speaker.name}</span>
                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full progress-bar transition-all duration-500"
                                                style={{ width: `${spkProgress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{Math.round(spkProgress)}%</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-sm">
                            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-amber-700">
                                Please don't close this tab. Generation typically takes 2–5 minutes per chapter.
                                You'll be notified when it's ready.
                            </p>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // --- Success state ---
    const duration = generationResult?.duration
        ? `${Math.floor(generationResult.duration / 60)}:${String(Math.round(generationResult.duration % 60)).padStart(2, '0')}`
        : '—';

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Success header */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-6"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 border-4 border-green-200 mb-2"
                >
                    <CheckCircle2 size={40} className="text-green-500" />
                </motion.div>
                <h2 className="text-4xl font-black tracking-tight">Your Audiobook is Ready!</h2>
                <p className="text-muted-foreground text-lg">
                    Generated in{" "}
                    <span className="font-bold text-narrify-blue">{Math.floor(generationTime / 60)}m {generationTime % 60}s</span>
                    {" "}with {speakers.length} speakers · XTTS v2 Neural TTS
                </p>
            </motion.div>

            {/* Hidden audio element — driven entirely by the custom player below */}
            {fullAudioUrl && (
                <audio ref={audioRef} src={fullAudioUrl} preload="metadata" className="hidden" />
            )}

            {/* Custom waveform player card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden"
            >
                {/* Waveform visualization */}
                <div className="p-8 space-y-4 border-b border-border">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
                        <span>Chapter 1: {generationResult?.audiobook_id || 'Generated Audiobook'}</span>
                        <div className="flex gap-4">
                            {speakers.slice(0, 3).map((s, i) => (
                                <span key={s.id} className={cn(
                                    "flex items-center gap-1.5",
                                    i === 0 ? "text-narrify-blue" : i === 1 ? "text-narrify-purple" : "text-narrify-cyan"
                                )}>
                                    <div className="w-2 h-2 rounded-full bg-current" />
                                    {s.name.split(' ')[0]}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Waveform bars — click any bar to seek */}
                    <div
                        className="flex items-end gap-[2px] h-28 cursor-pointer"
                        onClick={(e) => {
                            const audio = audioRef.current;
                            if (!audio || !audio.duration) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            audio.currentTime = pct * audio.duration;
                        }}
                    >
                        {WAVEFORM.map((h, i) => {
                            const isPlayed = (i / WAVEFORM.length) * 100 < playPosition;
                            const section = i < 35 ? "narrify-blue" : i < 65 ? "narrify-purple" : "narrify-cyan";
                            return (
                                <motion.div
                                    key={i}
                                    className={cn(
                                        "flex-1 rounded-full transition-all",
                                        isPlayed
                                            ? `bg-${section}`
                                            : "bg-muted"
                                    )}
                                    style={{ height: `${h}%` }}
                                    animate={isPlaying && Math.abs((i / WAVEFORM.length) * 100 - playPosition) < 8
                                        ? { height: [`${h}%`, `${Math.min(h + 20, 100)}%`, `${h}%`] }
                                        : { height: `${h}%` }
                                    }
                                    transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
                                />
                            );
                        })}
                    </div>

                    {/* Playhead track — click to seek */}
                    <div className="audio-track" onClick={(e) => {
                        const audio = audioRef.current;
                        if (!audio || !audio.duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pct = (e.clientX - rect.left) / rect.width;
                        audio.currentTime = pct * audio.duration;
                    }}>
                        <div className="audio-track-fill" style={{ width: `${playPosition}%` }} />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-narrify-blue shadow-md border-2 border-white"
                            style={{ left: `calc(${playPosition}% - 8px)` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                        <span>{Math.floor(playPosition * 0.01 * (generationResult?.duration ?? 0))}s</span>
                        <span>{duration}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => {
                        const audio = audioRef.current;
                        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
                    }}>
                        <SkipBack size={20} />
                    </Button>
                    <Button
                        size="icon"
                        variant="narrify"
                        className="w-14 h-14 rounded-full shadow-lg glow-blue flex-shrink-0"
                        onClick={() => {
                            const audio = audioRef.current;
                            if (!audio) return;
                            if (audio.paused) audio.play(); else audio.pause();
                        }}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => {
                        const audio = audioRef.current;
                        if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
                    }}>
                        <SkipForward size={20} />
                    </Button>

                    <div className="flex-1" />

                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Settings size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Share2 size={18} />
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-xl" onClick={resetWizard}>
                        <RotateCcw size={15} />
                        New
                    </Button>
                </div>
            </motion.div>

            {/* Visibility toggle */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-between p-5 bg-card rounded-2xl border border-border"
            >
                <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">Audiobook Visibility</p>
                    <p className="text-xs text-muted-foreground">
                        {isPublic ? 'Public — visible to all users in the shared library' : 'Private — only visible in your dashboard'}
                    </p>
                </div>
                <button
                    onClick={async () => {
                        const next = !isPublic;
                        setIsPublic(next);
                        if (djangoBookId) {
                            try {
                                await audiobookApi.update(djangoBookId, { is_public: next } as any);
                            } catch { /* non-fatal */ }
                        }
                    }}
                    className={cn(
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                        isPublic ? "bg-narrify-blue" : "bg-muted"
                    )}
                    role="switch"
                    aria-checked={isPublic}
                >
                    <span className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200",
                        isPublic ? "translate-x-5" : "translate-x-0"
                    )} />
                </button>
            </motion.div>

            {/* Download formats */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-4"
            >
                <h3 className="font-black text-lg text-foreground">Download Formats</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {DOWNLOAD_FORMATS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => item.available && handleDownload(item.key)}
                            disabled={!item.available}
                            className={cn(
                                "group p-6 bg-card rounded-2xl border-2 transition-all flex flex-col items-center gap-3 text-center",
                                item.available
                                    ? "border-border hover:border-narrify-blue/40 hover:shadow-lg cursor-pointer"
                                    : "border-border opacity-50 cursor-not-allowed"
                            )}
                        >
                            <item.icon size={32} className={item.available ? "text-slate-300 group-hover:text-narrify-blue transition-colors" : "text-slate-200"} />
                            <div>
                                <p className="font-black text-foreground">{item.label}</p>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold mt-0.5">{item.format}</p>
                            </div>
                            {item.available && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-narrify-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Download size={13} /> Download
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Generation stats */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                {[
                    { label: "Total Segments", value: generationResult?.segments_processed ?? "—" },
                    { label: "Unique Speakers", value: `${speakers.length}` },
                    { label: "Audio Duration", value: duration },
                    { label: "Generation Time", value: generationResult?.generation_time ? `${Math.round(generationResult.generation_time)}s` : `${generationTime}s` },
                ].map((s, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border p-4 text-center">
                        <p className="text-xl font-black narrify-text-gradient">{s.value}</p>
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</p>
                    </div>
                ))}
            </motion.div>

            {/* Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
                <Link href="/dashboard" className="flex-1 sm:flex-none">
                    <Button size="lg" variant="narrify" className="w-full h-12 px-8 rounded-2xl gap-2 shadow-lg">
                        <Headphones size={18} />
                        View in Dashboard
                    </Button>
                </Link>
                <Button size="lg" variant="outline" className="flex-1 sm:flex-none h-12 px-8 rounded-2xl gap-2" onClick={resetWizard}>
                    <RotateCcw size={16} />
                    Create Another
                </Button>
            </motion.div>
        </div>
    );
};
