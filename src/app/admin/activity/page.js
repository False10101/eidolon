'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CreditIcon from '@/app/CreditIcon';


const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } } };

function Sk({ w = 'w-16', h = 'h-3' }) { return <div className={`skeleton rounded ${h} ${w}`} />; }
function fmtCredit(n) { return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function fmtNum(n) { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'; if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'; return String(n ?? 0); }
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

const TYPE_DOT = { note: 'bg-[var(--accent)]', transcript: 'bg-[#22c55e]', exam_prep: 'bg-[#f59e0b]', audio_convert: 'bg-[#a78bfa]', topup: 'bg-[#a78bfa]', rebate: 'bg-[#3b82f6]' };
const TYPE_LABEL = { note: 'Note', transcript: 'Transcript', exam_prep: 'Exam prep', audio_convert: 'Converter', topup: 'Top-up', rebate: 'Rebate' };

function StatusPill({ status }) {
  const map = { completed: 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]', pending: 'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]', failed: 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]' };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] capitalize ${map[status] ?? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>{status}</span>;
}

function BarChart({ data }) {
  if (!data?.length) return <div className="flex h-[140px] items-center justify-center text-[12px] text-[var(--fg-4)] opacity-40">No data for this period</div>;
  const max = Math.max(...data.flatMap(d => [d.notes ?? 0, d.transcripts ?? 0, d.examPrep ?? 0]), 1);
  const H = 100, W = 780, pad = 40, bw = 8, gap = 3, groupW = (W - pad) / data.length;
  const yTicks = [0, 0.33, 0.66, 1].map(f => ({ f, val: Math.round(f * max) }));

  return (
    <svg viewBox={`0 0 ${W + 10} ${H + 30}`} className="w-full overflow-visible">
      {yTicks.map(({ f, val }, i) => (
        <g key={i}>
          <line x1={pad} y1={H - f * H} x2={W} y2={H - f * H} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <text x={pad - 6} y={H - f * H + 3.5} textAnchor="end" fill="#6b6b7a" fontSize="8.5" opacity=".55" fontFamily="Geist, sans-serif">{val}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = pad + i * groupW + groupW / 2;
        const nh = ((d.notes ?? 0) / max) * H, th = ((d.transcripts ?? 0) / max) * H, eh = ((d.examPrep ?? 0) / max) * H;
        const total = bw * 3 + gap * 2, x0 = cx - total / 2;
        return (
          <g key={i}>
            <rect x={x0} y={H - nh} width={bw} height={Math.max(nh, 1)} fill="#00d4c8" opacity=".75" rx="2" />
            <rect x={x0 + bw + gap} y={H - th} width={bw} height={Math.max(th, 1)} fill="#22c55e" opacity=".75" rx="2" />
            <rect x={x0 + (bw + gap) * 2} y={H - eh} width={bw} height={Math.max(eh, 1)} fill="#f59e0b" opacity=".75" rx="2" />
            <text x={x0 + bw / 2} y={H - nh - 4} textAnchor="middle" fill="#00d4c8" fontSize="7.5" opacity=".8">{d.notes}</text>
            <text x={x0 + bw + gap + bw / 2} y={H - th - 4} textAnchor="middle" fill="#22c55e" fontSize="7.5" opacity=".8">{d.transcripts}</text>
            <text x={x0 + (bw + gap) * 2 + bw / 2} y={H - eh - 4} textAnchor="middle" fill="#f59e0b" fontSize="7.5" opacity=".8">{d.examPrep}</text>
            {data.length <= 14 && <text x={cx} y={H + 16} textAnchor="middle" fill="#6b6b7a" fontSize="9" opacity=".6">{new Date(d.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</text>}
          </g>
        );
      })}
    </svg>
  );
}

const NAV = [
  { id: '/admin',          label: 'Overview',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
  { id: '/admin/users',    label: 'Users',     icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { id: '/admin/activity', label: 'Activity',  icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { id: '/admin/generations', label: 'Generations', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5M8 17h7" /></svg> },
  { id: '/admin/groups',   label: 'Groups',    icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg> },
  { id: '/admin/referrals',label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
];

export default function ActivityAdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { getAccessTokenSilently, logout } = useAuth0();
  
  const [period, setPeriod] = useState('30D');
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(false);

  const apiFetch = useCallback(async (url, opts = {}) => {
    const token = await getAccessTokenSilently();
    return fetch(url, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers } });
  }, [getAccessTokenSilently]);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/activity?period=${period}`);
      setActivity(await res.json());
    } finally { setLoading(false); }
  }, [apiFetch, period]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const PERIODS = ['7D', '30D', '90D', 'all'];

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
          <motion.div key="activity" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4" variants={containerVariants} initial="hidden" animate="visible">
            <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
              <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">Platform <span className="text-[var(--accent)]">activity</span></h1>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className={`rounded px-3 py-1 text-[11px] uppercase transition-all ${period === p ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>{p}</button>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 flex-shrink-0">
              {[
                { label: 'Notes generated',  val: fmtNum(activity?.stats?.notes ?? 0),       bar: 'var(--accent)' },
                { label: 'Transcriptions',   val: fmtNum(activity?.stats?.transcripts ?? 0),  bar: '#22c55e' },
                { label: 'Exam preps',       val: fmtNum(activity?.stats?.examPrep ?? 0),     bar: '#f59e0b' },
              ].map(({ label, val, bar }) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 surface noise">
                  <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60">{label}</div>
                  {loading ? <div className="skeleton h-6 w-16 rounded" /> : <div className="font-mono text-[22px] font-medium text-[var(--fg)]">{val}</div>}
                  <div className="mt-2.5 h-[2px] rounded-full overflow-hidden bg-[var(--surface-deep)]"><div className="h-full rounded-full" style={{ width: '60%', background: bar }} /></div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface flex-shrink-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Generation activity</span>
                <div className="flex items-center gap-4">
                  {[['#00d4c8', 'Notes'], ['#22c55e', 'Transcripts'], ['#f59e0b', 'Exam prep']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ background: color }} /><span className="text-[10.5px] text-[var(--fg-4)]">{label}</span></div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-3">
                {loading ? <div className="skeleton h-[140px] w-full rounded" /> : <BarChart data={activity?.chartData} />}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
              <div className="px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0"><span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Activity log</span></div>
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>{['Type', 'Title', 'User', 'Cost', 'Status', 'Time'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {loading && Array(8).fill(null).map((_, i) => (
                      <tr key={i} className="border-b border-[var(--border-faint)]">
                        {[20, 24, 20, 14, 16, 12].map((w, j) => <td key={j} className="px-4 py-2.5"><Sk w={`w-${w}`} /></td>)}
                      </tr>
                    ))}
                    {(activity?.activity ?? []).map(a => (
                      <tr key={a.id} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-2 text-[11.5px] text-[var(--fg-3)]"><div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[var(--fg-4)]'}`} />{TYPE_LABEL[a.type] ?? a.type}</div></td>
                        <td className="max-w-[240px] truncate px-4 py-2.5 text-[11.5px] text-[var(--fg-2)]">{a.title}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--fg-4)]">{a.username}</td>
                        <td className="px-4 py-2.5 font-mono text-[11.5px] text-[var(--fg-3)] inline-flex items-center gap-1.5">{fmtCredit(a.chargeAmount)} <CreditIcon size={11} color="#9898a8" /></td>
                        <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                        <td className="px-4 py-2.5 text-[11px] text-[var(--fg-4)]">{timeAgo(a.createdAt)}</td>
                      </tr>
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
