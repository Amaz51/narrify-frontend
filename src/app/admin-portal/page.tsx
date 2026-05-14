"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { adminApi, AdminStats, AdminUser, AdminBook, EvaluationResult, EvaluationRequest } from '@/lib/api/admin';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import {
    LayoutDashboard, Users, BookOpen, Trash2, Shield, ShieldOff,
    RefreshCw, Search, CheckCircle, XCircle, Clock, AlertTriangle,
    ChevronLeft, ChevronRight, Activity, PlayCircle, Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'books' | 'evaluations';
const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
        processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700 animate-pulse' },
        uploaded:   { label: 'Uploaded',   className: 'bg-slate-100 text-slate-600' },
        failed:     { label: 'Failed',     className: 'bg-red-100 text-red-700' },
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
        <div className="bg-card rounded-2xl border border-border p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
                <Icon size={22} className="text-white" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
                {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }: {
    page: number; totalPages: number; onChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost" size="icon"
                    className="w-8 h-8 rounded-lg"
                    disabled={page === 1}
                    onClick={() => onChange(page - 1)}
                >
                    <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p = start + i;
                    if (p > totalPages) return null;
                    return (
                        <button
                            key={p}
                            onClick={() => onChange(p)}
                            className={cn(
                                'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                                p === page
                                    ? 'bg-narrify-blue text-white'
                                    : 'hover:bg-accent text-muted-foreground'
                            )}
                        >
                            {p}
                        </button>
                    );
                })}
                <Button
                    variant="ghost" size="icon"
                    className="w-8 h-8 rounded-lg"
                    disabled={page === totalPages}
                    onClick={() => onChange(page + 1)}
                >
                    <ChevronRight size={14} />
                </Button>
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
                <StatCard icon={Users}        label="Total Users"        value={users.total}                      sub={`+${users.new_last_7_days} this week`} color="bg-narrify-blue" />
                <StatCard icon={BookOpen}     label="Total Audiobooks"   value={books.total}                      color="bg-violet-500" />
                <StatCard icon={CheckCircle}  label="Completed"          value={books.by_status.completed ?? 0}   color="bg-green-500" />
                <StatCard icon={Clock}        label="Minutes Generated"  value={`${books.total_minutes_generated}m`} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={AlertTriangle} label="Failed"           value={books.by_status.failed ?? 0}     color="bg-red-500" />
                <StatCard icon={RefreshCw}     label="Processing"       value={books.by_status.processing ?? 0} color="bg-blue-400" />
                <StatCard icon={Users}         label="New Users (30d)"  value={users.new_last_30_days}          color="bg-teal-500" />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Audiobooks</h3>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-accent/50 border-b border-border">
                            <tr>
                                {['Title', 'User', 'Status', 'Duration', 'Created'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {recent_books.map((b) => (
                                <tr key={b.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{b.title}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{b.username}</td>
                                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                                    <td className="px-4 py-3 text-muted-foreground">{b.total_duration ? `${Math.round(b.total_duration / 60)}m` : '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground/60 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
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
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const totalPages = Math.ceil(count / PAGE_SIZE);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.getUsers({
                search: search || undefined,
                page,
                page_size: PAGE_SIZE,
            });
            setUsers(res.results);
            setCount(res.count);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [search, page]);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [search]);

    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    const toggleActive = async (user: AdminUser) => {
        setActionLoading(user.id);
        try {
            const updated = await adminApi.updateUser(user.id, { is_active: !user.is_active });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } finally { setActionLoading(null); }
    };

    const toggleStaff = async (user: AdminUser) => {
        setActionLoading(user.id);
        try {
            const updated = await adminApi.updateUser(user.id, { is_staff: !user.is_staff });
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        } finally { setActionLoading(null); }
    };

    const deleteUser = async (user: AdminUser) => {
        if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
        setActionLoading(user.id);
        try {
            await adminApi.deleteUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setCount((c) => c - 1);
        } finally { setActionLoading(null); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search users by name or email..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30 text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <span className="text-sm text-muted-foreground">{count} users</span>
            </div>

            {loading ? (
                <SkeletonTable rows={PAGE_SIZE} cols={6} />
            ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-accent/50 border-b border-border">
                            <tr>
                                {['User', 'Email', 'Plan', 'Books', 'Status', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-foreground">{user.username}</div>
                                        {user.is_staff && (
                                            <span className="text-xs text-narrify-blue font-medium">Admin</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-accent rounded-full text-xs text-muted-foreground capitalize">
                                            {user.subscription_plan}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">{user.audiobook_count}</td>
                                    <td className="px-4 py-3">
                                        {user.is_active
                                            ? <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckCircle size={12} /> Active</span>
                                            : <span className="text-red-500 text-xs font-medium flex items-center gap-1"><XCircle size={12} /> Disabled</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-narrify-blue"
                                                title={user.is_active ? 'Disable user' : 'Enable user'}
                                                disabled={actionLoading === user.id} onClick={() => toggleActive(user)}>
                                                {user.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-violet-600"
                                                title={user.is_staff ? 'Remove admin' : 'Make admin'}
                                                disabled={actionLoading === user.id} onClick={() => toggleStaff(user)}>
                                                {user.is_staff ? <ShieldOff size={14} /> : <Shield size={14} />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-500"
                                                title="Delete user"
                                                disabled={actionLoading === user.id} onClick={() => deleteUser(user)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && (
                        <p className="text-center py-10 text-muted-foreground text-sm">No users found.</p>
                    )}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}
        </div>
    );
}

// ─── Books Tab ─────────────────────────────────────────────────────────────────

function BooksTab({ onEvaluate }: { onEvaluate: (book: AdminBook) => void }) {
    const [books, setBooks] = useState<AdminBook[]>([]);
    const [count, setCount] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [evaluatingId, setEvaluatingId] = useState<number | null>(null);

    const totalPages = Math.ceil(count / PAGE_SIZE);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.getBooks({
                search: search || undefined,
                status: statusFilter || undefined,
                page,
                page_size: PAGE_SIZE,
            });
            setBooks(res.results);
            setCount(res.count);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, page]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [search, statusFilter]);

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
        } finally { setActionLoading(null); }
    };

    const handleEvaluate = async (book: AdminBook) => {
        setEvaluatingId(book.id);
        try {
            await onEvaluate(book);
        } finally {
            setEvaluatingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title or user..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30 text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-narrify-blue/30 text-foreground"
                >
                    <option value="">All statuses</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                </select>
                <span className="text-sm text-muted-foreground">{count} books</span>
            </div>

            {loading ? (
                <SkeletonTable rows={PAGE_SIZE} cols={6} />
            ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-accent/50 border-b border-border">
                            <tr>
                                {['Title', 'Author', 'User', 'Status', 'Duration', 'Actions'].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {books.map((book) => (
                                <tr key={book.id} className="hover:bg-accent/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{book.title}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{book.author || '—'}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">{book.username}</td>
                                    <td className="px-4 py-3"><StatusBadge status={book.status} /></td>
                                    <td className="px-4 py-3 text-muted-foreground">{book.total_duration ? `${Math.round(book.total_duration / 60)}m` : '—'}</td>
                                    <td className="px-4 py-3 flex items-center gap-1">
                                        {book.status === 'completed' && (
                                            <Button
                                                variant="ghost" size="icon"
                                                className="w-7 h-7 text-muted-foreground hover:text-narrify-blue"
                                                title="Run voice evaluation"
                                                disabled={evaluatingId === book.id}
                                                onClick={() => handleEvaluate(book)}
                                            >
                                                {evaluatingId === book.id
                                                    ? <Loader2 size={14} className="animate-spin" />
                                                    : <Activity size={14} />}
                                            </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-500"
                                            title="Delete book"
                                            disabled={actionLoading === book.id} onClick={() => deleteBook(book)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {books.length === 0 && (
                        <p className="text-center py-10 text-muted-foreground text-sm">No books found.</p>
                    )}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}
        </div>
    );
}

// ─── Evaluations Tab ──────────────────────────────────────────────────────────

function ScorePill({ value, low, high, fmt }: {
    value: number | null | boolean;
    low?: number;
    high?: number;
    fmt?: (v: number) => string;
}) {
    if (value === null || value === undefined) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }
    if (typeof value === 'boolean') {
        return (
            <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
            )}>
                {value ? <CheckCircle size={11} /> : <XCircle size={11} />}
                {value ? 'Match' : 'Mismatch'}
            </span>
        );
    }
    const num = value as number;
    let color = 'bg-slate-100 text-slate-600';
    if (low !== undefined && high !== undefined) {
        if (num >= high) color = 'bg-green-100 text-green-700';
        else if (num >= low) color = 'bg-yellow-100 text-yellow-700';
        else color = 'bg-red-100 text-red-600';
    }
    const label = fmt ? fmt(num) : num.toFixed(2);
    return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>{label}</span>;
}

function OverallScoreBadge({ score }: { score: number | null }) {
    if (score === null) return <span className="text-muted-foreground text-xs">—</span>;
    const color = score >= 70 ? 'text-green-600' : score >= 45 ? 'text-yellow-600' : 'text-red-500';
    return <span className={cn('text-lg font-bold', color)}>{score.toFixed(1)}</span>;
}

function EvaluationsTab({ refreshSignal }: { refreshSignal: number }) {
    const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<EvaluationResult | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const PAGE = 15;
    const totalPages = Math.ceil(count / PAGE);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminApi.getEvaluations({ page, page_size: PAGE });
            setEvaluations(res.results);
            setCount(res.count);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { load(); }, [load, refreshSignal]);

    const deleteEval = async (id: number) => {
        if (!confirm('Delete this evaluation record?')) return;
        setDeletingId(id);
        try {
            await adminApi.deleteEvaluation(id);
            setEvaluations((prev) => prev.filter((e) => e.id !== id));
            setCount((c) => c - 1);
            if (selected?.id === id) setSelected(null);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{count} evaluation{count !== 1 ? 's' : ''}</p>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={load}>
                    <RefreshCw size={13} /> Refresh
                </Button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-accent/40 rounded-xl px-4 py-2">
                <span><span className="font-semibold text-foreground">WER</span> — lower is better (0–1)</span>
                <span><span className="font-semibold text-foreground">UTMOS</span> — naturalness 1–5</span>
                <span><span className="font-semibold text-foreground">SECS</span> — speaker similarity −1 to 1</span>
                <span><span className="font-semibold text-foreground">SNR</span> — audio cleanliness (dB)</span>
                <span><span className="font-semibold text-foreground">Score</span> — composite 0–100</span>
            </div>

            {loading ? (
                <SkeletonTable rows={10} cols={8} />
            ) : (
                <div className="bg-card rounded-2xl border border-border overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="bg-accent/50 border-b border-border">
                            <tr>
                                {['Book', 'Date', 'WER', 'UTMOS', 'SECS', 'SNR (dB)', 'Emotion', 'Score', ''].map((h) => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {evaluations.map((ev) => (
                                <tr
                                    key={ev.id}
                                    className={cn(
                                        'hover:bg-accent/30 transition-colors cursor-pointer',
                                        selected?.id === ev.id && 'bg-narrify-blue/5',
                                    )}
                                    onClick={() => setSelected(selected?.id === ev.id ? null : ev)}
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-foreground truncate max-w-[160px]">{ev.book_title}</p>
                                        <p className="text-xs text-muted-foreground">{ev.evaluated_by_username || 'admin'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(ev.evaluated_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <ScorePill value={ev.wer} low={0.15} high={0.05} fmt={(v) => (v * 100).toFixed(1) + '%'} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <ScorePill value={ev.utmos_score} low={2.5} high={3.5} fmt={(v) => v.toFixed(2)} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <ScorePill value={ev.secs_score} low={0.6} high={0.8} fmt={(v) => v.toFixed(3)} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <ScorePill value={ev.snr_db} low={15} high={25} fmt={(v) => v.toFixed(1)} />
                                    </td>
                                    <td className="px-4 py-3">
                                        {ev.intended_emotion && ev.detected_emotion ? (
                                            <div className="space-y-0.5">
                                                <ScorePill value={ev.emotion_match} />
                                                <p className="text-[10px] text-muted-foreground">
                                                    {ev.detected_emotion} {ev.intended_emotion ? `(target: ${ev.intended_emotion})` : ''}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {ev.detected_emotion || '—'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <OverallScoreBadge score={ev.overall_score} />
                                    </td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="ghost" size="icon"
                                            className="w-7 h-7 text-muted-foreground hover:text-red-500"
                                            title="Delete evaluation"
                                            disabled={deletingId === ev.id}
                                            onClick={() => deleteEval(ev.id)}
                                        >
                                            <Trash2 size={13} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {evaluations.length === 0 && (
                        <div className="py-16 text-center space-y-2">
                            <Activity size={32} className="mx-auto text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No evaluations yet.</p>
                            <p className="text-xs text-muted-foreground/70">
                                Go to the Audiobooks tab and click the <Activity size={12} className="inline" /> icon on a completed book.
                            </p>
                        </div>
                    )}
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
            )}

            {/* Detail panel */}
            {selected && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">{selected.book_title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Evaluated {new Date(selected.evaluated_at).toLocaleString()} by {selected.evaluated_by_username || 'admin'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground mb-1">Overall</p>
                            <OverallScoreBadge score={selected.overall_score} />
                            <p className="text-[10px] text-muted-foreground mt-0.5">/100</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            {
                                label: 'Intelligibility',
                                sub: 'Word Error Rate',
                                value: selected.wer !== null ? `${(selected.wer * 100).toFixed(1)}%` : '—',
                                note: selected.wer !== null && selected.cer !== null ? `CER: ${(selected.cer! * 100).toFixed(1)}%` : 'Provide original text to compute',
                                available: selected.wer !== null,
                                good: selected.wer !== null && selected.wer < 0.05,
                                warn: selected.wer !== null && selected.wer < 0.15,
                            },
                            {
                                label: 'Naturalness',
                                sub: 'Predicted MOS',
                                value: selected.utmos_score !== null ? selected.utmos_score.toFixed(2) : '—',
                                note: selected.utmos_method ? `via ${selected.utmos_method}` : undefined,
                                available: selected.utmos_score !== null,
                                good: selected.utmos_score !== null && selected.utmos_score >= 3.5,
                                warn: selected.utmos_score !== null && selected.utmos_score >= 2.5,
                            },
                            {
                                label: 'Speaker Sim.',
                                sub: 'SECS score',
                                value: selected.secs_score !== null ? selected.secs_score.toFixed(3) : '—',
                                note: selected.secs_score !== null ? 'Range −1 to 1' : 'Provide reference voice to compute',
                                available: selected.secs_score !== null,
                                good: selected.secs_score !== null && selected.secs_score >= 0.8,
                                warn: selected.secs_score !== null && selected.secs_score >= 0.6,
                            },
                            {
                                label: 'Audio Quality',
                                sub: 'SNR (dB)',
                                value: selected.snr_db !== null ? `${selected.snr_db.toFixed(1)} dB` : '—',
                                note: '> 20 dB is clean',
                                available: selected.snr_db !== null,
                                good: selected.snr_db !== null && selected.snr_db >= 25,
                                warn: selected.snr_db !== null && selected.snr_db >= 15,
                            },
                            {
                                label: 'Emotion',
                                sub: selected.intended_emotion ? `target: ${selected.intended_emotion}` : 'detected (no target set)',
                                value: selected.detected_emotion || '—',
                                note: selected.ser_confidence !== null
                                    ? `conf: ${(selected.ser_confidence * 100).toFixed(0)}%${selected.ser_confidence < 0.4 ? ' (low)' : ''}`
                                    : undefined,
                                available: !!selected.detected_emotion,
                                good: selected.emotion_match === true,
                                warn: selected.emotion_match === null && !!selected.detected_emotion,
                            },
                        ].map(({ label, sub, value, note, available, good, warn }) => (
                            <div
                                key={label}
                                className={cn(
                                    'rounded-xl border p-4',
                                    !available
                                        ? 'border-border bg-accent/30'
                                        : good ? 'border-green-200 bg-green-50 dark:bg-green-500/5 dark:border-green-500/20'
                                        : warn ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-500/5 dark:border-yellow-500/20'
                                        : 'border-red-200 bg-red-50 dark:bg-red-500/5 dark:border-red-500/20',
                                )}
                            >
                                <p className="text-xs font-semibold text-foreground">{label}</p>
                                <p className="text-[10px] text-muted-foreground mb-2">{sub}</p>
                                <p className="text-xl font-bold text-foreground">{value}</p>
                                {note && <p className="text-[10px] text-muted-foreground mt-1">{note}</p>}
                            </div>
                        ))}
                    </div>

                    {selected.transcribed_text && (
                        <div>
                            <p className="text-xs font-semibold text-foreground mb-1">ASR Transcript (Whisper)</p>
                            <p className="text-xs text-muted-foreground bg-accent/50 rounded-lg px-3 py-2 leading-relaxed">
                                {selected.transcribed_text}
                            </p>
                        </div>
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
                    <div key={i} className="bg-card rounded-2xl border border-border p-6 animate-pulse">
                        <div className="w-12 h-12 bg-muted rounded-xl mb-3" />
                        <div className="h-3 bg-muted rounded w-24 mb-2" />
                        <div className="h-6 bg-muted rounded w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonTable({ rows, cols }: { rows: number; cols: number }) {
    return (
        <div className="bg-card rounded-2xl border border-border p-4 animate-pulse space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="h-4 bg-muted rounded flex-1" />
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
    const [evalRefreshSignal, setEvalRefreshSignal] = useState(0);
    const [evaluatingBook, setEvaluatingBook] = useState<string | null>(null);

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

    const handleEvaluate = async (book: AdminBook) => {
        setEvaluatingBook(book.title);
        try {
            await adminApi.evaluateBook(book.id, {});
            setEvalRefreshSignal((s) => s + 1);
            setTab('evaluations');
        } catch (e: unknown) {
            const err = e as { code?: string; response?: { data?: { detail?: string } } };
            const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
            const msg = err.response?.data?.detail;
            if (isTimeout) {
                alert('Evaluation is taking longer than expected (models still loading). Wait 30 s then try again.');
            } else {
                alert(`Evaluation failed: ${msg || String(e)}`);
            }
        } finally {
            setEvaluatingBook(null);
        }
    };

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
        { id: 'users',        label: 'Users',         icon: Users },
        { id: 'books',        label: 'Audiobooks',    icon: BookOpen },
        { id: 'evaluations',  label: 'Evaluations',   icon: Activity },
    ];

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <Shield size={24} className="text-narrify-blue" />
                        <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
                    </div>
                    <p className="text-muted-foreground text-sm">Manage users, audiobooks, and platform statistics.</p>
                </div>

                {/* Evaluating toast */}
                {evaluatingBook && (
                    <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-narrify-blue/10 border border-narrify-blue/20 rounded-xl text-sm text-narrify-blue">
                        <Loader2 size={15} className="animate-spin flex-shrink-0" />
                        Running evaluation on <span className="font-medium truncate max-w-[240px]">{evaluatingBook}</span>…
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-accent p-1 rounded-xl mb-8 w-fit">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={cn(
                                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all',
                                tab === id
                                    ? 'bg-card text-narrify-blue shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {statsError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 text-sm rounded-xl border border-red-100 dark:border-red-500/20">
                        {statsError}
                    </div>
                )}

                {/* Content */}
                {tab === 'overview'    && <OverviewTab stats={statsLoading ? null : stats} />}
                {tab === 'users'       && <UsersTab />}
                {tab === 'books'       && <BooksTab onEvaluate={handleEvaluate} />}
                {tab === 'evaluations' && <EvaluationsTab refreshSignal={evalRefreshSignal} />}
            </div>
        </MainLayout>
    );
}
