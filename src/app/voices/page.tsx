"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    Mic, Search, Star, Play, Sparkles, UploadCloud, Pause,
    Check, Volume2, X, Info, Clock,
    AlertCircle, GripVertical, Pencil, Trash2, Wand2, Globe2, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiService } from "@/services/api";
import {
    DndContext, DragEndEvent, DragOverlay, DragStartEvent,
    PointerSensor, useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
    SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female' | 'neutral';
type VoiceType = 'Studio' | 'Natural' | 'Neural' | 'Cloned';

interface Voice {
    id: string;
    name: string;
    type: VoiceType;
    gender: Gender;
    mood: string;
    language: string;
    featured?: boolean;
    cloned?: boolean;
    isPublic?: boolean;   // visibility for cloned voices
    waveform: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FALLBACK_VOICES: Voice[] = [
    { id: 'voice2',   name: 'Maryam',   type: 'Natural', gender: 'female', mood: 'Authoritative',  language: 'English', featured: true,  waveform: [40,55,35,70,50,85,45,65,30,75] },
    { id: 'voice3',   name: 'James',    type: 'Neural',  gender: 'male',   mood: 'Warm & Friendly', language: 'English', featured: true,  waveform: [50,80,40,95,30,65,80,50,90,35] },
    { id: 'voice6',   name: 'Michael',  type: 'Neural',  gender: 'male',   mood: 'Deep & Calm',     language: 'English', featured: false, waveform: [30,60,50,75,40,85,35,70,55,80] },
    { id: 'voice7',   name: 'Shahzaib', type: 'Natural', gender: 'male',   mood: 'Storyteller',     language: 'English', featured: false, waveform: [40,70,45,85,55,65,35,90,50,75] },
    { id: 'ivy',      name: 'Ivy',      type: 'Studio',  gender: 'female', mood: 'Sophisticated',   language: 'English', featured: true,  waveform: [35,72,48,88,30,65,55,82,42,70] },
    { id: 'dallin',   name: 'Dallin',   type: 'Natural', gender: 'male',   mood: 'Inspiring',       language: 'English', featured: false, waveform: [45,78,38,92,52,68,35,85,48,72] },
    { id: 'lauran',   name: 'Lauran',   type: 'Neural',  gender: 'female', mood: 'Friendly',        language: 'English', featured: true,  waveform: [38,65,52,80,42,75,50,88,35,68] },
    { id: 'sara',     name: 'Sara',     type: 'Natural', gender: 'female', mood: 'Expressive',      language: 'English', featured: false, waveform: [42,70,55,85,38,78,45,90,50,62] },
    { id: 'victoria', name: 'Victoria', type: 'Studio',  gender: 'female', mood: 'Elegant',         language: 'English', featured: false, waveform: [30,68,45,82,55,72,40,88,35,75] },
];

const randomWaveform = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 60) + 25);

const CATEGORIES = ['All Voices', 'Studio', 'Natural', 'Neural', 'Cloned', 'Starred'];
const LANGUAGES_FILTER = ['All', 'English', 'Urdu', 'Arabic', 'French', 'German'];

const GENDER_BADGE: Record<Gender, string> = {
    male: 'badge-male',
    female: 'badge-female',
    neutral: 'badge-neutral',
};

const TYPE_COLOR: Record<VoiceType, string> = {
    Studio:  'bg-blue-50   text-blue-600  border-blue-100',
    Natural: 'bg-green-50  text-green-600 border-green-100',
    Neural:  'bg-purple-50 text-purple-600 border-purple-100',
    Cloned:  'bg-amber-50  text-amber-600 border-amber-100',
};

const LS_ORDER_KEY      = 'narrify_voices_order';
const LS_STARRED_KEY    = 'narrify_voices_starred';
const LS_DELETED_KEY    = 'narrify_voices_deleted';
const LS_NAMES_KEY      = 'narrify_voices_names';      // Record<voiceId, string>
const LS_VISIBILITY_KEY = 'narrify_voices_visibility'; // Record<voiceId, 'private'|'public'>

// ─── SortableVoiceCard ────────────────────────────────────────────────────────

interface CardProps {
    voice: Voice;
    isStarred: boolean;
    isSelected: boolean;
    isPlayingThis: boolean;
    hasPreviewError: boolean;
    isRenaming: boolean;
    renameValue: string;
    isDragOverlay?: boolean;
    onToggleStar: (id: string) => void;
    onSelect: (id: string) => void;
    onPlay: (id: string) => void;
    onStartRename: (id: string, current: string) => void;
    onRenameChange: (val: string) => void;
    onRenameCommit: (id: string) => void;
    onRenameCancel: () => void;
    onDeleteRequest: (id: string) => void;
}

function SortableVoiceCard({
    voice, isStarred, isSelected, isPlayingThis, hasPreviewError,
    isRenaming, renameValue, isDragOverlay = false,
    onToggleStar, onSelect, onPlay, onStartRename, onRenameChange,
    onRenameCommit, onRenameCancel, onDeleteRequest,
}: CardProps) {
    const {
        attributes, listeners, setNodeRef, transform, transition, isDragging,
    } = useSortable({ id: voice.id });

    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-card rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden group",
                isSelected
                    ? "border-narrify-blue ring-2 ring-narrify-blue/15 shadow-lg"
                    : "border-border hover:border-narrify-blue/30 hover:shadow-md",
                isDragging && !isDragOverlay && "opacity-40 scale-95",
                isDragOverlay && "shadow-2xl rotate-1 ring-2 ring-narrify-blue/30",
            )}
        >
            <div className="p-5 space-y-4">
                {/* Top row */}
                <div className="flex items-start justify-between">
                    {/* Drag handle */}
                    <div className="flex items-center gap-2">
                        <button
                            {...attributes}
                            {...listeners}
                            className="text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing p-0.5 -ml-1"
                            tabIndex={-1}
                            aria-label="Drag to reorder"
                        >
                            <GripVertical size={14} />
                        </button>
                        <div className="w-11 h-11 rounded-xl narrify-gradient-soft border border-narrify-blue/10 flex items-center justify-center text-narrify-blue group-hover:narrify-gradient group-hover:text-white transition-all">
                            <Mic size={20} />
                        </div>
                    </div>

                    {/* Right icons */}
                    <div className="flex items-center gap-1">
                        {voice.featured && (
                            <span className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center" title="Featured">
                                <Sparkles size={12} className="text-amber-500" />
                            </span>
                        )}
                        {voice.cloned && (
                            <>
                                <span className="w-6 h-6 rounded-lg bg-narrify-blue/8 border border-narrify-blue/15 flex items-center justify-center" title="Your clone">
                                    <Wand2 size={11} className="text-narrify-blue" />
                                </span>
                                <span
                                    className={cn(
                                        "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                        voice.isPublic
                                            ? "bg-green-50 text-green-600 border border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
                                            : "bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
                                    )}
                                    title={voice.isPublic ? "Visible to all users" : "Only visible to you"}
                                >
                                    {voice.isPublic ? "Public" : "Private"}
                                </span>
                            </>
                        )}
                        {/* Rename */}
                        {!isRenaming && (
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onStartRename(voice.id, voice.name); }}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-narrify-blue hover:bg-narrify-blue/8 transition-all"
                                title="Rename"
                            >
                                <Pencil size={11} />
                            </button>
                        )}
                        {/* Delete */}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(voice.id); }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            title="Delete voice"
                        >
                            <Trash2 size={11} />
                        </button>
                        {/* Star */}
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onToggleStar(voice.id); }}
                            className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                isStarred ? "text-amber-500 bg-amber-50 dark:bg-amber-500/10" : "text-muted-foreground/40 hover:text-amber-400"
                            )}
                        >
                            <Star size={14} className={isStarred ? "fill-amber-500" : ""} />
                        </button>
                    </div>
                </div>

                {/* Name — inline rename or static */}
                <div className="space-y-1.5">
                    {isRenaming ? (
                        <div className="flex items-center gap-1.5">
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => onRenameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onRenameCommit(voice.id);
                                    if (e.key === "Escape") onRenameCancel();
                                }}
                                className="flex-1 text-sm font-black bg-muted rounded-lg px-2.5 py-1 outline-none border border-narrify-blue/40 text-foreground min-w-0"
                            />
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onRenameCommit(voice.id); }}
                                className="p-1.5 rounded-lg bg-narrify-blue text-white hover:opacity-90 transition-opacity flex-shrink-0"
                            >
                                <Check size={12} />
                            </button>
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => { e.stopPropagation(); onRenameCancel(); }}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <h3 className="font-black text-foreground">{voice.name}</h3>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                        <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", GENDER_BADGE[voice.gender])}>
                            {voice.gender}
                        </span>
                        <span className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border", TYPE_COLOR[voice.type])}>
                            {voice.type}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Globe2 size={10} /> {voice.language} · {voice.mood}
                    </p>
                </div>

                {/* Mini waveform */}
                <div className="flex items-end gap-[2px] h-8">
                    {voice.waveform.map((h, j) => (
                        <motion.div
                            key={j}
                            className={cn(
                                "flex-1 rounded-full transition-colors",
                                isPlayingThis ? "bg-narrify-blue" : "bg-slate-200 group-hover:bg-narrify-blue/30"
                            )}
                            style={{ height: `${h}%` }}
                            animate={isPlayingThis && !hasPreviewError ? {
                                height: [`${h}%`, `${Math.min(h + 25, 100)}%`, `${h}%`],
                            } : { height: `${h}%` }}
                            transition={{ duration: 0.5 + j * 0.05, repeat: Infinity, repeatType: "reverse" }}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onPlay(voice.id); }}
                        className={cn(
                            "flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-bold transition-all border",
                            isPlayingThis
                                ? "bg-narrify-blue text-white border-narrify-blue"
                                : hasPreviewError
                                    ? "bg-red-50 dark:bg-red-500/10 text-red-500 border-red-200 dark:border-red-500/30"
                                    : "bg-muted/50 text-foreground border-border hover:border-narrify-blue/30 hover:text-narrify-blue"
                        )}
                    >
                        {isPlayingThis
                            ? <><Pause size={13} /> Stop</>
                            : hasPreviewError
                                ? <><AlertCircle size={13} /> Unavailable</>
                                : <><Play size={13} /> Preview</>
                        }
                    </button>
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onSelect(voice.id); }}
                        className={cn(
                            "flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all border",
                            isSelected
                                ? "bg-green-500 text-white border-green-500"
                                : "bg-card text-foreground border-border hover:border-narrify-blue/30"
                        )}
                    >
                        {isSelected ? <Check size={13} /> : "Select"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VoiceLibraryPage() {
    const [voices, setVoices] = useState<Voice[]>(FALLBACK_VOICES);
    const [voiceOrder, setVoiceOrder] = useState<string[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);

    // Clone modal
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneName, setCloneName] = useState('');
    const [cloneGender, setCloneGender] = useState<Gender>('neutral');
    const [cloneFile, setCloneFile] = useState<File | null>(null);
    const [cloneIsPublic, setCloneIsPublic] = useState(false);
    const [isCloning, setIsCloning] = useState(false);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const cloneFileRef = useRef<HTMLInputElement>(null);

    // ── Visibility helpers ─────────────────────────────────────────────────────

    const setVoiceVisibility = useCallback((id: string, isPublic: boolean) => {
        try {
            const map: Record<string, boolean> = JSON.parse(localStorage.getItem(LS_VISIBILITY_KEY) || '{}');
            map[id] = isPublic;
            localStorage.setItem(LS_VISIBILITY_KEY, JSON.stringify(map));
        } catch { /* ignore */ }
    }, []);

    // Delete confirmation
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Inline rename
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Filters
    const [category, setCategory] = useState('All Voices');
    const [langFilter, setLangFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');

    // Playback
    const [playing, setPlaying] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Selection
    const [starred, setStarred] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<string | null>(null);

    // DnD
    const [activeId, setActiveId] = useState<string | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    // ── Persistence helpers ────────────────────────────────────────────────────

    // Load starred + order from localStorage on mount
    useEffect(() => {
        try {
            const savedStarred = localStorage.getItem(LS_STARRED_KEY);
            if (savedStarred) setStarred(new Set(JSON.parse(savedStarred)));
        } catch { /* ignore */ }
    }, []);

    // Persist starred whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(LS_STARRED_KEY, JSON.stringify([...starred]));
        } catch { /* ignore */ }
    }, [starred]);

    // Persist order whenever it changes
    useEffect(() => {
        if (voiceOrder.length === 0) return;
        try {
            localStorage.setItem(LS_ORDER_KEY, JSON.stringify(voiceOrder));
        } catch { /* ignore */ }
    }, [voiceOrder]);

    // ── Fetch voices ──────────────────────────────────────────────────────────

    const fetchVoices = useCallback(async () => {
        setIsLoadingVoices(true);
        setBackendError(null);
        try {
            const response = await apiService.listVoices();
            const rawVoices = response.data.voices as any[];

            if (rawVoices && rawVoices.length > 0) {
                const mapped: Voice[] = rawVoices.map((v) => ({
                    id: v.voice_id ?? v.id ?? String(Math.random()),
                    name: v.voice_name ?? v.name ?? 'Unknown',
                    type: (v.is_custom ? 'Cloned' : (v.type ?? 'Neural')) as VoiceType,
                    gender: (['male', 'female', 'neutral'].includes(v.gender) ? v.gender : 'neutral') as Gender,
                    mood: v.mood ?? v.style ?? (v.is_custom ? 'Custom Clone' : 'Natural'),
                    language: v.language === 'en' ? 'English' : (v.language ?? 'English'),
                    featured: v.featured ?? false,
                    cloned: v.is_custom ?? v.cloned ?? false,
                    waveform: randomWaveform(),
                }));
                applyOrder(mapped);
            } else {
                applyOrder(FALLBACK_VOICES);
            }
        } catch {
            setBackendError('Could not reach the backend — showing demo voices.');
            applyOrder(FALLBACK_VOICES);
        } finally {
            setIsLoadingVoices(false);
        }
    }, []);

    // Apply saved order from localStorage (new voices appended at end).
    // Voices whose IDs are in LS_DELETED_KEY are always filtered out —
    // this ensures a delete persists across refreshes even when the backend
    // still returns the voice.
    const applyOrder = (fetched: Voice[]) => {
        let deletedIds: Set<string> = new Set();
        try {
            deletedIds = new Set(JSON.parse(localStorage.getItem(LS_DELETED_KEY) || '[]'));
        } catch { /* ignore */ }

        // Attach saved visibility for cloned voices
        let visibilityMap: Record<string, boolean> = {};
        try {
            visibilityMap = JSON.parse(localStorage.getItem(LS_VISIBILITY_KEY) || '{}');
        } catch { /* ignore */ }

        // Attach saved custom names (works for all voice types)
        let namesMap: Record<string, string> = {};
        try {
            namesMap = JSON.parse(localStorage.getItem(LS_NAMES_KEY) || '{}');
        } catch { /* ignore */ }

        const visible = fetched
            .filter((v) => !deletedIds.has(v.id))
            .map((v) => ({
                ...v,
                name: namesMap[v.id] ?? v.name,
                ...(v.cloned ? { isPublic: visibilityMap[v.id] ?? false } : {}),
            }));

        try {
            const saved: string[] = JSON.parse(localStorage.getItem(LS_ORDER_KEY) || '[]');
            if (saved.length > 0) {
                const idSet = new Set(visible.map((v) => v.id));
                const ordered = saved.filter((id) => idSet.has(id));
                const appended = visible.filter((v) => !ordered.includes(v.id)).map((v) => v.id);
                const finalOrder = [...ordered, ...appended];
                setVoiceOrder(finalOrder);
                setVoices(finalOrder.map((id) => visible.find((v) => v.id === id)!).filter(Boolean));
                return;
            }
        } catch { /* fall through */ }
        setVoices(visible);
        setVoiceOrder(visible.map((v) => v.id));
    };

    useEffect(() => { fetchVoices(); }, [fetchVoices]);

    // ── Clone ─────────────────────────────────────────────────────────────────

    const handleCloneVoice = async () => {
        if (!cloneName.trim()) { setCloneError('Please enter a voice name.'); return; }
        if (!cloneFile)        { setCloneError('Please upload an audio sample.'); return; }

        setIsCloning(true);
        setCloneError(null);
        try {
            const response = await apiService.cloneVoice({
                voice_name: cloneName.trim(),
                gender: cloneGender,
                audio_file: cloneFile,
            });
            const { voice_id } = response.data;

            // Persist visibility preference locally
            setVoiceVisibility(voice_id, cloneIsPublic);

            const newVoice: Voice = {
                id: voice_id,
                name: cloneName.trim(),
                type: 'Cloned',
                gender: cloneGender,
                mood: 'Custom Clone',
                language: 'English',
                cloned: true,
                isPublic: cloneIsPublic,
                waveform: randomWaveform(),
            };
            setVoices((prev) => [newVoice, ...prev]);
            setVoiceOrder((prev) => [newVoice.id, ...prev]);
            setShowCloneModal(false);
            setCloneName('');
            setCloneFile(null);
            setCloneIsPublic(false);
            fetchVoices();
        } catch (err: any) {
            setCloneError(err.response?.data?.detail || 'Voice cloning failed. Please try again.');
        } finally {
            setIsCloning(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────

    const handleDeleteConfirm = async () => {
        if (!deleteTargetId) return;
        const id = deleteTargetId;
        setIsDeleting(true);
        try {
            // Best-effort delete on backend; ignore errors (FastAPI may not have this endpoint)
            await apiService.deleteVoice(id).catch(() => {});
        } finally {
            // Persist the deleted ID so fetchVoices() filters it out on refresh
            try {
                const existing: string[] = JSON.parse(localStorage.getItem(LS_DELETED_KEY) || '[]');
                if (!existing.includes(id)) {
                    localStorage.setItem(LS_DELETED_KEY, JSON.stringify([...existing, id]));
                }
            } catch { /* ignore */ }

            // Remove from local state
            setVoices((prev) => prev.filter((v) => v.id !== id));
            setVoiceOrder((prev) => prev.filter((oid) => oid !== id));
            if (selected === id) setSelected(null);
            if (playing === id) { audioRef.current?.pause(); setPlaying(null); }
            setDeleteTargetId(null);
            setIsDeleting(false);
        }
    };

    // ── Rename ────────────────────────────────────────────────────────────────

    const handleRenameCommit = (id: string) => {
        const trimmed = renameValue.trim();
        if (trimmed) {
            setVoices((prev) => prev.map((v) => v.id === id ? { ...v, name: trimmed } : v));
            // Persist rename so it survives page refresh
            try {
                const existing: Record<string, string> = JSON.parse(localStorage.getItem(LS_NAMES_KEY) || '{}');
                existing[id] = trimmed;
                localStorage.setItem(LS_NAMES_KEY, JSON.stringify(existing));
            } catch { /* ignore */ }
        }
        setRenamingId(null);
    };

    // ── Star ──────────────────────────────────────────────────────────────────

    const toggleStar = (id: string) => {
        setStarred((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // ── Play preview ──────────────────────────────────────────────────────────

    const handlePlay = (id: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        if (playing === id) { setPlaying(null); return; }

        setPreviewError(null);
        const url = `${FASTAPI_URL}/voices/${id}/sample`;
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlaying(id);

        audio.oncanplay = () => audio.play().catch(() => { setPlaying(null); setPreviewError(id); });
        audio.onended   = () => setPlaying(null);
        audio.onerror   = () => { if (audioRef.current === audio) { setPlaying(null); setPreviewError(id); } };
        audio.load();
    };

    // ── Drag & Drop ───────────────────────────────────────────────────────────

    const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;
        setVoices((prev) => {
            const oldIdx = prev.findIndex((v) => v.id === active.id);
            const newIdx = prev.findIndex((v) => v.id === over.id);
            const reordered = arrayMove(prev, oldIdx, newIdx);
            setVoiceOrder(reordered.map((v) => v.id));
            return reordered;
        });
    };

    // ── Filtered view (operates on current voices array which already reflects order) ──

    const filtered = voices.filter((v) => {
        const matchCat    = category === 'All Voices' ? true
            : category === 'Starred' ? starred.has(v.id)
            : v.type === category;
        const matchLang   = langFilter === 'All' || v.language === langFilter;
        const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
                            v.mood.toLowerCase().includes(search.toLowerCase());
        const matchGender = genderFilter === 'all' || v.gender === genderFilter;
        return matchCat && matchLang && matchSearch && matchGender;
    });

    const activeVoice = activeId ? voices.find((v) => v.id === activeId) : null;
    const deleteTarget = deleteTargetId ? voices.find((v) => v.id === deleteTargetId) : null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <MainLayout>
            <div className="space-y-10 max-w-7xl mx-auto">

                {/* Backend connectivity banner */}
                {backendError && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-sm"
                    >
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                        <span className="text-amber-700 font-medium">{backendError}</span>
                        <button onClick={fetchVoices} className="ml-auto text-xs font-bold text-amber-700 underline">Retry</button>
                    </motion.div>
                )}

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight">Voice Library</h1>
                        <p className="text-muted-foreground text-lg">
                            {isLoadingVoices
                                ? 'Loading voices...'
                                : `${voices.length} neural voices · ${voices.filter((v) => v.cloned).length} cloned by you`
                            }
                        </p>
                    </div>
                    <Button
                        variant="narrify"
                        className="h-12 px-6 gap-2 rounded-xl shadow-lg shadow-narrify-blue/20"
                        onClick={() => setShowCloneModal(true)}
                    >
                        <UploadCloud size={18} />
                        Clone New Voice
                    </Button>
                </div>

                {/* Search + filters */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-narrify-blue/20 focus-within:border-narrify-blue/40 transition-all">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                placeholder="Search voices..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'male', 'female', 'neutral'] as const).map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setGenderFilter(g)}
                                    className={cn(
                                        "px-4 py-2 text-xs font-bold rounded-xl border capitalize transition-all",
                                        genderFilter === g ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-narrify-blue/30 hover:text-foreground"
                                    )}
                                >
                                    {g === 'all' ? 'All' : g === 'male' ? '♂ Male' : g === 'female' ? '♀ Female' : '◎ Neutral'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={cn(
                                    "px-4 py-2 text-sm font-bold rounded-full border transition-all",
                                    category === cat
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-card text-muted-foreground border-border hover:border-narrify-blue/30 hover:text-foreground"
                                )}
                            >
                                {cat === 'Starred' ? `★ ${cat}` : cat}
                            </button>
                        ))}
                        <div className="ml-auto flex gap-2">
                            {LANGUAGES_FILTER.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLangFilter(l)}
                                    className={cn(
                                        "px-3 py-2 text-xs font-bold rounded-full border transition-all",
                                        langFilter === l
                                            ? "bg-narrify-blue/10 text-narrify-blue border-narrify-blue/30"
                                            : "bg-card text-muted-foreground border-border hover:text-narrify-blue hover:border-narrify-blue/20"
                                    )}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading skeleton */}
                {isLoadingVoices && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton h-52 rounded-2xl" />
                        ))}
                    </div>
                )}

                {/* Voice grid with DnD */}
                {!isLoadingVoices && (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={filtered.map((v) => v.id)} strategy={rectSortingStrategy}>
                            <AnimatePresence mode="popLayout">
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {filtered.map((voice, i) => (
                                        <motion.div
                                            key={voice.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            <SortableVoiceCard
                                                voice={voice}
                                                isStarred={starred.has(voice.id)}
                                                isSelected={selected === voice.id}
                                                isPlayingThis={playing === voice.id}
                                                hasPreviewError={previewError === voice.id}
                                                isRenaming={renamingId === voice.id}
                                                renameValue={renameValue}
                                                onToggleStar={toggleStar}
                                                onSelect={(id) => setSelected(selected === id ? null : id)}
                                                onPlay={(id) => { setPreviewError(null); handlePlay(id); }}
                                                onStartRename={(id, cur) => { setRenamingId(id); setRenameValue(cur); }}
                                                onRenameChange={setRenameValue}
                                                onRenameCommit={handleRenameCommit}
                                                onRenameCancel={() => setRenamingId(null)}
                                                onDeleteRequest={setDeleteTargetId}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        </SortableContext>

                        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
                            {activeVoice && (
                                <SortableVoiceCard
                                    voice={activeVoice}
                                    isStarred={starred.has(activeVoice.id)}
                                    isSelected={selected === activeVoice.id}
                                    isPlayingThis={false}
                                    hasPreviewError={false}
                                    isRenaming={false}
                                    renameValue=""
                                    isDragOverlay
                                    onToggleStar={() => {}}
                                    onSelect={() => {}}
                                    onPlay={() => {}}
                                    onStartRename={() => {}}
                                    onRenameChange={() => {}}
                                    onRenameCommit={() => {}}
                                    onRenameCancel={() => {}}
                                    onDeleteRequest={() => {}}
                                />
                            )}
                        </DragOverlay>
                    </DndContext>
                )}

                {/* Empty state */}
                {!isLoadingVoices && filtered.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                            <Mic size={28} className="text-muted-foreground/40" />
                        </div>
                        <p className="font-bold text-muted-foreground">No voices match your filters</p>
                        <button
                            onClick={() => { setCategory('All Voices'); setLangFilter('All'); setSearch(''); setGenderFilter('all'); }}
                            className="text-sm text-narrify-blue font-bold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}

                {/* Clone CTA */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900 p-12 md:p-16 text-white">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(147,51,234,0.2),transparent_60%)]" />
                    <div className="relative z-10 max-w-2xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-black uppercase tracking-widest">
                            <Sparkles size={12} className="text-amber-400" /> Pro Feature — Voice Cloning
                        </div>
                        <h2 className="text-4xl font-black leading-tight">Your Voice. Any Character.</h2>
                        <p className="text-white/70 text-lg leading-relaxed">
                            Upload just <strong className="text-white">6–30 seconds</strong> of audio and Narrify creates a perfect,
                            high-fidelity voice clone. Assign it to any character in your audiobook.
                            No studio. No training time.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button
                                className="bg-white text-gray-900 hover:bg-white/90 h-12 px-8 font-black rounded-xl gap-2"
                                onClick={() => setShowCloneModal(true)}
                            >
                                <UploadCloud size={18} /> Clone Your Voice
                            </Button>
                            <Button variant="ghost" className="h-12 px-6 text-white hover:bg-white/10 rounded-xl border border-white/15">
                                <Info size={16} className="mr-2" /> Learn How It Works
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Clone Modal ───────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showCloneModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !isCloning && setShowCloneModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card rounded-3xl shadow-2xl border border-border max-w-md w-full p-8 space-y-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-foreground">Clone a Voice</h3>
                                    <p className="text-sm text-muted-foreground">Upload a 6–30 second audio sample</p>
                                </div>
                                <button onClick={() => setShowCloneModal(false)} disabled={isCloning} className="p-2 hover:bg-accent rounded-xl transition-colors">
                                    <X size={18} className="text-muted-foreground" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Voice Name</label>
                                    <input
                                        value={cloneName}
                                        onChange={(e) => setCloneName(e.target.value)}
                                        placeholder="e.g. Morgan Freeman, My Voice..."
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 outline-none text-sm transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gender</label>
                                    <div className="flex gap-2">
                                        {(['male', 'female', 'neutral'] as Gender[]).map((g) => (
                                            <button
                                                key={g}
                                                onClick={() => setCloneGender(g)}
                                                className={cn(
                                                    "flex-1 py-2 text-sm font-bold rounded-xl border capitalize transition-all",
                                                    cloneGender === g ? "bg-narrify-blue text-white border-narrify-blue" : "bg-card text-muted-foreground border-border hover:border-narrify-blue/30"
                                                )}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="border-2 border-dashed border-border rounded-2xl p-8 text-center space-y-3 hover:border-narrify-blue/40 transition-colors cursor-pointer"
                                    onClick={() => cloneFileRef.current?.click()}
                                >
                                    <input
                                        ref={cloneFileRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0] ?? null;
                                            setCloneFile(f);
                                            setCloneError(null);
                                            if (f) {
                                                const objUrl = URL.createObjectURL(f);
                                                const audio = new Audio(objUrl);
                                                audio.addEventListener('loadedmetadata', () => {
                                                    URL.revokeObjectURL(objUrl);
                                                    if (audio.duration < 6) {
                                                        setCloneError('Audio too short — minimum 6 seconds required.');
                                                        setCloneFile(null);
                                                    } else if (audio.duration > 30) {
                                                        setCloneError('Audio too long — maximum 30 seconds allowed.');
                                                        setCloneFile(null);
                                                    }
                                                });
                                                audio.addEventListener('error', () => URL.revokeObjectURL(objUrl));
                                            }
                                        }}
                                    />
                                    <div className="w-12 h-12 bg-narrify-blue/8 rounded-xl flex items-center justify-center mx-auto">
                                        <Volume2 size={22} className="text-narrify-blue" />
                                    </div>
                                    {cloneFile ? (
                                        <p className="font-bold text-narrify-blue">{cloneFile.name}</p>
                                    ) : (
                                        <>
                                            <p className="font-bold text-foreground">Drop audio file or click to upload</p>
                                            <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A · 6–30 seconds</p>
                                        </>
                                    )}
                                </div>

                                {cloneError && (
                                    <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                                        <AlertCircle size={14} /> {cloneError}
                                    </p>
                                )}

                                {/* Visibility toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold text-foreground">Visibility</p>
                                        <p className="text-xs text-muted-foreground">
                                            {cloneIsPublic ? 'Public — available to all users' : 'Private — only you can use this voice'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCloneIsPublic(!cloneIsPublic)}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                                            cloneIsPublic ? "bg-narrify-blue" : "bg-muted"
                                        )}
                                        role="switch"
                                        aria-checked={cloneIsPublic}
                                    >
                                        <span className={cn(
                                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200",
                                            cloneIsPublic ? "translate-x-5" : "translate-x-0"
                                        )} />
                                    </button>
                                </div>

                                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 font-medium border border-amber-100">
                                    <Clock size={13} className="mt-0.5 flex-shrink-0" />
                                    Voice cloning takes 30–45 seconds. The clone will appear in your library.
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCloneModal(false)} disabled={isCloning}>
                                    Cancel
                                </Button>
                                <Button variant="narrify" className="flex-1 rounded-xl gap-2" onClick={handleCloneVoice} disabled={isCloning}>
                                    {isCloning
                                        ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                        : <Wand2 size={16} />
                                    }
                                    {isCloning ? 'Cloning...' : 'Clone Voice'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
            <AnimatePresence>
                {deleteTargetId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !isDeleting && setDeleteTargetId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 12, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 12, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-3xl shadow-2xl border border-border max-w-sm w-full p-8 space-y-5"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                                <Trash2 size={26} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-black text-foreground">Delete Voice?</h3>
                                <p className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">&ldquo;{deleteTarget?.name}&rdquo;</strong> will be permanently removed from your library. This cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    disabled={isDeleting}
                                    onClick={() => setDeleteTargetId(null)}
                                    className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isDeleting}
                                    onClick={handleDeleteConfirm}
                                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting
                                        ? <Loader2 size={15} className="animate-spin" />
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
