"use client";


import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    Headphones, Play, Pause, Download, ChevronLeft, Clock,
    Sparkles, FileText, Globe2, Users, CheckCircle2, AlertCircle,
    Loader2, Volume2, VolumeX, SkipBack, SkipForward,
    RefreshCw, Zap, ChevronRight, Square, Pencil, Check, X,
    Trash2, Camera, Settings2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/utils/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobookById, deleteAudiobook } from "@/store/slices/audiobookSlice";
import { audiobookApi } from "@/lib/api/audiobooks";
import { djangoApi } from "@/lib/api/axios";
import { format } from "date-fns";


const CHAPTER_COLORS = [
    "bg-narrify-blue", "bg-narrify-purple", "bg-narrify-cyan",
    "bg-pink-500", "bg-amber-500", "bg-green-500", "bg-rose-500",
];


const WAVEFORM = Array.from({ length: 60 }, (_, i) => {
    const pattern = [30, 60, 45, 80, 35, 70, 50, 90, 40, 65, 55, 85];
    return pattern[i % pattern.length];
});


const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];


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


function toTitleCase(str: string) {
    return str.replace(/[_\-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}


export default function AudiobookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { currentAudiobook: book, isLoading } = useAppSelector((s) => s.audiobook);


    // Audio player state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioError, setAudioError] = useState(false);
    const [volume, setVolume] = useState(1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [activeChapter, setActiveChapter] = useState(0);


    // Edit states
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState("");
    const [savingTitle, setSavingTitle] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);


    // Actions
    const [isReprocessing, setIsReprocessing] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [taskProgress, setTaskProgress] = useState(0);
    const [taskStage, setTaskStage] = useState("");
    const [actionError, setActionError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);


    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);


    const FASTAPI_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");


    const audioUrl = (() => {
        if (!book?.output_audio_path) return null;
        const p = book.output_audio_path;
        if (p.startsWith("http")) return p;
        const filename = p.split(/[\\\/]/).pop();
        return `${FASTAPI_URL}/api/outputs/${filename}`;
    })();


    const storageKey = `audiobook_${params.id}_position`;


    useEffect(() => {
        const id = Number(params.id);
        if (!isNaN(id)) dispatch(fetchAudiobookById(id));
    }, [params.id, dispatch]);


    useEffect(() => {
        if (book) setTitleValue(toTitleCase(book.title));
    }, [book?.title]);


    // Poll task status while processing
    useEffect(() => {
        if (book?.status !== "processing") return;
        const id = Number(params.id);
        const interval = setInterval(async () => {
            try {
                const s = await audiobookApi.getTaskStatus(id);
                setTaskProgress(s.progress ?? 0);
                setTaskStage(s.stage ?? "");
                if (s.book_status !== "processing") {
                    clearInterval(interval);
                    dispatch(fetchAudiobookById(id));
                }
            } catch { /* ignore */ }
        }, 4000);
        return () => clearInterval(interval);
    }, [book?.status, params.id, dispatch]);


    // Elapsed timer
    useEffect(() => {
        if (book?.status !== "processing") { setElapsedSeconds(0); return; }
        const startSec = book.updated_at
            ? Math.max(0, Math.floor((Date.now() - new Date(book.updated_at).getTime()) / 1000))
            : 0;
        setElapsedSeconds(startSec);
        const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [book?.status, book?.updated_at]);


    // Sync audio element
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioUrl) return;
        audio.src = audioUrl;
        audio.load();
        const onLoaded = () => {
            setDuration(audio.duration);
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
        const onEnded = () => { setIsPlaying(false); setCurrentTime(0); localStorage.removeItem(storageKey); };
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


    // Auto-advance active chapter
    useEffect(() => {
        if (!duration || !book?.chapters?.length || book.chapters.length <= 1) return;
        const idx = Math.min(Math.floor((currentTime / duration) * book.chapters.length), book.chapters.length - 1);
        setActiveChapter(idx);
    }, [currentTime, duration, book?.chapters?.length]);


    useEffect(() => { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
    useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackSpeed; }, [playbackSpeed]);


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


    const FASTAPI_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");

    const seekToChapter = (chapterIndex: number, chapters: any[]) => {
        const audio = audioRef.current;
        if (!audio) return;
        const chapter = chapters[chapterIndex];
        // If chapter has its own audio URL (stored in content field), switch to it
        const chapterAudioPath = chapter?.content;
        if (chapterAudioPath && chapterAudioPath.startsWith('/api/outputs/')) {
            const filename = chapterAudioPath.split('/').pop();
            const chapterAudioUrl = `${FASTAPI_BASE_URL}/api/outputs/${filename}`;
            audio.src = chapterAudioUrl;
            audio.load();
            setCurrentTime(0);
            setActiveChapter(chapterIndex);
            audio.play().then(() => setIsPlaying(true)).catch(() => setAudioError(true));
        } else if (duration) {
            // Fallback: seek to proportional position in full-book audio
            const chapterStart = (chapterIndex / chapters.length) * duration;
            audio.currentTime = chapterStart;
            setCurrentTime(chapterStart);
            setActiveChapter(chapterIndex);
            if (!isPlaying) audio.play().then(() => setIsPlaying(true)).catch(() => { });
        }
    };


    const handleSaveTitle = async () => {
        if (!book || !titleValue.trim()) { setEditingTitle(false); return; }
        setSavingTitle(true);
        try {
            await audiobookApi.rename(book.id, titleValue.trim());
            dispatch(fetchAudiobookById(book.id));
        } catch { /* ignore */ } finally {
            setSavingTitle(false);
            setEditingTitle(false);
        }
    };


    const handleThumbnailChange = async (file: File) => {
        if (!book) return;
        setUploadingThumb(true);
        try {
            await audiobookApi.uploadThumbnail(book.id, file);
            dispatch(fetchAudiobookById(book.id));
        } catch { /* ignore */ } finally {
            setUploadingThumb(false);
        }
    };


    const handleStop = async () => {
        if (!book) return;
        setIsStopping(true);
        setActionError(null);
        try {
            await audiobookApi.forceReset(book.id);
            dispatch(fetchAudiobookById(book.id));
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || "Failed to stop processing.");
        } finally { setIsStopping(false); }
    };


    const handleGenerate = async () => {
        if (!book) return;
        setIsReprocessing(true);
        setActionError(null);
        try {
            await audiobookApi.startProcessing(book.id);
            dispatch(fetchAudiobookById(book.id));
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || "Failed to start processing.");
        } finally { setIsReprocessing(false); }
    };


    const handleReprocess = async () => {
        if (!book) return;
        setIsReprocessing(true);
        setActionError(null);
        try {
            await audiobookApi.retry(book.id);
            dispatch(fetchAudiobookById(book.id));
        } catch (err: any) {
            setActionError(err?.response?.data?.detail || "Failed to retry processing.");
        } finally { setIsReprocessing(false); }
    };


    const handleDelete = async () => {
        if (!book) return;
        setIsDeleting(true);
        await dispatch(deleteAudiobook(book.id));
        setIsDeleting(false);
        setShowDeleteModal(false);
        router.push("/dashboard");
    };


    const handleDownload = async () => {
        if (!book) return;
        try {
            const response = await djangoApi.get(
                `/audiobooks/books/${book.id}/download/`,
                { responseType: "blob" }
            );
            const blob = new Blob([response.data]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const disposition = (response.headers["content-disposition"] as string) || "";
            const match = disposition.match(/filename="([^"]+)"/);
            a.download = match?.[1] || `narrify_audiobook_${book.id}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(audiobookApi.downloadUrl(book.id), "_blank");
        }
    };


    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;


    if (isLoading) {
        return (
            <MainLayout>
                <div className="max-w-6xl mx-auto py-20 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Loader2 size={40} className="animate-spin text-narrify-blue mx-auto" />
                        <p className="text-muted-foreground font-medium">Loading audiobook…</p>
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
                    <Link href="/dashboard"><Button variant="narrify">Back to Dashboard</Button></Link>
                </div>
            </MainLayout>
        );
    }


    const rawChapters: any[] = book.chapters ?? [];
    const chapters = rawChapters.length > 0
        ? rawChapters
        : [{ title: book.title || "Full Audiobook", primary_speaker: "Narrator", duration: book.total_duration }];


    const speakers = Object.entries(
        chapters.reduce((acc: Record<string, number>, ch: any) => {
            const sp = ch.primary_speaker || "Narrator";
            acc[sp] = (acc[sp] || 0) + 1;
            return acc;
        }, {})
    );


    // Show real user name — prefer full_name, fallback to username, fallback to title-cased author
    const displayAuthor = book.full_name || book.username || (book.author !== "Unknown" ? book.author : null) || "Unknown";


    return (
        <MainLayout>
            {/* Hidden audio element */}
            <audio ref={audioRef} preload="metadata" />


            {/* Hidden thumbnail file input */}
            <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailChange(file);
                    e.target.value = '';
                }}
            />


            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Back + Delete bar */}
                <div className="flex items-center justify-between">
                    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                        <Link href="/dashboard">
                            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2 hover:text-foreground">
                                <ChevronLeft size={16} /> Back to Dashboard
                            </Button>
                        </Link>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            <Trash2 size={15} /> Delete
                        </Button>
                    </motion.div>
                </div>


                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start"
                >
                    {/* Cover art — click to change */}
                    <button
                        className="relative w-full md:w-64 lg:w-72 aspect-square rounded-[2rem] shadow-2xl shadow-narrify-blue/20 flex-shrink-0 overflow-hidden group focus:outline-none"
                        onClick={() => thumbInputRef.current?.click()}
                        title="Click to change cover image"
                    >
                        {book.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={book.thumbnail_url} alt="cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full narrify-gradient flex items-center justify-center text-white">
                                <Headphones size={90} strokeWidth={1} />
                            </div>
                        )}
                        {/* Upload overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                            {uploadingThumb
                                ? <Loader2 size={28} className="animate-spin" />
                                : <>
                                    <Camera size={28} />
                                    <span className="text-sm font-bold">Change Cover</span>
                                </>
                            }
                        </div>
                    </button>


                    <div className="flex-1 space-y-5">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <StatusBadge status={book.status} />
                                {book.completed_at && (
                                    <span className="text-muted-foreground text-sm flex items-center gap-1.5 font-medium">
                                        <Clock size={13} /> {format(new Date(book.completed_at), "MMM d, yyyy")}
                                    </span>
                                )}
                            </div>


                            {/* Editable title */}
                            {editingTitle ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        autoFocus
                                        value={titleValue}
                                        onChange={(e) => setTitleValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveTitle();
                                            if (e.key === "Escape") setEditingTitle(false);
                                        }}
                                        className="flex-1 text-3xl md:text-4xl font-black tracking-tight bg-muted rounded-xl px-4 py-2 outline-none border-2 border-narrify-blue/40 text-foreground"
                                    />
                                    <button onClick={handleSaveTitle} disabled={savingTitle}
                                        className="p-2.5 rounded-xl bg-narrify-blue text-white hover:opacity-90 transition-opacity">
                                        {savingTitle ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                    </button>
                                    <button onClick={() => setEditingTitle(false)}
                                        className="p-2.5 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="group flex items-start gap-3 text-left"
                                    onClick={() => setEditingTitle(true)}
                                >
                                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none text-foreground group-hover:text-narrify-blue transition-colors">
                                        {toTitleCase(book.title)}
                                    </h1>
                                    <Pencil size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex-shrink-0" />
                                </button>
                            )}


                            <p className="text-muted-foreground text-lg md:text-xl font-medium">
                                By {displayAuthor}
                            </p>
                        </div>


                        {/* Meta pills */}
                        <div className="flex flex-wrap gap-2 text-sm font-medium text-muted-foreground">
                            {book.total_duration > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                                    <Clock size={13} /> {formatDuration(book.total_duration)}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                                <FileText size={13} /> {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                                <Globe2 size={13} /> {book.source_language} → {book.target_language}
                            </span>
                            {speakers.length > 0 && (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                                    <Users size={13} /> {speakers.length} speaker{speakers.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>


                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            {book.status === "completed" && audioUrl && (
                                <>
                                    <Button
                                        id="listen-now-btn"
                                        size="lg"
                                        variant="narrify"
                                        className="h-12 md:h-14 px-8 md:px-10 rounded-full gap-3 shadow-xl shadow-narrify-blue/20"
                                        onClick={togglePlay}
                                    >
                                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                                        {isPlaying ? "Pause" : "Listen Now"}
                                    </Button>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-12 md:h-14 px-8 md:px-10 rounded-full gap-3 border-2"
                                        onClick={handleDownload}
                                    >
                                        <Download size={18} /> Download
                                    </Button>
                                </>
                            )}
                            {book.status === "completed" && !audioUrl && (
                                <Button size="lg" variant="narrify" disabled={isReprocessing}
                                    className="h-12 md:h-14 px-8 md:px-10 rounded-full gap-3"
                                    onClick={handleReprocess}>
                                    {isReprocessing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
                                    {isReprocessing ? "Queuing…" : "Generate Audio"}
                                </Button>
                            )}
                            {book.status === "uploaded" && (
                                <Button size="lg" variant="narrify" disabled={isReprocessing}
                                    className="h-12 md:h-14 px-8 md:px-10 rounded-full gap-3 shadow-xl shadow-narrify-blue/20"
                                    onClick={handleGenerate}>
                                    {isReprocessing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                                    {isReprocessing ? "Starting…" : "Generate Audiobook"}
                                </Button>
                            )}
                            {book.status === "processing" && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <Button size="lg" disabled className="h-12 md:h-14 px-10 rounded-full gap-3">
                                            <Loader2 size={20} className="animate-spin" />
                                            {taskStage || "Processing…"} {taskProgress > 0 ? `(${taskProgress}%)` : ""}
                                        </Button>
                                        <Button size="lg" variant="outline" disabled={isStopping}
                                            className="h-12 md:h-14 px-6 rounded-full gap-2 border-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-500/30"
                                            onClick={handleStop}>
                                            {isStopping ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} className="fill-current" />}
                                            {isStopping ? "Stopping…" : "Stop"}
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {taskProgress > 0 && (
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden w-48">
                                                <div className="h-full bg-narrify-blue rounded-full transition-all duration-500" style={{ width: `${taskProgress}%` }} />
                                            </div>
                                        )}
                                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                            {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")}
                                            {taskProgress > 0 ? (() => {
                                                const remaining = Math.max(0, Math.round(elapsedSeconds / (taskProgress / 100) - elapsedSeconds));
                                                return (
                                                    <span className="ml-1.5 text-muted-foreground/60">
                                                        · ~{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} left
                                                    </span>
                                                );
                                            })() : elapsedSeconds >= 3 ? (
                                                <span className="ml-1.5 text-muted-foreground/60">· estimating…</span>
                                            ) : null}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {book.status === "failed" && (
                                <Button size="lg" variant="outline" disabled={isReprocessing}
                                    className="h-12 md:h-14 px-10 rounded-full gap-3 text-red-500 border-red-200 hover:bg-red-50"
                                    onClick={handleReprocess}>
                                    {isReprocessing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                                    {isReprocessing ? "Queuing…" : "Retry Generation"}
                                </Button>
                            )}
                        </div>
                        {actionError && (
                            <p className="flex items-center gap-1.5 text-sm text-red-500 font-medium">
                                <AlertCircle size={14} /> {actionError}
                            </p>
                        )}
                    </div>
                </motion.div>


                {/* ── Audio Player ── */}
                <AnimatePresence>
                    {book.status === "completed" && audioUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden"
                        >
                            {/* Waveform */}
                            <div className="px-6 md:px-8 pt-7 pb-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                                    {toTitleCase(book.title)} · Chapter {activeChapter + 1} of {chapters.length}
                                </p>
                                <div className="flex items-end gap-[2px] h-16 md:h-20 mb-4">
                                    {WAVEFORM.map((h, i) => {
                                        const played = (i / WAVEFORM.length) * 100 < progress;
                                        return (
                                            <motion.div
                                                key={i}
                                                className={cn("flex-1 rounded-full transition-colors duration-150",
                                                    played ? "bg-narrify-blue" : "bg-muted")}
                                                style={{ height: `${h}%` }}
                                                animate={isPlaying && Math.abs((i / WAVEFORM.length) * 100 - progress) < 6
                                                    ? { height: [`${h}%`, `${Math.min(h + 22, 100)}%`, `${h}%`] }
                                                    : { height: `${h}%` }}
                                                transition={isPlaying && Math.abs((i / WAVEFORM.length) * 100 - progress) < 6
                                                    ? { duration: 0.35, repeat: Infinity, repeatType: "reverse" }
                                                    : { duration: 0.2 }}
                                            />
                                        );
                                    })}
                                </div>


                                {/* Seek bar */}
                                <div className="relative h-2 bg-muted rounded-full cursor-pointer group" onClick={seek}>
                                    <div className="absolute inset-y-0 left-0 bg-narrify-blue rounded-full transition-all duration-100"
                                        style={{ width: `${progress}%` }} />
                                    <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-narrify-blue rounded-full shadow-md border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ left: `calc(${progress}% - 8px)` }} />
                                </div>
                                <div className="flex justify-between text-xs font-mono text-muted-foreground mt-1.5">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration || book.total_duration)}</span>
                                </div>
                            </div>


                            {/* Controls */}
                            <div className="px-6 md:px-8 pb-6 flex items-center gap-3 md:gap-4">
                                <button onClick={() => skip(-15)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-xl hover:bg-muted">
                                    <SkipBack size={18} />
                                </button>
                                <button
                                    id="player-play-btn"
                                    onClick={togglePlay}
                                    className="w-12 h-12 md:w-14 md:h-14 rounded-full narrify-gradient text-white flex items-center justify-center shadow-lg shadow-narrify-blue/30 flex-shrink-0 hover:opacity-90 active:scale-95 transition-all"
                                >
                                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                                </button>
                                <button onClick={() => skip(15)} className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-xl hover:bg-muted">
                                    <SkipForward size={18} />
                                </button>


                                <div className="flex-1" />


                                {/* Playback speed */}
                                <div className="relative">
                                    <button
                                        id="speed-btn"
                                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors border border-border"
                                    >
                                        <Settings2 size={13} />
                                        {playbackSpeed}×
                                    </button>
                                    <AnimatePresence>
                                        {showSpeedMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-20 py-1"
                                            >
                                                {SPEED_OPTIONS.map((s) => (
                                                    <button key={s} onClick={() => { setPlaybackSpeed(s); setShowSpeedMenu(false); }}
                                                        className={cn(
                                                            "w-full flex items-center justify-between gap-8 px-4 py-2 text-sm font-bold hover:bg-muted transition-colors",
                                                            playbackSpeed === s ? "text-narrify-blue" : "text-foreground"
                                                        )}>
                                                        {s}×
                                                        {playbackSpeed === s && <Check size={12} className="text-narrify-blue" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>


                                {/* Volume */}
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground hover:text-foreground transition-colors">
                                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                                    </button>
                                    <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
                                        onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }}
                                        className="w-16 md:w-20 accent-narrify-blue hidden sm:block" />
                                </div>


                                <button onClick={handleDownload} className="text-muted-foreground hover:text-narrify-blue transition-colors p-2 rounded-xl hover:bg-muted">
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
                </AnimatePresence>


                {/* ── Details ── */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8 pt-2">
                    <div className="md:col-span-2 space-y-6">
                        {/* Chapters */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-border">
                                <h3 className="font-black text-foreground">Chapters</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {book.status === "completed" ? "Click a chapter to jump to it" : "Available after processing"}
                                </p>
                            </div>
                            <div className="divide-y divide-border">
                                {chapters.map((ch: any, i: number) => {
                                    const isActive = activeChapter === i && isPlaying;
                                    const chapterDuration = ch.duration || (book.total_duration / chapters.length);
                                    return (
                                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                                            onClick={() => book.status === "completed" && audioUrl && seekToChapter(i, chapters)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 transition-all duration-150 group",
                                                book.status === "completed" && audioUrl ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
                                                isActive && "bg-narrify-blue/5"
                                            )}>
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                                                isActive ? "bg-narrify-blue" : `${CHAPTER_COLORS[i % CHAPTER_COLORS.length]} opacity-80`)}>
                                                {isActive ? <Pause size={14} className="text-white" /> : <span className="text-white text-xs font-black">{i + 1}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("font-bold text-sm truncate transition-colors",
                                                    isActive ? "text-narrify-blue" : "text-foreground group-hover:text-narrify-blue")}>
                                                    {ch.title ?? `Chapter ${i + 1}`}
                                                </p>
                                                {ch.primary_speaker && (
                                                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Speaker: {ch.primary_speaker}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                {chapterDuration > 0 && (
                                                    <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                                                        {formatDuration(chapterDuration)}
                                                    </span>
                                                )}
                                                {book.status === "completed" && audioUrl && (
                                                    <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-narrify-blue transition-colors" />
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>


                    <div className="space-y-5">
                        {/* Settings used */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-border">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Settings Used</h3>
                            </div>
                            <div className="p-5 space-y-3 text-sm">
                                {[
                                    { label: "Voice Quality", value: <span className="flex items-center gap-1 text-narrify-blue font-bold"><Sparkles size={12} /> Ultra-HD Neural</span> },
                                    { label: "Created By", value: <span className="font-bold text-foreground">{displayAuthor}</span> },
                                    { label: "Source Language", value: book.source_language },
                                    { label: "Target Language", value: book.target_language },
                                    { label: "Base Speed", value: book.base_speed ? `${book.base_speed}×` : "1.0×" },
                                    { label: "Emotion Intensity", value: book.emotion_intensity ? `${book.emotion_intensity}×` : "1.5×" },
                                    { label: "Total Segments", value: book.total_segments || "—" },
                                    { label: "Gen. Time", value: book.generation_time ? `${Math.round(book.generation_time)}s` : "—" },
                                    { label: "Created", value: book.created_at ? format(new Date(book.created_at), "MMM d, yyyy") : "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-bold text-right text-foreground">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>


                        {/* Regenerate CTA */}
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="p-6 narrify-gradient rounded-2xl text-white space-y-4 shadow-xl shadow-narrify-blue/20">
                            <h3 className="font-black text-lg">Need a revision?</h3>
                            <p className="text-sm text-white/80">Regenerate with different speed, emotion, or voice settings.</p>
                            <Link href="/create">
                                <Button className="w-full bg-white text-narrify-blue hover:bg-white/90 font-bold rounded-xl gap-2 mt-2">
                                    <RefreshCw size={14} /> Regenerate
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ── Delete Confirmation Modal ── */}
            <AnimatePresence>
                {showDeleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="delete-modal-overlay"
                        onClick={() => !isDeleting && setShowDeleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 12, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="delete-modal-card"
                        >
                            <div className="delete-modal-icon">
                                <Trash2 size={26} />
                            </div>
                            <h3 className="delete-modal-title">Delete Audiobook?</h3>
                            <p className="delete-modal-desc">
                                <strong>&ldquo;{toTitleCase(book.title)}&rdquo;</strong> will be permanently deleted. This action cannot be undone.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    className="delete-modal-cancel"
                                    disabled={isDeleting}
                                    onClick={() => setShowDeleteModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    id="confirm-delete-btn"
                                    className="delete-modal-confirm"
                                    disabled={isDeleting}
                                    onClick={handleDelete}
                                >
                                    {isDeleting
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><Trash2 size={15} /> Delete</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MainLayout>
    );
}
function StatusBadge({ status }: { status: string }) {
    if (status === "completed")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-100 dark:border-green-500/20">
                <CheckCircle2 size={11} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-500/20 animate-pulse">
                <Loader2 size={11} className="animate-spin" /> Processing
            </span>
        );
    if (status === "uploaded")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-500/20">
                <FileText size={11} /> Uploaded
            </span>
        );
    return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full text-xs font-bold border border-red-100 dark:border-red-500/20">
            <AlertCircle size={11} /> Failed
        </span>
    );
}



