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
  note: 'bg-[var(--accent)]',
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
    approved:  'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]',
    pending:   'border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] text-[#f59e0b]',
    failed:    'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]',
    rejected:  'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[#ef4444]',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] capitalize ${map[status] ?? 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>
      {status}
    </span>
  );
}

function ProfitCell({ profit }) {
  const color = profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';
  return (
    <span className={`font-mono text-[12px] ${color}`}>
      {profit >= 0 ? '+' : ''}${fmtFiat(profit)}
    </span>
  );
}

function BarChart({ data }) {
  if (!data?.length) return (
    <div className="flex h-[140px] items-center justify-center text-[12px] text-[var(--fg-4)] opacity-40">No data for this period</div>
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

// ── User Detail ───────────────────────────────────────────────────────────────
function UserDetail({ userId, apiFetch, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('breakdown');

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [userId]);

  const u = data?.user;
  const p = data?.profit;

  return (
    <motion.div
      key="user-detail"
      className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
      variants={containerVariants} initial="hidden" animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
          <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><polyline points="15 18 9 12 15 6" /></svg>
          Users
        </button>
        <span className="text-[var(--fg-4)] text-[12px]">/</span>
        {loading
          ? <Sk w="w-32" h="h-4" />
          : <span className="font-serif text-[18px] tracking-[-0.02em] text-[var(--fg)]">{u?.username}</span>
        }
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array(6).fill(null).map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Top row — profile + profit summary */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 flex-shrink-0">
            {/* Profile card */}
            <div className="col-span-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 surface noise flex flex-col gap-2">
              <div className="text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60 mb-1">Profile</div>
              <div className="text-[14px] font-medium text-[var(--fg)]">{u?.username}</div>
              <div className="text-[11.5px] text-[var(--fg-3)] truncate">{u?.email}</div>
              <div className="flex flex-col gap-1.5 mt-1">
                {[
                  { label: 'Balance', value: <span className="inline-flex items-center gap-1 text-[var(--accent)] font-mono">{fmtCredit(u?.balance)} <CreditIcon size={11} color="#00d4c8"/></span> },
                  { label: 'Member since', value: new Date(u?.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  { label: 'Last active', value: timeAgo(u?.lastLogin) },
                  { label: 'Referral code', value: <span className="font-mono text-[var(--accent)]">{u?.referralCode ?? '—'}</span> },
                  { label: 'Referred by', value: u?.referrerUsername ? <span className="text-[#f59e0b]">{u.referrerUsername}</span> : <span className="text-[var(--fg-4)]">—</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1.5">
                    <span className="text-[11px] text-[var(--fg-4)]">{label}</span>
                    <span className="text-[11.5px] text-[var(--fg)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profit summary */}
            <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 surface noise">
              <div className="text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60 mb-3">Profit breakdown</div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Total profit', value: `$${fmtFiat(p?.total)}`, color: p?.total >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]', big: true },
                  { label: 'Total revenue', value: `$${fmtFiat(p?.revenue)}`, color: 'text-[var(--fg)]' },
                  { label: 'Total API cost', value: `-$${fmtFiat(p?.cost)}`, color: 'text-[#ef4444]' },
                ].map(({ label, value, color, big }) => (
                  <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                    <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-60 mb-1">{label}</div>
                    <div className={`font-mono ${big ? 'text-[20px]' : 'text-[16px]'} font-medium ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Notes', key: 'notes', color: '#00d4c8' },
                  { label: 'Exam prep', key: 'exam', color: '#f59e0b' },
                  { label: 'Transcripts', key: 'transcripts', color: '#22c55e' },
                ].map(({ label, key, color }) => {
                  const b = p?.breakdown?.[key];
                  return (
                    <div key={key} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                        <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)]">{label}</span>
                        <span className="ml-auto text-[10px] text-[var(--fg-4)] opacity-50">{b?.count ?? 0} gen.</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[11px]">
                        <div className="flex justify-between"><span className="text-[var(--fg-4)]">Revenue</span><span className="font-mono text-[var(--fg)]">${fmtFiat(b?.revenue)}</span></div>
                        <div className="flex justify-between"><span className="text-[var(--fg-4)]">API cost</span><span className="font-mono text-[#ef4444]">-${fmtFiat(b?.cost)}</span></div>
                        <div className="flex justify-between border-t border-[var(--border)] pt-0.5 mt-0.5">
                          <span className="text-[var(--fg-4)]">Profit</span>
                          <ProfitCell profit={b?.profit ?? 0} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Tabs — Activity log */}
          <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-0.5">
                {[['breakdown', 'Service Breakdown'], ['activity', 'Activity Log'], ['referrals', `Referrals (${data?.referrals?.length ?? 0})`]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActivityTab(tab)}
                    className={`rounded px-3 py-1 text-[11px] transition-all ${activityTab === tab ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Breakdown tab */}
            {activityTab === 'breakdown' && (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Service', 'Generations', 'Revenue', 'API Cost', 'Profit', 'Margin'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Notes', key: 'notes', color: '#00d4c8' },
                      { label: 'Exam prep', key: 'exam', color: '#f59e0b' },
                      { label: 'Transcripts', key: 'transcripts', color: '#22c55e' },
                    ].map(({ label, key, color }) => {
                      const b = p?.breakdown?.[key];
                      const margin = b?.revenue > 0 ? ((b.profit / b.revenue) * 100).toFixed(1) : '—';
                      return (
                        <tr key={key} className="border-b border-[var(--border-faint)] last:border-0">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                              <span className="text-[12.5px] text-[var(--fg-2)]">{label}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-[12px] text-[var(--fg-3)]">{b?.count ?? 0}</td>
                          <td className="px-3 py-3 font-mono text-[12px] text-[var(--fg-2)]">${fmtFiat(b?.revenue)}</td>
                          <td className="px-3 py-3 font-mono text-[12px] text-[#ef4444]">-${fmtFiat(b?.cost)}</td>
                          <td className="px-3 py-3"><ProfitCell profit={b?.profit ?? 0} /></td>
                          <td className="px-3 py-3 font-mono text-[12px] text-[var(--fg-3)]">{margin !== '—' ? `${margin}%` : '—'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[var(--surface-raised)]">
                      <td className="px-3 py-2.5 text-[11.5px] font-medium text-[var(--fg-3)]">Total</td>
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--fg)]">${fmtFiat(p?.revenue)}</td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[#ef4444]">-${fmtFiat(p?.cost)}</td>
                      <td className="px-3 py-2.5"><ProfitCell profit={p?.total ?? 0} /></td>
                      <td className="px-3 py-2.5 font-mono text-[12px] text-[var(--fg-3)]">
                        {p?.revenue > 0 ? `${((p.total / p.revenue) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Activity Log tab */}
            {activityTab === 'activity' && (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['Type', 'Description', 'Amount', 'Balance after', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.activity ?? []).map(a => (
                      <tr key={a.id} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-[11.5px] text-[var(--fg-3)]">
                            <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[var(--fg-4)]'}`} />
                            {TYPE_LABEL[a.type] ?? a.type}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[11.5px] text-[var(--fg-2)] max-w-[200px] truncate">{a.title}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-mono text-[12px] flex items-center gap-1 ${a.type === 'topup' || a.type === 'rebate' ? 'text-[#22c55e]' : 'text-[var(--fg-2)]'}`}>
                            {a.type === 'topup' || a.type === 'rebate' ? '+' : '-'}{Math.abs(a.chargeAmount).toFixed(2)}
                            <CreditIcon size={10} color={a.type === 'topup' || a.type === 'rebate' ? '#22c55e' : '#9898a8'} />
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[11.5px] text-[var(--fg-3)]">
                          <span className="inline-flex items-center gap-1">{fmtCredit(a.balanceAfter)} <CreditIcon size={10} color="#9898a8" /></span>
                        </td>
                        <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                        <td className="px-4 py-2.5 text-[11px] text-[var(--fg-4)]">{timeAgo(a.createdAt)}</td>
                      </tr>
                    ))}
                    {(data?.activity ?? []).length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-10 text-center text-[12px] text-[var(--fg-4)] opacity-40">No activity</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Referrals tab */}
            {activityTab === 'referrals' && (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                {(data?.referrals ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-[12px] text-[var(--fg-4)] opacity-40">No referrals yet</div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['User', 'Email', 'Joined'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.referrals.map(r => (
                        <tr key={r.id} className="border-b border-[var(--border-faint)] last:border-0">
                          <td className="px-3 py-3 text-[12.5px] text-[var(--fg-2)]">{r.username}</td>
                          <td className="px-3 py-3 text-[11.5px] text-[var(--fg-3)]">{r.email}</td>
                          <td className="px-3 py-3 text-[11.5px] text-[var(--fg-3)]">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

// ── Referrals Page ────────────────────────────────────────────────────────────
function ReferralsPage({ apiFetch }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [period, setPeriod]   = useState('unpaid');
  const [paying, setPaying]   = useState(null); // referrerId being marked paid

  const load = useCallback(() => {
    setLoading(true);
    setExpanded(null);
    apiFetch(`/api/admin/referrals?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [apiFetch, period]);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (referrerId) => {
    if (paying) return;
    setPaying(referrerId);
    try {
      await apiFetch('/api/admin/referrals/payout', {
        method: 'POST',
        body: JSON.stringify({ referrerId }),
      });
      load(); // refresh
    } finally {
      setPaying(null);
    }
  };

  const referrers  = data?.referrers ?? [];
  const totalOwed  = referrers.reduce((s, r) => s + r.owedToReferrer, 0);
  const totalProfit = referrers.reduce((s, r) => s + r.totalProfit, 0);

  const PERIODS = [
    { key: 'unpaid', label: 'Unpaid' },
    { key: '7D',     label: '7D' },
    { key: '30D',    label: '30D' },
    { key: '90D',    label: '90D' },
    { key: 'all',    label: 'All' },
  ];

  return (
    <motion.div
      key="referrals"
      className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
      variants={containerVariants} initial="hidden" animate="visible"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
        <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
          Referral <span className="text-[var(--accent)]">payouts</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--fg-4)]">30% of referred users' profit</span>
          <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
            {PERIODS.map(({ key, label }) => (
              <button key={key} onClick={() => setPeriod(key)}
                className={`rounded px-3 py-1 text-[11px] transition-all ${period === key
                  ? key === 'unpaid'
                    ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                    : 'bg-[var(--surface-deep)] text-[var(--fg)]'
                  : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 flex-shrink-0">
        {[
          { label: 'Referrers',                      value: loading ? null : String(referrers.length),          color: 'text-[var(--fg)]' },
          { label: period === 'unpaid' ? 'Unpaid profit' : 'Profit in period', value: loading ? null : `$${fmtFiat(totalProfit)}`, color: 'text-[var(--fg)]' },
          { label: period === 'unpaid' ? 'Total owed now' : 'Owed (30%)',      value: loading ? null : `$${fmtFiat(totalOwed)}`,   color: 'text-[#f59e0b]', border: 'border-[rgba(245,158,11,0.2)]' },
        ].map(({ label, value, color, border }) => (
          <div key={label} className={`rounded-xl border bg-[var(--surface)] px-4 py-3 surface noise ${border ?? 'border-[var(--border)]'}`}>
            <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60">{label}</div>
            {value != null
              ? <div className={`font-mono text-[20px] font-medium ${color}`}>{value}</div>
              : <div className="skeleton h-6 w-20 rounded" />}
          </div>
        ))}
      </motion.div>

      {/* Referrers table */}
      <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
          <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Referrers</span>
          {period === 'unpaid' && <span className="text-[10.5px] text-[var(--fg-4)]">Showing profit since each referrer's last payout</span>}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
          {loading && Array(4).fill(null).map((_, i) => (
            <div key={i} className="border-b border-[var(--border-faint)] px-4 py-3.5 flex gap-4">
              <Sk w="w-32" h="h-3.5" /><Sk w="w-48" /><Sk w="w-20" /><Sk w="w-20" /><Sk w="w-24" />
            </div>
          ))}
          {!loading && referrers.length === 0 && (
            <div className="flex h-full items-center justify-center text-[12px] text-[var(--fg-4)] opacity-40">No referrals yet</div>
          )}
          {referrers.map(r => (
            <div key={r.referrerId}>
              <div className="flex items-center border-b border-[var(--border-faint)] hover:bg-[var(--surface-tint-faint)] transition-colors">
                {/* Expand toggle + name */}
                <button
                  onClick={() => setExpanded(expanded === r.referrerId ? null : r.referrerId)}
                  className="flex items-center gap-2 px-4 py-3.5 flex-1 min-w-0 text-left"
                >
                  <svg viewBox="0 0 24 24"
                    className={`h-3 w-3 flex-shrink-0 stroke-current fill-none stroke-2 text-[var(--fg-4)] transition-transform ${expanded === r.referrerId ? 'rotate-90' : ''}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--fg)]">{r.referrerUsername}</div>
                    <div className="text-[11px] text-[var(--fg-4)]">{r.referrerEmail}</div>
                  </div>
                </button>

                {/* Last paid */}
                <div className="px-4 py-3.5 w-40 text-right flex-shrink-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Last paid</div>
                  <div className={`text-[11.5px] ${r.lastPaidAt ? 'text-[var(--fg-3)]' : 'text-[#ef4444] opacity-60'}`}>
                    {r.lastPaidAt ? timeAgo(r.lastPaidAt) : 'Never'}
                  </div>
                </div>

                {/* Referrals count */}
                <div className="px-4 py-3.5 w-24 text-right flex-shrink-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Referrals</div>
                  <div className="font-mono text-[13px] text-[var(--fg-3)]">{r.referredUsers.length}</div>
                </div>

                {/* Profit */}
                <div className="px-4 py-3.5 w-32 text-right flex-shrink-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Profit</div>
                  <div className="font-mono text-[13px] text-[var(--fg-2)]">${fmtFiat(r.totalProfit)}</div>
                </div>

                {/* Owed */}
                <div className="px-4 py-3.5 w-32 text-right flex-shrink-0">
                  <div className="text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-50 mb-0.5">Owed (30%)</div>
                  <div className="font-mono text-[14px] font-medium text-[#f59e0b]">${fmtFiat(r.owedToReferrer)}</div>
                </div>

                {/* Mark paid button */}
                <div className="px-4 py-3.5 flex-shrink-0">
                  <button
                    onClick={() => handleMarkPaid(r.referrerId)}
                    disabled={!!paying || r.owedToReferrer <= 0}
                    className="flex items-center gap-1.5 rounded-lg border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.07)] px-3 py-1.5 text-[11.5px] text-[#22c55e] transition-all hover:bg-[rgba(34,197,94,0.13)] disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {paying === r.referrerId
                      ? <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#22c55e]" />
                      : <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><polyline points="20 6 9 17 4 12" /></svg>
                    }
                    Mark paid
                  </button>
                </div>
              </div>

              {/* Expanded: per-user breakdown */}
              <AnimatePresence>
                {expanded === r.referrerId && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden bg-[var(--surface-raised)]"
                  >
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['User', 'Email', 'Profit generated', '30% owed'].map(h => (
                            <th key={h} className="px-6 py-2 text-left text-[9.5px] uppercase tracking-[0.07em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50">{h}</th>
                          ))}
                        </tr>
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
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const { getAccessTokenSilently, logout } = useAuth0();

  const [page, setPage] = useState('overview');
  const [selectedUserId, setSelectedUserId] = useState(null);
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
      setOverview(await res.json());
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
      setActivity(await res.json());
    } finally { setActivityLoading(false); }
  }, [apiFetch, period]);

  useEffect(() => { if (page === 'overview') loadOverview(); }, [page, period]);
  useEffect(() => { if (page === 'users' && !selectedUserId) loadUsers(); }, [page, userSearch, userFilter, selectedUserId]);
  useEffect(() => { if (page === 'activity') loadActivity(); }, [page, period]);

  const PERIODS = ['7D', '30D', '90D', 'all'];
  const NAV = [
    { id: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg> },
    { id: 'users',    label: 'Users',    icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { id: 'activity', label: 'Activity', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
    { id: 'referrals', label: 'Referrals', icon: <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
  ];

  const m = overview?.metrics;
  const metricCards = [
    { label: 'Total users',      value: m ? String(m.totalUsers)     : null, sub: m ? `+${m.newThisMonth} this month` : null, color: 'text-[var(--fg)]' },
    { label: 'Active this week', value: m ? String(m.activeThisWeek) : null, sub: m ? `${Math.round((m.activeThisWeek / Math.max(m.totalUsers, 1)) * 100)}% of total` : null, color: 'text-[var(--accent)]' },
    { label: 'Total Profit',     value: m ? `$${fmtFiat(m.totalProfit)}` : null, sub: 'Net gain after API bills', color: 'text-[#22c55e]' },
    { label: 'Bank Inflow',      value: m ? `$${fmtFiat(m.bankInflow)}` : null, sub: 'Gross cash this month',    color: 'text-[var(--fg-3)]' },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] font-sans text-sm text-[var(--fg)]">
      {/* Navbar */}
      <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[var(--border-faint)] bg-[var(--surface)] px-8 z-50 nav-surface">
        <div className="flex items-center gap-4 select-none">
          <span className="font-serif text-[20px] tracking-[-0.02em] text-[var(--accent)]">
            Eidolon<sup className="text-[11px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup>
          </span>
          <div className="h-4 w-px bg-[var(--surface-tint)]" />
          <span className="rounded-full border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-[#f59e0b]">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-1.5 text-[12.5px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            Back to app
          </button>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="group flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-all hover:border-[rgba(239,68,68,0.3)]">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[var(--fg-4)] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#ef4444]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[200px] flex-shrink-0 flex-col border-r border-[var(--border-faint)] bg-[var(--surface)]">
          <div className="px-4 pt-5 pb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--fg-4)] opacity-40 select-none">Admin</div>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setSelectedUserId(null); }}
              className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-[13px] transition-all
                ${page === n.id ? 'border-[var(--accent)] bg-[rgba(0,212,200,0.07)] text-[var(--accent)]' : 'border-transparent text-[var(--fg-4)] hover:bg-[var(--surface-tint-faint)] hover:text-[var(--fg-3)]'}`}>
              {n.icon}
              <span className="flex-1 text-left">{n.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">

          {/* ══ OVERVIEW ══ */}
          {page === 'overview' && (
            <motion.div key="overview" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible">
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                  Platform <span className="text-[var(--accent)]">overview</span>
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                    {PERIODS.map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`rounded px-3 py-1 text-[11px] uppercase transition-all ${period === p ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button onClick={loadOverview}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
                    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 stroke-current fill-none stroke-2 ${overviewLoading ? 'animate-spin' : ''}`}>
                      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.63-7.88" />
                    </svg>
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3 flex-shrink-0">
                {metricCards.map(({ label, value, sub, color }) => (
                  <div key={label} className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 surface">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                    <div className="mb-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] opacity-60">{label}</div>
                    {value != null
                      ? <div className={`font-mono text-[22px] font-medium leading-none ${color}`}>{value}</div>
                      : <div className="skeleton h-6 w-20 rounded" />}
                    <div className="mt-1 text-[11px] text-[var(--fg-4)]">
                      {sub ?? <span className="skeleton h-2.5 w-24 rounded inline-block mt-1" />}
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 flex-shrink-0">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Service usage</span>
                    <span className="text-[10px] text-[var(--fg-4)] opacity-50 capitalize">{period}</span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-3">
                    {(overview?.serviceUsage ?? Array(4).fill(null)).map((s, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5 text-[11.5px]">
                          {s ? <span className="text-[var(--fg-3)]">{s.label}</span> : <Sk w="w-24" />}
                          {s
                            ? <div className="flex items-center gap-1.5 font-mono">
                                <span className="text-[10px] text-[var(--fg-4)] opacity-60">{s.detail}</span>
                                <span className="text-[10px] text-[var(--fg-4)] opacity-30">·</span>
                                <span className="text-[11px] text-[var(--fg-4)]">{s.count} gen.</span>
                              </div>
                            : <div className="flex items-center gap-2"><Sk w="w-20" h="h-2" /><Sk w="w-10" /></div>}
                        </div>
                        <div className="h-[3px] rounded-full bg-[var(--surface-deep)] overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                            style={{ width: `${s?.pct ?? 0}%`, opacity: s?.pct === 100 ? 1 : 0.6 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface noise">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Service performance</span>
                    <span className="text-[10px] text-[var(--fg-4)] opacity-50">Current period</span>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-2">
                    <div className="grid grid-cols-4 px-2 mb-1 text-[9px] uppercase tracking-wider text-[var(--fg-4)] opacity-50">
                      <div className="col-span-1">Feature</div>
                      <div className="text-right">Revenue</div>
                      <div className="text-right">API Cost</div>
                      <div className="text-right">Profit</div>
                    </div>
                    {['note', 'exam', 'transcript'].map(key => {
                      const d = overview?.revenue?.[key];
                      return (
                        <div key={key} className="grid grid-cols-4 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[11.5px]">
                          <span className="capitalize text-[var(--fg-3)]">{key === 'exam' ? 'Exam Prep' : key}</span>
                          <span className="text-right font-mono text-[var(--fg)]">${fmtFiat(d?.rev)}</span>
                          <span className="text-right font-mono text-[#ef4444] opacity-80">-${fmtFiat(d?.cost)}</span>
                          <span className="text-right font-mono text-[#22c55e] font-medium">+${fmtFiat(d?.profit)}</span>
                        </div>
                      );
                    })}
                    <div className="h-px bg-[var(--surface-tint)] my-1" />
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11.5px] rounded-lg bg-[var(--accent)]/[0.03] border border-[var(--accent)]/[0.1]">
                      <span className="text-[var(--accent)]">Net operating profit</span>
                      <span className="font-mono font-medium text-[var(--accent)]">${fmtFiat(overview?.metrics?.totalProfit)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 min-h-0">
                <div className="flex w-full flex-col h-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                    <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Recent activity</span>
                    <button onClick={() => setPage('activity')} className="text-[10.5px] text-[var(--fg-4)] hover:text-[var(--accent)] transition-colors">View all →</button>
                  </div>
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          {['Type', 'User', 'Cost', 'Status', 'Time'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {!overview && Array(6).fill(null).map((_, i) => (
                          <tr key={i} className="border-b border-[var(--border-faint)]">
                            {[28, 20, 14, 16, 12].map((w, j) => <td key={j} className="px-4 py-2.5"><Sk w={`w-${w}`} /></td>)}
                          </tr>
                        ))}
                        {(overview?.recentActivity ?? []).map((a, i) => (
                          <tr key={i} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 text-[11.5px] text-[var(--fg-3)]">
                                <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[var(--fg-4)]'}`} />
                                {TYPE_LABEL[a.type] ?? a.type}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--fg-4)]">{a.username}</td>
                            <td className="px-4 py-2.5 font-mono text-[11.5px] text-[var(--fg-3)] inline-flex items-center gap-1">
                              {fmtCredit(a.chargeAmount)} <CreditIcon size={10} color="#9898a8" />
                            </td>
                            <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                            <td className="px-4 py-2.5 text-[11px] text-[var(--fg-4)]">{timeAgo(a.createdAt)}</td>
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
          {page === 'users' && !selectedUserId && (
            <motion.div key="users" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible">
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                  Platform <span className="text-[var(--accent)]">users</span>
                </h1>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-4)] fill-none stroke-2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search name or email…"
                      className="w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3.5 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-4)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                  </div>
                  <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                    {['all', 'active', 'inactive'].map(f => (
                      <button key={f} onClick={() => setUserFilter(f)}
                        className={`rounded px-3 py-1 text-[11px] capitalize transition-all ${userFilter === f ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['User', 'Balance', 'Total spent', 'Gens', 'Referred by', 'Last active', 'Status'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersLoading && Array(6).fill(null).map((_, i) => (
                        <tr key={i} className="border-b border-[var(--border-faint)]">
                          {[32, 16, 16, 10, 20, 16, 14].map((w, j) => <td key={j} className="px-4 py-3.5"><Sk w={`w-${w}`} /></td>)}
                        </tr>
                      ))}
                      {!usersLoading && (users ?? []).length === 0 && (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-[12px] text-[var(--fg-4)] opacity-40">No users found</td></tr>
                      )}
                      {(users ?? []).map(u => (
                        <tr key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors cursor-pointer">
                          <td className="px-4 py-3.5">
                            <div className="text-[13px] font-medium text-[var(--fg)]">{u.username}</div>
                            <div className="text-[11px] text-[var(--fg-4)]">{u.email}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[13px] text-[var(--accent)]">
                            <span className="inline-flex items-center gap-1.5">{fmtCredit(u.balance)} <CreditIcon size={12} color="#00d4c8" /></span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[12.5px] text-[var(--fg-3)]">
                            <span className="inline-flex items-center gap-1.5">{fmtCredit(u.totalSpent)} <CreditIcon size={11} color="#9898a8" /></span>
                          </td>
                          <td className="px-4 py-3.5 text-[12.5px] text-[var(--fg-3)]">{u.generations}</td>
                          <td className="px-4 py-3.5 text-[12px]">
                            {u.referrerUsername
                              ? <span className="rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] px-2 py-0.5 text-[11px] text-[#f59e0b]">{u.referrerUsername}</span>
                              : <span className="text-[var(--fg-4)] opacity-40">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-[12.5px] text-[var(--fg-3)]">{timeAgo(u.lastLogin)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]
                              ${u.isActive ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.08)] text-[#22c55e]' : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-4)]'}`}>
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

          {/* ══ USER DETAIL ══ */}
          {page === 'users' && selectedUserId && (
            <UserDetail
              userId={selectedUserId}
              apiFetch={apiFetch}
              onBack={() => setSelectedUserId(null)}
            />
          )}

          {/* ══ ACTIVITY ══ */}
          {page === 'activity' && (
            <motion.div key="activity" className="flex flex-1 flex-col overflow-hidden px-7 py-5 gap-4"
              variants={containerVariants} initial="hidden" animate="visible">
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-shrink-0">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                  Platform <span className="text-[var(--accent)]">activity</span>
                </h1>
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => setPeriod(p)}
                      className={`rounded px-3 py-1 text-[11px] uppercase transition-all ${period === p ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-4)] hover:text-[var(--fg-3)]'}`}>
                      {p}
                    </button>
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
                    {activityLoading
                      ? <div className="skeleton h-6 w-16 rounded" />
                      : <div className="font-mono text-[22px] font-medium text-[var(--fg)]">{val}</div>}
                    <div className="mt-2.5 h-[2px] rounded-full overflow-hidden bg-[var(--surface-deep)]">
                      <div className="h-full rounded-full" style={{ width: '60%', background: bar }} />
                    </div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden surface flex-shrink-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                  <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Generation activity</span>
                  <div className="flex items-center gap-4">
                    {[['#00d4c8', 'Notes'], ['#22c55e', 'Transcripts'], ['#f59e0b', 'Exam prep']].map(([color, label]) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                        <span className="text-[10.5px] text-[var(--fg-4)]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-3">
                  {activityLoading
                    ? <div className="skeleton h-[140px] w-full rounded" />
                    : <BarChart data={activity?.chartData} />}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] surface">
                <div className="px-4 py-2.5 border-b border-[var(--border)] flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-4)] opacity-65">Activity log</span>
                </div>
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['Type', 'User', 'Cost', 'Status', 'Time'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-[9.5px] uppercase tracking-[0.08em] text-[var(--fg-4)] font-normal border-b border-[var(--border-faint)] opacity-50 bg-[var(--surface)] sticky top-0 z-10">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activityLoading && Array(8).fill(null).map((_, i) => (
                        <tr key={i} className="border-b border-[var(--border-faint)]">
                          {[20, 20, 14, 16, 12].map((w, j) => <td key={j} className="px-4 py-2.5"><Sk w={`w-${w}`} /></td>)}
                        </tr>
                      ))}
                      {(activity?.activity ?? []).map(a => (
                        <tr key={a.id} className="border-b border-[var(--border-faint)] last:border-0 hover:bg-[var(--surface-tint-faint)] transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 text-[11.5px] text-[var(--fg-3)]">
                              <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${TYPE_DOT[a.type] ?? 'bg-[var(--fg-4)]'}`} />
                              {TYPE_LABEL[a.type] ?? a.type}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--fg-4)]">{a.username}</td>
                          <td className="px-4 py-2.5 font-mono text-[11.5px] text-[var(--fg-3)] inline-flex items-center gap-1.5">
                            {fmtCredit(a.chargeAmount)} <CreditIcon size={11} color="#9898a8" />
                          </td>
                          <td className="px-4 py-2.5"><StatusPill status={a.status} /></td>
                          <td className="px-4 py-2.5 text-[11px] text-[var(--fg-4)]">{timeAgo(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ══ REFERRALS ══ */}
          {page === 'referrals' && <ReferralsPage apiFetch={apiFetch} />}

        </main>
      </div>
    </div>
  );
}
