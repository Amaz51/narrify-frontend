"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
    MoveRight, PlayCircle, Sparkles, BookOpen, Mic2, Globe2,
    Zap, Shield, Users, ChevronRight, Clock, FileText, Headphones,
    Star, ArrowUpRight, Check, Volume2, Wand2, Download, Languages
} from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useState } from "react";

import { NarrifyLogo } from "@/assets/logo/NarrifyLogo";

const FEATURES = [
    {
        icon: Users,
        title: "Multi-Speaker Detection",
        desc: "Automatically identifies 3–5+ distinct characters and narrators in your manuscript, assigning unique AI voices to each.",
        color: "from-blue-500 to-indigo-600",
        tag: "Core Feature",
    },
    {
        icon: Globe2,
        title: "200+ Languages",
        desc: "Translate and narrate in any language. Native RTL support for Urdu, Arabic, Hebrew with correct text direction.",
        color: "from-purple-500 to-fuchsia-600",
        tag: "Global Reach",
    },
    {
        icon: Wand2,
        title: "Emotion-Aware Prosody",
        desc: "Happy dialogue sounds uplifting. Tense scenes sound urgent. The AI automatically adjusts tone and cadence based on content.",
        color: "from-cyan-500 to-teal-600",
        tag: "AI Magic",
    },
    {
        icon: Mic2,
        title: "Voice Cloning (6s sample)",
        desc: "Upload just 6–30 seconds of any voice and Narrify creates a high-fidelity clone — for characters, narrators, or your own voice.",
        color: "from-amber-500 to-orange-600",
        tag: "Pro Feature",
    },
    {
        icon: Zap,
        title: "Async Batch Processing",
        desc: "Celery workers + Redis caching power simultaneous processing of 5+ audiobooks. Typical chapter: 2–3 minutes.",
        color: "from-rose-500 to-pink-600",
        tag: "Performance",
    },
    {
        icon: Download,
        title: "Multi-Format Export",
        desc: "Download your audiobook as MP3 (320kbps), WAV (48kHz/24-bit lossless), or M4B (optimized for Apple Books).",
        color: "from-green-500 to-emerald-600",
        tag: "Flexibility",
    },
];

const STATS = [
    { value: "200+", label: "Languages Supported" },
    { value: "10K+", label: "Audiobooks Created" },
    { value: "2-3min", label: "Per-Chapter Generation" },
    { value: "99.2%", label: "Uptime SLA" },
];

const USE_CASES = [
    { icon: BookOpen, title: "Students", desc: "Convert dense textbooks to audiobooks for studying on-the-go." },
    { icon: Shield, title: "Accessibility", desc: "Visually impaired users can access any PDF content as audio." },
    { icon: Mic2, title: "Authors", desc: "Preview your novel with distinct voices for every character." },
    { icon: Languages, title: "Language Learners", desc: "Listen to translated content in your target language." },
    { icon: Volume2, title: "Content Creators", desc: "Produce podcast-style narrations from written articles." },
    { icon: FileText, title: "Enterprises", desc: "Automate documentation and reports into audio format." },
];

const DEMO_SAMPLES = [
    { title: "Harry Potter - Chapter 1", lang: "English → Urdu", speakers: 4, duration: "12:42", badge: "Popular" },
    { title: "German News Article", lang: "German → English", speakers: 2, duration: "5:10", badge: "RTL Demo" },
    { title: "English Short Story", lang: "English → Hindi", speakers: 3, duration: "8:55", badge: "Multi-Speaker" },
];

const TESTIMONIALS = [
    { name: "Sarah K.", role: "PhD Student", star: 5, quote: "Narrify transformed my entire dissertation into an audiobook in under 10 minutes. The multi-speaker feature is mindblowing." },
    { name: "Ahmed R.", role: "Author & Publisher", star: 5, quote: "My Arabic novel sounded incredibly natural. For the first time, a tool actually handles RTL properly. Speechify and Descript can't compete." },
    { name: "Maria L.", role: "ESL Teacher", star: 5, quote: "I use Narrify to create listening exercises by translating English content to Spanish — my students love it!" },
];

export default function Home() {
    const { scrollYProgress } = useScroll();
    const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

    const [playingDemo, setPlayingDemo] = useState<number | null>(null);

    return (
        <MainLayout>
            <div className="space-y-32 pb-20">

                {/* ── HERO ─────────────────────────────────────── */}
                <section className="relative pt-12 pb-8 overflow-hidden min-h-[85vh] flex items-center">

                    {/* Ambient blobs */}
                    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-narrify-purple/8 blur-3xl" />
                        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-narrify-blue/8 blur-3xl" />
                        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-narrify-cyan/5 blur-3xl" />
                    </div>

                    <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="space-y-8 text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-narrify-blue/8 border border-narrify-blue/15 text-narrify-blue text-xs font-bold tracking-widest uppercase"
                            >
                                <Sparkles size={12} className="animate-pulse" />
                                Powered by XTTS v2 · NLLB-200 · spaCy
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-foreground"
                            >
                                Turn any PDF into a{" "}
                                <span className="narrify-text-gradient">Professional Audiobook</span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl text-muted-foreground leading-relaxed max-w-2xl"
                            >
                                Multi-speaker AI narration with 200+ languages, emotion-aware prosody, and voice cloning. No studio required.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
                            >
                                <Link href="/create">
                                    <Button size="lg" variant="narrify" className="h-14 px-10 text-base gap-2 group rounded-2xl shadow-xl shadow-narrify-blue/25">
                                        Create Free Audiobook
                                        <MoveRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="#demo">
                                    <Button size="lg" variant="outline" className="h-14 px-10 text-base gap-2 rounded-2xl border-2">
                                        <PlayCircle size={20} className="text-narrify-blue" />
                                        Try Demo Samples
                                    </Button>
                                </Link>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground pt-2"
                            >
                                {["No credit card required", "200+ languages", "2-3 min per chapter"].map((item) => (
                                    <span key={item} className="flex items-center gap-1.5">
                                        <Check size={13} className="text-green-500" />
                                        {item}
                                    </span>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Hero Visual — mock app card */}
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 80 }}
                            className="relative animate-float"
                        >
                            <div className="relative bg-card rounded-3xl border border-border shadow-2xl overflow-hidden p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Currently Generating</p>
                                        <p className="text-lg font-black text-foreground">Harry Potter & The Sorcerer's Stone</p>
                                    </div>
                                    <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 animate-pulse">
                                        Processing
                                    </div>
                                </div>

                                {/* Fake waveform */}
                                <div className="flex items-end gap-[3px] h-16">
                                    {Array.from({ length: 60 }).map((_, i) => {
                                        const heights = [30, 60, 45, 80, 35, 70, 50, 90, 40, 65];
                                        const h = heights[i % heights.length];
                                        const speaker = i < 20 ? "bg-narrify-blue" : i < 40 ? "bg-narrify-purple" : "bg-muted";
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full ${speaker}`}
                                                style={{ height: `${h}%`, opacity: i < 42 ? 1 : 0.4 }}
                                            />
                                        );
                                    })}
                                </div>

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                                        <span>Processing segment 23/50</span>
                                        <span className="text-narrify-blue font-bold">46%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className="progress-bar h-full" style={{ width: "46%" }} />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <Clock size={10} /> Est. 1m 24s remaining
                                    </p>
                                </div>

                                {/* Speakers */}
                                <div className="flex gap-2 flex-wrap">
                                    {[{ name: "Harry", gender: "MALE", color: "badge-male" }, { name: "Hermione", gender: "FEMALE", color: "badge-female" }, { name: "Narrator", gender: "NEUTRAL", color: "badge-neutral" }].map((s) => (
                                        <span key={s.name} className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${s.color}`}>
                                            {s.name} · {s.gender}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Floating badge */}
                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -bottom-5 -left-8 bg-card rounded-2xl border border-border shadow-xl px-4 py-3 flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-500/15 rounded-xl flex items-center justify-center">
                                    <Check size={16} className="text-green-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Completed</p>
                                    <p className="text-xs font-black text-foreground">Chapter 3 Ready!</p>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 8, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-5 -right-5 bg-card rounded-2xl border border-border shadow-xl px-4 py-3 text-center"
                            >
                                <p className="text-2xl font-black narrify-text-gradient">200+</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Languages</p>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* ── STATS ──────────────────────────────────────── */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {STATS.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            className="text-center p-8 bg-card rounded-3xl border border-border shadow-sm hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200"
                        >
                            <p className="text-4xl font-black narrify-text-gradient">{stat.value}</p>
                            <p className="text-sm font-medium text-muted-foreground mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </section>

                {/* ── 4-STEP FLOW ────────────────────────────────── */}
                <section className="space-y-14">
                    <div className="text-center space-y-3">
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-black uppercase tracking-widest text-narrify-blue">
                            How It Works
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                            From PDF to Audiobook in 4 Steps
                        </motion.h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { step: "01", title: "Upload PDF", desc: "Drag & drop any PDF up to 50MB. Any language, any genre.", icon: FileText, color: "from-blue-500 to-indigo-600" },
                            { step: "02", title: "Select Language", desc: "Choose source & target language. Auto-detect handles the rest.", icon: Languages, color: "from-purple-500 to-fuchsia-600" },
                            { step: "03", title: "Configure Speakers", desc: "Review detected characters, assign voices, adjust emotion & speed.", icon: Users, color: "from-amber-500 to-orange-500" },
                            { step: "04", title: "Generate & Download", desc: "AI generates your audiobook in 2–5 minutes. Export as MP3, WAV, or M4B.", icon: Headphones, color: "from-green-500 to-emerald-600" },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="relative group"
                            >
                                {i < 3 && (
                                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-border to-transparent z-0" />
                                )}
                                <div className="relative z-10 bg-card rounded-3xl border border-border p-7 shadow-sm group-hover:shadow-md group-hover:border-narrify-blue/20 transition-all duration-200 space-y-5">
                                    <div className="flex items-start justify-between">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                                            <item.icon size={22} className="text-white" />
                                        </div>
                                        <span className="text-5xl font-black text-muted/50 select-none">{item.step}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="font-black text-lg text-foreground">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        <Link href="/create">
                            <Button size="lg" variant="narrify" className="h-14 px-10 text-base rounded-2xl gap-2 shadow-xl shadow-narrify-blue/25 group">
                                Start Creating Now
                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* ── FEATURES ───────────────────────────────────── */}
                <section className="space-y-14">
                    <div className="text-center space-y-3">
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-black uppercase tracking-widest text-narrify-blue">
                            What Makes Us Different
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                            Built for Production-<br className="hidden md:block" />Grade Audiobooks
                        </motion.h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07 }}
                                className="card-hover bg-card rounded-3xl border border-border shadow-sm p-8 space-y-5 hover:border-narrify-blue/20 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                                        <f.icon size={22} className="text-white" />
                                    </div>
                                    <span className="px-2.5 py-1 bg-narrify-blue/8 text-narrify-blue text-[10px] font-black uppercase tracking-widest rounded-full border border-narrify-blue/15">
                                        {f.tag}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-black text-lg text-foreground">{f.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── USE CASES ──────────────────────────────────── */}
                <section className="space-y-12">
                    <div className="text-center space-y-3">
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-black uppercase tracking-widest text-narrify-purple">
                            Who Uses Narrify
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                            Built for Every Creator
                        </motion.h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {USE_CASES.map((uc, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                className="flex items-start gap-4 p-6 bg-card rounded-2xl border border-border shadow-sm hover:border-narrify-blue/20 hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-10 h-10 rounded-xl narrify-gradient flex items-center justify-center flex-shrink-0">
                                    <uc.icon size={18} className="text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{uc.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{uc.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── DEMO SAMPLES ───────────────────────────────── */}
                <section id="demo" className="space-y-12">
                    <div className="text-center space-y-3">
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-black uppercase tracking-widest text-narrify-cyan">
                            Try It Now
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-black tracking-tight">
                            Live Demo Samples
                        </motion.h2>
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-muted-foreground max-w-lg mx-auto">
                            Experience Narrify's multi-speaker, multilingual audiobook generation without uploading a single file.
                        </motion.p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {DEMO_SAMPLES.map((demo, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`p-7 bg-card rounded-3xl border shadow-sm hover:shadow-lg transition-all duration-200 space-y-5 cursor-pointer group ${playingDemo === i ? "border-narrify-blue ring-2 ring-narrify-blue/10" : "border-border hover:border-narrify-blue/30"}`}
                                onClick={() => setPlayingDemo(playingDemo === i ? null : i)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="font-black text-lg text-foreground">{demo.title}</h3>
                                        <p className="text-sm text-narrify-blue font-semibold flex items-center gap-1">
                                            <Globe2 size={12} /> {demo.lang}
                                        </p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-narrify-purple/8 text-narrify-purple text-[10px] font-black uppercase tracking-widest rounded-full border border-narrify-purple/15">
                                        {demo.badge}
                                    </span>
                                </div>

                                {/* Mini waveform */}
                                <div className="flex items-end gap-1 h-10">
                                    {Array.from({ length: 30 }).map((_, j) => {
                                        const hs = [40, 70, 55, 90, 45, 80, 60, 100, 50, 75];
                                        return (
                                            <div
                                                key={j}
                                                className={`flex-1 rounded-full transition-colors ${playingDemo === i ? "bg-narrify-blue" : "bg-muted group-hover:bg-narrify-blue/40"}`}
                                                style={{ height: `${hs[j % hs.length]}%` }}
                                            />
                                        );
                                    })}
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex gap-3 text-xs text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1"><Users size={11} /> {demo.speakers} speakers</span>
                                        <span className="flex items-center gap-1"><Clock size={11} /> {demo.duration}</span>
                                    </div>
                                    <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${playingDemo === i ? "narrify-gradient text-white shadow-lg" : "bg-muted text-muted-foreground group-hover:bg-narrify-blue/10 group-hover:text-narrify-blue"}`}>
                                        {playingDemo === i
                                            ? <span className="flex gap-0.5"><span className="w-0.5 h-3 bg-white rounded-full" /><span className="w-0.5 h-3 bg-white rounded-full" /></span>
                                            : <PlayCircle size={16} />
                                        }
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="text-center text-sm text-muted-foreground font-medium">
                        Demo mode — audio preview coming soon. <Link href="/create" className="text-narrify-blue font-bold hover:underline">Upload your own PDF →</Link>
                    </div>
                </section>

                {/* ── TESTIMONIALS ───────────────────────────────── */}
                <section className="space-y-12">
                    <div className="text-center space-y-3">
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-xs font-black uppercase tracking-widest text-narrify-blue">
                            Loved By Creators
                        </motion.p>
                        <motion.h2 initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-4xl font-black text-foreground">
                            What our users say
                        </motion.h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-card rounded-3xl border border-border shadow-sm p-8 space-y-5 hover:shadow-md hover:border-narrify-blue/20 transition-all duration-200"
                            >
                                <div className="flex gap-0.5">
                                    {Array.from({ length: t.star }).map((_, j) => <Star key={j} size={14} className="text-amber-400 fill-amber-400" />)}
                                </div>
                                <p className="text-muted-foreground leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
                                <div className="flex items-center gap-3 pt-2 border-t border-border">
                                    <div className="w-8 h-8 rounded-full narrify-gradient flex items-center justify-center text-xs font-black text-white">
                                        {t.name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{t.name}</p>
                                        <p className="text-[11px] text-muted-foreground">{t.role}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── CTA ────────────────────────────────────────── */}
                <section className="relative overflow-hidden rounded-[3rem] p-14 md:p-20 text-center">
                    <div className="absolute inset-0 narrify-gradient opacity-95" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                    <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                            <Sparkles size={12} /> Start Free Today
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black text-white leading-tight">
                            Ready to Narrify?
                        </h2>
                        <p className="text-white/75 text-xl">
                            Join 10,000+ authors, students, and creators worldwide. No setup. No subscription required to start.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/create">
                                <Button size="lg" className="h-14 px-12 text-base bg-white text-narrify-blue hover:bg-white/90 font-black rounded-2xl shadow-2xl gap-2 group">
                                    Create Your First Audiobook
                                    <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="/auth/login">
                                <Button size="lg" variant="ghost" className="h-14 px-10 text-base text-white hover:bg-white/10 rounded-2xl font-semibold border border-white/20">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

            </div>
        </MainLayout>
    );
}
