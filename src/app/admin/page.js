'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';

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

function fmtBaht(n) {
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

// ─── Skeleton cell ─────────────────────────────────────────────────────────────
function Sk({ w = 'w-16', h = 'h-3' }) {
  return <div className={`skeleton rounded ${h} ${w}`} />;
}

// ─── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, loadingLabel, danger = true, loading, onConfirm, onCancel, children }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={loading ? undefined : onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        className={`mx-4 w-full max-w-sm overflow-hidden rounded-2xl border bg-[#111116] shadow-2xl shadow-black/80 surface
          ${danger ? 'border-[rgba(239,68,68,0.18)]' : 'border-[rgba(34,197,94,0.18)]'}`}>
        <div className={`px-6 py-5 border-b border-white/[0.07] ${danger ? 'bg-[rgba(239,68,68,0.04)]' : 'bg-[rgba(34,197,94,0.04)]'}`}>
          <div className="text-[15px] font-medium text-[#e8e8ed]">{title}</div>
          <div className="mt-0.5 text-[12px] text-[#6b6b7a]">{message}</div>
        </div>

        {/* 👇 2. Render the children right here above the buttons! */}
        {children}

        <div className="flex gap-2 px-6 py-4">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] text-[#9898a8] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed] disabled:opacity-40">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-[13px] font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed
              ${danger
                ? 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.14)]'
                : 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.08)] text-[#22c55e] hover:bg-[rgba(34,197,94,0.14)]'}`}>
            {loading && <div className={`h-3.5 w-3.5 animate-spin rounded-full border border-transparent ${danger ? 'border-t-[#ef4444]' : 'border-t-[#22c55e]'}`} />}
            {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
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

function SecureAdminImage({ slipPath }) {
  const { getAccessTokenSilently } = useAuth0();
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slipPath) return;

    let objectUrl;
    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/admin/topups/slips?path=${encodeURIComponent(slipPath)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          setImgUrl(objectUrl);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Image fetch error", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [slipPath, getAccessTokenSilently]);

  if (loading) {
    return (
      <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-lg bg-[#1e1e27]/50 animate-pulse">
        <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-[#6b6b7a] fill-none stroke-[1.2] animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
      </div>
    );
  }

  if (error || !imgUrl) {
    return (
      <div className="flex h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.1)]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-[#ef4444] fill-none stroke-[1.2] opacity-60"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
        <span className="text-[10px] text-[#ef4444] opacity-80">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt="Payment slip"
      className="max-h-[180px] rounded-lg object-contain"
    />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { getAccessTokenSilently, logout } = useAuth0();

  const [page, setPage] = useState('overview');
  const [period, setPeriod] = useState('30D');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState(null);
  const [topups, setTopups] = useState(null);
  const [activity, setActivity] = useState(null);

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [topupsLoading, setTopupsLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [topupFilter, setTopupFilter] = useState('all');
  const [selectedTopup, setSelectedTopup] = useState(null);

  const [confirmApprove, setConfirmApprove] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [manualAmount, setManualAmount] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [pendingCount, setPendingCount] = useState(null);


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
      setPendingCount(data?.metrics?.pendingTopups ?? 0);
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

  const loadTopups = useCallback(async () => {
    setTopupsLoading(true);
    try {
      const res = await apiFetch(`/api/admin/topups?status=${topupFilter}`);
      const data = await res.json();
      setTopups(data?.topups ?? []);
      setPendingCount(prev => data?.topups?.filter(t => t.status === 'pending').length ?? prev);
    } finally { setTopupsLoading(false); }
  }, [apiFetch, topupFilter]);

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
  useEffect(() => { if (page === 'topups') loadTopups(); }, [page, topupFilter]);
  useEffect(() => { if (page === 'activity') loadActivity(); }, [page, period]);

  useEffect(() => {
    apiFetch('/api/admin/topups?status=pending')
      .then(r => r.json())
      .then(d => setPendingCount(d?.topups?.length ?? 0))
      .catch(() => { });
  }, []);

  const handleApprove = async () => {
    if (!confirmApprove || approving) return;

    if (confirmApprove.verifiedBy === 'manual' && (!manualAmount || parseFloat(manualAmount) <= 0)) {
      alert("Please enter a valid top-up amount.");
      return;
    }

    setApproving(true);
    try {
      await apiFetch('/api/admin/topups/approve', { method: 'POST', body: JSON.stringify({ topupId: confirmApprove.id, manualAmount: manualAmount }) });
      setConfirmApprove(null);
      setManualAmount('');
      setSelectedTopup(null);
      loadTopups();
      if (page === 'overview') loadOverview();
    } finally { setApproving(false); }
  };

  const handleReject = async () => {
    if (!confirmReject || rejecting) return;
    setRejecting(true);
    try {
      await apiFetch('/api/admin/topups/reject', { method: 'POST', body: JSON.stringify({ topupId: confirmReject.id }) });
      setConfirmReject(null);
      setSelectedTopup(null);
      loadTopups();
      if (page === 'overview') loadOverview();
    } finally { setRejecting(false); }
  };

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
      id: 'topups', label: 'Top-ups', badge: pendingCount,
      icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M12 5v14M5 12l7-7 7 7" /></svg>
    },
    {
      id: 'activity', label: 'Activity',
      icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
    },
  ];

  // ── Safe metric values — never touch undefined ──────────────────────────────
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
      label: 'Revenue this month',
      value: m ? `฿ ${fmtBaht(m.revenueThisMonth)}` : null,
      sub: 'charged to users',
      color: 'text-[#22c55e]',
    },
    {
      label: 'Pending top-ups',
      value: m ? String(m.pendingTopups) : null,
      sub: 'awaiting review',
      color: 'text-[#f59e0b]',
      action: () => setPage('topups'),
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] font-sans text-sm text-[#e8e8ed]">

      <AnimatePresence>
        {confirmApprove && (
          <ConfirmModal
            title={confirmApprove.verifiedBy === 'manual' ? 'Approve manual slip?' : `Approve ฿ ${fmtBaht(confirmApprove.amount)}?`}
            message={`This will credit the balance for ${confirmApprove.username}. This cannot be undone.`}
            confirmLabel="Approve" loadingLabel="Approving…"
            danger={false} loading={approving}
            onConfirm={handleApprove}
            onCancel={() => {
              if (!approving) {
                setConfirmApprove(null);
                setManualAmount('');
              }
            }}
          >
            {/* 🛑 If it's a manual slip, show the input field! */}
            {confirmApprove.verifiedBy === 'manual' && (
              <div className="px-6 py-4 border-b border-white/[0.07] bg-[#111116]">
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-[#6b6b7a]">
                  Verified Amount (฿)
                </label>
                <input
                  type="number"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#18181f] px-3 py-2.5 text-[14px] text-[#e8e8ed] outline-none transition-colors focus:border-[#00d4c8]"
                  autoFocus
                />
              </div>
            )}
          </ConfirmModal>
        )}
        {confirmReject && (
          <ConfirmModal
            title="Reject top-up?"
            message={`The top-up of ฿ ${fmtBaht(confirmReject.amount)} for ${confirmReject.username} will be rejected.`}
            confirmLabel="Reject" loadingLabel="Rejecting…"
            danger loading={rejecting}
            onConfirm={handleReject}
            onCancel={() => { if (!rejecting) setConfirmReject(null); }}
          />
        )}
      </AnimatePresence>

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
              {n.badge > 0 && (
                <span className="rounded-full bg-[#f59e0b] px-1.5 py-px font-mono text-[10px] font-semibold text-[#0c0c0e]">{n.badge}</span>
              )}
            </button>
          ))}
        </aside>

        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">

          {/* ══ OVERVIEW ══ */}
          {page === 'overview' && (
            <motion.div
              key="overview"
              // Changed to flex flex-col and overflow-hidden to lock container height
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

              {/* Metric cards (Shrunk padding) */}
              <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3 flex-shrink-0">
                {metricCards.map(({ label, value, sub, color, action }) => (
                  <div key={label} onClick={action}
                    className={`relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-3 surface ${action ? 'cursor-pointer hover:border-white/[0.14]' : ''}`}>
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

              {/* Middle row (Shrunk padding & gaps) */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 flex-shrink-0">

                {/* Service usage */}
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

                {/* Revenue breakdown */}
                <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface noise">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Revenue breakdown</span>
                    <span className="text-[10px] text-[#6b6b7a] opacity-50">This month</span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-1.5">
                    {[
                      { label: 'Notes charged', val: overview?.revenue?.notes },
                      { label: 'Transcription', val: overview?.revenue?.transcript },
                      { label: 'Exam prep', val: overview?.revenue?.examPrep },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#18181f] px-3 py-1.5 text-[11.5px]">
                        <span className="text-[#6b6b7a]">{label}</span>
                        {val != null ? <span className="font-mono text-[11.5px] text-[#9898a8]">฿ {fmtBaht(val)}</span> : <Sk w="w-14" />}
                      </div>
                    ))}
                    <div className="h-px bg-white/[0.06] my-0.5" />
                    {[
                      { label: 'Total charged', val: overview?.revenue?.total, color: 'text-[#00d4c8]' },
                      { label: 'Balance in circ.', val: overview?.revenue?.circulation, color: 'text-[#22c55e]' },
                      { label: 'All-time top-ups', val: overview?.revenue?.allTimeTopups, color: 'text-[#9898a8]' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#18181f] px-3 py-1.5 text-[11.5px]">
                        <span className="text-[#6b6b7a]">{label}</span>
                        {val != null ? <span className={`font-mono font-medium text-[11.5px] ${color}`}>฿ {fmtBaht(val)}</span> : <Sk w="w-16" />}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Bottom row (Flex 1 allows it to take remaining space, overflow handles the rest) */}
              <motion.div variants={itemVariants} className="grid flex-1 min-h-0 gap-3" style={{ gridTemplateColumns: '1fr 320px' }}>

                {/* Recent activity (Internal scrolling) */}
                <div className="flex flex-col h-full overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
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
                            <td className="px-4 py-2.5 font-mono text-[11.5px] text-[#9898a8]">฿ {fmtBaht(a.chargeAmount)}</td>
                            <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                            <td className="px-4 py-2.5 text-[11px] text-[#6b6b7a]">{timeAgo(a.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pending queue (Internal scrolling) */}
                <div className="flex flex-col h-full overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Pending top-ups</span>
                    {(m?.pendingTopups ?? 0) > 0 && (
                      <span className="text-[10px] text-[#f59e0b] opacity-80">{m.pendingTopups} awaiting</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                    {!overview && Array(2).fill(null).map((_, i) => (
                      <div key={i} className="rounded-xl border border-white/[0.07] bg-[#18181f] p-3.5 flex flex-col gap-2">
                        <div className="flex justify-between"><Sk w="w-20" /><Sk w="w-12" /></div>
                        <Sk w="w-full" h="h-2.5" />
                        <div className="skeleton h-8 w-full rounded-lg" />
                      </div>
                    ))}
                    {overview && (overview.pendingQueue ?? []).length === 0 && (
                      <div className="py-8 text-center text-[11.5px] text-[#6b6b7a] opacity-40">No pending top-ups</div>
                    )}
                    {(overview?.pendingQueue ?? []).map(q => (
                      <div key={q.id} className="flex-shrink-0 rounded-xl border border-white/[0.07] bg-[#18181f] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11.5px] text-[#9898a8]">{q.username}</span>
                          <span className="font-mono text-[13px] font-medium text-[#f59e0b]">฿ {fmtBaht(q.amount)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2.5 text-[10.5px] text-[#6b6b7a]">
                          <span>{timeAgo(q.createdAt)}</span>
                          <span className="font-mono opacity-70">#{q.ref}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setConfirmApprove(q)}
                            className="flex-1 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.07)] py-1.5 text-[11.5px] font-medium text-[#22c55e] transition-all hover:bg-[rgba(34,197,94,0.14)]">
                            Approve
                          </button>
                          <button onClick={() => setConfirmReject(q)}
                            className="flex-1 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] py-1.5 text-[11.5px] text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.12)]">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ USERS ══ */}
          {page === 'users' && (
            <motion.div
              key="users"
              // Locked container height, scroll bar on table body
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
                          <td className="px-4 py-3.5 font-mono text-[13px] text-[#00d4c8]">฿ {fmtBaht(u.balance)}</td>
                          <td className="px-4 py-3.5 font-mono text-[12.5px] text-[#9898a8]">฿ {fmtBaht(u.totalSpent)}</td>
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

          {/* ══ TOP-UPS ══ */}
          {page === 'topups' && (
            <motion.div
              key="topups"
              // Locked container height
              className="flex flex-1 min-h-0 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible"
            >
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                  Top-up <span className="text-[#00d4c8]">requests</span>
                </h1>
                <div className="flex rounded-lg border border-white/[0.07] bg-[#18181f] p-1">
                  {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setTopupFilter(f)}
                      className={`rounded px-3 py-1 text-[11px] capitalize transition-all ${topupFilter === f ? 'bg-[#1e1e27] text-[#e8e8ed]' : 'text-[#6b6b7a] hover:text-[#9898a8]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 min-h-0 gap-4">
                <div className="flex flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['User', 'Amount', 'Reference', 'Verified by', 'Status', 'Date'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] text-[#6b6b7a] font-normal border-b border-white/[0.07] opacity-50 bg-[#111116] sticky top-0 z-10">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topupsLoading && Array(5).fill(null).map((_, i) => (
                          <tr key={i} className="border-b border-white/[0.04]">
                            {[20, 14, 12, 16, 14, 12].map((w, j) => <td key={j} className="px-4 py-3"><Sk w={`w-${w}`} /></td>)}
                          </tr>
                        ))}
                        {!topupsLoading && (topups ?? []).length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[#6b6b7a] opacity-40">No top-ups found</td></tr>
                        )}
                        {(topups ?? []).map(t => (
                          <tr key={t.id} onClick={() => setSelectedTopup(t)}
                            className={`border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors
                              ${selectedTopup?.id === t.id ? 'bg-[rgba(0,212,200,0.04)]' : 'hover:bg-white/[0.015]'}`}>
                            <td className="px-4 py-3 font-mono text-[11.5px] text-[#6b6b7a]">{t.username}</td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-[13px] font-medium
                                ${t.status === 'pending' ? 'text-[#f59e0b]' :
                                  t.status === 'approved' ? 'text-[#22c55e]' : 'text-[#ef4444] line-through'}`}>
                                ฿ {fmtBaht(t.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-[#6b6b7a]">#{t.ref}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10.5px]
                                ${t.verifiedBy === 'easyslip' ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]' :
                                  t.verifiedBy === 'manual' ? 'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.07)] text-[#f59e0b]' :
                                    t.verifiedBy === 'system' ? 'border-[rgba(168,85,247,0.2)] bg-[rgba(168,85,247,0.07)] text-[#a855f7]' :
                                      'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.07)] text-[#ef4444]'}`}>
                                {t.verifiedBy === 'easyslip' ? 'EasySlip' :
                                  t.verifiedBy === 'manual' ? 'Manual' :
                                    t.verifiedBy === 'system' ? 'System' :
                                      'Not Yet Verified'}
                              </span>
                            </td>
                            <td className="px-4 py-3"><StatusPill status={t.status} /></td>
                            <td className="px-4 py-3 text-[12px] text-[#6b6b7a]">{timeAgo(t.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Slip detail */}
                <div className="flex w-[340px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Slip detail</span>
                    {selectedTopup && <StatusPill status={selectedTopup.status} />}
                  </div>
                  {!selectedTopup ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center opacity-40">
                      <svg viewBox="0 0 24 24" className="h-10 w-10 stroke-[#6b6b7a] fill-none stroke-[1.2]">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                      <p className="text-[12.5px] text-[#6b6b7a]">Select a top-up request to view the slip</p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col overflow-y-auto p-4 gap-3.5"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                      <div className="flex items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181f] p-4 flex-shrink-0">
                        {selectedTopup.slipImagePath ? (
                          <SecureAdminImage slipPath={selectedTopup.slipImagePath} />
                        ) : (
                          <div className="flex h-[140px] w-[100px] flex-col items-center justify-center gap-2 rounded-lg bg-[#1e1e27]">
                            <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-[#6b6b7a] fill-none stroke-[1.2] opacity-40">
                              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                            </svg>
                            <span className="text-[10px] text-[#6b6b7a] opacity-50">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {[
                          { label: 'User', val: selectedTopup.username, mono: true },
                          { label: 'Amount', val: `฿ ${fmtBaht(selectedTopup.amount)}`, color: 'text-[#00d4c8]' },
                          { label: 'Reference', val: `#${selectedTopup.ref}`, mono: true },
                          {
                            label: 'Verified by', val: selectedTopup.verifiedBy === 'easyslip' ? 'EasySlip ✓' : selectedTopup.verifiedBy === 'manual' ? 'Manual' : 'Auto-verify failed',
                            color: selectedTopup.verifiedBy === 'easyslip' ? 'text-[#00d4c8]' : selectedTopup.verifiedBy === 'manual' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
                          },
                          { label: 'Submitted', val: timeAgo(selectedTopup.createdAt) },
                        ].map(({ label, val, mono, color }) => (
                          <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#18181f] px-3 py-2 text-[11.5px]">
                            <span className="text-[#6b6b7a]">{label}</span>
                            <span className={`${mono ? 'font-mono' : ''} ${color ?? 'text-[#9898a8]'}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                      {selectedTopup.status === 'pending' && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button onClick={() => setConfirmApprove(selectedTopup)}
                            className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.07)] py-2 text-[12px] font-medium text-[#22c55e] transition-all hover:bg-[rgba(34,197,94,0.14)]">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2.2]"><polyline points="20 6 9 17 4 12" /></svg>
                            Approve top-up
                          </button>
                          <button onClick={() => setConfirmReject(selectedTopup)}
                            className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] py-2 text-[12px] text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.12)]">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2]"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            Reject
                          </button>
                        </div>
                      )}
                      {selectedTopup.status !== 'pending' && (
                        <div className={`rounded-lg border px-4 py-2.5 text-center text-[11.5px] font-medium flex-shrink-0
                          ${selectedTopup.status === 'approved'
                            ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.06)] text-[#22c55e]'
                            : 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] text-[#ef4444]'}`}>
                          {selectedTopup.status === 'approved' ? 'Approved — balance credited' : 'Rejected'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ ACTIVITY ══ */}
          {page === 'activity' && (
            <motion.div
              key="activity"
              // Locked container height
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
                          <td className="px-4 py-2.5 font-mono text-[11.5px] text-[#9898a8]">฿ {fmtBaht(a.chargeAmount)}</td>
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