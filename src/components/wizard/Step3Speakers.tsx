"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNarrifyStore, Speaker } from '@/stores/useNarrifyStore';
import { apiService } from '@/services/api';

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api';

interface ApiVoice { id: string; name: string; gender: string; }
import { Button } from '@/components/ui/button';
import {
    ChevronLeft, ArrowRight, Sparkles, User, Mic, Volume2,
    Play, Info, Plus, Trash2, Edit3, Check, Upload, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Progress } from './Step1Upload';

const GENDER_STYLES = {
    male: {
        badge: 'badge-male',
        bg: 'bg-blue-50',
        border: 'border-blue-100',
        icon: 'text-blue-500',
        label: 'Male',
        emoji: '♂',
    },
    female: {
        badge: 'badge-female',
        bg: 'bg-pink-50',
        border: 'border-pink-100',
        icon: 'text-pink-500',
        label: 'Female',
        emoji: '♀',
    },
    neutral: {
        badge: 'badge-neutral',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        icon: 'text-slate-500',
        label: 'Neutral',
        emoji: '◎',
    },
};

const DEFAULT_VOICES = {
    male: [
        { id: 'v_m1', name: 'James — Professional', type: 'Studio' },
        { id: 'v_m2', name: 'Marcus — Authoritative', type: 'Neural' },
        { id: 'v_m3', name: 'The Professor', type: 'Neural' },
    ],
    female: [
        { id: 'v_f1', name: 'Sophia — Calm', type: 'Natural' },
        { id: 'v_f2', name: 'Elena — Expressive', type: 'Studio' },
        { id: 'v_f3', name: 'Aria — Storyteller', type: 'Neural' },
    ],
    neutral: [
        { id: 'v_n1', name: 'Alex — Neutral', type: 'Neural' },
        { id: 'v_n2', name: 'Child Storyteller', type: 'Natural' },
    ],
};

const ANALYSIS_STEPS = [
    "Parsing PDF structure...",
    "Running NLP sentence segmentation...",
    "Detecting speakers & dialogue patterns...",
    "Inferring character genders...",
    "Analyzing emotional context...",
    "Assigning voice profiles...",
    "Finalizing speaker configuration...",
];

const EMOTION_LABELS = ['Calm', 'Subtle', 'Moderate', 'Expressive', 'Intense'];
const SPEED_LABELS = ['Slow', 'Relaxed', 'Normal', 'Brisk', 'Fast'];

const SpeakerCard = ({ speaker, index, apiVoices }: { speaker: Speaker; index: number; apiVoices: ApiVoice[] }) => {
    const { updateSpeaker } = useNarrifyStore();
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(speaker.name);
    const [showVoicePicker, setShowVoicePicker] = useState(false);
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const style = GENDER_STYLES[speaker.gender];

    // Use real API voices filtered by gender, fall back to static list
    const filteredApiVoices = apiVoices.filter(v => v.gender === speaker.gender);
    const voices = filteredApiVoices.length > 0
        ? filteredApiVoices.map(v => ({ id: v.id, name: v.name, type: 'Neural' }))
        : DEFAULT_VOICES[speaker.gender];

    const handleNameSave = () => {
        if (editName.trim()) updateSpeaker(speaker.id, { name: editName.trim() });
        setIsEditingName(false);
    };

    const handleVoicePreview = () => {
        const voiceId = speaker.voiceId || voices[0]?.id;
        if (!voiceId) return;

        // Stop any currently playing preview
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (isPlayingPreview) {
            setIsPlayingPreview(false);
            return;
        }

        setIsPlayingPreview(true);
        const audio = new Audio(`${FASTAPI_URL}/voices/${voiceId}/sample`);
        audioRef.current = audio;
        audio.onended = () => setIsPlayingPreview(false);
        audio.onerror = () => setIsPlayingPreview(false);
        audio.play().catch(() => setIsPlayingPreview(false));
    };

    const emotionLabel = EMOTION_LABELS[Math.round(speaker.emotion * (EMOTION_LABELS.length - 1))];
    const speedLabel = SPEED_LABELS[Math.round(((speaker.speed - 0.5) / 1.5) * (SPEED_LABELS.length - 1))];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-narrify-blue/20 transition-all"
        >
            {/* Card header */}
            <div className={cn("px-6 pt-6 pb-4 border-b", style.bg, style.border)}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0", `bg-${speaker.gender === 'male' ? 'blue' : speaker.gender === 'female' ? 'pink' : 'slate'}-100`)}>
                            {style.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                            {isEditingName ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setIsEditingName(false); }}
                                        className="text-lg font-black bg-white border border-narrify-blue rounded-lg px-2 py-0.5 outline-none w-full"
                                    />
                                    <button onClick={handleNameSave} className="text-green-500 hover:text-green-600 flex-shrink-0">
                                        <Check size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group/name cursor-pointer" onClick={() => setIsEditingName(true)}>
                                    <p className="font-black text-lg text-slate-900 truncate">{speaker.name}</p>
                                    <Edit3 size={13} className="text-slate-300 group-hover/name:text-narrify-blue transition-colors flex-shrink-0" />
                                </div>
                            )}
                            <span className={cn("inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5", style.badge)}>
                                {style.label}
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("rounded-xl flex-shrink-0", isPlayingPreview ? "text-narrify-blue bg-narrify-blue/10" : "text-slate-300")}
                        onClick={handleVoicePreview}
                    >
                        {isPlayingPreview ? (
                            <div className="flex items-end gap-0.5 h-4">
                                {[1, 2, 3, 2, 1].map((h, i) => (
                                    <div key={i} className="w-0.5 bg-narrify-blue rounded-full animate-pulse" style={{ height: `${h * 25}%`, animationDelay: `${i * 100}ms` }} />
                                ))}
                            </div>
                        ) : (
                            <Volume2 size={18} />
                        )}
                    </Button>
                </div>
            </div>

            {/* Card body */}
            <div className="p-6 space-y-6">
                {/* Voice selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Voice</label>
                    <button
                        onClick={() => setShowVoicePicker(!showVoicePicker)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-narrify-blue/30 transition-all text-sm font-semibold text-slate-700"
                    >
                        <div className="flex items-center gap-2">
                            <Mic size={14} className="text-narrify-blue" />
                            {voices.find(v => v.id === speaker.voiceId)?.name ?? voices[0].name}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {voices.find(v => v.id === speaker.voiceId)?.type ?? voices[0].type}
                        </div>
                    </button>

                    <AnimatePresence>
                        {showVoicePicker && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-1.5 space-y-1.5">
                                    {voices.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => { updateSpeaker(speaker.id, { voiceId: v.id }); setShowVoicePicker(false); }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all",
                                                speaker.voiceId === v.id
                                                    ? "bg-narrify-blue text-white border-narrify-blue"
                                                    : "bg-white text-slate-700 border-slate-200 hover:border-narrify-blue/30"
                                            )}
                                        >
                                            <span>{v.name}</span>
                                            <span className={cn("text-[10px] font-bold uppercase", speaker.voiceId === v.id ? "text-white/70" : "text-slate-400")}>{v.type}</span>
                                        </button>
                                    ))}
                                    <button
                                        className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-narrify-blue/30 text-sm font-bold text-narrify-blue hover:bg-narrify-blue/5 transition-all"
                                    >
                                        <Upload size={13} /> Upload Custom Voice (6-30 sec)
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Emotion slider */}
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emotion Intensity</label>
                        <span className="text-xs font-bold text-narrify-purple">{emotionLabel}</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="1" step="0.01"
                        value={speaker.emotion}
                        onChange={e => updateSpeaker(speaker.id, { emotion: parseFloat(e.target.value) })}
                        className="w-full h-2 appearance-none rounded-full cursor-pointer"
                        style={{
                            background: `linear-gradient(90deg, #9333EA ${speaker.emotion * 100}%, #E5E7EB ${speaker.emotion * 100}%)`
                        }}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        <span>Calm</span>
                        <span>Intense</span>
                    </div>
                </div>

                {/* Speed slider */}
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Speech Speed</label>
                        <span className="text-xs font-bold text-narrify-blue">{speaker.speed.toFixed(1)}x — {speedLabel}</span>
                    </div>
                    <input
                        type="range"
                        min="0.5" max="2.0" step="0.1"
                        value={speaker.speed}
                        onChange={e => updateSpeaker(speaker.id, { speed: parseFloat(e.target.value) })}
                        className="w-full h-2 appearance-none rounded-full cursor-pointer"
                        style={{
                            background: `linear-gradient(90deg, #4F46E5 ${((speaker.speed - 0.5) / 1.5) * 100}%, #E5E7EB ${((speaker.speed - 0.5) / 1.5) * 100}%)`
                        }}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        <span>0.5x</span>
                        <span>2.0x</span>
                    </div>
                </div>

                {/* Clone voice button */}
                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:border-narrify-blue hover:text-narrify-blue transition-colors">
                    <Mic size={14} />
                    Clone Custom Voice for {speaker.name.split(' ')[0]}
                </button>
            </div>
        </motion.div>
    );
};

export const Step3Speakers = () => {
    const { setStep, speakers, setSpeakers, setProcessedData, fileId, processedData, isProcessing, setIsProcessing, progress, setProgress } = useNarrifyStore();
    const [analysisStep, setAnalysisStep] = useState(0);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [realSegmentsCount, setRealSegmentsCount] = useState<number | null>(null);
    const [apiVoices, setApiVoices] = useState<ApiVoice[]>([]);

    useEffect(() => {
        if (speakers.length === 0 && !isProcessing) {
            analyzeDocument();
        }
        // Fetch real voices from FastAPI for the voice picker
        apiService.listVoices().then((res) => {
            const list: ApiVoice[] = res.data?.voices ?? [];
            setApiVoices(list);
        }).catch(() => { /* silent — falls back to DEFAULT_VOICES */ });
    }, []);

    const analyzeDocument = async () => {
        setIsProcessing(true);
        setProgress(0);
        setAnalysisError(null);

        // Start a simulated progress animation while API call runs
        let p = 0;
        let stepIdx = 0;
        const interval = setInterval(() => {
            p += 1.5;
            const newStepIdx = Math.floor((p / 95) * ANALYSIS_STEPS.length);
            if (newStepIdx !== stepIdx && newStepIdx < ANALYSIS_STEPS.length) {
                stepIdx = newStepIdx;
                setAnalysisStep(stepIdx);
            }
            setProgress(Math.min(Math.round(p), 95));
            if (p >= 95) clearInterval(interval);
        }, 80);

        try {
            const response = await apiService.processPDF(fileId!, true);
            const data = response.data;

            clearInterval(interval);

            // Build speaker map from returned segments
            const speakersMap = new Map<string, Speaker>();
            let totalSegments = 0;

            if (data.chapters && Array.isArray(data.chapters)) {
                data.chapters.forEach((chapter: any) => {
                    if (chapter.segments && Array.isArray(chapter.segments)) {
                        totalSegments += chapter.segments.length;
                        chapter.segments.forEach((seg: any) => {
                            if (!speakersMap.has(seg.speaker)) {
                                const gender = (seg.gender === 'male' || seg.gender === 'female') ? seg.gender : 'neutral';
                                speakersMap.set(seg.speaker, {
                                    id: seg.speaker.toLowerCase().replace(/\s+/g, '-'),
                                    name: seg.speaker,
                                    gender,
                                    voiceId: undefined,
                                    emotion: 0.5,
                                    speed: 1.0,
                                });
                            }
                        });
                    }
                });
            }

            // If backend returns speakers_detected directly
            if (data.speakers_detected && Array.isArray(data.speakers_detected) && speakersMap.size === 0) {
                data.speakers_detected.forEach((name: string) => {
                    speakersMap.set(name, {
                        id: name.toLowerCase().replace(/\s+/g, '-'),
                        name,
                        gender: 'neutral',
                        voiceId: undefined,
                        emotion: 0.5,
                        speed: 1.0,
                    });
                });
            }

            setRealSegmentsCount(totalSegments);
            setProcessedData(data);
            setSpeakers(Array.from(speakersMap.values()));

            setProgress(100);
            setIsProcessing(false);

        } catch (err: any) {
            clearInterval(interval);
            const errMsg = err.response?.data?.detail || 'Analysis failed. Please check the backend is running.';
            setAnalysisError(errMsg);
            setProgress(0);
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-10 max-w-2xl mx-auto">
                {/* Spinner */}
                <div className="relative w-36 h-36">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-narrify-blue border-r-narrify-purple"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-3 rounded-full border-2 border-transparent border-b-narrify-cyan"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="text-narrify-purple w-10 h-10 animate-pulse" />
                    </div>
                </div>

                <div className="text-center space-y-4 w-full">
                    <h3 className="text-2xl font-black">Analyzing Your Manuscript</h3>
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={analysisStep}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="text-slate-500 font-medium"
                        >
                            {ANALYSIS_STEPS[analysisStep]}
                        </motion.p>
                    </AnimatePresence>

                    <div className="space-y-3 mt-2">
                        <div className="flex justify-between text-sm font-semibold">
                            <span className="text-slate-500">NLP Pipeline</span>
                            <span className="text-narrify-blue">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                    </div>

                    {/* Step indicators */}
                    <div className="flex justify-center gap-1.5 mt-2">
                        {ANALYSIS_STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1 rounded-full transition-all duration-300",
                                    i <= analysisStep ? "bg-narrify-blue w-4" : "bg-slate-200 w-2"
                                )}
                            />
                        ))}
                    </div>
                </div>

                {/* Live stats preview */}
                <div className="w-full grid grid-cols-3 gap-3 text-center">
                    {[
                        { label: "Segments", value: progress > 30 ? Math.floor(progress * 0.5) : "...", },
                        { label: "Speakers Found", value: progress > 60 ? "..." : "...", },
                        { label: "Emotions Detected", value: progress > 80 ? "..." : "...", },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4">
                            <p className="text-xl font-black narrify-text-gradient">{s.value}</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* API error banner — shown but user can still continue */}
            {analysisError && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-200"
                >
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-red-800 text-sm">Analysis Failed</p>
                        <p className="text-xs text-red-600 mt-0.5">{analysisError} — Retry before continuing.</p>
                    </div>
                    <button onClick={analyzeDocument} className="ml-auto text-xs font-bold text-red-700 underline flex-shrink-0">
                        Retry
                    </button>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">Configure Speakers</h2>
                    <p className="text-muted-foreground text-lg">
                        Detected{" "}
                        <span className="font-bold text-narrify-purple">{speakers.length} speakers</span>
                        . Assign voices and tune emotion & speed.
                    </p>
                </div>

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(
                        speakers.reduce((acc, s) => { acc[s.gender] = (acc[s.gender] || 0) + 1; return acc; }, {} as Record<string, number>)
                    ).map(([gender, count]) => {
                        const style = GENDER_STYLES[gender as keyof typeof GENDER_STYLES];
                        return (
                            <span key={gender} className={cn("text-xs font-bold px-3 py-1.5 rounded-full border", style.badge)}>
                                {style.emoji} {count} {style.label}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Info toast */}
            <div className="flex items-start gap-3 p-4 bg-narrify-blue/5 rounded-2xl border border-narrify-blue/10 text-sm">
                <Info size={15} className="text-narrify-blue flex-shrink-0 mt-0.5" />
                <p className="text-slate-600">
                    Click any speaker name to rename it. Voice assignments and emotion settings will be applied per character during generation.
                </p>
            </div>

            {/* Speaker cards */}
            <div className="grid lg:grid-cols-2 gap-5">
                {speakers.map((speaker, idx) => (
                    <SpeakerCard key={speaker.id} speaker={speaker} index={idx} apiVoices={apiVoices} />
                ))}
            </div>

            {/* Processing stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Segments", value: realSegmentsCount !== null ? `${realSegmentsCount}` : processedData ? "—" : "—" },
                    { label: "Unique Speakers", value: `${speakers.length}` },
                    { label: "Emotion Profiles", value: processedData ? "✓" : "—" },
                    { label: "Est. Duration", value: processedData ? "~TBD" : "~TBD" },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                        <p className="text-xl font-black narrify-text-gradient">{s.value}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setStep(2)} className="gap-2 text-slate-500">
                    <ChevronLeft size={16} /> Back
                </Button>
                <Button
                    size="lg"
                    variant="narrify"
                    onClick={() => setStep(4)}
                    disabled={speakers.length === 0}
                    className="h-12 px-10 rounded-2xl gap-2 shadow-xl shadow-narrify-blue/20 group"
                >
                    <Sparkles size={16} />
                    Generate Audiobook
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};
