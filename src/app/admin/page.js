'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreditIcon from '../CreditIcon';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

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

function fmtCredit(n) {
  return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtFiat(n) {
  return Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n ?? 0);
}

const TYPE_DOT = {
  note: 'bg-[#00d4c8]',
  transcript: 'bg-[#22c55e]',
  exam_prep: 'bg-[#f59e0b]',
  audio_convert: 'bg-[#a78bfa]',
  topup: 'bg-[#a78bfa]',
  rebate: 'bg-[#3b82f6]',
};
const TYPE_LABEL = {
  note: 'Note',
  transcript: 'Transcript',
  exam_prep: 'Exam prep',
  audio_convert: 'Converter',
  topup: 'Top-up',
  rebate: 'Rebate',
};

function Sk({ w = 'w-16', h = 'h-3' }) {
  return <div className={`skeleton rounded ${h} ${w}`} />;
}

function StatusPill({ status }) {
  const map = {
    completed: 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]',
    approved: 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]',
    pending: 'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]',
    failed: 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]',
    rejected: 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] capitalize ${map[status] ?? 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a]'}`}>
      {status}
    </span>
  );
}

function BarChart({ data }) {
  if (!data?.length) return (
    <div className="flex h-[140px] items-center justify-center text-[12px] text-[#6b6b7a] opacity-40">No data for this period</div>
  );
  const max = Math.max(...data.flatMap(d => [d.notes ?? 0, d.transcripts ?? 0, d.examPrep ?? 0]), 1);
  const H = 100, W = 780, pad = 40;
  const bw = 8, gap = 3;
  const groupW = (W - pad) / data.length;
  return (
    <svg viewBox={`0 0 ${W + 10} ${H + 30}`} className="w-full overflow-visible">
      {[0, 0.33, 0.66, 1].map((f, i) => (
        <line key={i} x1={pad} y1={H - f * H} x2={W} y2={H - f * H} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const cx = pad + i * groupW + groupW / 2;
        const nh = ((d.notes ?? 0) / max) * H;
        const th = ((d.transcripts ?? 0) / max) * H;
        const eh = ((d.examPrep ?? 0) / max) * H;
        const total = bw * 3 + gap * 2;
        const x0 = cx - total / 2;
        return (
          <g key={i}>
            <rect x={x0} y={H - nh} width={bw} height={Math.max(nh, 1)} fill="#00d4c8" opacity=".75" rx="2" />
            <rect x={x0 + bw + gap} y={H - th} width={bw} height={Math.max(th, 1)} fill="#22c55e" opacity=".75" rx="2" />
            <rect x={x0 + (bw + gap) * 2} y={H - eh} width={bw} height={Math.max(eh, 1)} fill="#f59e0b" opacity=".75" rx="2" />
            {data.length <= 14 && (
              <text x={cx} y={H + 16} textAnchor="middle" fill="#6b6b7a" fontSize="9" opacity=".6" fontFamily="Geist, sans-serif">
                {new Date(d.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { getAccessTokenSilently, logout } = useAuth0();

  const [page, setPage] = useState('overview');
  const [period, setPeriod] = useState('30D');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState(null);
  const [activity, setActivity] = useState(null);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');

  const apiFetch = useCallback(async (url, opts = {}) => {
    const token = await getAccessTokenSilently();
    return fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
    });
  }, [getAccessTokenSilently]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await apiFetch(`/api/admin/overview?period=${period}`);
      const data = await res.json();
      setOverview(data);
    } finally { setOverviewLoading(false); }
  }, [apiFetch, period]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}&filter=${userFilter}`);
      const data = await res.json();
      setUsers(data?.users ?? []);
    } finally { setUsersLoading(false); }
  }, [apiFetch, userSearch, userFilter]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await apiFetch(`/api/admin/activity?period=${period}`);
      const data = await res.json();
      setActivity(data);
    } finally { setActivityLoading(false); }
  }, [apiFetch, period]);

  useEffect(() => { if (page === 'overview') loadOverview(); }, [page, period]);
  useEffect(() => { if (page === 'users') loadUsers(); }, [page, userSearch, userFilter]);
  useEffect(() => { if (page === 'activity') loadActivity(); }, [page, period]);

  const PERIODS = ['7D', '30D', '90D', 'all'];
  const NAV = [
    {
      id: 'overview', label: 'Overview',
      icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
    },
    {
      id: 'users', label: 'Users',
      icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    },
    {
      id: 'activity', label: 'Activity',
      icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    },
  ];

  const m = overview?.metrics;
  const metricCards = [
    {
      label: 'Total users',
      value: m ? String(m.totalUsers) : null,
      sub: m ? `+${m.newThisMonth} this month` : null,
      color: 'text-[#e8e8ed]',
    },
    {
      label: 'Active this week',
      value: m ? String(m.activeThisWeek) : null,
      sub: m ? `${Math.round((m.activeThisWeek / Math.max(m.totalUsers, 1)) * 100)}% of total` : null,
      color: 'text-[#00d4c8]',
    },
    {
      label: 'Total Profit', // This is the Revenue - API Costs
      value: m ? `$${fmtFiat(m.totalProfit)}` : null,
      sub: 'Net gain after API bills',
      color: 'text-[#22c55e]',
    },
    {
      label: 'Bank Inflow', // Fresh Stripe Cash
      value: m ? `$${fmtFiat(m.bankInflow)}` : null,
      sub: 'Gross cash this month',
      color: 'text-[#9898a8]',
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] font-sans text-sm text-[#e8e8ed]">
      {/* Navbar */}
      <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#111116] px-8 z-50 nav-surface">
        <div className="flex items-center gap-4 select-none">
          <span className="font-serif text-[20px] tracking-[-0.02em] text-[#00d4c8]">
            Eidolon<sup className="text-[11px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup>
          </span>
          <div className="h-4 w-px bg-white/[0.07]" />
          <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#f59e0b]">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3.5 py-1.5 text-[12.5px] text-[#9898a8] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            Back to app
          </button>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="group flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-all hover:border-[rgba(239,68,68,0.3)]">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[#6b6b7a] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#ef4444]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[200px] flex-shrink-0 flex-col border-r border-white/[0.05] bg-[#111116]">
          <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-[0.1em] text-[#6b6b7a] opacity-40 select-none">Admin</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-all
                ${page === n.id ? 'border-[#00d4c8] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]' : 'border-transparent text-[#6b6b7a] hover:bg-white/[0.02] hover:text-[#9898a8]'}`}>
              {n.icon}
              <span className="flex-1 text-left">{n.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
          {/* ══ OVERVIEW ══ */}
          {page === 'overview' && (
            <motion.div
              key="overview"
              className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible"
            >
              {/* Header */}
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                  Platform <span className="text-[#00d4c8]">overview</span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg border border-white/[0.07] bg-[#18181f] p-1">
                    {PERIODS.map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`rounded px-3 py-1 text-[11px] uppercase transition-all ${period === p ? 'bg-[#1e1e27] text-[#e8e8ed]' : 'text-[#6b6b7a] hover:text-[#9898a8]'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={loadOverview}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] text-[#6b6b7a] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 stroke-current fill-none stroke-2 ${overviewLoading ? 'animate-spin' : ''}`}>
                      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.63-7.88" />
                    </svg>
                  </button>
                </div>
              </motion.div>

              {/* Metric cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3 flex-shrink-0">
                {metricCards.map(({ label, value, sub, color }) => (
                  <div key={label} className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-3 surface">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                    <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[#6b6b7a] opacity-60">{label}</div>
                    {value != null
                      ? <div className={`font-mono text-[22px] font-medium leading-none ${color}`}>{value}</div>
                      : <div className="skeleton h-6 w-20 rounded" />
                    }
                    <div className="mt-1 text-[11px] text-[#6b6b7a]">
                      {sub ?? <span className="skeleton h-2.5 w-24 rounded inline-block mt-1" />}
                    </div>
                  </div>
                ))}
              </motion.div>

              {/* Middle row */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface noise">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Service usage</span>
                    <span className="text-[10px] text-[#6b6b7a] opacity-50 capitalize">{period}</span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-3">
                    {(overview?.serviceUsage ?? Array(4).fill(null)).map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5 text-[11.5px]">
                          {s ? <span className="text-[#9898a8]">{s.label}</span> : <Sk w="w-24" />}
                          {s ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-[10px] text-[#6b6b7a] opacity-60">{s.detail}</span>
                              <span className="text-[10px] text-[#6b6b7a] opacity-30">·</span>
                              <span className="text-[11px] text-[#6b6b7a]">{s.count} gen.</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2"><Sk w="w-20" h="h-2" /><Sk w="w-10" /></div>
                          )}
                        </div>
                        <div className="h-[3px] rounded-full bg-[#1e1e27] overflow-hidden">
                          <div className="h-full rounded-full bg-[#00d4c8] transition-all duration-500"
                            style={{ width: `${s?.pct ?? 0}%`, opacity: s?.pct === 100 ? 1 : 0.6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface noise">
  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Service Performance</span>
    <span className="text-[10px] text-[#6b6b7a] opacity-50">Current Period</span>
  </div>
  <div className="px-4 py-3 flex flex-col gap-2">
    {/* Feature Breakdown Table-style */}
    <div className="grid grid-cols-4 px-2 mb-1 text-[9px] uppercase tracking-wider text-[#6b6b7a] opacity-50">
      <div className="col-span-1">Feature</div>
      <div className="text-right">Revenue</div>
      <div className="text-right">API Cost</div>
      <div className="text-right">Profit</div>
    </div>

    {['note', 'exam', 'transcript'].map((key) => {
      const data = overview?.revenue?.[key];
      return (
        <div key={key} className="grid grid-cols-4 items-center rounded-lg border border-white/[0.06] bg-[#18181f] px-3 py-2 text-[11.5px]">
          <span className="capitalize text-[#9898a8]">{key === 'exam' ? 'Exam Prep' : key}</span>
          <span className="text-right font-mono text-[#e8e8ed]">${fmtFiat(data?.rev)}</span>
          <span className="text-right font-mono text-[#ef4444] opacity-80">-${fmtFiat(data?.cost)}</span>
          <span className="text-right font-mono text-[#22c55e] font-medium">+${fmtFiat(data?.profit)}</span>
        </div>
      );
    })}

    <div className="h-px bg-white/[0.06] my-1" />
    
    <div className="flex items-center justify-between px-3 py-1.5 text-[11.5px]">
      <span className="text-[#6b6b7a]">Total API Expenditure</span>
      <span className="font-mono text-[#ef4444] opacity-80">-${fmtFiat(overview?.revenue?.totalCost)}</span>
    </div>
    <div className="flex items-center justify-between px-3 py-1.5 text-[11.5px] rounded-lg bg-[#00d4c8]/[0.03] border border-[#00d4c8]/[0.1]">
      <span className="text-[#00d4c8]">Net Operating Profit</span>
      <span className="font-mono font-medium text-[#00d4c8]">${fmtFiat(overview?.metrics?.totalProfit)}</span>
    </div>
  </div>
</div>
              </motion.div>

              {/* Bottom Row - Full width Recent Activity */}
              <motion.div variants={itemVariants} className="flex flex-1 min-h-0">
                <div className="flex w-full flex-col h-full overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Recent activity</span>
                    <button onClick={() => setPage('activity')} className="text-[10.5px] text-[#6b6b7a] hover:text-[#00d4c8] transition-colors">View all →</button>
                  </div>
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['Type', 'User', 'Cost', 'Status', 'Time'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[#6b6b7a] font-normal border-b border-white/[0.05] opacity-50 bg-[#111116] sticky top-0 z-10">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!overview && Array(6).fill(null).map((_, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            {[28, 20, 14, 16, 12].map((w, j) => (
                              <td key={j} className="px-4 py-2.5"><Sk w={`w-${w}`} /></td>
                            ))}
                          </tr>
                        ))}
                        {(overview?.recentActivity ?? []).map(a => (
                          <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 text-[11.5px] text-[#9898a8]">
                                <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[#6b6b7a]'}`} />
                                {TYPE_LABEL[a.type] ?? a.type}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[#6b6b7a]">{a.username}</td>
                            <td className="px-4 py-2.5 font-mono text-[11.5px] text-[#9898a8] inline-flex items-center gap-1">
                              {fmtCredit(a.chargeAmount)} <CreditIcon size={10} color="#9898a8"/>
                            </td>
                            <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                            <td className="px-4 py-2.5 text-[11px] text-[#6b6b7a]">{timeAgo(a.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ USERS ══ */}
          {page === 'users' && (
            <motion.div
              key="users"
              className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible"
            >
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                  Platform <span className="text-[#00d4c8]">users</span>
                </h1>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[#6b6b7a] fill-none stroke-2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="w-[280px] rounded-lg border border-white/[0.07] bg-[#18181f] py-2 pl-9 pr-3.5 text-[13px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                  </div>
                  <div className="flex rounded-lg border border-white/[0.07] bg-[#18181f] p-1">
                    {['all', 'active', 'inactive'].map(f => (
                      <button key={f} onClick={() => setUserFilter(f)}
                        className={`rounded px-3 py-1 text-[11px] capitalize transition-all ${userFilter === f ? 'bg-[#1e1e27] text-[#e8e8ed]' : 'text-[#6b6b7a] hover:text-[#9898a8]'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['User', 'Balance', 'Total spent', 'Generations', 'Last active', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] text-[#6b6b7a] font-normal border-b border-white/[0.07] opacity-50 bg-[#111116] sticky top-0 z-10">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading && Array(6).fill(null).map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          <td className="px-4 py-3.5"><Sk w="w-32" h="h-3.5" /></td>
                          {[16, 16, 10, 16, 14].map((w, j) => <td key={j} className="px-4 py-3.5"><Sk w={`w-${w}`} /></td>)}
                        </tr>
                      ))}
                      {!usersLoading && (users ?? []).length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#6b6b7a] opacity-40">No users found</td></tr>
                      )}
                      {(users ?? []).map(u => (
                        <tr key={u.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="text-[13px] font-medium text-[#e8e8ed]">{u.username}</div>
                            <div className="text-[11px] text-[#6b6b7a]">{u.email}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[13px] text-[#00d4c8]"><span className="inline-flex items-center gap-1.5">{fmtCredit(u.balance)} <CreditIcon size={12} color="#00d4c8"/></span></td>
                          <td className="px-4 py-3.5 font-mono text-[12.5px] text-[#9898a8]"><span className="inline-flex items-center gap-1.5">{fmtCredit(u.totalSpent)} <CreditIcon size={11} color="#9898a8"/></span></td>
                          <td className="px-4 py-3.5 text-[12.5px] text-[#9898a8]">{u.generations}</td>
                          <td className="px-4 py-3.5 text-[12.5px] text-[#9898a8]">{timeAgo(u.lastLogin)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]
                              ${u.isActive ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]' : 'border-white/[0.06] bg-[#18181f] text-[#6b6b7a]'}`}>
                              <div className="h-[5px] w-[5px] rounded-full bg-current" />
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ ACTIVITY ══ */}
          {page === 'activity' && (
            <motion.div
              key="activity"
              className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible"
            >
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                  Platform <span className="text-[#00d4c8]">activity</span>
                </h1>
                <div className="flex rounded-lg border border-white/[0.07] bg-[#18181f] p-1">
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`rounded px-3 py-1 text-[11px] uppercase transition-all ${period === p ? 'bg-[#1e1e27] text-[#e8e8ed]' : 'text-[#6b6b7a] hover:text-[#9898a8]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 flex-shrink-0">
                {[
                  { label: 'Notes generated', val: fmtNum(activity?.stats?.notes ?? 0), bar: '#00d4c8' },
                  { label: 'Transcriptions', val: fmtNum(activity?.stats?.transcripts ?? 0), bar: '#22c55e' },
                  { label: 'Exam preps', val: fmtNum(activity?.stats?.examPrep ?? 0), bar: '#f59e0b' },
                ].map(({ label, val, bar }) => (
                  <div key={label} className="rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-3 surface noise">
                    <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[#6b6b7a] opacity-60">{label}</div>
                    {activityLoading
                      ? <div className="skeleton h-6 w-16 rounded" />
                      : <div className="font-mono text-[22px] font-medium text-[#e8e8ed]">{val}</div>
                    }
                    <div className="mt-2.5 h-[2px] rounded-full overflow-hidden bg-[#1e1e27]">
                      <div className="h-full rounded-full" style={{ width: '60%', background: bar }} />
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface flex-shrink-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
                  <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Generation activity</span>
                  <div className="flex items-center gap-4">
                    {[['#00d4c8', 'Notes'], ['#22c55e', 'Transcripts'], ['#f59e0b', 'Exam prep']].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-[10.5px] text-[#6b6b7a]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3">
                  {activityLoading
                    ? <div className="skeleton h-[140px] w-full rounded" />
                    : <BarChart data={activity?.chartData} />
                  }
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                <div className="px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Activity log</span>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['Type', 'User', 'Cost', 'Status', 'Time'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[#6b6b7a] font-normal border-b border-white/[0.05] opacity-50 bg-[#111116] sticky top-0 z-10">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activityLoading && Array(8).fill(null).map((_, i) => (
                        <tr key={i} className="border-b border-white/[0.04]">
                          {[20, 20, 14, 16, 12].map((w, j) => <td key={j} className="px-4 py-2.5"><Sk w={`w-${w}`} /></td>)}
                        </tr>
                      ))}
                      {(activity?.activity ?? []).map(a => (
                        <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 text-[11.5px] text-[#9898a8]">
                              <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[#6b6b7a]'}`} />
                              {TYPE_LABEL[a.type] ?? a.type}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[#6b6b7a]">{a.username}</td>
                          <td className="px-4 py-2.5 font-mono text-[11.5px] text-[#9898a8] inline-flex items-center gap-1.5">
                            {fmtCredit(a.chargeAmount)} <CreditIcon size={11} color="#9898a8"/>
                          </td>
                          <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                          <td className="px-4 py-2.5 text-[11px] text-[#6b6b7a]">{timeAgo(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

        </main>
      </div>
    </div>
  );
}