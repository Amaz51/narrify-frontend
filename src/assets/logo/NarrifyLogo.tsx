import React from 'react';

export const NarrifyLogo: React.FC<{ className?: string, iconOnly?: boolean }> = ({ className, iconOnly }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10"
            >
                <rect width="40" height="40" rx="10" fill="url(#paint0_linear)" />
                <path
                    d="M10 20C10 18.8954 10.8954 18 12 18H28C29.1046 18 30 18.8954 30 20V25C30 26.1046 29.1046 27 28 27H12C10.8954 27 10 26.1046 10 25V20Z"
                    fill="white"
                    fillOpacity="0.2"
                />
                <rect x="13" y="14" width="14" height="2" rx="1" fill="white" />
                <rect x="13" y="10" width="8" height="2" rx="1" fill="white" />
                <path
                    d="M15 22V28"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M20 20V30"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M25 23V27"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M30 22V28"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient
                        id="paint0_linear"
                        x1="0"
                        y1="0"
                        x2="40"
                        y2="40"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop stopColor="#4F46E5" />
                        <stop offset="1" stopColor="#9333EA" />
                    </linearGradient>
                </defs>
            </svg>
            {!iconOnly && (
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Narrify
                </span>
            )}
        </div>
    );
};

export const NarrifyIcon: React.FC<{ className?: string }> = ({ className }) => {
    return <NarrifyLogo className={className} iconOnly={true} />;
};
