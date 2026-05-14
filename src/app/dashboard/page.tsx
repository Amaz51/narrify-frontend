"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    Headphones, Plus, MoreVertical, Play, Clock, Search,
    TrendingUp, CheckCircle2, AlertCircle, Loader2,
    Globe2, Users, Zap, ArrowUpRight, Sparkles, RefreshCw,
    Pause, SkipBack, SkipForward, Volume2, VolumeX, X,
    Pencil, Check, FileText,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobooks, deleteAudiobook } from "@/store/slices/audiobookSlice";
import { fetchUserProfile, logoutUser } from "@/store/slices/authSlice";
import { Audiobook, audiobookApi } from "@/lib/api/audiobooks";
import { format } from "date-fns";

// ── helpers ──────────────────────────────────────────────────────────────────

const FASTAPI_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");

function buildAudioUrl(path: string): string | null {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const filename = path.split(/[\\/]/).pop();
    return `${FASTAPI_BASE}/api/outputs/${filename}`;
}

function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
}

/** "test_short" → "Test Short", "harry_potter" → "Harry Potter" */
function toTitleCase(str: string) {
    return str.replace(/[_\-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

type StatusFilter = "all" | "completed" | "processing" | "failed" | "uploaded";

// ── StatusBadge ───────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
    if (status === "completed")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-100 dark:border-green-500/20 whitespace-nowrap">
                <CheckCircle2 size={11} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-500/20 whitespace-nowrap animate-pulse">
                <Loader2 size={11} className="animate-spin" /> Processing
            </span>
        );
    if (status === "uploaded")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-500/20 whitespace-nowrap">
                <FileText size={11} /> Uploaded
            </span>
        );
    return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full text-xs font-bold border border-red-100 dark:border-red-500/20 whitespace-nowrap">
            <AlertCircle size={11} /> Failed
        </span>
    );
};

const GRADIENT_COLORS = [
    "from-blue-400 to-indigo-500",
    "from-amber-400 to-orange-500",
    "from-purple-400 to-fuchsia-500",
    "from-cyan-400 to-blue-500",
    "from-rose-400 to-pink-500",
    "from-green-400 to-teal-500",
];

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((s) => s.auth);
    const { audiobooks, isLoading } = useAppSelector((s) => s.audiobook);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<StatusFilter>("all");
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [retryingId, setRetryingId] = useState<number | null>(null);
    const [generatingId, setGeneratingId] = useState<number | null>(null);
    const [resettingId, setResettingId] = useState<number | null>(null);
    const [uploadingThumbId, setUploadingThumbId] = useState<number | null>(null);
    const thumbInputRef = useRef<HTMLInputElement>(null);
    const [thumbTargetId, setThumbTargetId] = useState<number | null>(null);

    // Inline rename
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [savingRename, setSavingRename] = useState(false);

    // Mini player — uses a JSX <audio> element (no new Audio() to avoid hydration)
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playingBook, setPlayingBook] = useState<Audiobook | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // ── initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) { router.push("/auth/login"); return; }
        dispatch(fetchUserProfile());
        dispatch(fetchAudiobooks());
    }, [isAuthenticated, dispatch, router]);

    // ── auto-poll while any book is processing ────────────────────────────────
    // Keep a stable ref so the interval never restarts on every fetch response.
    const audiobooksRef = useRef(audiobooks);
    audiobooksRef.current = audiobooks;
    const stalePollCountRef = useRef<Record<number, number>>({});

    useEffect(() => {
        const id = setInterval(() => {
            const current = audiobooksRef.current;
            const processing = current.filter((b) => b.status === "processing");
            if (processing.length === 0) return;
            // Increment stale counter; reset for books that are no longer processing
            const processingIds = new Set(processing.map((b) => b.id));
            Object.keys(stalePollCountRef.current).forEach((idStr) => {
                if (!processingIds.has(Number(idStr))) delete stalePollCountRef.current[Number(idStr)];
            });
            processing.forEach((b) => {
                stalePollCountRef.current[b.id] = (stalePollCountRef.current[b.id] ?? 0) + 1;
            });
            dispatch(fetchAudiobooks());
        }, 5000);
        return () => clearInterval(id);
    }, [dispatch]); // stable — never restarts

    // ── mute sync ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = isMuted;
    }, [isMuted]);

    // ── close menu on outside click ───────────────────────────────────────────
    useEffect(() => {
        if (openMenu === null) return;
        const handler = () => setOpenMenu(null);
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, [openMenu]);

    // ── handlers ──────────────────────────────────────────────────────────────

    const handleDeleteConfirm = async () => {
        if (deleteConfirmId === null) return;
        if (playingBook?.id === deleteConfirmId) closePlayer();
        setIsDeleting(true);
        await dispatch(deleteAudiobook(deleteConfirmId));
        setIsDeleting(false);
        setDeleteConfirmId(null);
    };

    const handleGenerate = async (id: number) => {
        setGeneratingId(id);
        delete stalePollCountRef.current[id]; // reset stale counter so "Stuck? Reset" doesn't appear immediately
        try {
            await audiobookApi.startProcessing(id);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ } finally {
            setGeneratingId(null);
        }
    };

    const handleRetry = async (id: number) => {
        setRetryingId(id);
        delete stalePollCountRef.current[id]; // reset stale counter for fresh retry attempt
        try {
            await audiobookApi.retry(id);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ } finally {
            setRetryingId(null);
        }
    };

    const handleForceReset = async (id: number) => {
        setResettingId(id);
        delete stalePollCountRef.current[id]; // clear stale counter on manual reset
        try {
            await audiobookApi.forceReset(id);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ } finally {
            setResettingId(null);
            setOpenMenu(null);
        }
    };

    const startRename = (book: Audiobook) => {
        setEditingId(book.id);
        setEditTitle(toTitleCase(book.title));
        setOpenMenu(null);
    };

    const saveRename = async (id: number) => {
        const trimmed = editTitle.trim();
        if (!trimmed) { setEditingId(null); return; }
        setSavingRename(true);
        try {
            await audiobookApi.rename(id, trimmed);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ } finally {
            setSavingRename(false);
            setEditingId(null);
        }
    };

    const handleToggleVisibility = async (book: Audiobook) => {
        setOpenMenu(null);
        try {
            await audiobookApi.update(book.id, { is_public: !book.is_public } as any);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ }
    };

    const handleThumbnailUpload = async (file: File, id: number) => {
        setUploadingThumbId(id);
        try {
            await audiobookApi.uploadThumbnail(id, file);
            dispatch(fetchAudiobooks());
        } catch { /* ignore */ } finally {
            setUploadingThumbId(null);
            setThumbTargetId(null);
        }
    };

    const handlePlay = (book: Audiobook) => {
        const url = buildAudioUrl(book.output_audio_path);
        if (!url || !audioRef.current) return;
        const audio = audioRef.current;

        if (playingBook?.id === book.id) {
            if (isPlaying) { audio.pause(); setIsPlaying(false); }
            else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
            return;
        }
        audio.src = url;
        audio.load();
        setPlayingBook(book);
        setCurrentTime(0);
        setAudioDuration(0);
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    const closePlayer = () => {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
        setPlayingBook(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setAudioDuration(0);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        router.push("/auth/login");
    };

    // ── derived state ─────────────────────────────────────────────────────────

    const filtered = audiobooks.filter((b) => {
        const title = toTitleCase(b.title).toLowerCase();
        const author = b.author.toLowerCase();
        const matchSearch = title.includes(search.toLowerCase()) || author.includes(search.toLowerCase());
        const matchFilter = filter === "all" || b.status === filter;
        return matchSearch && matchFilter;
    });

    const stats = [
        { label: "Total Audiobooks", value: String(audiobooks.length), icon: Headphones, color: "text-narrify-blue", bg: "bg-narrify-blue/8 dark:bg-narrify-blue/15", change: "All time" },
        { label: "Processing", value: String(audiobooks.filter((a) => a.status === "processing").length), icon: Loader2, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", change: "In queue", spin: true },
        { label: "Minutes Generated", value: String(Math.floor(user?.total_minutes_generated ?? 0)), icon: Clock, color: "text-narrify-purple", bg: "bg-narrify-purple/8 dark:bg-narrify-purple/15", change: "All time" },
        { label: "Completed", value: String(audiobooks.filter((a) => a.status === "completed").length), icon: CheckCircle2, color: "text-green-500 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10", change: "Ready to play" },
    ];

    if (!isAuthenticated) return null;

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <MainLayout>
            {/* Hidden thumbnail file input */}
            <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && thumbTargetId !== null) handleThumbnailUpload(file, thumbTargetId);
                    e.target.value = '';
                }}
            />

            {/* Hidden audio element — avoids hydration mismatch from new Audio() */}
            <audio
                ref={audioRef}
                className="hidden"
                onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
                onLoadedMetadata={() => audioRef.current && setAudioDuration(audioRef.current.duration)}
                onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
            />

            <div className={cn("space-y-8 max-w-7xl mx-auto", playingBook && "pb-24")}>

                {/* Page header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                            {user ? `Welcome back, ${user.full_name?.split(" ")[0] || user.username}` : "My Audiobooks"}
                        </h1>
                        <p className="text-muted-foreground">Manage your generated content and processing tasks.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/create">
                            <Button variant="narrify" className="h-11 px-6 gap-2 rounded-xl shadow-lg shadow-narrify-blue/20">
                                <Plus size={18} /> Create New Audiobook
                            </Button>
                        </Link>
                        <Button variant="outline" className="h-11 px-4 rounded-xl hidden sm:flex" onClick={handleLogout}>
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md transition-all duration-200 group">
                            <div className="flex items-center justify-between">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", stat.bg, stat.color)}>
                                    <stat.icon size={20} className={"spin" in stat && stat.spin ? "animate-spin" : ""} />
                                </div>
                                <ArrowUpRight size={14} className="text-muted-foreground/40 group-hover:text-narrify-blue transition-colors" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{stat.label}</p>
                            </div>
                            <p className="text-xs text-narrify-blue font-medium flex items-center gap-1">
                                <TrendingUp size={10} /> {stat.change}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Promo */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="relative overflow-hidden rounded-2xl narrify-gradient p-6 text-white flex items-center justify-between gap-6">
                    <div className="absolute right-0 top-0 w-72 h-full opacity-10 bg-[radial-gradient(circle_at_center,_white,_transparent)]" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Sparkles size={22} className="text-white" />
                        </div>
                        <div>
                            <p className="font-black text-lg">Try Voice Cloning</p>
                            <p className="text-white/70 text-sm">Clone any voice with just 6 seconds of audio.</p>
                        </div>
                    </div>
                    <Link href="/voices" className="flex-shrink-0 relative z-10">
                        <Button className="bg-white text-narrify-blue hover:bg-white/90 font-bold rounded-xl gap-1.5 h-10 px-5">
                            Try Now <ArrowUpRight size={14} />
                        </Button>
                    </Link>
                </motion.div>

                {/* Search + filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-narrify-blue/20 focus-within:border-narrify-blue/40 transition-all">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            placeholder="Search by title or author..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(["all", "completed", "processing", "uploaded", "failed"] as StatusFilter[]).map((f) => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={cn("px-4 py-2 text-sm font-bold rounded-xl border capitalize transition-all duration-150",
                                    filter === f ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-narrify-blue/30 hover:text-foreground"
                                )}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Book list */}
                <div className="space-y-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5 animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-muted flex-shrink-0" />
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-4 bg-muted rounded-lg w-2/5" />
                                    <div className="h-3 bg-muted rounded-lg w-1/5" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <AnimatePresence>
                            {filtered.length === 0 ? (
                                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                                        <Headphones size={28} className="text-muted-foreground/50" />
                                    </div>
                                    <p className="font-bold text-muted-foreground">
                                        {search || filter !== "all" ? "No audiobooks match your search." : "No audiobooks yet."}
                                    </p>
                                    {!search && filter === "all" && (
                                        <Link href="/create">
                                            <Button variant="narrify" className="gap-2 rounded-xl mt-2">
                                                <Plus size={16} /> Create Your First Audiobook
                                            </Button>
                                        </Link>
                                    )}
                                </motion.div>
                            ) : (
                                filtered.map((book: Audiobook, i: number) => (
                                    <motion.div key={book.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }} transition={{ delay: i * 0.04 }}
                                        className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200 group overflow-hidden">
                                        <div className="flex items-center p-5 gap-4 sm:gap-5">

                                            {/* Thumbnail — click to upload */}
                                            <button
                                                className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex-shrink-0 overflow-hidden group/thumb focus:outline-none"
                                                title="Click to set cover image"
                                                onClick={() => {
                                                    setThumbTargetId(book.id);
                                                    thumbInputRef.current?.click();
                                                }}
                                            >
                                                {book.thumbnail_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={book.thumbnail_url} alt="cover" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center", GRADIENT_COLORS[book.id % GRADIENT_COLORS.length])}>
                                                        <Headphones size={22} className="text-white" />
                                                    </div>
                                                )}
                                                {/* Upload overlay */}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                                    {uploadingThumbId === book.id
                                                        ? <Loader2 size={14} className="text-white animate-spin" />
                                                        : <Plus size={14} className="text-white" />
                                                    }
                                                </div>
                                            </button>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Inline rename or title */}
                                                        {editingId === book.id ? (
                                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    autoFocus
                                                                    value={editTitle}
                                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") saveRename(book.id);
                                                                        if (e.key === "Escape") setEditingId(null);
                                                                    }}
                                                                    className="flex-1 text-sm font-black bg-muted rounded-lg px-3 py-1.5 outline-none border border-narrify-blue/40 text-foreground"
                                                                />
                                                                <button onClick={() => saveRename(book.id)} disabled={savingRename}
                                                                    className="p-1.5 rounded-lg bg-narrify-blue text-white hover:opacity-90 transition-opacity">
                                                                    {savingRename ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                                </button>
                                                                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <Link href={`/audiobook/${book.id}`}>
                                                                <h3 className="font-black text-foreground group-hover:text-narrify-blue transition-colors truncate text-sm sm:text-base">
                                                                    {toTitleCase(book.title)}
                                                                </h3>
                                                            </Link>
                                                        )}
                                                        <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                                                            {book.author === "Unknown" ? "Unknown Author" : book.author}
                                                        </p>
                                                    </div>
                                                    <div className="hidden sm:block">
                                                        <StatusBadge status={book.status} />
                                                    </div>
                                                </div>

                                                <div className="sm:hidden mt-1.5">
                                                    <StatusBadge status={book.status} />
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-muted-foreground font-medium">
                                                    {book.total_duration > 0 && (
                                                        <span className="flex items-center gap-1"><Clock size={11} /> {book.duration_minutes}m</span>
                                                    )}
                                                    {book.chapter_titles?.length > 0 && (
                                                        <span className="flex items-center gap-1 flex-wrap">
                                                            {book.chapter_titles.map((ch) => (
                                                                <span key={ch.chapter_number} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border" style={{fontSize:'10px'}}>
                                                                    {ch.title || `Ch.${ch.chapter_number}`}
                                                                </span>
                                                            ))}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1"><Globe2 size={11} /> {book.source_language} → {book.target_language}</span>
                                                    {book.is_public && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-500/20 font-bold uppercase tracking-wider" style={{fontSize:'9px'}}>
                                                            Public
                                                        </span>
                                                    )}
                                                    <span className="hidden sm:inline text-muted-foreground/40">·</span>
                                                    <span className="hidden sm:inline">{format(new Date(book.created_at), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

                                                {/* Play — completed with audio */}
                                                {book.status === "completed" && book.output_audio_path && (
                                                    <Button
                                                        variant={playingBook?.id === book.id ? "narrify" : "outline"}
                                                        size="sm"
                                                        className="rounded-xl gap-1.5 h-9"
                                                        onClick={() => handlePlay(book)}
                                                    >
                                                        {playingBook?.id === book.id && isPlaying
                                                            ? <><Pause size={12} className="fill-current" /> Pause</>
                                                            : <><Play size={12} className="fill-current" /> Play</>
                                                        }
                                                    </Button>
                                                )}

                                                {/* Play — uploaded but audio already exists (e.g. after force reset) */}
                                                {book.status === "uploaded" && book.output_audio_path && (
                                                    <Button
                                                        variant={playingBook?.id === book.id ? "narrify" : "outline"}
                                                        size="sm"
                                                        className="rounded-xl gap-1.5 h-9"
                                                        onClick={() => handlePlay(book)}
                                                    >
                                                        {playingBook?.id === book.id && isPlaying
                                                            ? <><Pause size={12} className="fill-current" /> Pause</>
                                                            : <><Play size={12} className="fill-current" /> Play</>
                                                        }
                                                    </Button>
                                                )}

                                                {/* Generate Audio — completed without audio path */}
                                                {book.status === "completed" && !book.output_audio_path && (
                                                    <Button variant="outline" size="sm" disabled={retryingId === book.id}
                                                        className="rounded-xl gap-1.5 h-9 text-narrify-blue border-narrify-blue/30 hover:bg-narrify-blue/5"
                                                        onClick={() => handleRetry(book.id)}>
                                                        {retryingId === book.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                        Generate Audio
                                                    </Button>
                                                )}

                                                {/* Generate — uploaded */}
                                                {book.status === "uploaded" && (
                                                    <Button variant="outline" size="sm" disabled={generatingId === book.id}
                                                        className="rounded-xl gap-1.5 h-9 text-narrify-blue border-narrify-blue/30 hover:bg-narrify-blue/5"
                                                        onClick={() => handleGenerate(book.id)}>
                                                        {generatingId === book.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                        {book.output_audio_path ? "Re-generate" : "Generate"}
                                                    </Button>
                                                )}

                                                {/* Stale processing warning + force reset */}
                                                {book.status === "processing" && (stalePollCountRef.current[book.id] ?? 0) >= 15 && (
                                                    <Button variant="outline" size="sm" disabled={resettingId === book.id}
                                                        className="rounded-xl gap-1.5 h-9 text-amber-600 border-amber-300 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                                                        onClick={() => handleForceReset(book.id)}>
                                                        {resettingId === book.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                        Stuck? Reset
                                                    </Button>
                                                )}

                                                {/* Retry — failed */}
                                                {book.status === "failed" && (
                                                    <Button variant="outline" size="sm" disabled={retryingId === book.id}
                                                        className="rounded-xl gap-1.5 h-9 text-red-500 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                        onClick={() => handleRetry(book.id)}>
                                                        {retryingId === book.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                        Retry
                                                    </Button>
                                                )}

                                                {/* ⋮ Menu */}
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="icon"
                                                        className="rounded-xl text-muted-foreground/50 hover:text-foreground h-9 w-9"
                                                        onClick={() => setOpenMenu(openMenu === book.id ? null : book.id)}>
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                    <AnimatePresence>
                                                        {openMenu === book.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                className="absolute right-0 top-full mt-1 w-44 bg-card rounded-xl border border-border shadow-xl z-30 overflow-hidden">
                                                                {[
                                                                    {
                                                                        label: "Open Details",
                                                                        icon: ArrowUpRight,
                                                                        action: () => { router.push(`/audiobook/${book.id}`); setOpenMenu(null); }
                                                                    },
                                                                    {
                                                                        label: "Rename",
                                                                        icon: Pencil,
                                                                        action: () => startRename(book),
                                                                    },
                                                                    {
                                                                        label: book.is_public ? "Make Private" : "Make Public",
                                                                        icon: Globe2,
                                                                        action: () => handleToggleVisibility(book),
                                                                    },
                                                                    book.status === "processing" ? {
                                                                        label: resettingId === book.id ? "Resetting…" : "Force Reset",
                                                                        icon: RefreshCw,
                                                                        action: () => handleForceReset(book.id),
                                                                    } : null,
                                                                    {
                                                                        label: "Delete",
                                                                        icon: AlertCircle,
                                                                        danger: true,
                                                                        action: () => { setOpenMenu(null); setDeleteConfirmId(book.id); }
                                                                    },
                                                                ].filter(Boolean).map((item: any) => (
                                                                    <button key={item.label}
                                                                        className={cn("w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors",
                                                                            item.danger ? "text-red-500" : "text-foreground")}
                                                                        onClick={item.action}>
                                                                        <item.icon size={14} />
                                                                        {item.label}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* ── Sticky mini-player ─────────────────────────────────────────── */}
            <AnimatePresence>
                {playingBook && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl px-4 py-3">
                        <div className="max-w-7xl mx-auto flex items-center gap-4">

                            {/* Book info */}
                            <div className="flex items-center gap-3 min-w-0 w-48 flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl narrify-gradient flex items-center justify-center flex-shrink-0">
                                    <Headphones size={16} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-foreground truncate">{toTitleCase(playingBook.title)}</p>
                                    <p className="text-xs text-muted-foreground truncate">{playingBook.author}</p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15); }}
                                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <SkipBack size={16} />
                                </button>
                                <button
                                    onClick={() => {
                                        const audio = audioRef.current;
                                        if (!audio) return;
                                        if (isPlaying) { audio.pause(); setIsPlaying(false); }
                                        else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
                                    }}
                                    className="w-10 h-10 rounded-full narrify-gradient text-white flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity">
                                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                                </button>
                                <button onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(audioDuration, audioRef.current.currentTime + 15); }}
                                    className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <SkipForward size={16} />
                                </button>
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-xs font-mono text-muted-foreground w-10 text-right flex-shrink-0 hidden sm:block">{fmt(currentTime)}</span>
                                <div className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer"
                                    onClick={(e) => {
                                        const audio = audioRef.current;
                                        if (!audio || !audioDuration) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        audio.currentTime = ((e.clientX - rect.left) / rect.width) * audioDuration;
                                    }}>
                                    <div className="h-full bg-narrify-blue rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs font-mono text-muted-foreground w-10 flex-shrink-0 hidden sm:block">{fmt(audioDuration)}</span>
                            </div>

                            {/* Volume + links */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>
                                <Link href={`/audiobook/${playingBook.id}`}>
                                    <span className="text-muted-foreground hover:text-narrify-blue text-xs font-medium hidden md:block transition-colors px-2 cursor-pointer">
                                        Full Player
                                    </span>
                                </Link>
                                <button onClick={closePlayer} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete confirmation ────────────────────────────────────────── */}
            <AnimatePresence>
                {deleteConfirmId !== null && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => !isDeleting && setDeleteConfirmId(null)}>
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                    <AlertCircle size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <p className="font-black text-foreground">Delete Audiobook?</p>
                                    <p className="text-sm text-muted-foreground mt-0.5">This cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <Button variant="outline" className="flex-1 rounded-xl" disabled={isDeleting} onClick={() => setDeleteConfirmId(null)}>
                                    Cancel
                                </Button>
                                <Button className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-red-500" disabled={isDeleting} onClick={handleDeleteConfirm}>
                                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : "Delete"}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MainLayout>
    );
}
