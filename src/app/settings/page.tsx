"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    User, Shield, Key, Layout, Moon, Sun, Monitor,
    CheckCircle2, Headphones, Clock, Lock, Eye, EyeOff,
    RefreshCw, Crown, ArrowUpRight, AlertCircle,
    Loader2, Globe2
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUserProfile, logoutUser, updateProfile, updateUserData } from "@/store/slices/authSlice";
import { authApi } from "@/lib/api/auth";
import { fetchAudiobooks } from "@/store/slices/audiobookSlice";
import { format } from "date-fns";
import Link from "next/link";

const SECTIONS = [
    { id: "profile",    label: "Profile",          icon: User },
    { id: "plan",       label: "Plan & Usage",      icon: Crown },
    { id: "security",   label: "Security",          icon: Shield },
    { id: "appearance", label: "Appearance",        icon: Layout },
    { id: "api",        label: "API & Integration", icon: Key },
];

const PLAN_BADGES: Record<string, { label: string; color: string; bg: string }> = {
    free:       { label: "Free",       color: "text-slate-600",   bg: "bg-slate-100" },
    starter:    { label: "Starter",    color: "text-blue-600",    bg: "bg-blue-50" },
    pro:        { label: "Pro",        color: "text-purple-600",  bg: "bg-purple-50" },
    enterprise: { label: "Enterprise", color: "text-amber-600",   bg: "bg-amber-50" },
};

const PLAN_LIMITS: Record<string, { audiobooks: number; minutes: number }> = {
    free:       { audiobooks: 3,       minutes: 60 },
    starter:    { audiobooks: 20,      minutes: 500 },
    pro:        { audiobooks: 100,     minutes: 3000 },
    enterprise: { audiobooks: 999999,  minutes: 999999 },
};

function InputField({
    label, value, onChange, type = "text", disabled = false, placeholder = "",
}: {
    label: string; value: string; onChange?: (v: string) => void;
    type?: string; disabled?: boolean; placeholder?: string;
}) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                    "w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm transition-all outline-none",
                    "focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40",
                    disabled && "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                )}
            />
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, isLoading, error } = useAppSelector((s) => s.auth);
    const { audiobooks } = useAppSelector((s) => s.audiobook);

    const { theme, setTheme } = useTheme();
    const [activeTab, setActiveTab] = useState("profile");
    const [saved, setSaved] = useState(false);

    // Profile form
    const [fullName, setFullName]   = useState("");
    const [email, setEmail]         = useState("");
    const [phone, setPhone]         = useState("");

    // Security form
    const [currentPw, setCurrentPw]   = useState("");
    const [newPw, setNewPw]           = useState("");
    const [confirmPw, setConfirmPw]   = useState("");
    const [showPw, setShowPw]         = useState(false);
    const [pwError, setPwError]       = useState("");
    const [pwSaved, setPwSaved]       = useState(false);
    const [isPwLoading, setIsPwLoading] = useState(false);

    // Profile picture
    const [uploadingPic, setUploadingPic] = useState(false);
    const picInputRef = useRef<HTMLInputElement | null>(null);


    useEffect(() => {
        if (!isAuthenticated) { router.push("/auth/login"); return; }
        dispatch(fetchUserProfile());
        dispatch(fetchAudiobooks());
    }, [isAuthenticated, dispatch, router]);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || "");
            setEmail(user.email || "");
            setPhone(user.phone_number || "");
        }
    }, [user]);

    const handleProfilePicUpload = async (file: File) => {
        setUploadingPic(true);
        try {
            const updated = await authApi.uploadProfilePicture(file);
            dispatch(updateUserData(updated));
        } catch { /* ignore */ } finally {
            setUploadingPic(false);
        }
    };

    const handleSaveProfile = async () => {
        const result = await dispatch(updateProfile({ full_name: fullName, email, phone_number: phone }));
        if (updateProfile.fulfilled.match(result)) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError("");
        if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
        if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
        setIsPwLoading(true);
        try {
            await authApi.changePassword({ current_password: currentPw, new_password: newPw });
            setPwSaved(true);
            setTimeout(() => setPwSaved(false), 2500);
            setCurrentPw(""); setNewPw(""); setConfirmPw("");
        } catch (err: any) {
            const msg = err.response?.data?.detail
                || err.response?.data?.current_password?.[0]
                || err.response?.data?.new_password?.[0]
                || "Failed to update password.";
            setPwError(msg);
        } finally {
            setIsPwLoading(false);
        }
    };

    const plan      = user?.subscription_plan ?? "free";
    const planBadge = PLAN_BADGES[plan] ?? PLAN_BADGES.free;
    const limits    = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
    const initials  = (user?.full_name || user?.username || "?")
        .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const completedBooks = audiobooks.filter((b) => b.status === "completed").length;
    const minutesUsed    = Math.floor(user?.total_minutes_generated ?? 0);

    if (!isAuthenticated) return null;

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="space-y-1">
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Account Settings</h1>
                    <p className="text-muted-foreground">Manage your profile, plan, and preferences.</p>
                </header>

                <div className="grid md:grid-cols-[240px_1fr] gap-8">
                    {/* Sidebar */}
                    <aside className="space-y-1">
                        {/* Avatar card */}
                        <div className="bg-card rounded-2xl border border-border p-5 mb-4 flex flex-col items-center gap-3 text-center">
                            <button
                                className="relative w-16 h-16 rounded-2xl overflow-hidden group focus:outline-none shadow-md shadow-narrify-blue/20"
                                title="Change profile picture"
                                onClick={() => picInputRef.current?.click()}
                            >
                                {(user as any)?.profile_picture_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={(user as any).profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full narrify-gradient flex items-center justify-center text-white font-black text-xl">{initials}</div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {uploadingPic ? <Loader2 size={16} className="text-white animate-spin" /> : <RefreshCw size={14} className="text-white" />}
                                </div>
                            </button>
                            <div>
                                <p className="font-black text-foreground text-sm">{user?.full_name || user?.username}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                            </div>
                            <span className={cn("text-xs font-bold px-3 py-1 rounded-full", planBadge.bg, planBadge.color)}>
                                {planBadge.label} Plan
                            </span>
                        </div>

                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setActiveTab(s.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 font-medium text-sm",
                                    activeTab === s.id
                                        ? "bg-card shadow-sm text-narrify-blue ring-1 ring-border"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                <s.icon size={16} />
                                {s.label}
                            </button>
                        ))}

                        <button
                            onClick={async () => { await dispatch(logoutUser()); router.push("/auth/login"); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all mt-4"
                        >
                            <AlertCircle size={16} /> Sign Out
                        </button>
                    </aside>

                    {/* Content panels */}
                    <div className="space-y-6 min-w-0">
                        <AnimatePresence mode="wait">

                            {/* ── PROFILE ── */}
                            {activeTab === "profile" && (
                                <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Profile Information</CardTitle>
                                            <CardDescription>Update your name, email, and contact details.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Hidden profile picture input */}
                                            <input ref={picInputRef} type="file" accept="image/*" className="hidden"
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) handleProfilePicUpload(f);
                                                    e.target.value = '';
                                                }} />

                                            {/* Avatar row */}
                                            <div className="flex items-center gap-5 pb-6 border-b border-border">
                                                <button
                                                    className="relative w-20 h-20 rounded-2xl overflow-hidden group flex-shrink-0 focus:outline-none shadow-md shadow-narrify-blue/20"
                                                    title="Change profile picture"
                                                    onClick={() => picInputRef.current?.click()}
                                                >
                                                    {(user as any)?.profile_picture_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={(user as any).profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full narrify-gradient flex items-center justify-center text-white font-black text-2xl">{initials}</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                                        {uploadingPic ? <Loader2 size={18} className="text-white animate-spin" /> : <RefreshCw size={16} className="text-white" />}
                                                        <span className="text-white text-[10px] font-bold">Change</span>
                                                    </div>
                                                </button>
                                                <div className="space-y-1">
                                                    <p className="font-black text-foreground">{user?.full_name || user?.username}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Member since {user?.created_at ? format(new Date(user.created_at), "MMMM yyyy") : "—"}
                                                    </p>
                                                    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full", planBadge.bg, planBadge.color)}>
                                                        <Crown size={10} /> {planBadge.label} Plan
                                                    </span>
                                                </div>
                                            </div>

                                            {error && (
                                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                                                    {error}
                                                </div>
                                            )}

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <InputField label="Full Name" value={fullName} onChange={setFullName} placeholder="John Smith" />
                                                <InputField label="Username" value={user?.username || ""} disabled />
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <InputField label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                                                <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+1 555 000 0000" />
                                            </div>

                                            <div className="flex items-center gap-3 pt-2">
                                                <Button variant="narrify" onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
                                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                                    {isLoading ? "Saving…" : "Save Changes"}
                                                </Button>
                                                {saved && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -6 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="text-sm text-green-600 font-medium flex items-center gap-1"
                                                    >
                                                        <CheckCircle2 size={14} /> Saved
                                                    </motion.span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* ── PLAN & USAGE ── */}
                            {activeTab === "plan" && (
                                <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                                    {/* Current plan */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Current Plan</CardTitle>
                                            <CardDescription>Your subscription and usage this billing period.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl narrify-gradient flex items-center justify-center">
                                                        <Crown size={18} className="text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black">{planBadge.label} Plan</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {plan === "free" ? "Upgrade to unlock more features" : "Active subscription"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link href="#">
                                                    <Button variant="narrify" size="sm" className="gap-1.5 rounded-xl">
                                                        {plan === "free" ? "Upgrade" : "Manage"} <ArrowUpRight size={13} />
                                                    </Button>
                                                </Link>
                                            </div>

                                            {/* Usage bars */}
                                            <div className="space-y-4">
                                                <UsageBar
                                                    icon={Headphones}
                                                    label="Audiobooks Created"
                                                    used={user?.audiobooks_created ?? audiobooks.length}
                                                    limit={limits.audiobooks}
                                                    color="narrify-blue"
                                                />
                                                <UsageBar
                                                    icon={Clock}
                                                    label="Minutes Generated"
                                                    used={minutesUsed}
                                                    limit={limits.minutes}
                                                    color="narrify-purple"
                                                    unit="min"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { icon: Headphones, label: "Total Audiobooks", value: user?.audiobooks_created ?? audiobooks.length, color: "text-narrify-blue", bg: "bg-narrify-blue/8" },
                                            { icon: CheckCircle2, label: "Completed", value: completedBooks, color: "text-green-500", bg: "bg-green-50" },
                                            { icon: Clock, label: "Minutes Generated", value: minutesUsed, color: "text-narrify-purple", bg: "bg-narrify-purple/8" },
                                            { icon: Globe2, label: "Languages Used", value: new Set(audiobooks.map((b) => b.target_language)).size || 1, color: "text-amber-500", bg: "bg-amber-50" },
                                        ].map((stat, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                                                className="bg-card rounded-2xl border border-border p-4 space-y-3">
                                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                                                    <stat.icon size={17} />
                                                </div>
                                                <div>
                                                    <p className="text-xl font-black text-foreground">{stat.value}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Plan comparison */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Available Plans</CardTitle>
                                            <CardDescription>Scale with your production needs.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                {[
                                                    {
                                                        name: "Starter", price: "$9", period: "/mo",
                                                        features: ["20 audiobooks/mo", "500 minutes", "5 voices", "MP3 export"],
                                                        highlight: false,
                                                    },
                                                    {
                                                        name: "Pro", price: "$29", period: "/mo",
                                                        features: ["100 audiobooks/mo", "3,000 minutes", "200+ voices", "Voice cloning", "Priority processing"],
                                                        highlight: true,
                                                    },
                                                    {
                                                        name: "Enterprise", price: "Custom", period: "",
                                                        features: ["Unlimited", "Custom voices", "API access", "SLA", "Dedicated support"],
                                                        highlight: false,
                                                    },
                                                ].map((p) => (
                                                    <div key={p.name} className={cn(
                                                        "rounded-2xl border p-5 space-y-4 relative overflow-hidden",
                                                        p.highlight ? "border-narrify-blue bg-narrify-blue/5 ring-1 ring-narrify-blue/20" : "border-border bg-card"
                                                    )}>
                                                        {p.highlight && (
                                                            <div className="absolute top-3 right-3">
                                                                <span className="text-[10px] font-black px-2 py-1 bg-narrify-blue text-white rounded-full">POPULAR</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-black text-sm">{p.name}</p>
                                                            <p className="text-2xl font-black mt-1 text-foreground">
                                                                {p.price}<span className="text-sm font-medium text-muted-foreground">{p.period}</span>
                                                            </p>
                                                        </div>
                                                        <ul className="space-y-2">
                                                            {p.features.map((f) => (
                                                                <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" /> {f}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                        <Button
                                                            variant={p.highlight ? "narrify" : "outline"}
                                                            className="w-full rounded-xl"
                                                            size="sm"
                                                        >
                                                            {plan === p.name.toLowerCase() ? "Current Plan" : "Choose Plan"}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* ── SECURITY ── */}
                            {activeTab === "security" && (
                                <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Change Password</CardTitle>
                                            <CardDescription>We recommend using a strong, unique password.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                                                {pwError && (
                                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                                                        {pwError}
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold uppercase text-muted-foreground">Current Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showPw ? "text" : "password"}
                                                            value={currentPw}
                                                            onChange={(e) => setCurrentPw(e.target.value)}
                                                            required
                                                            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm outline-none focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 transition-all"
                                                        />
                                                        <button type="button" onClick={() => setShowPw(!showPw)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <InputField label="New Password" value={newPw} onChange={setNewPw} type="password" placeholder="••••••••" />
                                                <InputField label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="••••••••" />
                                                <div className="flex items-center gap-3 pt-2">
                                                    <Button type="submit" variant="narrify" disabled={isPwLoading} className="gap-2">
                                                        {isPwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                                                        {isPwLoading ? "Updating…" : "Update Password"}
                                                    </Button>
                                                    {pwSaved && (
                                                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                            className="text-sm text-green-600 font-medium flex items-center gap-1">
                                                            <CheckCircle2 size={14} /> Updated
                                                        </motion.span>
                                                    )}
                                                </div>
                                            </form>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* ── APPEARANCE ── */}
                            {activeTab === "appearance" && (
                                <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Appearance</CardTitle>
                                            <CardDescription>Customize how Narrify looks on your device.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">Interface Theme</label>
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: "Light",  value: "light",  icon: Sun },
                                                    { label: "Dark",   value: "dark",   icon: Moon },
                                                    { label: "System", value: "system", icon: Monitor },
                                                ].map((t) => {
                                                    const active = theme === t.value;
                                                    return (
                                                    <button key={t.value}
                                                        onClick={() => setTheme(t.value)}
                                                        className={cn(
                                                            "flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 group",
                                                            active
                                                                ? "border-narrify-blue bg-narrify-blue/8 ring-2 ring-narrify-blue/20"
                                                                : "border-border hover:border-narrify-blue/40 hover:bg-narrify-blue/5"
                                                        )}>
                                                        <t.icon size={24} className={active ? "text-narrify-blue" : "text-muted-foreground group-hover:text-narrify-blue transition-colors"} />
                                                        <span className={cn("text-sm font-bold", active ? "text-narrify-blue" : "text-foreground group-hover:text-narrify-blue transition-colors")}>{t.label}</span>
                                                        {active && <CheckCircle2 size={14} className="text-narrify-blue" />}
                                                    </button>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* ── API ── */}
                            {activeTab === "api" && (
                                <motion.div key="api" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                API Access
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200">
                                                    Coming Soon
                                                </span>
                                            </CardTitle>
                                            <CardDescription>Programmatic access to the Narrify API is not yet available.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-start gap-4 p-5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20">
                                                <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">API keys are not yet active</p>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                        Public API access is planned for a future release. You will be able to generate API keys here once the feature launches.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-muted/40 rounded-2xl border border-border space-y-3">
                                                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Planned capabilities</p>
                                                <ul className="space-y-2 text-sm text-muted-foreground">
                                                    {[
                                                        "Upload PDFs and trigger audiobook generation via REST",
                                                        "Webhook callbacks when generation completes",
                                                        "Manage voices and speaker assignments programmatically",
                                                        "Download generated audio through authenticated endpoints",
                                                    ].map((item) => (
                                                        <li key={item} className="flex items-start gap-2">
                                                            <CheckCircle2 size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

function UsageBar({
    icon: Icon, label, used, limit, color, unit = "",
}: {
    icon: React.ElementType; label: string; used: number; limit: number; color: string; unit?: string;
}) {
    const pct = limit >= 999999 ? 5 : Math.min(100, Math.round((used / limit) * 100));
    const isNearLimit = pct >= 80;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                    <Icon size={14} className={`text-${color}`} />
                    {label}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                    {used.toLocaleString()}{unit ? ` ${unit}` : ""} / {limit >= 999999 ? "∞" : `${limit.toLocaleString()}${unit ? ` ${unit}` : ""}`}
                </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className={cn(
                        "h-full rounded-full",
                        isNearLimit ? "bg-amber-400" : `bg-${color}`,
                        limit >= 999999 && "bg-green-400"
                    )}
                />
            </div>
        </div>
    );
}
