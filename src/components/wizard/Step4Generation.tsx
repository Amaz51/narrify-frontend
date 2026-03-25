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
    { label: 'MP3 High Quality', format: '320kbps · Stereo', icon: FileAudio, key: 'mp3' },
    { label: 'WAV Lossless', format: '48kHz · 24-bit', icon: FileBadge, key: 'wav' },
    { label: 'M4B Audiobook', format: 'With Chapter Marks', icon: Headphones, key: 'm4b' },
];

// Stable waveform bars
const WAVEFORM = Array.from({ length: 100 }, (_, i) => {
    const heights = [30, 60, 45, 80, 35, 70, 50, 90, 40, 65, 55, 85, 42, 72, 38, 78, 52, 88, 48, 68];
    return heights[i % heights.length];
});

export const Step4Generation = () => {
    const dispatch = useAppDispatch();
    const {
        setStep, isProcessing, setIsProcessing, progress, setProgress, resetWizard,
        speakers, file, fileId, processedData, sourceLanguage, targetLanguage,
        generationResult, audioUrl, setGenerationResult, setAudioUrl,
        djangoBookId, setDjangoBookId,
    } = useNarrifyStore();

    const [isGenerated, setIsGenerated] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [playPosition, setPlayPosition] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [generationTime, setGenerationTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Auto-start generation on mount
    useEffect(() => {
        if (!isGenerated && !generationResult) {
            startGeneration();
        } else if (generationResult) {
            // Already generated in a previous visit to this step
            setIsGenerated(true);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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

    // Simulated progress (caps at 95% until real response)
    useEffect(() => {
        if (isProcessing) {
            let p = 0;
            progressIntervalRef.current = setInterval(() => {
                p += 0.5;
                const capped = Math.min(p, 95);
                setProgress(Math.round(capped));

                const nextStep = GENERATION_STEPS.findIndex(s => s.pct > capped);
                setCurrentStep(nextStep === -1 ? GENERATION_STEPS.length - 1 : Math.max(0, nextStep - 1));

                if (p >= 95) clearInterval(progressIntervalRef.current!);
            }, 1000);
        } else {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
        return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); };
    }, [isProcessing]);

    const startGeneration = async () => {
        setIsProcessing(true);
        setProgress(0);
        setGenerationError(null);

        try {
            // Build per-speaker average emotion intensity
            const avgEmotion = speakers.length > 0
                ? speakers.reduce((sum, s) => sum + s.emotion, 0) / speakers.length
                : 0.5;
            const avgSpeed = speakers.length > 0
                ? speakers.reduce((sum, s) => sum + s.speed, 0) / speakers.length
                : 1.0;

            const emotionIntensity = parseFloat((avgEmotion * 3).toFixed(2));
            const baseSpeed = parseFloat(avgSpeed.toFixed(2));

            // Create Django record before generation so we can update it after
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
                    });
                    bookId = record.id;
                    setDjangoBookId(record.id);
                } catch (e) {
                    // Non-fatal — dashboard save fails silently
                    console.warn('Could not create Django audiobook record:', e);
                }
            }

            const payload = {
                file_id: fileId!,
                chapters: processedData?.chapters ?? [],
                emotion_intensity: emotionIntensity,
                base_speed: baseSpeed,
                source_language: sourceLanguage.toLowerCase(),
                target_language: targetLanguage.toLowerCase(),
            };

            const response = await apiService.generateAudiobook(payload);
            const data = response.data;

            // data: { audiobook_id, audio_url, duration, segments_processed, speakers_used, generation_time }
            setGenerationResult(data);
            setAudioUrl(data.audio_url);

            // Jump progress to 100
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            setProgress(100);
            setCurrentStep(GENERATION_STEPS.length - 1);
            setIsProcessing(false);
            setIsGenerated(true);

            // Persist generation result to Django
            if (bookId) {
                try {
                    // Strip base URL — save only the relative path so the
                    // audiobook detail page can reconstruct it using the current env var
                    const audioPath = (() => {
                        const u = data.audio_url ?? '';
                        if (!u.startsWith('http')) return u;
                        try { return new URL(u).pathname; } catch { return u; }
                    })();
                    await dispatch(updateAudiobook({
                        id: bookId,
                        data: {
                            status: 'completed',
                            output_audio_path: audioPath,
                            total_duration: Math.round(data.duration ?? 0),
                            generation_time: Math.round(data.generation_time ?? 0),
                            total_segments: data.segments_processed ?? 0,
                        },
                    }));
                    dispatch(fetchAudiobooks());
                } catch (e) {
                    console.warn('Could not update Django audiobook record:', e);
                }
            }

            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                console.log(`✅ Generated: ${data.duration}s audio in ${data.generation_time}s`);
            }
        } catch (err: any) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            console.error('Generation failed:', err);
            const errMsg = err.response?.data?.detail || 'Generation failed. Please check the backend is running.';
            setGenerationError(errMsg);
            setIsProcessing(false);
        }
    };

    // Simulate playhead movement (for the custom UI player)
    useEffect(() => {
        let playInterval: NodeJS.Timeout;
        if (isPlaying) {
            playInterval = setInterval(() => {
                setPlayPosition(p => {
                    if (p >= 100) { setIsPlaying(false); return 0; }
                    return p + 0.1;
                });
            }, 120);
        }
        return () => clearInterval(playInterval);
    }, [isPlaying]);

    // Audio element mute sync
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
    }, [isMuted]);

    const estimatedRemaining = Math.round(((100 - progress) / 100) * 3 * 60);
    const remainingMins = Math.floor(estimatedRemaining / 60);
    const remainingSecs = estimatedRemaining % 60;

    const fullAudioUrl = audioUrl
        ? `${process.env.NEXT_PUBLIC_API_URL}${audioUrl.startsWith('/api') ? audioUrl.replace('/api', '') : audioUrl}`
        : null;

    const handleDownload = async (format: string) => {
        if (!generationResult?.audio_url) return;
        const filename = generationResult.audio_url.split('/').pop();
        try {
            const response = await apiService.downloadAudio(filename);
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audiobook_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
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
                                    <p className="text-slate-500 font-medium">
                                        Processing with XTTS v2 neural voices
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-5xl font-black narrify-text-gradient">{progress}%</span>
                                </div>
                            </div>

                            <Progress value={progress} className="h-3" />

                            <div className="flex items-center justify-between text-sm text-slate-400">
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
                                    <div key={speaker.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
                                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", spkProgress >= 100 ? "bg-green-400" : spkProgress > 0 ? "bg-narrify-blue animate-pulse" : "bg-slate-200")} />
                                        <span className="flex-1 text-sm font-bold text-slate-700">{speaker.name}</span>
                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full progress-bar transition-all duration-500"
                                                style={{ width: `${spkProgress}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono text-slate-400 w-10 text-right">{Math.round(spkProgress)}%</span>
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
                <p className="text-slate-500 text-lg">
                    Generated in{" "}
                    <span className="font-bold text-narrify-blue">{Math.floor(generationTime / 60)}m {generationTime % 60}s</span>
                    {" "}with {speakers.length} speakers · XTTS v2 Neural TTS
                </p>
            </motion.div>

            {/* Native Audio Player — shows only if we have a real URL */}
            {fullAudioUrl && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-3"
                >
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Generated Audio</p>
                    <audio
                        ref={audioRef}
                        src={fullAudioUrl}
                        controls
                        className="w-full"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />
                </motion.div>
            )}

            {/* Custom waveform player card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden"
            >
                {/* Waveform visualization */}
                <div className="p-8 space-y-4 border-b border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
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

                    {/* Waveform bars */}
                    <div className="flex items-end gap-[2px] h-28">
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
                                            : "bg-slate-200"
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

                    {/* Playhead track */}
                    <div className="audio-track" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setPlayPosition(((e.clientX - rect.left) / rect.width) * 100);
                    }}>
                        <div className="audio-track-fill" style={{ width: `${playPosition}%` }} />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-narrify-blue shadow-md border-2 border-white"
                            style={{ left: `calc(${playPosition}% - 8px)` }}
                        />
                    </div>

                    <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>{Math.floor(playPosition * 0.01 * (generationResult?.duration ?? 0))}s</span>
                        <span>{duration}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => setPlayPosition(Math.max(0, playPosition - 5))}>
                        <SkipBack size={20} />
                    </Button>
                    <Button
                        size="icon"
                        variant="narrify"
                        className="w-14 h-14 rounded-full shadow-lg glow-blue flex-shrink-0"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => setPlayPosition(Math.min(100, playPosition + 5))}>
                        <SkipForward size={20} />
                    </Button>

                    <div className="flex-1" />

                    <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <Settings size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-slate-400">
                        <Share2 size={18} />
                    </Button>
                    <Button variant="outline" className="gap-2 rounded-xl" onClick={resetWizard}>
                        <RotateCcw size={15} />
                        New
                    </Button>
                </div>
            </motion.div>

            {/* Download formats */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-4"
            >
                <h3 className="font-black text-lg text-slate-800">Download Formats</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    {DOWNLOAD_FORMATS.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => handleDownload(item.key)}
                            className="group p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-narrify-blue/40 hover:shadow-lg transition-all flex flex-col items-center gap-3 text-center"
                        >
                            <item.icon size={32} className="text-slate-300 group-hover:text-narrify-blue transition-colors" />
                            <div>
                                <p className="font-black text-slate-800">{item.label}</p>
                                <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{item.format}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-narrify-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                <Download size={13} /> Download
                            </div>
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
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                        <p className="text-xl font-black narrify-text-gradient">{s.value}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.label}</p>
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
