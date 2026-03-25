"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    Headphones, Plus, MoreVertical, Play, Clock, FileText, Search,
    TrendingUp, CheckCircle2, AlertCircle, Loader2,
    Download, Globe2, Users, Zap, ArrowUpRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobooks, deleteAudiobook } from "@/store/slices/audiobookSlice";
import { fetchUserProfile, logoutUser } from "@/store/slices/authSlice";
import { Audiobook } from "@/lib/api/audiobooks";
import { format } from "date-fns";

type StatusFilter = "all" | "completed" | "processing" | "failed" | "uploaded";

const StatusBadge = ({ status }: { status: string }) => {
    if (status === "completed")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-bold border border-green-100 dark:border-green-500/20 whitespace-nowrap">
                <CheckCircle2 size={11} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-500/20 whitespace-nowrap">
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

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/auth/login");
            return;
        }
        dispatch(fetchUserProfile());
        dispatch(fetchAudiobooks());
    }, [isAuthenticated, dispatch, router]);

    const handleDeleteConfirm = async () => {
        if (deleteConfirmId === null) return;
        setIsDeleting(true);
        await dispatch(deleteAudiobook(deleteConfirmId));
        setIsDeleting(false);
        setDeleteConfirmId(null);
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        router.push("/auth/login");
    };

    const filtered = audiobooks.filter((b) => {
        const matchSearch =
            b.title.toLowerCase().includes(search.toLowerCase()) ||
            b.author.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" || b.status === filter;
        return matchSearch && matchFilter;
    });

    const stats = [
        {
            label: "Total Audiobooks",
            value: String(audiobooks.length),
            icon: Headphones,
            color: "text-narrify-blue",
            bg: "bg-narrify-blue/8 dark:bg-narrify-blue/15",
            change: "All time",
        },
        {
            label: "Processing",
            value: String(audiobooks.filter((a) => a.status === "processing").length),
            icon: Loader2,
            color: "text-amber-500 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-500/10",
            change: "In queue",
            spin: true,
        },
        {
            label: "Minutes Generated",
            value: String(Math.floor(user?.total_minutes_generated ?? 0)),
            icon: Clock,
            color: "text-narrify-purple",
            bg: "bg-narrify-purple/8 dark:bg-narrify-purple/15",
            change: "All time",
        },
        {
            label: "Completed",
            value: String(audiobooks.filter((a) => a.status === "completed").length),
            icon: CheckCircle2,
            color: "text-green-500 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-500/10",
            change: "Ready to play",
        },
    ];

    if (!isAuthenticated) return null;

    return (
        <MainLayout>
            <div className="space-y-8 max-w-7xl mx-auto">
                {/* Page header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">
                            {user ? `Welcome back, ${user.full_name?.split(' ')[0] || user.username}` : "My Audiobooks"}
                        </h1>
                        <p className="text-muted-foreground">Manage your generated content and processing tasks.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/create">
                            <Button variant="narrify" className="h-11 px-6 gap-2 rounded-xl shadow-lg shadow-narrify-blue/20 hover:shadow-narrify-blue/30 transition-shadow">
                                <Plus size={18} />
                                Create New Audiobook
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="h-11 px-4 rounded-xl hidden sm:flex"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4 hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200 group"
                        >
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

                {/* Promo banner */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative overflow-hidden rounded-2xl narrify-gradient p-6 text-white flex items-center justify-between gap-6"
                >
                    <div className="absolute right-0 top-0 w-72 h-full opacity-10 bg-[radial-gradient(circle_at_center,_white,_transparent)]" />
                    <div className="absolute left-0 bottom-0 w-48 h-full opacity-5 bg-[radial-gradient(circle_at_bottom-left,_white,_transparent)]" />
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
                        <Button className="bg-white text-narrify-blue hover:bg-white/90 font-bold rounded-xl gap-1.5 h-10 px-5 transition-all hover:shadow-lg">
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
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-2 text-sm font-bold rounded-xl border capitalize transition-all duration-150",
                                    filter === f
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-card text-muted-foreground border-border hover:border-narrify-blue/30 hover:text-foreground"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Audiobook list */}
                <div className="space-y-3">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-5 animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-muted flex-shrink-0" />
                                <div className="flex-1 space-y-2.5">
                                    <div className="h-4 bg-muted rounded-lg w-2/5" />
                                    <div className="h-3 bg-muted rounded-lg w-1/5" />
                                    <div className="flex gap-3">
                                        <div className="h-3 bg-muted rounded-lg w-16" />
                                        <div className="h-3 bg-muted rounded-lg w-20" />
                                        <div className="h-3 bg-muted rounded-lg w-24" />
                                    </div>
                                </div>
                                <div className="h-7 w-20 bg-muted rounded-xl flex-shrink-0" />
                            </div>
                        ))
                    ) : (
                        <AnimatePresence>
                            {filtered.length === 0 ? (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="py-20 text-center space-y-4"
                                >
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
                                    <motion.div
                                        key={book.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200 group overflow-hidden"
                                    >
                                        <div className="flex items-center p-5 gap-4 sm:gap-5">
                                            {/* Thumbnail */}
                                            <div className={cn(
                                                "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br flex-shrink-0 flex items-center justify-center",
                                                GRADIENT_COLORS[book.id % GRADIENT_COLORS.length]
                                            )}>
                                                <Headphones size={22} className="text-white" />
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3 flex-wrap">
                                                    <div className="flex-1 min-w-0">
                                                        <Link href={`/audiobook/${book.id}`}>
                                                            <h3 className="font-black text-foreground group-hover:text-narrify-blue transition-colors truncate text-sm sm:text-base">
                                                                {book.title}
                                                            </h3>
                                                        </Link>
                                                        <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">{book.author}</p>
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
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={11} /> {book.duration_minutes}m
                                                        </span>
                                                    )}
                                                    {book.total_chapters > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Users size={11} /> {book.total_chapters} ch.
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Globe2 size={11} /> {book.source_language} → {book.target_language}
                                                    </span>
                                                    <span className="hidden sm:inline text-muted-foreground/40">·</span>
                                                    <span className="hidden sm:inline">{format(new Date(book.created_at), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                                {book.status === "completed" && (
                                                    <>
                                                        <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-narrify-blue h-9 w-9 hidden sm:flex">
                                                            <Download size={15} />
                                                        </Button>
                                                        <Link href={`/audiobook/${book.id}`}>
                                                            <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 border-border hover:border-narrify-blue/30 hover:text-narrify-blue text-foreground">
                                                                <Play size={12} className="fill-current" /> Play
                                                            </Button>
                                                        </Link>
                                                    </>
                                                )}
                                                {book.status === "failed" && (
                                                    <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9 text-red-500 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10">
                                                        <Zap size={12} /> Retry
                                                    </Button>
                                                )}
                                                <div className="relative">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="rounded-xl text-muted-foreground/50 hover:text-foreground h-9 w-9"
                                                        onClick={() => setOpenMenu(openMenu === book.id ? null : book.id)}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                    <AnimatePresence>
                                                        {openMenu === book.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                className="absolute right-0 top-full mt-1 w-40 bg-card rounded-xl border border-border shadow-xl z-30 overflow-hidden"
                                                            >
                                                                {[
                                                                    { label: "Open Details", icon: ArrowUpRight, action: () => { router.push(`/audiobook/${book.id}`); setOpenMenu(null); } },
                                                                    { label: "Delete", icon: AlertCircle, danger: true, action: () => { setOpenMenu(null); setDeleteConfirmId(book.id); } },
                                                                ].map((item) => (
                                                                    <button
                                                                        key={item.label}
                                                                        className={cn(
                                                                            "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors",
                                                                            item.danger ? "text-red-500" : "text-foreground"
                                                                        )}
                                                                        onClick={item.action}
                                                                    >
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

            {/* Delete confirmation modal */}
            <AnimatePresence>
                {deleteConfirmId !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => !isDeleting && setDeleteConfirmId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full space-y-4"
                        >
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
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl"
                                    disabled={isDeleting}
                                    onClick={() => setDeleteConfirmId(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white border-red-500"
                                    disabled={isDeleting}
                                    onClick={handleDeleteConfirm}
                                >
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
