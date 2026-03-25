import { useEffect, useState } from 'react';

export function useDarkMode() {
    // SSR-safe: always false on server, synced from DOM on client mount
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // The inline script in layout.tsx already applied the correct class —
        // just read it instead of recalculating from localStorage
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    const toggle = () => {
        setIsDark((prev) => {
            const next = !prev;
            const root = document.documentElement;
            if (next) {
                root.classList.add('dark');
                localStorage.setItem('narrify_theme', 'dark');
            } else {
                root.classList.remove('dark');
                localStorage.setItem('narrify_theme', 'light');
            }
            return next;
        });
    };

    return { isDark, toggle };
}
