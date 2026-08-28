'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

function Sk({ w = 'w-16', h = 'h-3' }) { return <div className={`skeleton rounded ${h} ${w}`} />; }
function fmtFiat(n) { return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function timeAgo(ts) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d > 1 ? 's' : ''} ago`;
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function ProfitCell({ profit }) {
  const color = profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';
  return <span className={`font-mono text-[12px] ${color}`}>{profit >= 0 ? '+' : ''}${fmtFiat(profit)}</span>;
}

const NAV = [
  { id: '/admin',          label: 'Overview',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: '/admin/users',    label: 'Users',     icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { id: '/admin/activity', label: 'Activity',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: '/admin/generations', label: 'Generations', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h7" /></svg> },
  { id: '/admin/groups',   label: 'Groups',    icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> },
  { id: '/admin/referrals',label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
];

export default function ReferralsAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccessTokenSilently, logout } = useAuth0();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [period, setPeriod] = useState('unpaid');
  const [paying, setPaying] = useState(null);

  const apiFetch = useCallback(async (url, opts = {}) => {
    const token = await getAccessTokenSilently();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers } });
  }, [getAccessTokenSilently]);

  const load = useCallback(() => {
    setLoading(true);
    setExpanded(null);
    apiFetch(`/api/admin/referrals?period=${period}`).then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false));
  }, [apiFetch, period]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (referrerId) => {
    if (paying) return;
    setPaying(referrerId);
    try {
      await apiFetch('/api/admin/referrals/payout', { method: 'POST', body: JSON.stringify({ referrerId }) });
      load();
    } finally { setPaying(null); }
  };

  const referrers = data?.referrers ?? [];
  const totalOwed = referrers.reduce((s, r) => s + r.owedToReferrer, 0);
  const totalProfit = referrers.reduce((s, r) => s + r.totalProfit, 0);

  const PERIODS = [ { key: 'unpaid', label: 'Unpaid' }, { key: '7D', label: '7D' }, { key: '30D', label: '30D' }, { key: '90D', label: '90D' }, { key: 'all', label: 'All' } ];

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
          <motion.div key="referrals" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
              <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">Referral <span className="text-[var(--accent)]">payouts</span></h1>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--fg-4)]">30% of referred users&apos; profit</span>
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                  {PERIODS.map(({ key, label }) => (
                    <button key={key} onClick={() => setPeriod(key)} className={`rounded px-3 py-1 text-[11px] transition-all ${period === key ? key === 'unpaid' ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]' : 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 flex-shrink-0">
              {[
                { label: 'Referrers', value: loading ? null : String(referrers.length), color: 'text-[var(--fg)]' },
                { label: period === 'unpaid' ? 'Unpaid profit' : 'Profit in period', value: loading ? null : `$${fmtFiat(totalProfit)}`, color: 'text-[var(--fg)]' },
                { label: period === 'unpaid' ? 'Total owed now' : 'Owed (30%)', value: loading ? null : `$${fmtFiat(totalOwed)}`, color: 'text-[#f59e0b]', border: 'border-[rgba(245,158,11,0.2)]' },
              ].map(({ label, value, color, border }) => (
                <div key={label} className={`rounded-xl border bg-[var(--surface)] px-4 py-3 surface noise ${border ?? 'border-[var(--border)]'}`}>
                  <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60">{label}</div>
                  {value != null ? <div className={`font-mono text-[20px] font-medium ${color}`}>{value}</div> : <div className="skeleton h-6 w-20 rounded" />}
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Referrers</span>
                {period === 'unpaid' && <span className="text-[10.5px] text-[var(--fg-4)]">Showing profit since each referrer&apos;s last payout</span>}
              </div>
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                {loading && Array(4).fill(null).map((_, i) => (
                  <div key={i} className="border-b border-[var(--border-faint)] px-4 py-3.5 flex gap-4"><Sk w="w-32" h="h-3.5" /><Sk w="w-48" /><Sk w="w-20" /><Sk w="w-20" /><Sk w="w-24" /></div>
                ))}
                {!loading && referrers.length === 0 && (
                  <div className="flex h-full items-center justify-center text-[12px] text-[var(--fg-4)] opacity-40">No referrals yet</div>
                )}
                {referrers.map(r => (
                  <div key={r.referrerId}>
                    <div className="flex items-center border-b border-[var(--border-faint)] hover:bg-[var(--surface-tint-faint)] transition-colors">
                      <button onClick={() => setExpanded(expanded === r.referrerId ? null : r.referrerId)} className="flex items-center gap-2 px-4 py-3.5 flex-1 min-w-0 text-left">
                        <svg viewBox="0 0 24 24" className={`h-3 w-3 flex-shrink-0 stroke-current fill-none stroke-2 text-[var(--fg-4)] transition-transform ${expanded === r.referrerId ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" /></svg>
                        <div className="min-w-0"><div className="text-[13px] font-medium text-[var(--fg)]">{r.referrerUsername}</div><div className="text-[11px] text-[var(--fg-4)]">{r.referrerEmail}</div></div>
                      </button>
                      <div className="px-4 py-3.5 w-40 text-right flex-shrink-0">
                        <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Last paid</div>
                        <div className={`text-[11.5px] ${r.lastPaidAt ? 'text-[var(--fg-3)]' : 'text-[#ef4444] opacity-60'}`}>{r.lastPaidAt ? timeAgo(r.lastPaidAt) : 'Never'}</div>
                      </div>
                      <div className="px-4 py-3.5 w-24 text-right flex-shrink-0">
                        <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Referrals</div>
                        <div className="font-mono text-[13px] text-[var(--fg-3)]">{r.referredUsers.length}</div>
                      </div>
                      <div className="px-4 py-3.5 w-32 text-right flex-shrink-0">
                        <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Profit</div>
                        <div className="font-mono text-[13px] text-[var(--fg-2)]">${fmtFiat(r.totalProfit)}</div>
                      </div>
                      <div className="px-4 py-3.5 w-32 text-right flex-shrink-0">
                        <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Owed (30%)</div>
                        <div className="font-mono text-[14px] font-medium text-[#f59e0b]">${fmtFiat(r.owedToReferrer)}</div>
                      </div>
                      <div className="px-4 py-3.5 flex-shrink-0">
                        <button onClick={() => handleMarkPaid(r.referrerId)} disabled={!!paying || r.owedToReferrer <= 0} className="flex items-center gap-1.5 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.07)] px-3 py-1.5 text-[11.5px] text-[#22c55e] transition-all hover:bg-[rgba(34,197,94,0.13)] disabled:opacity-30 disabled:cursor-not-allowed">
                          {paying === r.referrerId ? <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#22c55e]" /> : <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><polyline points="20 6 9 17 4 12" /></svg>} Mark paid
                        </button>
                      </div>
                    </div>
                    <AnimatePresence>
                      {expanded === r.referrerId && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden bg-[var(--surface-raised)]">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>{['User', 'Email', 'Profit generated', '30% owed'].map(h => <th key={h} className="px-6 py-2 text-left text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {r.referredUsers.map(u => (
                                <tr key={u.userId} className="border-b border-[var(--border-faint)] last:border-0">
                                  <td className="px-6 py-2.5 text-[12px] text-[var(--fg-2)]">{u.username}</td>
                                  <td className="px-6 py-2.5 text-[11.5px] text-[var(--fg-3)]">{u.email}</td>
                                  <td className="px-6 py-2.5"><ProfitCell profit={u.profit} /></td>
                                  <td className="px-6 py-2.5 font-mono text-[12px] text-[#f59e0b]">${fmtFiat(u.profit * 0.30)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
