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
import { loginUser, clearError } from "@/store/slices/authSlice";

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.auth);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        dispatch(clearError());

        const result = await dispatch(loginUser({ username: email, password }));

        if (loginUser.fulfilled.match(result)) {
            router.push("/dashboard");
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
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
                        <p className="text-muted-foreground">Log in to your Narrify account to continue.</p>
                    </div>
                </div>

                <Card className="border-border shadow-xl">
                    <CardContent className="p-8 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">
                                    Email Address or Username
                                </label>
                                <input
                                    type="text"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Password</label>
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
                                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-narrify-blue/20 focus:border-narrify-blue/40 transition-all outline-none"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="narrify"
                                className="w-full h-12 font-bold group"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <><Loader2 size={16} className="animate-spin mr-2" />Signing in...</>
                                ) : (
                                    <>Sign In <MoveRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/register" className="text-narrify-blue font-bold hover:underline">
                        Sign up for free
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
