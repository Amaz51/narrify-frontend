"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NarrifyLogo } from "@/assets/logo/NarrifyLogo";
import Link from "next/link";
import { MoveRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginUser, googleLogin, clearError } from "@/store/slices/authSlice";
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

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [googleError, setGoogleError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(clearError());

        const result = await dispatch(
            loginUser({ username: email, password })
        );

        if (loginUser.fulfilled.match(result)) {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-narrify-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md space-y-8"
            >
                <div className="flex flex-col items-center gap-6">
                    <Link href="/">
                        <NarrifyLogo className="scale-125" />
                    </Link>
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-black">Welcome back</h1>
                        <p className="text-slate-500">Log in to your Narrify account to continue.</p>
                    </div>
                </div>

                <Card className="border-slate-200 shadow-xl">
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <GoogleLoginButton onError={(msg) => setGoogleError(msg || null)} />
                            <Button variant="outline" className="w-full h-12 gap-2 border-slate-200 font-bold" disabled>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                Continue with GitHub
                            </Button>
                        </div>

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

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">
                                    Email Address or Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-slate-400">Password</label>
                                    <Link href="#" className="text-xs font-bold text-narrify-blue hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 transition-all outline-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="narrify"
                                className="w-full h-12 font-bold group"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                                {!isLoading && (
                                    <MoveRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/register" className="text-narrify-blue font-bold hover:underline">
                        Sign up for free
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
