"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
    PointerSensor, useSensor, useSensors, closestCorners, useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobooks } from "@/store/slices/audiobookSlice";
import { fetchUserProfile } from "@/store/slices/authSlice";
import { Audiobook, audiobookApi } from "@/lib/api/audiobooks";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import {
    Headphones, Clock, Globe2, CheckCircle2, Loader2,
    AlertCircle, FileText, GripVertical, Plus, LayoutGrid,
    Play, RefreshCw, Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ─── Column definitions ───────────────────────────────────────────────────────

const COLUMN_ORDER = ["backlog", "todo", "generating", "done"] as const;
type ColumnId = typeof COLUMN_ORDER[number];

const COLUMNS: Record<ColumnId, {
    title: string;
    gradient: string;
    badge: string;
    emptyText: string;
}> = {
    backlog: {
        title: "Backlog",
        gradient: "from-slate-400 to-slate-600",
        badge: "bg-slate-100 text-slate-600",
        emptyText: "Drop audiobooks here to queue them",
    },
    todo: {
        title: "To Generate",
        gradient: "from-blue-400 to-indigo-500",
        badge: "bg-blue-50 text-blue-600",
        emptyText: "Drag books here when ready to generate",
    },
    generating: {
        title: "Generating",
        gradient: "from-amber-400 to-orange-500",
        badge: "bg-amber-50 text-amber-600",
        emptyText: "Books being processed appear here",
    },
    done: {
        title: "Done",
        gradient: "from-emerald-400 to-teal-500",
        badge: "bg-emerald-50 text-emerald-600",
        emptyText: "Completed audiobooks land here",
    },
};

function defaultColumn(status: Audiobook["status"]): ColumnId {
    if (status === "processing") return "generating";
    if (status === "completed") return "done";
    if (status === "uploaded") return "todo";
    return "backlog";
}

type BoardColumns = Record<ColumnId, number[]>;

// ─── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({
    book, columnId, isDragOverlay = false, onStartProcessing, processingId,
}: {
    book: Audiobook;
    columnId: ColumnId;
    isDragOverlay?: boolean;
    onStartProcessing: (id: number) => void;
    processingId: number | null;
}) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: String(book.id), data: { type: "card", columnId } });

    const style = { transform: CSS.Transform.toString(transform), transition };
    const isStarting = processingId === book.id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3 select-none cursor-grab active:cursor-grabbing hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200",
                isDragging && !isDragOverlay && "opacity-40 scale-95",
                isDragOverlay && "shadow-2xl rotate-1 ring-2 ring-narrify-blue/30",
            )}
        >
            {/* Title row */}
            <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-narrify-blue transition-colors">
                    <GripVertical size={16} />
                </span>
                <div className="flex-1 min-w-0">
                    <p
                        className="font-bold text-foreground text-sm leading-snug truncate hover:text-narrify-blue transition-colors cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/audiobook/${book.id}`; }}
                    >
                        {book.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-muted-foreground/70">
                {book.total_duration > 0 && (
                    <span className="flex items-center gap-1"><Clock size={10} /> {book.duration_minutes}m</span>
                )}
                <span className="flex items-center gap-1"><Globe2 size={10} /> {book.source_language}</span>
                <span className="flex items-center gap-1 ml-auto">{format(new Date(book.created_at), "MMM d")}</span>
            </div>

            {/* Status + action */}
            <div className="flex items-center justify-between gap-2">
                <StatusChip status={book.status} />
                {columnId === "todo" && book.status !== "processing" && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onStartProcessing(book.id); }}
                        disabled={isStarting}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-narrify-blue/10 text-narrify-blue hover:bg-narrify-blue hover:text-white rounded-lg transition-all disabled:opacity-50"
                    >
                        {isStarting
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Zap size={10} />}
                        {isStarting ? "Starting…" : "Generate"}
                    </button>
                )}
                {columnId === "done" && book.status === "completed" && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/audiobook/${book.id}`; }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-green-50 text-green-600 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                    >
                        <Play size={10} /> Play
                    </button>
                )}
            </div>
        </div>
    );
}

function StatusChip({ status }: { status: Audiobook["status"] }) {
    if (status === "completed")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full border border-green-100 dark:border-green-500/20">
                <CheckCircle2 size={9} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-500/20">
                <Loader2 size={9} className="animate-spin" /> Processing
            </span>
        );
    if (status === "uploaded")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-500/20">
                <FileText size={9} /> Uploaded
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full border border-red-100 dark:border-red-500/20">
            <AlertCircle size={9} /> Failed
        </span>
    );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
    columnId, books, isOver, onStartProcessing, processingId,
}: {
    columnId: ColumnId;
    books: Audiobook[];
    isOver: boolean;
    onStartProcessing: (id: number) => void;
    processingId: number | null;
}) {
    const col = COLUMNS[columnId];
    const { setNodeRef } = useDroppable({ id: columnId });

    return (
        <div className="flex flex-col w-72 flex-shrink-0">
            <div className={cn("rounded-t-2xl p-4 bg-gradient-to-r text-white", col.gradient)}>
                <div className="flex items-center justify-between">
                    <span className="font-black text-sm">{col.title}</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{books.length}</span>
                </div>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 min-h-[480px] rounded-b-2xl border border-t-0 border-border p-3 space-y-2.5 transition-colors duration-150",
                    isOver ? "bg-narrify-blue/5 border-narrify-blue/30" : "bg-muted/30"
                )}
            >
                <SortableContext items={books.map((b) => String(b.id))} strategy={verticalListSortingStrategy}>
                    <AnimatePresence initial={false}>
                        {books.map((book) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                            >
                                <SortableCard
                                    book={book}
                                    columnId={columnId}
                                    onStartProcessing={onStartProcessing}
                                    processingId={processingId}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {books.length === 0 && (
                        <div className={cn(
                            "h-28 rounded-xl border-2 border-dashed flex items-center justify-center text-center p-4 transition-colors",
                            isOver ? "border-narrify-blue/40 bg-narrify-blue/5" : "border-border"
                        )}>
                            <p className="text-[11px] text-muted-foreground font-medium leading-snug">{col.emptyText}</p>
                        </div>
                    )}
                </SortableContext>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BoardPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((s) => s.auth);
    const { audiobooks, isLoading } = useAppSelector((s) => s.audiobook);

    const [columns, setColumns] = useState<BoardColumns>({ backlog: [], todo: [], generating: [], done: [] });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const initializedRef = useRef(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    useEffect(() => {
        if (!isAuthenticated) { router.push("/auth/login"); return; }
        dispatch(fetchUserProfile());
        dispatch(fetchAudiobooks());
    }, [isAuthenticated, dispatch, router]);

    // Poll every 10s for status updates when any book is processing (stable interval)
    const audiobooksRef = useRef(audiobooks);
    audiobooksRef.current = audiobooks;
    useEffect(() => {
        const interval = setInterval(() => {
            if (audiobooksRef.current.some((b) => b.status === "processing")) {
                dispatch(fetchAudiobooks());
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [dispatch]); // stable — never restarts

    // Sync board columns whenever audiobooks update
    useEffect(() => {
        if (!user?.id || audiobooks.length === 0) return;

        const storageKey = `narrify_board_${user.id}`;
        const saved = localStorage.getItem(storageKey);

        if (saved && !initializedRef.current) {
            try {
                const parsed: BoardColumns = JSON.parse(saved);
                const isValid = COLUMN_ORDER.every((id) => Array.isArray(parsed[id]));
                if (isValid) {
                    initializedRef.current = true;
                    const bookIdSet = new Set(audiobooks.map((b) => b.id));
                    const cleaned: BoardColumns = { backlog: [], todo: [], generating: [], done: [] };
                    for (const col of COLUMN_ORDER) {
                        cleaned[col] = parsed[col].filter((id) => bookIdSet.has(id));
                    }
                    const savedAllIds = new Set(COLUMN_ORDER.flatMap((col) => parsed[col]));
                    const newBooks = audiobooks.filter((b) => !savedAllIds.has(b.id));
                    for (const book of newBooks) cleaned[defaultColumn(book.status)].push(book.id);

                    // Re-sync processing/completed books to correct columns
                    const resync: BoardColumns = { ...cleaned };
                    for (const book of audiobooks) {
                        if (book.status === "processing") {
                            for (const col of COLUMN_ORDER) {
                                resync[col] = resync[col].filter((id) => id !== book.id);
                            }
                            if (!resync.generating.includes(book.id)) resync.generating.push(book.id);
                        } else if (book.status === "completed") {
                            for (const col of (["backlog", "todo", "generating"] as ColumnId[])) {
                                resync[col] = resync[col].filter((id) => id !== book.id);
                            }
                            if (!resync.done.includes(book.id)) resync.done.push(book.id);
                        }
                    }
                    setColumns(resync);
                    return;
                }
            } catch { /* fall through */ }
        }

        if (!initializedRef.current) {
            initializedRef.current = true;
            const initial: BoardColumns = { backlog: [], todo: [], generating: [], done: [] };
            for (const book of audiobooks) initial[defaultColumn(book.status)].push(book.id);
            setColumns(initial);
        } else {
            // Already initialized — just sync status changes
            setColumns((prev) => {
                const next = { ...prev };
                for (const book of audiobooks) {
                    if (book.status === "processing") {
                        for (const col of COLUMN_ORDER) next[col] = next[col].filter((id) => id !== book.id);
                        if (!next.generating.includes(book.id)) next.generating.push(book.id);
                    } else if (book.status === "completed") {
                        for (const col of (["backlog", "todo", "generating"] as ColumnId[])) {
                            next[col] = next[col].filter((id) => id !== book.id);
                        }
                        if (!next.done.includes(book.id)) next.done.push(book.id);
                    }
                }
                return next;
            });
        }
    }, [user?.id, audiobooks]);

    // Persist on change
    useEffect(() => {
        if (!user?.id || !initializedRef.current) return;
        localStorage.setItem(`narrify_board_${user.id}`, JSON.stringify(columns));
    }, [columns, user?.id]);

    // ── Start Processing ──────────────────────────────────────────────────────

    const handleStartProcessing = useCallback(async (bookId: number) => {
        setProcessingId(bookId);
        try {
            await audiobookApi.startProcessing(bookId);
            // Move to generating column
            setColumns((prev) => {
                const next = { ...prev };
                for (const col of COLUMN_ORDER) next[col] = next[col].filter((id) => id !== bookId);
                next.generating.push(bookId);
                return next;
            });
            // Refresh audiobooks to get updated status
            dispatch(fetchAudiobooks());
        } catch (err) {
            console.error("Failed to start processing:", err);
        } finally {
            setProcessingId(null);
        }
    }, [dispatch]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const findColumnOfCard = (cardId: string): ColumnId | null => {
        for (const col of COLUMN_ORDER) {
            if (columns[col].includes(Number(cardId))) return col;
        }
        return null;
    };

    const bookById = (id: number) => audiobooks.find((b) => b.id === id);

    // ── Drag handlers ────────────────────────────────────────────────────────

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(String(active.id));
    };

    const handleDragOver = ({ active, over }: DragOverEvent) => {
        if (!over) { setOverColumnId(null); return; }

        const activeCardId = String(active.id);
        const overId = String(over.id);

        const sourceCol = findColumnOfCard(activeCardId);
        const targetCol = (COLUMN_ORDER as readonly string[]).includes(overId)
            ? (overId as ColumnId)
            : findColumnOfCard(overId);

        setOverColumnId(targetCol);

        if (!sourceCol || !targetCol || sourceCol === targetCol) return;

        setColumns((prev) => {
            const sourceItems = prev[sourceCol].filter((id) => id !== Number(activeCardId));
            const targetItems = [...prev[targetCol]];
            const overIndex = targetItems.indexOf(Number(overId));
            const insertAt = overIndex === -1 ? targetItems.length : overIndex;
            targetItems.splice(insertAt, 0, Number(activeCardId));
            return { ...prev, [sourceCol]: sourceItems, [targetCol]: targetItems };
        });
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);
        setOverColumnId(null);
        if (!over) return;

        const activeCardId = String(active.id);
        const overId = String(over.id);
        const col = findColumnOfCard(activeCardId);
        if (!col) return;

        const overIsCard = !(COLUMN_ORDER as readonly string[]).includes(overId);
        if (overIsCard && findColumnOfCard(overId) === col) {
            const items = columns[col];
            const oldIdx = items.indexOf(Number(activeCardId));
            const newIdx = items.indexOf(Number(overId));
            if (oldIdx !== newIdx) {
                setColumns((prev) => ({ ...prev, [col]: arrayMove(prev[col], oldIdx, newIdx) }));
            }
        }
    };

    const activeBook = activeId ? bookById(Number(activeId)) : null;
    const activeBookColumn = activeId ? (findColumnOfCard(activeId) ?? "backlog") : "backlog";

    if (!isAuthenticated) return null;

    const processingCount = audiobooks.filter((b) => b.status === "processing").length;

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3 text-foreground">
                            <LayoutGrid size={26} className="text-narrify-blue" />
                            Project Board
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Drag audiobooks between columns to track their pipeline stage.
                            {processingCount > 0 && (
                                <span className="ml-2 text-amber-500 font-medium">
                                    <Loader2 size={11} className="inline animate-spin mr-1" />
                                    {processingCount} processing — auto-refreshing
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground hover:text-foreground rounded-xl"
                            onClick={() => dispatch(fetchAudiobooks())}
                        >
                            <RefreshCw size={14} /> Refresh
                        </Button>
                        <Link href="/create">
                            <Button variant="narrify" className="gap-2 rounded-xl shadow-lg shadow-narrify-blue/20">
                                <Plus size={16} /> New Audiobook
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Loading skeletons */}
                {isLoading && (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {COLUMN_ORDER.map((col) => (
                            <div key={col} className="w-72 flex-shrink-0">
                                <div className="h-14 rounded-t-2xl bg-muted animate-pulse" />
                                <div className="rounded-b-2xl border border-border bg-muted/30 p-3 space-y-2.5 min-h-[480px]">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Board */}
                {!isLoading && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex gap-4 overflow-x-auto pb-6">
                            {COLUMN_ORDER.map((colId) => {
                                const books = columns[colId]
                                    .map((id) => bookById(id))
                                    .filter((b): b is Audiobook => !!b);
                                return (
                                    <Column
                                        key={colId}
                                        columnId={colId}
                                        books={books}
                                        isOver={overColumnId === colId}
                                        onStartProcessing={handleStartProcessing}
                                        processingId={processingId}
                                    />
                                );
                            })}
                        </div>

                        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
                            {activeBook && (
                                <SortableCard
                                    book={activeBook}
                                    columnId={activeBookColumn as ColumnId}
                                    isDragOverlay
                                    onStartProcessing={() => { }}
                                    processingId={null}
                                />
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Empty state */}
                {!isLoading && audiobooks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 space-y-4"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <Headphones size={28} className="text-muted-foreground/50" />
                        </div>
                        <p className="font-bold text-muted-foreground">No audiobooks yet.</p>
                        <Link href="/create">
                            <Button variant="narrify" className="gap-2 rounded-xl mt-2">
                                <Plus size={16} /> Create Your First Audiobook
                            </Button>
                        </Link>
                    </motion.div>
                )}
            </div>
        </MainLayout>
    );
}
