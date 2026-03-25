"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { adminApi, AdminStats, AdminUser, AdminBook } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
    LayoutDashboard, Users, BookOpen, Trash2, Shield, ShieldOff,
    RefreshCw, Search, CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'books';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
        processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
        uploaded: { label: 'Uploaded', className: 'bg-slate-100 text-slate-600' },
        failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
    };
    const s = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
    return (
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.className)}>
            {s.label}
        </span>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-start gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: AdminStats | null }) {
    if (!stats) return <SkeletonGrid />;

    const { users, books, recent_books } = stats;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={users.total} sub={`+${users.new_last_7_days} this week`} color="bg-narrify-blue" />
                <StatCard icon={BookOpen} label="Total Audiobooks" value={books.total} color="bg-violet-500" />
                <StatCard icon={CheckCircle} label="Completed" value={books.by_status.completed ?? 0} color="bg-green-500" />
                <StatCard icon={Clock} label="Minutes Generated" value={`${books.total_minutes_generated}m`} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={AlertTriangle} label="Failed" value={books.by_status.failed ?? 0} color="bg-red-500" />
                <StatCard icon={RefreshCw} label="Processing" value={books.by_status.processing ?? 0} color="bg-blue-400" />
                <StatCard icon={Users} label="New Users (30d)" value={users.new_last_30_days} color="bg-teal-500" />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Audiobooks</h3>
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Title', 'User', 'Status', 'Duration', 'Created'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {recent_books.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{b.title}</td>
                                    <td className="px-4 py-3 text-slate-500">{b.username}</td>
                                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                                    <td className="px-4 py-3 text-slate-500">{b.total_duration ? `${Math.round(b.total_duration / 60)}m` : '—'}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [count, setCount] = useState(0);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.getUsers({ search: search || undefined });
            setUsers(res.results);
            setCount(res.count);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const toggleActive = async (user: AdminUser) => {
        setActionLoading(user.id);
        try {
            const updated = await adminApi.updateUser(user.id, { is_active: !user.is_active });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } finally {
            setActionLoading(null);
        }
    };

    const toggleStaff = async (user: AdminUser) => {
        setActionLoading(user.id);
        try {
            const updated = await adminApi.updateUser(user.id, { is_staff: !user.is_staff });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } finally {
            setActionLoading(null);
        }
    };

    const deleteUser = async (user: AdminUser) => {
        if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
        setActionLoading(user.id);
        try {
            await adminApi.deleteUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setCount((c) => c - 1);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30"
                    />
                </div>
                <span className="text-sm text-slate-400">{count} users</span>
            </div>

            {loading ? (
                <SkeletonTable rows={5} cols={6} />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['User', 'Email', 'Plan', 'Books', 'Status', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{user.username}</div>
                                        {user.is_staff && (
                                            <span className="text-xs text-narrify-blue font-medium">Admin</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 capitalize">
                                            {user.subscription_plan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{user.audiobook_count}</td>
                                    <td className="px-4 py-3">
                                        {user.is_active
                                            ? <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Active</span>
                                            : <span className="text-red-500 text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Disabled</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-7 h-7 text-slate-400 hover:text-narrify-blue"
                                                title={user.is_active ? 'Disable user' : 'Enable user'}
                                                disabled={actionLoading === user.id}
                                                onClick={() => toggleActive(user)}
                                            >
                                                {user.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-7 h-7 text-slate-400 hover:text-violet-600"
                                                title={user.is_staff ? 'Remove admin' : 'Make admin'}
                                                disabled={actionLoading === user.id}
                                                onClick={() => toggleStaff(user)}
                                            >
                                                {user.is_staff ? <ShieldOff size={14} /> : <Shield size={14} />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="w-7 h-7 text-slate-400 hover:text-red-500"
                                                title="Delete user"
                                                disabled={actionLoading === user.id}
                                                onClick={() => deleteUser(user)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <p className="text-center py-10 text-slate-400 text-sm">No users found.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Books Tab ─────────────────────────────────────────────────────────────────

function BooksTab() {
    const [books, setBooks] = useState<AdminBook[]>([]);
    const [count, setCount] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.getBooks({
                search: search || undefined,
                status: statusFilter || undefined,
            });
            setBooks(res.results);
            setCount(res.count);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const deleteBook = async (book: AdminBook) => {
        if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
        setActionLoading(book.id);
        try {
            await adminApi.deleteBook(book.id);
            setBooks((prev) => prev.filter((b) => b.id !== book.id));
            setCount((c) => c - 1);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or user..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30 text-slate-600"
                >
                    <option value="">All statuses</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                </select>
                <span className="text-sm text-slate-400">{count} books</span>
            </div>

            {loading ? (
                <SkeletonTable rows={5} cols={6} />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                {['Title', 'Author', 'User', 'Status', 'Duration', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {books.map((book) => (
                                <tr key={book.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{book.title}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{book.author || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 text-xs">{book.username}</td>
                                    <td className="px-4 py-3"><StatusBadge status={book.status} /></td>
                                    <td className="px-4 py-3 text-slate-500">{book.total_duration ? `${Math.round(book.total_duration / 60)}m` : '—'}</td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-7 h-7 text-slate-400 hover:text-red-500"
                                            title="Delete book"
                                            disabled={actionLoading === book.id}
                                            onClick={() => deleteBook(book)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {books.length === 0 && (
                        <p className="text-center py-10 text-slate-400 text-sm">No books found.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function SkeletonGrid() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl mb-3" />
                        <div className="h-3 bg-slate-100 rounded w-24 mb-2" />
                        <div className="h-6 bg-slate-100 rounded w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="h-4 bg-slate-100 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPortalPage() {
    const router = useRouter();
    const { user, isLoading: authLoading } = useAppSelector((s) => s.auth);
    const [tab, setTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState('');

    // Client-side admin guard — middleware handles the cookie check,
    // but we also guard here to show a proper error if the Redux user is loaded
    useEffect(() => {
        if (!authLoading && user && !user.is_staff) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (!user?.is_staff) return;
        setStatsLoading(true);
        adminApi.getStats()
            .then(setStats)
            .catch(() => setStatsError('Failed to load stats.'))
            .finally(() => setStatsLoading(false));
    }, [user?.is_staff]);

    if (authLoading || !user) return null;
    if (!user.is_staff) return null;

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'books', label: 'Audiobooks', icon: BookOpen },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <Shield size={24} className="text-narrify-blue" />
                    <h1 className="text-2xl font-bold text-slate-800">Admin Portal</h1>
                </div>
                <p className="text-slate-500 text-sm">Manage users, audiobooks, and platform statistics.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-8 w-fit">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all',
                            tab === id
                                ? 'bg-white text-narrify-blue shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <Icon size={15} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {statsError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                    {statsError}
                </div>
            )}

            {tab === 'overview' && <OverviewTab stats={statsLoading ? null : stats} />}
            {tab === 'users' && <UsersTab />}
            {tab === 'books' && <BooksTab />}
        </div>
    );
}
