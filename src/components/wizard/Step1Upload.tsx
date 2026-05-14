"use client";

import React, { useCallback, useState } from 'react';
import { useNarrifyStore } from '@/stores/useNarrifyStore';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
    Upload, FileText, X, CheckCircle2, AlertCircle, FileWarning,
    BookOpen, Sparkles, Info, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

// Inline Progress component
const Progress = React.forwardRef<HTMLDivElement, { value: number; className?: string; }>(
    ({ value, className }, ref) => (
        <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
            <div
                className="h-full progress-bar transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    )
);
Progress.displayName = "Progress";

const DEMO_PDFS = [
    { name: "Harry Potter - Chapter 1.pdf", size: "2.4 MB", pages: 22, speakers: 4, lang: "English" },
    { name: "German News Article.pdf", size: "0.8 MB", pages: 6, speakers: 2, lang: "German" },
    { name: "Urdu Short Story.pdf", size: "1.2 MB", pages: 14, speakers: 3, lang: "Urdu (RTL)" },
];

export const Step1Upload = () => {
    const { setFile, file, setStep, setFileId } = useNarrifyStore();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [showDemo, setShowDemo] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFile = useCallback(async (selectedFile: File) => {
        setError(null);
        if (selectedFile.type !== 'application/pdf') {
            setError('Only PDF files are supported. Please upload a .pdf file.');
            return;
        }
        if (selectedFile.size > 50 * 1024 * 1024) {
            setError('File exceeds 50MB limit. Please compress or split your PDF.');
            return;
        }

        setFile(selectedFile);
        setUploadProgress(0);
        setIsUploading(true);

        // Start a simulated progress animation while upload happens
        let prog = 0;
        const interval = setInterval(() => {
            prog += Math.random() * 5 + 2;
            if (prog >= 90) {
                clearInterval(interval);
                prog = 90;
            }
            setUploadProgress(Math.round(prog));
        }, 120);

        try {
            const response = await apiService.uploadPDF(selectedFile);
            const { file_id, filename, pages, chapters } = response.data;

            clearInterval(interval);
            setUploadProgress(100);
            useNarrifyStore.getState().setFileId(file_id);

            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                console.log(`✅ Uploaded: ${filename}, ${pages} pages, ${chapters} chapters, file_id: ${file_id}`);
            }
        } catch (err: any) {
            clearInterval(interval);
            setUploadProgress(0);
            setFile(null);

            const status = err.response?.status;
            if (status === 413) {
                setError('File too large. Please upload a smaller PDF.');
            } else if (status === 400) {
                setError('Invalid PDF. Please check your file and try again.');
            } else {
                setError(err.response?.data?.detail || 'Upload failed. Please check the backend is running.');
            }
        } finally {
            setIsUploading(false);
        }
    }, [setFile, setFileId]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFile(droppedFile);
    }, [handleFile]);

    const handleDemoSelect = (demo: typeof DEMO_PDFS[0]) => {
        // Create a real-ish demo PDF blob for demo mode
        const blob = new Blob(['%PDF-1.4 demo content'], { type: 'application/pdf' });
        const demoFile = new File([blob], demo.name, { type: 'application/pdf' });
        handleFile(demoFile);
        setShowDemo(false);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-2.5">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl narrify-gradient shadow-lg mb-3">
                    <Upload size={24} className="text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Upload your manuscript</h2>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto">
                    Drag and drop your PDF — any language, any genre. Up to 50MB.
                </p>
            </div>

            {/* Drop zone */}
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden",
                    isDragging
                        ? "border-narrify-purple bg-narrify-purple/5 scale-[1.01]"
                        : file
                            ? "border-green-300 dark:border-green-500/40 bg-green-50/50 dark:bg-green-500/5"
                            : error
                                ? "border-red-300 dark:border-red-500/40 bg-red-50/50 dark:bg-red-500/5 cursor-default"
                                : "border-border hover:border-narrify-blue/50 hover:bg-narrify-blue/3 bg-muted/20"
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !file && !isUploading && document.getElementById('fileInput')?.click()}
            >
                <input
                    id="fileInput"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />

                <div className="flex flex-col items-center justify-center min-h-[300px] p-10">
                    <AnimatePresence mode="wait">
                        {!file && !error && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center gap-5 text-center"
                            >
                                <motion.div
                                    animate={isDragging ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                                    className="w-24 h-24 rounded-2xl bg-narrify-blue/8 border border-narrify-blue/15 flex items-center justify-center text-narrify-blue"
                                >
                                    <FileText size={44} />
                                </motion.div>
                                <div className="space-y-2">
                                    <p className="text-xl font-bold text-foreground">
                                        {isDragging ? "Drop it here!" : "Click to upload or drag & drop"}
                                    </p>
                                    <p className="text-sm text-muted-foreground font-medium">PDF only · Max 50MB · Any language</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Sparkles size={12} className="text-narrify-purple" />
                                    Supports RTL languages: Urdu, Arabic, Hebrew
                                </div>
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-4 text-center"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                                    <AlertCircle size={40} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-red-600 text-lg">Upload Failed</p>
                                    <p className="text-sm text-red-400 mt-1">{error}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); setError(null); }}
                                    className="border-red-200 text-red-600"
                                >
                                    Try Again
                                </Button>
                            </motion.div>
                        )}

                        {file && (
                            <motion.div
                                key="filled"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full max-w-md space-y-5"
                            >
                                {/* File card */}
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-md">
                                    <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center justify-center flex-shrink-0">
                                        <FileText size={28} className="text-red-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground truncate">{file.name}</p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                    {uploadProgress === 100 ? (
                                        <CheckCircle2 size={24} className="text-green-500 flex-shrink-0" />
                                    ) : isUploading ? (
                                        <div className="w-5 h-5 rounded-full border-2 border-narrify-blue border-t-transparent animate-spin flex-shrink-0" />
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); setUploadProgress(0); useNarrifyStore.getState().setFileId(null); }}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                                        >
                                            <X size={18} className="text-slate-400" />
                                        </button>
                                    )}
                                </div>

                                {/* Progress */}
                                <div className="space-y-2.5">
                                    <div className="flex justify-between text-sm font-semibold">
                                        <span className="text-muted-foreground">
                                            {isUploading ? "Uploading to server..." : uploadProgress < 100 ? "Processing..." : "✓ Upload complete"}
                                        </span>
                                        <span className={uploadProgress < 100 ? "text-narrify-blue" : "text-green-500 dark:text-green-400"}>{uploadProgress}%</span>
                                    </div>
                                    <Progress value={uploadProgress} />
                                    {uploadProgress === 100 && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1"
                                        >
                                            <CheckCircle2 size={12} /> File validated — click Next to continue
                                        </motion.p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* File requirements */}
            <div className="grid sm:grid-cols-3 gap-3">
                {[
                    { icon: FileText, label: "PDF Format", desc: "Only .pdf files accepted" },
                    { icon: FileWarning, label: "Max 50MB", desc: "Compress if larger" },
                    { icon: BookOpen, label: "Any Language", desc: "200+ langs supported" },
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-card rounded-2xl border border-border text-sm">
                        <item.icon size={16} className="text-narrify-blue flex-shrink-0" />
                        <div>
                            <span className="font-bold text-foreground">{item.label} </span>
                            <span className="text-muted-foreground">{item.desc}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Demo mode toggle */}
            <div className="flex justify-center">
                <button
                    onClick={() => setShowDemo(!showDemo)}
                    className="text-sm text-narrify-blue font-bold hover:underline flex items-center gap-1.5"
                >
                    <Sparkles size={13} />
                    {showDemo ? "Hide demo samples" : "No PDF? Try a demo sample →"}
                </button>
            </div>

            <AnimatePresence>
                {showDemo && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-narrify-blue/5 to-narrify-purple/5 rounded-3xl border border-narrify-blue/10 p-6 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-narrify-blue">
                                <Info size={14} />
                                Demo Mode — No upload required
                            </div>
                            <div className="grid sm:grid-cols-3 gap-3">
                                {DEMO_PDFS.map((demo, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleDemoSelect(demo)}
                                        className="text-left p-4 bg-card rounded-2xl border border-border hover:border-narrify-blue/40 hover:shadow-md transition-all space-y-1"
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-red-500" />
                                            <span className="text-xs font-bold text-foreground truncate">{demo.name}</span>
                                        </div>
                                        <div className="flex gap-3 text-[11px] text-muted-foreground">
                                            <span>{demo.size}</span>
                                            <span>{demo.pages} pages</span>
                                        </div>
                                        <span className="inline-block text-[10px] font-black uppercase tracking-wider text-narrify-purple bg-narrify-purple/8 px-2 py-0.5 rounded-full">
                                            {demo.lang}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom action */}
            <div className="flex justify-end pt-2">
                <Button
                    size="lg"
                    variant="narrify"
                    disabled={!file || uploadProgress < 100 || isUploading}
                    onClick={() => setStep(2)}
                    className="h-14 px-10 rounded-2xl gap-2 shadow-xl shadow-narrify-blue/20 group"
                >
                    Continue to Language
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
};

export { Progress };
