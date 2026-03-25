'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div className="min-h-screen mesh-bg flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glassmorphism-card rounded-3xl p-10 text-center max-w-md w-full space-y-6 shadow-xl"
            >
                <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
                    <AlertCircle size={32} className="text-red-400" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight">Something went wrong</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {error.message || 'An unexpected error occurred. Please try again.'}
                    </p>
                </div>
                <button
                    onClick={reset}
                    className="inline-flex items-center gap-2 px-6 py-3 narrify-gradient text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md"
                >
                    <RotateCcw size={16} />
                    Try Again
                </button>
            </motion.div>
        </div>
    );
}
