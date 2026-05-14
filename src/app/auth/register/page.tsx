"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NarrifyLogo } from "@/assets/logo/NarrifyLogo";
import Link from "next/link";
import { MoveRight, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerUser, clearError } from "@/store/slices/authSlice";

export default function RegisterPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [agreed, setAgreed] = useState(false);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!agreed) return;

        dispatch(clearError());

        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
        const full_name = `${firstName} ${lastName}`.trim();

        const result = await dispatch(
            registerUser({ username, email, password, password2: password, full_name })
        );

        if (registerUser.fulfilled.match(result)) {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl grid md:grid-cols-[1fr_2fr] gap-0 rounded-[2rem] overflow-hidden shadow-2xl bg-card border border-border"
            >
                {/* Left Side - Promo */}
                <div className="hidden md:flex flex-col justify-between p-8 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-narrify-blue via-transparent to-transparent" />
                    <Link href="/">
                        <NarrifyLogo iconOnly className="scale-125" />
                    </Link>
                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <Sparkles className="text-narrify-cyan" />
                            <h2 className="text-2xl font-black">Join Narrify</h2>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Unlock the power of neural narration for your manuscripts.
                            </p>
                        </div>
                        <ul className="space-y-4 text-xs font-bold text-slate-300">
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-narrify-cyan" /> 200+ Neural Voices
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-narrify-cyan" /> Multi-Speaker AI
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-narrify-cyan" /> Unlimited Projects
                            </li>
                        </ul>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                        EST. 2026 • NARRIFY AI
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-10 space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black">Create Account</h1>
                        <p className="text-muted-foreground text-sm font-medium">
                            Get started with professional audiobooks today.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Smith"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">Email Address</label>
                            <input
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-narrify-blue focus:ring-narrify-blue"
                            />
                            <label htmlFor="terms" className="text-xs text-muted-foreground font-medium">
                                I agree to the{" "}
                                <Link href="#" className="font-bold text-foreground hover:text-narrify-blue transition-colors">Terms of Service</Link>{" "}
                                and{" "}
                                <Link href="#" className="font-bold text-foreground hover:text-narrify-blue transition-colors">Privacy Policy</Link>.
                            </label>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="narrify"
                                className="w-full h-12 font-bold flex items-center justify-center gap-2 group"
                                disabled={isLoading || !agreed}
                            >
                                {isLoading ? (
                                    <><Loader2 size={16} className="animate-spin mr-2" />Creating Account...</>
                                ) : (
                                    <>Create Account <MoveRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </Button>
                        </div>
                    </form>

                    <p className="text-center text-xs text-muted-foreground font-medium">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="text-narrify-blue font-bold hover:underline">
                            Sign in here
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
