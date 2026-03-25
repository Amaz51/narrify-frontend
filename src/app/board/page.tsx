"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAudiobooks } from "@/store/slices/audiobookSlice";
import { fetchUserProfile } from "@/store/slices/authSlice";
import { Audiobook } from "@/lib/api/audiobooks";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import {
    Headphones, Clock, Globe2, CheckCircle2, Loader2,
    AlertCircle, FileText, GripVertical, Plus, LayoutGrid,
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

// Default column per audiobook status
function defaultColumn(status: Audiobook["status"]): ColumnId {
    if (status === "processing") return "generating";
    if (status === "completed") return "done";
    if (status === "uploaded") return "todo";
    return "backlog";
}

type BoardColumns = Record<ColumnId, number[]>;

// ─── SortableCard ─────────────────────────────────────────────────────────────

function SortableCard({ book, columnId, isDragOverlay = false }: {
    book: Audiobook;
    columnId: ColumnId;
    isDragOverlay?: boolean;
}) {
    const {
        attributes, listeners, setNodeRef,
        transform, transition, isDragging,
    } = useSortable({
        id: String(book.id),
        data: { type: "card", columnId },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

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
            {/* Grip icon (visual only) + title */}
            <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-muted-foreground/40 group-hover:text-narrify-blue transition-colors">
                    <GripVertical size={16} />
                </span>
                <div className="flex-1 min-w-0">
                    <p
                        className="font-bold text-foreground text-sm leading-snug truncate hover:text-narrify-blue transition-colors cursor-pointer"
                        onClick={() => { window.location.href = `/audiobook/${book.id}`; }}
                    >
                        {book.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{book.author}</p>
                </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-400">
                {book.total_duration > 0 && (
                    <span className="flex items-center gap-1">
                        <Clock size={10} /> {book.duration_minutes}m
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <Globe2 size={10} /> {book.source_language}
                </span>
                <span className="flex items-center gap-1 ml-auto">
                    {format(new Date(book.created_at), "MMM d")}
                </span>
            </div>

            {/* Status chip */}
            <StatusChip status={book.status} />
        </div>
    );
}

function StatusChip({ status }: { status: Audiobook["status"] }) {
    if (status === "completed")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                <CheckCircle2 size={9} /> Completed
            </span>
        );
    if (status === "processing")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                <Loader2 size={9} className="animate-spin" /> Processing
            </span>
        );
    if (status === "uploaded")
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                <FileText size={9} /> Uploaded
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-red-50 text-red-500 rounded-full border border-red-100">
            <AlertCircle size={9} /> Failed
        </span>
    );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
    columnId, books, isOver,
}: {
    columnId: ColumnId;
    books: Audiobook[];
    isOver: boolean;
}) {
    const col = COLUMNS[columnId];
    const { setNodeRef } = useDroppable({ id: columnId });

    return (
        <div className="flex flex-col w-72 flex-shrink-0">
            {/* Header */}
            <div className={cn("rounded-t-2xl p-4 bg-gradient-to-r text-white", col.gradient)}>
                <div className="flex items-center justify-between">
                    <span className="font-black text-sm">{col.title}</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        {books.length}
                    </span>
                </div>
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 min-h-[480px] rounded-b-2xl border border-t-0 border-border p-3 space-y-2.5 transition-colors duration-150",
                    isOver ? "bg-narrify-blue/5 border-narrify-blue/30" : "bg-muted/30"
                )}
            >
                <SortableContext
                    items={books.map((b) => String(b.id))}
                    strategy={verticalListSortingStrategy}
                >
                    <AnimatePresence initial={false}>
                        {books.map((book) => (
                            <motion.div
                                key={book.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                            >
                                <SortableCard book={book} columnId={columnId} />
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {books.length === 0 && (
                        <div className={cn(
                            "h-28 rounded-xl border-2 border-dashed flex items-center justify-center text-center p-4 transition-colors",
                            isOver ? "border-narrify-blue/40 bg-narrify-blue/5" : "border-border"
                        )}>
                            <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                                {col.emptyText}
                            </p>
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

    const [columns, setColumns] = useState<BoardColumns>({
        backlog: [], todo: [], generating: [], done: [],
    });
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);
    const initializedRef = useRef(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    useEffect(() => {
        if (!isAuthenticated) { router.push("/auth/login"); return; }
        dispatch(fetchUserProfile());
        dispatch(fetchAudiobooks());
    }, [isAuthenticated, dispatch, router]);

    // Load saved board state from localStorage (per-user), or build defaults
    useEffect(() => {
        if (!user?.id || audiobooks.length === 0 || initializedRef.current) return;
        initializedRef.current = true;

        const storageKey = `narrify_board_${user.id}`;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
            try {
                const parsed: BoardColumns = JSON.parse(saved);
                // Validate structure
                const isValid = COLUMN_ORDER.every((id) => Array.isArray(parsed[id]));
                if (isValid) {
                    // Remove IDs for books that no longer exist
                    const bookIdSet = new Set(audiobooks.map((b) => b.id));
                    const cleaned: BoardColumns = { backlog: [], todo: [], generating: [], done: [] };
                    for (const col of COLUMN_ORDER) {
                        cleaned[col] = parsed[col].filter((id) => bookIdSet.has(id));
                    }
                    // Add books that are new (not in saved state)
                    const savedAllIds = new Set(COLUMN_ORDER.flatMap((col) => parsed[col]));
                    const newBooks = audiobooks.filter((b) => !savedAllIds.has(b.id));
                    for (const book of newBooks) {
                        cleaned[defaultColumn(book.status)].push(book.id);
                    }
                    setColumns(cleaned);
                    return;
                }
            } catch { /* fall through to default */ }
        }

        // Build default layout from audiobook statuses
        const initial: BoardColumns = { backlog: [], todo: [], generating: [], done: [] };
        for (const book of audiobooks) {
            initial[defaultColumn(book.status)].push(book.id);
        }
        setColumns(initial);
    }, [user?.id, audiobooks]);

    // Persist to localStorage whenever columns change (after init)
    useEffect(() => {
        if (!user?.id || !initializedRef.current) return;
        localStorage.setItem(`narrify_board_${user.id}`, JSON.stringify(columns));
    }, [columns, user?.id]);

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
        // over.id could be a card ID or a column ID
        const targetCol = (COLUMN_ORDER as readonly string[]).includes(overId)
            ? (overId as ColumnId)
            : findColumnOfCard(overId);

        setOverColumnId(targetCol);

        if (!sourceCol || !targetCol || sourceCol === targetCol) return;

        // Move card to target column during drag (live preview)
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

        // If dropped on a card in the same column — reorder
        const overIsCard = !(COLUMN_ORDER as readonly string[]).includes(overId);
        if (overIsCard && findColumnOfCard(overId) === col) {
            const items = columns[col];
            const oldIdx = items.indexOf(Number(activeCardId));
            const newIdx = items.indexOf(Number(overId));
            if (oldIdx !== newIdx) {
                setColumns((prev) => ({
                    ...prev,
                    [col]: arrayMove(prev[col], oldIdx, newIdx),
                }));
            }
        }
        // Cross-column move already handled in dragOver
    };

    const activeBook = activeId ? bookById(Number(activeId)) : null;
    const activeBookColumn = activeId ? (findColumnOfCard(activeId) ?? "backlog") : "backlog";

    if (!isAuthenticated) return null;

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 text-foreground">
                            <LayoutGrid size={28} className="text-narrify-blue" />
                            Project Board
                        </h1>
                        <p className="text-muted-foreground">
                            Drag audiobooks between columns to track their pipeline stage.
                        </p>
                    </div>
                    <Link href="/create">
                        <Button variant="narrify" className="gap-2 rounded-xl shadow-lg shadow-narrify-blue/20">
                            <Plus size={16} /> New Audiobook
                        </Button>
                    </Link>
                </div>

                {/* Loading skeletons */}
                {isLoading && (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {COLUMN_ORDER.map((col) => (
                            <div key={col} className="w-72 flex-shrink-0">
                                <div className="h-14 rounded-t-2xl bg-muted animate-pulse" />
                                <div className="rounded-b-2xl border border-border bg-muted/30 p-3 space-y-2.5 min-h-[480px]">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
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
                                    />
                                );
                            })}
                        </div>

                        {/* Drag overlay — ghost card that follows cursor */}
                        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
                            {activeBook && (
                                <SortableCard
                                    book={activeBook}
                                    columnId={activeBookColumn as ColumnId}
                                    isDragOverlay
                                />
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Empty state */}
                {!isLoading && audiobooks.length === 0 && (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <Headphones size={28} className="text-muted-foreground/50" />
                        </div>
                        <p className="font-bold text-muted-foreground">No audiobooks yet.</p>
                        <Link href="/create">
                            <Button variant="narrify" className="gap-2 rounded-xl mt-2">
                                <Plus size={16} /> Create Your First Audiobook
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
