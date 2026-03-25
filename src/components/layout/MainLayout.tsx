"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NarrifyLogo } from '@/assets/logo/NarrifyLogo';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard, PlusCircle, Library, Settings, Bell,
    LayoutGrid, Shield, Menu, X, LogOut,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutUser } from '@/store/slices/authSlice';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Board',     href: '/board',      icon: LayoutGrid },
    { label: 'Create',    href: '/create',     icon: PlusCircle },
    { label: 'Voices',   href: '/voices',     icon: Library },
    { label: 'Settings', href: '/settings',   icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
}

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const dispatch = useAppDispatch();
    const router = useRouter();
    const isAuthPage = pathname.startsWith('/auth');
    const { user } = useAppSelector((s) => s.auth);
    const [mobileOpen, setMobileOpen] = useState(false);

    const initials = (user?.full_name || user?.username || '?')
        .split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const isAdmin = user?.is_staff;

    // Close drawer on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);
    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (mobileOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    if (isAuthPage) return <>{children}</>;

    return (
        <div className="min-h-screen bg-background transition-colors duration-300">
            {/* ── Navbar ─────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 glassmorphism border-b border-border/60 transition-colors duration-300">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex-shrink-0 transition-opacity hover:opacity-80">
                        <NarrifyLogo />
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-0.5">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(pathname, item.href);
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "gap-2 px-4 h-9 rounded-xl font-semibold text-sm transition-all duration-200",
                                            active
                                                ? "text-narrify-blue bg-narrify-blue/8 hover:bg-narrify-blue/12"
                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                        )}
                                    >
                                        <item.icon size={16} strokeWidth={active ? 2.5 : 2} />
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}
                        {isAdmin && (
                            <Link href="/admin-portal">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "gap-2 px-4 h-9 rounded-xl font-semibold text-sm",
                                        pathname.startsWith('/admin-portal')
                                            ? "text-narrify-blue bg-narrify-blue/8"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    <Shield size={16} /> Admin
                                </Button>
                            </Link>
                        )}
                    </nav>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground rounded-xl h-9 w-9 transition-colors">
                            <Bell size={18} />
                        </Button>
                        <Link href="/settings" className="hidden md:block">
                            <div className="w-9 h-9 rounded-xl narrify-gradient flex items-center justify-center text-white text-xs font-black cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-150 shadow-md shadow-narrify-blue/20">
                                {initials}
                            </div>
                        </Link>

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label="Toggle navigation"
                        >
                            <AnimatePresence mode="wait" initial={false}>
                                {mobileOpen ? (
                                    <motion.div key="close"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <X size={22} className="text-foreground" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="open"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Menu size={22} className="text-foreground" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Mobile Drawer ───────────────────────────────────────── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        {/* Drawer */}
                        <motion.aside
                            key="drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-background border-l border-border shadow-2xl md:hidden flex flex-col"
                        >
                            {/* Drawer header */}
                            <div className="h-16 flex items-center justify-between px-5 border-b border-border flex-shrink-0">
                                <NarrifyLogo />
                                <button
                                    onClick={() => setMobileOpen(false)}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-accent transition-colors"
                                >
                                    <X size={18} className="text-muted-foreground" />
                                </button>
                            </div>

                            {/* User profile row */}
                            {user && (
                                <div className="mx-4 mt-4 p-4 rounded-2xl bg-accent/60 border border-border/50 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl narrify-gradient flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-md shadow-narrify-blue/20">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground text-sm truncate">{user.full_name || user.username}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                </div>
                            )}

                            {/* Nav items */}
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {NAV_ITEMS.map((item, i) => {
                                    const active = isActive(pathname, item.href);
                                    return (
                                        <motion.div
                                            key={item.href}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04, duration: 0.2 }}
                                        >
                                            <Link href={item.href}>
                                                <div className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200",
                                                    active
                                                        ? "bg-narrify-blue/10 text-narrify-blue"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                )}>
                                                    <item.icon size={18} strokeWidth={active ? 2.5 : 2} />
                                                    {item.label}
                                                    {active && (
                                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-narrify-blue" />
                                                    )}
                                                </div>
                                            </Link>
                                        </motion.div>
                                    );
                                })}
                                {isAdmin && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: NAV_ITEMS.length * 0.04 }}
                                    >
                                        <Link href="/admin-portal">
                                            <div className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all",
                                                pathname.startsWith('/admin-portal')
                                                    ? "bg-narrify-blue/10 text-narrify-blue"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                            )}>
                                                <Shield size={18} /> Admin Portal
                                            </div>
                                        </Link>
                                    </motion.div>
                                )}
                            </nav>

                            {/* Sign out */}
                            <div className="p-4 border-t border-border flex-shrink-0">
                                <button
                                    onClick={async () => {
                                        await dispatch(logoutUser());
                                        router.push('/auth/login');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ── Main content ─────────────────────────────────────────── */}
            <main className="container mx-auto px-4 py-8 page-enter">
                {children}
            </main>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <footer className="py-10 border-t border-border bg-background mt-16">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <NarrifyLogo className="opacity-40 grayscale" />
                    <p className="text-sm text-muted-foreground">© 2026 Narrify AI. Production Grade SaaS.</p>
                    <div className="flex gap-6 text-sm text-muted-foreground font-medium">
                        <Link href="#" className="hover:text-narrify-blue transition-colors duration-150">Privacy</Link>
                        <Link href="#" className="hover:text-narrify-blue transition-colors duration-150">Terms</Link>
                        <Link href="#" className="hover:text-narrify-blue transition-colors duration-150">Support</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
};
