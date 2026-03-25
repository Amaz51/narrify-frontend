"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Headphones, Play, Pause, Download, ChevronLeft, Clock,
    Sparkles, FileText, Globe2, Users, CheckCircle2, AlertCircle,
    Loader2, Volume2, VolumeX, SkipBack, SkipForward,
    RefreshCw, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobookById } from "@/store/slices/audiobookSlice";
import { format } from "date-fns";

const CHAPTER_COLORS = [
    "bg-narrify-blue", "bg-narrify-purple", "bg-narrify-cyan",
    "bg-pink-500", "bg-amber-500", "bg-green-500", "bg-rose-500",
];

const WAVEFORM = Array.from({ length: 60 }, (_, i) => {
    const pattern = [30, 60, 45, 80, 35, 70, 50, 90, 40, 65, 55, 85];
    return pattern[i % pattern.length];
});

function formatDuration(seconds: number): string {
    if (!seconds) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}

export default function AudiobookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { currentAudiobook: book, isLoading } = useAppSelector((s) => s.audiobook);

    // Audio player state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioError, setAudioError] = useState(false);
    const [volume, setVolume] = useState(1);

    const FASTAPI_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");

    // Build the audio URL from output_audio_path
    const audioUrl = (() => {
        if (!book?.output_audio_path) return null;
        const p = book.output_audio_path;
        // If it's already a full URL return as-is
        if (p.startsWith("http")) return p;
        // If it contains /outputs/ filename segment, serve via FastAPI
        const filename = p.split(/[\\/]/).pop();
        return `${FASTAPI_URL}/api/outputs/${filename}`;
    })();

    const storageKey = `audiobook_${params.id}_position`;

    useEffect(() => {
        const id = Number(params.id);
        if (!isNaN(id)) dispatch(fetchAudiobookById(id));
    }, [params.id, dispatch]);

    // Sync audio element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return;

        audio.src = audioUrl;
        audio.load();

        const onLoaded = () => {
            setDuration(audio.duration);
            // Restore saved position
            const saved = parseFloat(localStorage.getItem(storageKey) || "0");
            if (saved > 0 && saved < audio.duration - 5) {
                audio.currentTime = saved;
                setCurrentTime(saved);
            }
        };
        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            localStorage.setItem(storageKey, String(Math.floor(audio.currentTime)));
        };
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            localStorage.removeItem(storageKey);
        };
        const onError = () => setAudioError(true);

        audio.addEventListener("loadedmetadata", onLoaded);
        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);
        audio.addEventListener("error", onError);

        return () => {
            audio.removeEventListener("loadedmetadata", onLoaded);
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended", onEnded);
            audio.removeEventListener("error", onError);
        };
    }, [audioUrl]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
    }, [isMuted]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) { audio.pause(); setIsPlaying(false); }
        else { audio.play().then(() => setIsPlaying(true)).catch(() => setAudioError(true)); }
    };

    const seek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pct * duration;
        setCurrentTime(pct * duration);
    };

    const skip = (secs: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs));
    };

    const handleDownload = async () => {
        if (!audioUrl) return;
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${book?.title ?? "audiobook"}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(audioUrl, "_blank");
        }
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (isLoading) {
        return (
            <MainLayout>
                <div className="max-w-6xl mx-auto py-20 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 size={40} className="animate-spin text-narrify-blue mx-auto" />
                        <p className="text-slate-400 font-medium">Loading audiobook…</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!book) {
        return (
            <MainLayout>
                <div className="max-w-6xl mx-auto py-20 text-center space-y-4">
                    <AlertCircle size={40} className="text-red-400 mx-auto" />
                    <p className="font-bold text-slate-600">Audiobook not found.</p>
                    <Link href="/dashboard">
                        <Button variant="narrify">Back to Dashboard</Button>
                    </Link>
                </div>
            </MainLayout>
        );
    }

    const chapters = book.chapters ?? [];
    const speakers = Object.entries(
        (chapters as any[]).reduce((acc: Record<string, number>, ch: any) => {
            const sp = ch.primary_speaker || "Narrator";
            acc[sp] = (acc[sp] || 0) + 1;
            return acc;
        }, {})
    );

    return (
        <MainLayout>
            {/* Hidden native audio element */}
            <audio ref={audioRef} preload="metadata" />

            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-2 text-slate-500 -ml-2">
                        <ChevronLeft size={16} /> Back to Dashboard
                    </Button>
                </Link>

                {/* Header */}
                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Cover art */}
                    <div className="w-full md:w-72 aspect-square rounded-[2rem] narrify-gradient shadow-2xl shadow-narrify-blue/20 flex items-center justify-center text-white flex-shrink-0">
                        <Headphones size={100} strokeWidth={1} />
                    </div>

                    <div className="flex-1 space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <StatusBadge status={book.status} />
                                {book.completed_at && (
                                    <span className="text-slate-400 text-sm flex items-center gap-1.5 font-medium">
                                        <Clock size={13} /> {format(new Date(book.completed_at), "MMM d, yyyy")}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">{book.title}</h1>
                            <p className="text-slate-500 text-xl font-medium">By {book.author}</p>
                        </div>

                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-500">
                            {book.total_duration > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                    <Clock size={13} /> {formatDuration(book.total_duration)}
                                </span>
                            )}
                            {book.total_chapters > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                    <FileText size={13} /> {book.total_chapters} chapters
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                <Globe2 size={13} /> {book.source_language} → {book.target_language}
                            </span>
                            {speakers.length > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full">
                                    <Users size={13} /> {speakers.length} speakers
                                </span>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            {book.status === "completed" && audioUrl && (
                                <>
                                    <Button
                                        size="lg"
                                        variant="narrify"
                                        className="h-14 px-10 rounded-full gap-3 shadow-xl shadow-narrify-blue/20"
                                        onClick={togglePlay}
                                    >
                                        {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                                        {isPlaying ? "Pause" : "Listen Now"}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-14 px-10 rounded-full gap-3 border-2"
                                        onClick={handleDownload}
                                    >
                                        <Download size={18} /> Download
                                    </Button>
                                </>
                            )}
                            {book.status === "processing" && (
                                <Button size="lg" disabled className="h-14 px-10 rounded-full gap-3">
                                    <Loader2 size={20} className="animate-spin" /> Processing…
                                </Button>
                            )}
                            {book.status === "failed" && (
                                <Button size="lg" variant="outline" className="h-14 px-10 rounded-full gap-3 text-red-500 border-red-200">
                                    <Zap size={20} /> Retry Generation
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Audio Player ── */}
                {book.status === "completed" && audioUrl && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden"
                    >
                        {/* Waveform */}
                        <div className="px-8 pt-7 pb-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                {book.title}
                            </p>
                            <div className="flex items-end gap-[2px] h-20 mb-4">
                                {WAVEFORM.map((h, i) => {
                                    const played = (i / WAVEFORM.length) * 100 < progress;
                                    return (
                                        <motion.div
                                            key={i}
                                            className={cn(
                                                "flex-1 rounded-full transition-colors duration-150",
                                                played ? "bg-narrify-blue" : "bg-slate-200 dark:bg-slate-700"
                                            )}
                                            style={{ height: `${h}%` }}
                                            animate={
                                                isPlaying && Math.abs((i / WAVEFORM.length) * 100 - progress) < 6
                                                    ? { height: [`${h}%`, `${Math.min(h + 22, 100)}%`, `${h}%`] }
                                                    : { height: `${h}%` }
                                            }
                                            transition={{ duration: 0.35, repeat: Infinity, repeatType: "reverse" }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Seek bar */}
                            <div
                                className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full cursor-pointer group"
                                onClick={seek}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 bg-narrify-blue rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-narrify-blue rounded-full shadow-md border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ left: `calc(${progress}% - 8px)` }}
                                />
                            </div>

                            <div className="flex justify-between text-xs font-mono text-slate-400 mt-1.5">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration || book.total_duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="px-8 pb-6 flex items-center gap-4">
                            <button onClick={() => skip(-15)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                                <SkipBack size={20} />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-14 h-14 rounded-full narrify-gradient text-white flex items-center justify-center shadow-lg shadow-narrify-blue/30 flex-shrink-0 hover:opacity-90 transition-opacity"
                            >
                                {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
                            </button>

                            <button onClick={() => skip(15)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                                <SkipForward size={20} />
                            </button>

                            <div className="flex-1" />

                            {/* Volume */}
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsMuted(!isMuted)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                </button>
                                <input
                                    type="range" min={0} max={1} step={0.05}
                                    value={isMuted ? 0 : volume}
                                    onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                                    className="w-20 accent-narrify-blue"
                                />
                            </div>

                            <button onClick={handleDownload} className="text-slate-400 hover:text-narrify-blue transition-colors p-2">
                                <Download size={18} />
                            </button>
                        </div>

                        {audioError && (
                            <p className="px-8 pb-4 text-xs text-amber-500 font-medium flex items-center gap-1.5">
                                <AlertCircle size={12} /> Audio file not yet available on the server.
                            </p>
                        )}
                    </motion.div>
                )}

                {/* ── Details ── */}
                <div className="grid md:grid-cols-3 gap-8 pt-2">
                    <div className="md:col-span-2 space-y-6">
                        {/* Chapters */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Chapters & Speakers</CardTitle>
                                <CardDescription>Character assignments throughout the audiobook.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {chapters.length > 0 ? (
                                    (chapters as any[]).map((ch: any, i: number) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
                                        >
                                            <div className={cn("w-1 h-10 rounded-full flex-shrink-0", CHAPTER_COLORS[i % CHAPTER_COLORS.length])} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{ch.title ?? `Chapter ${i + 1}`}</p>
                                                {ch.primary_speaker && (
                                                    <p className="text-xs text-slate-400 font-medium">Speaker: {ch.primary_speaker}</p>
                                                )}
                                            </div>
                                            {ch.duration > 0 && (
                                                <span className="text-xs font-mono text-slate-400 flex-shrink-0">
                                                    {formatDuration(ch.duration)}
                                                </span>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 py-4 text-center">
                                        Chapter details will appear here after processing.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-5">
                        {/* Settings used */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm uppercase tracking-widest text-slate-400">Settings Used</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {[
                                    { label: "Voice Quality", value: <span className="flex items-center gap-1 text-narrify-blue font-bold"><Sparkles size={13} /> Ultra-HD Neural</span> },
                                    { label: "Source Language", value: book.source_language },
                                    { label: "Target Language", value: book.target_language },
                                    { label: "Base Speed", value: book.base_speed ? `${book.base_speed}×` : "1.0×" },
                                    { label: "Emotion Intensity", value: book.emotion_intensity ? `${book.emotion_intensity}×` : "1.5×" },
                                    { label: "Source Format", value: <span className="flex items-center gap-1 font-bold"><FileText size={13} /> PDF</span> },
                                    { label: "Total Segments", value: book.total_segments || "—" },
                                    { label: "Gen. Time", value: book.generation_time ? `${Math.round(book.generation_time)}s` : "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-slate-500">{label}</span>
                                        <span className="font-bold text-right">{value}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Regenerate CTA */}
                        <div className="p-6 narrify-gradient rounded-3xl text-white space-y-4 shadow-xl shadow-narrify-blue/20">
                            <h3 className="font-black text-lg">Need a revision?</h3>
                            <p className="text-sm text-white/80">Regenerate with different speed, emotion, or voice settings.</p>
                            <Link href="/create">
                                <Button className="w-full bg-white text-narrify-blue hover:bg-white/90 font-bold rounded-xl gap-2">
                                    <RefreshCw size={14} /> Regenerate
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "completed")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                <CheckCircle2 size={11} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-bold border border-amber-100 animate-pulse">
                <Loader2 size={11} className="animate-spin" /> Processing
            </span>
        );
    if (status === "uploaded")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                <FileText size={11} /> Uploaded
            </span>
        );
    return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 rounded-full text-xs font-bold border border-red-100">
            <AlertCircle size={11} /> Failed
        </span>
    );
}
