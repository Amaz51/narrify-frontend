"use client";

import React, { useState } from 'react';
import { useNarrifyStore } from '@/stores/useNarrifyStore';
import { Button } from '@/components/ui/button';
import {
    Languages, Info, Globe, ChevronLeft, ArrowRight,
    Check, AlertTriangle, Sparkles, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

const LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧', rtl: false, nativeName: 'English' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', rtl: false, nativeName: 'Español' },
    { code: 'fr', name: 'French', flag: '🇫🇷', rtl: false, nativeName: 'Français' },
    { code: 'de', name: 'German', flag: '🇩🇪', rtl: false, nativeName: 'Deutsch' },
    { code: 'zh', name: 'Mandarin', flag: '🇨🇳', rtl: false, nativeName: '中文' },
    { code: 'ur', name: 'Urdu', flag: '🇵🇰', rtl: true, nativeName: 'اردو' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦', rtl: true, nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', rtl: false, nativeName: 'हिन्दी' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', rtl: false, nativeName: '日本語' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷', rtl: false, nativeName: '한국어' },
    { code: 'pt', name: 'Portuguese', flag: '🇧🇷', rtl: false, nativeName: 'Português' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', rtl: false, nativeName: 'Русский' },
    { code: 'tr', name: 'Turkish', flag: '🇹🇷', rtl: false, nativeName: 'Türkçe' },
    { code: 'he', name: 'Hebrew', flag: '🇮🇱', rtl: true, nativeName: 'עברית' },
    { code: 'fa', name: 'Persian', flag: '🇮🇷', rtl: true, nativeName: 'فارسی' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', rtl: false, nativeName: 'Italiano' },
    { code: 'pl', name: 'Polish', flag: '🇵🇱', rtl: false, nativeName: 'Polski' },
    { code: 'nl', name: 'Dutch', flag: '🇳🇱', rtl: false, nativeName: 'Nederlands' },
];

const POPULAR_PAIRS = [
    { from: 'en', to: 'ur', label: 'English → Urdu' },
    { from: 'en', to: 'ar', label: 'English → Arabic' },
    { from: 'de', to: 'en', label: 'German → English' },
    { from: 'en', to: 'hi', label: 'English → Hindi' },
    { from: 'en', to: 'zh', label: 'English → Mandarin' },
];

export const Step2Language = () => {
    const { setStep, sourceLanguage, targetLanguage, setLanguages, file } = useNarrifyStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [enableTranslation, setEnableTranslation] = useState(false);

    const selectedLang = LANGUAGES.find(l => l.name === targetLanguage);
    const filteredLangs = LANGUAGES.filter(l =>
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePopularPair = (from: string, to: string) => {
        const fromLang = LANGUAGES.find(l => l.code === from);
        const toLang = LANGUAGES.find(l => l.code === to);
        if (fromLang && toLang) {
            setEnableTranslation(true);
            setLanguages(fromLang.name, toLang.name);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl narrify-gradient shadow-lg mb-3">
                    <Globe size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Language Settings</h2>
                <p className="text-muted-foreground text-lg">
                    We detected{" "}
                    <span className="text-narrify-blue font-bold">{sourceLanguage}</span>
                    {" "}in your PDF. Optionally translate before generating.
                </p>
            </div>

            {/* Source language card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                            {LANGUAGES.find(l => l.name === sourceLanguage)?.flag ?? '🌐'}
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Detected Source Language</p>
                            <p className="text-xl font-black text-slate-900">{sourceLanguage}</p>
                            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <Info size={11} /> Automatically detected from your PDF content
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                        <Check size={12} />
                        <span className="text-xs font-bold">Auto-detected</span>
                    </div>
                </div>
            </div>

            {/* Translation toggle */}
            <div className="bg-gradient-to-br from-narrify-blue/5 to-narrify-purple/5 rounded-3xl border border-narrify-blue/10 p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Languages size={18} className="text-narrify-blue" />
                            <h3 className="font-black text-slate-900">Enable Translation</h3>
                            <span className="px-2 py-0.5 bg-narrify-purple/10 text-narrify-purple text-[10px] font-black uppercase tracking-wider rounded-full border border-narrify-purple/15">
                                Optional
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Powered by NLLB-200 — translate your PDF content before generating the audiobook. Adds 5–10 seconds.
                        </p>
                    </div>
                    {/* Toggle */}
                    <button
                        onClick={() => setEnableTranslation(!enableTranslation)}
                        className={cn(
                            "relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300",
                            enableTranslation ? "bg-narrify-blue" : "bg-slate-200"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300",
                            enableTranslation ? "left-6" : "left-0.5"
                        )} />
                    </button>
                </div>

                <AnimatePresence>
                    {enableTranslation && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 space-y-5 border-t border-narrify-blue/10">
                                {/* Popular pairs */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Popular Translation Pairs</p>
                                    <div className="flex flex-wrap gap-2">
                                        {POPULAR_PAIRS.map((pair, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handlePopularPair(pair.from, pair.to)}
                                                className={cn(
                                                    "px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all",
                                                    targetLanguage === LANGUAGES.find(l => l.code === pair.to)?.name
                                                        ? "bg-narrify-blue text-white border-narrify-blue shadow-sm"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-narrify-blue/40"
                                                )}
                                            >
                                                {pair.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Language grid with search */}
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search language..."
                                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-narrify-blue/20 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                                        {filteredLangs.map((lang) => {
                                            const isSelected = targetLanguage === lang.name;
                                            return (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => setLanguages(sourceLanguage, lang.name)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition-all",
                                                        isSelected
                                                            ? "bg-narrify-blue text-white border-narrify-blue shadow-md"
                                                            : "bg-white text-slate-700 border-slate-200 hover:border-narrify-blue/30 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <span className="text-base flex-shrink-0">{lang.flag}</span>
                                                    <div className="min-w-0">
                                                        <div className="truncate">{lang.name}</div>
                                                        {lang.rtl && (
                                                            <div className={cn("text-[10px] font-bold", isSelected ? "text-white/70" : "text-amber-500")}>
                                                                RTL
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isSelected && <Check size={13} className="ml-auto flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* RTL warning */}
            <AnimatePresence>
                {selectedLang?.rtl && enableTranslation && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-4 items-start p-5 bg-amber-50 rounded-2xl border border-amber-100"
                    >
                        <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-amber-900">RTL Language Selected: {selectedLang.name}</p>
                            <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                                Narrify will automatically mirror text direction and narrative flow for a native {selectedLang.name} reading experience.
                                Characters, punctuation, and dialogue markers will be adapted for right-to-left rendering.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Translation summary */}
            {enableTranslation && targetLanguage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-5 bg-white rounded-2xl border border-narrify-blue/20 shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <Sparkles size={16} className="text-narrify-purple" />
                        <p className="text-sm font-bold text-slate-800">
                            Translation Pipeline:{" "}
                            <span className="text-narrify-blue">{sourceLanguage}</span>
                            <span className="text-slate-400 mx-2">→</span>
                            <span className="text-narrify-purple">{targetLanguage}</span>
                        </p>
                        <span className="ml-auto text-xs text-slate-400 font-medium">+5-10 seconds</span>
                    </div>
                </motion.div>
            )}

            {/* No translation note */}
            {!enableTranslation && (
                <div className="flex items-center gap-2 text-sm text-slate-400 p-4 bg-slate-50 rounded-2xl">
                    <Check size={14} className="text-green-500" />
                    Audiobook will be generated in <strong className="text-slate-700 ml-1">{sourceLanguage}</strong>. No translation applied.
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-slate-500">
                    <ChevronLeft size={16} /> Back
                </Button>
                <Button size="lg" variant="narrify" onClick={() => setStep(3)} className="h-12 px-8 rounded-2xl gap-2 group">
                    Analyze Speakers
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};
