"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    Mic, Search, Star, Play, Sparkles, UploadCloud, Pause,
    Check, Filter, Wand2, Globe2, Volume2, Plus, X, Info, Clock,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useState, useEffect, useRef } from "react";
import { apiService } from "@/services/api";

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
    starred?: boolean;
    waveform: number[];
}

// Fallback static voices if backend is offline
const FALLBACK_VOICES: Voice[] = [
    { id: '1', name: 'James', type: 'Studio', gender: 'male', mood: 'Professional', language: 'English', featured: true, waveform: [30, 65, 45, 80, 35, 72, 55, 90, 42, 68] },
    { id: '2', name: 'Sophia', type: 'Natural', gender: 'female', mood: 'Calm', language: 'English', waveform: [40, 55, 35, 70, 50, 85, 45, 65, 30, 75] },
    { id: '3', name: 'Marcus', type: 'Neural', gender: 'male', mood: 'Authoritative', language: 'English', featured: true, waveform: [50, 80, 40, 95, 30, 65, 80, 50, 90, 35] },
    { id: '4', name: 'Elena', type: 'Studio', gender: 'female', mood: 'Expressive', language: 'French', waveform: [35, 70, 55, 85, 40, 75, 50, 90, 45, 60] },
    { id: '5', name: 'The Professor', type: 'Neural', gender: 'male', mood: 'Educational', language: 'English', waveform: [25, 55, 45, 70, 35, 60, 50, 80, 40, 65] },
    { id: '6', name: 'Aria', type: 'Natural', gender: 'female', mood: 'Storyteller', language: 'English', waveform: [45, 75, 60, 90, 40, 70, 55, 85, 50, 65] },
    { id: '7', name: 'Tariq', type: 'Neural', gender: 'male', mood: 'Narrator', language: 'Urdu', waveform: [30, 60, 50, 75, 40, 85, 35, 70, 55, 80] },
    { id: '8', name: 'Amara', type: 'Natural', gender: 'female', mood: 'Warm', language: 'Arabic', waveform: [40, 70, 45, 85, 55, 65, 35, 90, 50, 75] },
    { id: '9', name: 'Alex', type: 'Neural', gender: 'neutral', mood: 'Neutral', language: 'English', waveform: [35, 60, 50, 72, 42, 68, 55, 78, 48, 62] },
    { id: '10', name: 'My Voice Clone', type: 'Cloned', gender: 'male', mood: 'Custom', language: 'English', cloned: true, waveform: [42, 75, 55, 88, 38, 72, 60, 85, 45, 70] },
    { id: '11', name: 'Child Storyteller', type: 'Natural', gender: 'neutral', mood: 'Playful', language: 'English', waveform: [20, 55, 35, 65, 30, 80, 45, 60, 38, 70] },
    { id: '12', name: 'Hans', type: 'Studio', gender: 'male', mood: 'Professional', language: 'German', waveform: [35, 68, 48, 82, 40, 75, 52, 88, 42, 65] },
];

const randomWaveform = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 60) + 25);

const CATEGORIES = ['All Voices', 'Studio', 'Natural', 'Neural', 'Cloned', 'Starred'];
const LANGUAGES_FILTER = ['All', 'English', 'Urdu', 'Arabic', 'French', 'German'];

const GENDER_BADGE = {
    male: 'badge-male',
    female: 'badge-female',
    neutral: 'badge-neutral',
};

const TYPE_COLOR: Record<VoiceType, string> = {
    Studio: 'bg-blue-50 text-blue-600 border-blue-100',
    Natural: 'bg-green-50 text-green-600 border-green-100',
    Neural: 'bg-purple-50 text-purple-600 border-purple-100',
    Cloned: 'bg-amber-50 text-amber-600 border-amber-100',
};

export default function VoiceLibraryPage() {
    const [voices, setVoices] = useState<Voice[]>(FALLBACK_VOICES);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);

    // Clone modal state
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [cloneName, setCloneName] = useState('');
    const [cloneGender, setCloneGender] = useState<Gender>('neutral');
    const [cloneFile, setCloneFile] = useState<File | null>(null);
    const [isCloning, setIsCloning] = useState(false);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const cloneFileRef = useRef<HTMLInputElement>(null);

    const [category, setCategory] = useState('All Voices');
    const [langFilter, setLangFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [playing, setPlaying] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [starred, setStarred] = useState<Set<string>>(new Set());
    const [selected, setSelected] = useState<string | null>(null);
    const [genderFilter, setGenderFilter] = useState<Gender | 'all'>('all');
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

    const fetchVoices = async () => {
        setIsLoadingVoices(true);
        setBackendError(null);
        try {
            const response = await apiService.listVoices();
            const rawVoices = response.data.voices as any[];

            if (rawVoices && rawVoices.length > 0) {
                const mapped: Voice[] = rawVoices.map((v) => ({
                    id: v.id ?? String(Math.random()),
                    name: v.name ?? 'Unknown',
                    type: (v.type as VoiceType) ?? 'Neural',
                    gender: (['male', 'female', 'neutral'].includes(v.gender) ? v.gender : 'neutral') as Gender,
                    mood: v.mood ?? v.style ?? 'Natural',
                    language: v.language ?? 'English',
                    featured: v.featured ?? false,
                    cloned: v.cloned ?? false,
                    waveform: randomWaveform(),
                }));
                setVoices(mapped);
            } else {
                // Backend returned empty — keep fallback
                setVoices(FALLBACK_VOICES);
            }
        } catch (err: any) {
            console.warn('Voice library backend unavailable, using fallback data');
            setBackendError('Could not reach the backend — showing demo voices.');
            setVoices(FALLBACK_VOICES);
        } finally {
            setIsLoadingVoices(false);
        }
    };

    useEffect(() => {
        fetchVoices();
    }, []);

    const handleCloneVoice = async () => {
        if (!cloneName.trim()) { setCloneError('Please enter a voice name.'); return; }
        if (!cloneFile) { setCloneError('Please upload an audio sample.'); return; }

        setIsCloning(true);
        setCloneError(null);
        try {
            const response = await apiService.cloneVoice({
                voice_name: cloneName.trim(),
                gender: cloneGender,
                audio_file: cloneFile,
            });
            const { voice_id } = response.data;

            // Close modal and refresh
            setShowCloneModal(false);
            setCloneName('');
            setCloneFile(null);
            fetchVoices();

            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                console.log(`✅ Voice cloned: ${voice_id}`);
            }
        } catch (err: any) {
            setCloneError(err.response?.data?.detail || 'Voice cloning failed. Please try again.');
        } finally {
            setIsCloning(false);
        }
    };

    const toggleStar = (id: string) => {
        setStarred(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handlePlay = (id: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        if (playing === id) {
            setPlaying(null);
            return;
        }

        setPreviewError(null);
        const sampleUrl = `${FASTAPI_URL}/voices/${id}/sample`;
        const audio = new Audio(sampleUrl);
        audioRef.current = audio;

        audio.play().catch(() => {
            setPlaying(null);
            setPreviewError(id);
        });

        setPlaying(id);
        audio.onended = () => setPlaying(null);
        audio.onerror = () => {
            setPlaying(null);
            setPreviewError(id);
        };
    };

    const filtered = voices.filter(v => {
        const matchCat = category === 'All Voices' ? true
            : category === 'Starred' ? starred.has(v.id)
                : v.type === category;
        const matchLang = langFilter === 'All' || v.language === langFilter;
        const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) ||
            v.mood.toLowerCase().includes(search.toLowerCase());
        const matchGender = genderFilter === 'all' || v.gender === genderFilter;
        return matchCat && matchLang && matchSearch && matchGender;
    });

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
                        <p className="text-slate-500 text-lg">
                            {isLoadingVoices
                                ? 'Loading voices...'
                                : `${voices.length} neural voices · ${voices.filter(v => v.cloned).length} cloned by you`
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

                {/* Search + filters row */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-narrify-blue/20 focus-within:border-narrify-blue/40 transition-all">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <input
                                placeholder="Search voices..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                            />
                        </div>

                        {/* Gender filter */}
                        <div className="flex gap-2">
                            {(['all', 'male', 'female', 'neutral'] as const).map(g => (
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

                    {/* Category pills */}
                    <div className="flex gap-2 flex-wrap">
                        {CATEGORIES.map((cat, i) => (
                            <button
                                key={i}
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
                            {LANGUAGES_FILTER.map(l => (
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

                {/* Voice grid */}
                {!isLoadingVoices && (
                    <AnimatePresence mode="popLayout">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {filtered.map((voice, i) => {
                                const isStarred = starred.has(voice.id);
                                const isPlayingThis = playing === voice.id;
                                const isSelected = selected === voice.id;
                                const hasPreviewError = previewError === voice.id;

                                return (
                                    <motion.div
                                        key={voice.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: i * 0.03 }}
                                        className={cn(
                                            "bg-card rounded-2xl border shadow-sm transition-all duration-200 overflow-hidden group",
                                            isSelected
                                                ? "border-narrify-blue ring-2 ring-narrify-blue/15 shadow-lg"
                                                : "border-border hover:border-narrify-blue/30 hover:shadow-md"
                                        )}
                                    >
                                        <div className="p-5 space-y-4">
                                            {/* Top row */}
                                            <div className="flex items-start justify-between">
                                                <div className="w-12 h-12 rounded-xl narrify-gradient-soft border border-narrify-blue/10 flex items-center justify-center text-narrify-blue group-hover:narrify-gradient group-hover:text-white transition-all">
                                                    <Mic size={22} />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {voice.featured && (
                                                        <span className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center" title="Featured">
                                                            <Sparkles size={12} className="text-amber-500" />
                                                        </span>
                                                    )}
                                                    {voice.cloned && (
                                                        <span className="w-6 h-6 rounded-lg bg-narrify-blue/8 border border-narrify-blue/15 flex items-center justify-center" title="Your clone">
                                                            <Wand2 size={11} className="text-narrify-blue" />
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => toggleStar(voice.id)}
                                                        className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                            isStarred ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-400"
                                                        )}
                                                    >
                                                        <Star size={14} className={isStarred ? "fill-amber-500" : ""} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-foreground">{voice.name}</h3>
                                                </div>
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
                                                    onClick={() => { setPreviewError(null); handlePlay(voice.id); }}
                                                    className={cn(
                                                        "flex items-center justify-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-bold transition-all border",
                                                        isPlayingThis
                                                            ? "bg-narrify-blue text-white border-narrify-blue"
                                                            : previewError === voice.id
                                                                ? "bg-red-50 dark:bg-red-500/10 text-red-500 border-red-200 dark:border-red-500/30"
                                                                : "bg-muted/50 text-foreground border-border hover:border-narrify-blue/30 hover:text-narrify-blue"
                                                    )}
                                                >
                                                    {isPlayingThis
                                                        ? <><Pause size={13} /> Stop</>
                                                        : previewError === voice.id
                                                            ? <><AlertCircle size={13} /> Unavailable</>
                                                            : <><Play size={13} /> Preview</>
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => setSelected(isSelected ? null : voice.id)}
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
                                    </motion.div>
                                );
                            })}
                        </div>
                    </AnimatePresence>
                )}

                {!isLoadingVoices && filtered.length === 0 && (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                            <Mic size={28} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-500">No voices match your filters</p>
                        <button onClick={() => { setCategory('All Voices'); setLangFilter('All'); setSearch(''); setGenderFilter('all'); }} className="text-sm text-narrify-blue font-bold hover:underline">
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
                        <h2 className="text-4xl font-black leading-tight">
                            Your Voice. Any Character.
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Upload just <strong className="text-white">6–30 seconds</strong> of audio and Narrify creates a perfect,
                            high-fidelity voice clone. Assign it to any character in your audiobook.
                            No studio. No training time.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button
                                className="bg-white text-slate-900 hover:bg-white/90 h-12 px-8 font-black rounded-xl gap-2"
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

            {/* Voice Clone Modal */}
            <AnimatePresence>
                {showCloneModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCloneModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card rounded-3xl shadow-2xl border border-border max-w-md w-full p-8 space-y-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-foreground">Clone a Voice</h3>
                                    <p className="text-sm text-muted-foreground">Upload a 6–30 second audio sample</p>
                                </div>
                                <button onClick={() => setShowCloneModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                                    <X size={18} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Voice Name</label>
                                    <input
                                        value={cloneName}
                                        onChange={e => setCloneName(e.target.value)}
                                        placeholder="e.g. Morgan Freeman, My Voice..."
                                        className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 outline-none text-sm transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Gender</label>
                                    <div className="flex gap-2">
                                        {(['male', 'female', 'neutral'] as Gender[]).map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setCloneGender(g)}
                                                className={cn(
                                                    "flex-1 py-2 text-sm font-bold rounded-xl border capitalize transition-all",
                                                    cloneGender === g ? "bg-narrify-blue text-white border-narrify-blue" : "bg-white text-slate-500 border-slate-200 hover:border-narrify-blue/30"
                                                )}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3 hover:border-narrify-blue/40 transition-colors cursor-pointer"
                                    onClick={() => cloneFileRef.current?.click()}
                                >
                                    <input
                                        ref={cloneFileRef}
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={e => setCloneFile(e.target.files?.[0] ?? null)}
                                    />
                                    <div className="w-12 h-12 bg-narrify-blue/8 rounded-xl flex items-center justify-center mx-auto">
                                        <Volume2 size={22} className="text-narrify-blue" />
                                    </div>
                                    <div>
                                        {cloneFile ? (
                                            <p className="font-bold text-narrify-blue">{cloneFile.name}</p>
                                        ) : (
                                            <>
                                                <p className="font-bold text-slate-700">Drop audio file or click to upload</p>
                                                <p className="text-xs text-slate-400 mt-1">MP3, WAV, M4A · 6–30 seconds</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {cloneError && (
                                    <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                                        <AlertCircle size={14} /> {cloneError}
                                    </p>
                                )}

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
                                    {isCloning ? (
                                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    ) : (
                                        <Wand2 size={16} />
                                    )}
                                    {isCloning ? 'Cloning...' : 'Clone Voice'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </MainLayout>
    );
}
