'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

function Sk({ w = 'w-16', h = 'h-3' }) { return <div className={`skeleton rounded ${h} ${w}`} />; }
function fmtCredit(n) { return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

function formatFullDate(ts) {
    if (!ts) return '—';
    const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
    const d = new Date(str);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

const NAV = [
    { id: '/admin', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { id: '/admin/users', label: 'Users', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: '/admin/activity', label: 'Activity', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
    { id: '/admin/groups', label: 'Groups', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 12 12 17 22 12" /><polyline points="2 17 12 22 22 17" /></svg> },
    { id: '/admin/referrals', label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> },
];

export default function GroupsAdminPage() {
    const router = useRouter();
    const pathname = usePathname();
    const { getAccessTokenSilently, logout } = useAuth0();

    const [groups, setGroups] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const [expanded, setExpanded] = useState(null);

    const apiFetch = useCallback(async (url, opts = {}) => {
        const token = await getAccessTokenSilently();
        return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers } });
    }, [getAccessTokenSilently]);

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/admin/groups`);
            const data = await res.json();
            setGroups(data?.groups ?? []);
        } finally { setLoading(false); }
    }, [apiFetch, search, filter]);

    useEffect(() => { loadGroups(); }, [loadGroups, search, filter]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">
            {/* ══ NAVBAR ══ */}
            <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-8 z-50 nav-surface">
                <div className="flex items-center gap-4 select-none">
                    <span className="font-serif text-[20px] tracking-[-0.02em] text-[var(--accent)]">Eidolon<sup className="text-[11px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup></span>
                    <div className="h-4 w-px bg-[var(--surface-tint)]" />
                    <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#f59e0b]">Admin</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/home')} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1.5 text-[12.5px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg> Back to app
                    </button>
                    <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-all hover:border-[rgba(239,68,68,0.3)]">
                        <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[var(--fg-4)] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#ef4444]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    </button>
                </div>
            </nav>

            <div className="flex flex-1 overflow-hidden">
                {/* ══ SIDEBAR ══ */}
                <aside className="flex w-[200px] flex-shrink-0 flex-col border-r border-[var(--border-faint)] bg-[var(--surface)]">
                    <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-4)] opacity-40 select-none">Admin</div>
                    {NAV.map(n => {
                        const isActive = pathname === n.id || (n.id !== '/admin' && pathname?.startsWith(n.id));
                        return (
                            <Link key={n.id} href={n.id} className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-all ${isActive ? 'border-[var(--accent)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]' : 'border-transparent text-[var(--fg-4)] hover:bg-[var(--surface-tint-faint)] hover:text-[var(--fg-3)]'}`}>
                                {n.icon} <span className="flex-1 text-left">{n.label}</span>
                            </Link>
                        );
                    })}
                </aside>

                {/* ══ MAIN CONTENT ══ */}
                <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
                    <motion.div key="groups" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4" variants={containerVariants} initial="hidden" animate="visible">
                        <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">Platform <span className="text-[var(--accent)]">groups</span></h1>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-4)] fill-none stroke-2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search group name..." className="w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3.5 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-4)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                                </div>
                                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                                    {['all', 'active', 'empty'].map(f => (
                                        <button key={f} onClick={() => setFilter(f)} className={`rounded px-3 py-1 text-[11px] capitalize transition-all ${filter === f ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>{f}</button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            {['Group Name', 'Members', 'Owner', 'Total Spent', 'Generations', 'Created', 'Last Active', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && Array(6).fill(null).map((_, i) => (
                                            <tr key={i} className="border-b border-[var(--border-faint)]">
                                                {[24, 10, 20, 16, 12, 16, 16, 14].map((w, j) => <td key={j} className="px-4 py-3.5"><Sk w={`w-${w}`} /></td>)}
                                            </tr>
                                        ))}
                                        {!loading && (groups ?? []).length === 0 && (
                                            <tr><td colSpan={8} className="px-4 py-10 text-center text-[12px] text-[var(--fg-4)] opacity-40">No groups found</td></tr>
                                        )}
                                        {(groups ?? []).map(g => (
                                            <Fragment key={g.id}>
                                                <tr
                                                    onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                                                    className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors cursor-pointer"
                                                >
                                                    <td className="px-4 py-3.5 flex items-center gap-3">
                                                        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 flex-shrink-0 stroke-current fill-none stroke-2 text-[var(--fg-4)] transition-transform ${expanded === g.id ? 'rotate-90' : ''}`}>
                                                            <polyline points="9 18 15 12 9 6" />
                                                        </svg>
                                                        <div>
                                                            <div className="text-[13px] font-medium text-[var(--fg)]">{g.name}</div>
                                                            <div className="text-[11px] text-[var(--fg-4)] opacity-60">Code: {g.invite_code}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-deep)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--fg-3)]">
                                                            {g.memberCount ?? 0}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5"><div className="text-[12px] text-[var(--fg-2)]">{g.owner_username}</div></td>
                                                    <td className="px-4 py-3.5 font-mono text-[12.5px] text-[var(--fg-3)]"><span className="inline-flex items-center gap-1.5">{fmtCredit(g.totalSpent)} <CreditIcon size={11} color="#9898a8" /></span></td>
                                                    <td className="px-4 py-3.5 text-[12.5px] text-[var(--fg-3)]">{g.totalGenerations}</td>
                                                    <td className="px-4 py-3.5 text-[12px] text-[var(--fg-3)]">{formatFullDate(g.created_at)}</td>
                                                    <td className="px-4 py-3.5 text-[12px] text-[var(--fg-3)]">{formatFullDate(g.last_login)}</td>
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${g.isActive ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>
                                                            <div className="h-[5px] w-[5px] rounded-full bg-current" />{g.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </tr>

                                                <AnimatePresence>
                                                    {expanded === g.id && (
                                                        <tr>
                                                            <td colSpan={8} className="p-0 border-b border-[var(--border-faint)]">
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                                                    className="overflow-hidden bg-[var(--surface-raised)]"
                                                                >
                                                                    <div className="px-12 py-4">
                                                                        <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60 mb-2">Group Members</div>
                                                                        {(!g.members || g.members.length === 0) ? (
                                                                            <div className="text-[12px] text-[var(--fg-4)]">No members in this group yet.</div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {g.members.map(m => (
                                                                                    <div key={m.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                                                                                        <div className="h-6 w-6 rounded-full bg-[var(--surface-deep)] flex items-center justify-center text-[10px] text-[var(--fg-3)] font-medium">
                                                                                            {m.username.charAt(0).toUpperCase()}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <div className="text-[12px] font-medium text-[var(--fg)] truncate">{m.username} {m.username === g.owner_username && <span className="text-[10px] text-[#f59e0b] ml-1">(Owner)</span>}</div>
                                                                                            <div className="text-[10.5px] text-[var(--fg-4)] truncate">{m.email}</div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </AnimatePresence>
                                            </Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
