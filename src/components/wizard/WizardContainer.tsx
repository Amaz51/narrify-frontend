"use client";

import React from 'react';
import { useNarrifyStore } from '@/stores/useNarrifyStore';
import { Step1Upload } from './Step1Upload';
import { Step2Language } from './Step2Language';
import { Step3Speakers } from './Step3Speakers';
import { Step4Generation } from './Step4Generation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Check, Upload, Globe, Users, Headphones } from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Upload', subtitle: 'Your PDF', icon: Upload },
    { id: 2, title: 'Language', subtitle: 'Select & Translate', icon: Globe },
    { id: 3, title: 'Speakers', subtitle: 'Configure Voices', icon: Users },
    { id: 4, title: 'Generate', subtitle: 'Create Audiobook', icon: Headphones },
];

export const WizardContainer = () => {
    const { currentStep } = useNarrifyStore();

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            {/* Progress Stepper */}
            <div className="relative mb-16">
                {/* Connector line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-slate-100 -z-10 mx-12" />
                <div
                    className="absolute top-6 left-0 h-0.5 bg-gradient-to-r from-narrify-blue to-narrify-purple -z-0 mx-12 transition-all duration-700 ease-out"
                    style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - ${currentStep <= 1 ? '6rem' : currentStep >= STEPS.length ? '0' : '0'}px)` }}
                />

                <div className="flex justify-between items-start">
                    {STEPS.map((step) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-3 flex-1">
                                <div
                                    className={cn(
                                        "relative w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-400 bg-white z-10",
                                        isActive
                                            ? "border-narrify-blue text-narrify-blue shadow-lg shadow-narrify-blue/20 scale-110"
                                            : isCompleted
                                                ? "border-narrify-purple bg-narrify-purple text-white shadow-md"
                                                : "border-slate-200 text-slate-300"
                                    )}
                                >
                                    {isCompleted ? (
                                        <Check size={20} strokeWidth={3} />
                                    ) : (
                                        <step.icon size={18} />
                                    )}

                                    {isActive && (
                                        <motion.div
                                            className="absolute inset-0 rounded-2xl border-2 border-narrify-blue/30"
                                            animate={{ scale: [1, 1.3, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                        />
                                    )}
                                </div>

                                <div className="text-center hidden sm:block">
                                    <p className={cn(
                                        "text-xs font-black uppercase tracking-widest transition-colors",
                                        isActive ? "text-narrify-blue" : isCompleted ? "text-narrify-purple" : "text-slate-300"
                                    )}>
                                        {step.title}
                                    </p>
                                    <p className={cn(
                                        "text-[10px] font-medium mt-0.5 transition-colors",
                                        isActive ? "text-slate-500" : "text-slate-300"
                                    )}>
                                        {step.subtitle}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="min-h-[500px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 24, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, x: -24, filter: 'blur(4px)' }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {currentStep === 1 && <Step1Upload />}
                        {currentStep === 2 && <Step2Language />}
                        {currentStep === 3 && <Step3Speakers />}
                        {currentStep === 4 && <Step4Generation />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
