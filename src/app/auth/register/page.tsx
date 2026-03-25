"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NarrifyLogo } from "@/assets/logo/NarrifyLogo";
import Link from "next/link";
import { MoveRight, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { registerUser, googleLogin, clearError } from "@/store/slices/authSlice";
import { useGoogleLogin } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function GoogleLoginButton({ onError }: { onError: (msg: string) => void }) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { isLoading } = useAppSelector((state) => state.auth);

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            dispatch(clearError());
            onError('');
            const result = await dispatch(googleLogin(tokenResponse.access_token));
            if (googleLogin.fulfilled.match(result)) {
                router.push("/dashboard");
            }
        },
        onError: () => onError("Google sign-in failed. Please try again."),
    });

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-2 border-slate-200 font-bold"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
            )}
            Continue with Google
        </Button>
    );
}

export default function RegisterPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [agreed, setAgreed] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!agreed) return;

        dispatch(clearError());

        // Derive username from email prefix; combine names as full_name
        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
        const full_name = `${firstName} ${lastName}`.trim();

        const result = await dispatch(
            registerUser({
                username,
                email,
                password,
                password2: password,
                full_name,
            })
        );

        if (registerUser.fulfilled.match(result)) {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-narrify-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl grid md:grid-cols-[1fr_2fr] gap-0 rounded-[2rem] overflow-hidden shadow-2xl bg-white border"
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
                        <p className="text-slate-500 text-sm font-medium">
                            Get started with professional audiobooks today.
                        </p>
                    </div>

                    <GoogleLoginButton onError={(msg) => setGoogleError(msg || null)} />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {(error || googleError) && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                {error || googleError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Smith"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-narrify-blue/20 transition-all outline-none"
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
                            <label htmlFor="terms" className="text-xs text-slate-500 font-medium">
                                I agree to the{" "}
                                <Link href="#" className="font-bold text-slate-900">
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link href="#" className="font-bold text-slate-900">
                                    Privacy Policy
                                </Link>
                                .
                            </label>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                variant="narrify"
                                className="w-full h-12 font-bold flex items-center justify-center gap-2 group"
                                disabled={isLoading || !agreed}
                            >
                                {isLoading ? "Creating Account..." : "Create Account"}
                                {!isLoading && (
                                    <MoveRight
                                        size={18}
                                        className="group-hover:translate-x-1 transition-transform"
                                    />
                                )}
                            </Button>
                        </div>
                    </form>

                    <p className="text-center text-xs text-slate-500 font-medium">
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
