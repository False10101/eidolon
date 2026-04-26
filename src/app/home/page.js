'use client';

import {
  DocumentTextIcon,
  PencilSquareIcon,
  EyeIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { MusicalNoteIcon, LanguageIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import Navbar from '../navbar';
import CreditIcon from '../CreditIcon';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatLastLogin(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dayLabel =
    date.toDateString() === now.toDateString() ? 'Today' :
    date.toDateString() === yesterday.toDateString() ? 'Yesterday' :
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const timeLabel = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dayLabel}, ${timeLabel} · Bangkok time`;
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const pipeline = [
  {
    step: 'Step 01', name: 'Audio Converter', href: '/audio-converter',
    desc: 'Extract MP3 from Teams recording', price: 'free', isNew: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    step: 'Step 02', name: 'Transcriptor', href: '/transcriptor',
    desc: 'MP3 → clean Whisper transcript', price: '7 or 11 / hour', isNew: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
  },
  {
    step: 'Step 03', name: 'Inclass Notes', href: '/note',
    desc: 'Transcript → comprehensive lecture notes', price: '9 - 17 / note', isNew: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    step: 'Step 04', name: 'Exam Prep', href: '/exam-prep',
    desc: 'Notes → practice questions + solutions', price: '17 – 37 / subject', isNew: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

const typeDisplayMap = {
  note:       'Inclass Notes',
  transcript: 'Transcription',
  exam_prep:  'Exam Prep',
  topup: 'Topup',
  rebate: 'Rebate'
};

const routeMap = {
  note:       '/note',
  transcript: '/transcriptor',
  exam_prep:  '/exam-prep',
};

const USAGE_TYPES = [
  { key: 'note',       label: 'Inclass Notes' },
  { key: 'transcript', label: 'Transcriptor' },
  { key: 'exam_prep',  label: 'Exam Prep' },
];

// ─── Motion variants ───────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function HomeSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden p-6 md:p-8 min-w-0">

      {/* Welcome row */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton h-7 w-64 rounded-lg" />
          <div className="skeleton h-3.5 w-44 rounded" />
        </div>
        <div className="skeleton h-9 w-28 rounded-xl" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 flex flex-col gap-2">
            <div className="skeleton h-2.5 w-24 rounded" />
            <div className="skeleton h-7 w-20 rounded" />
            <div className="skeleton h-2.5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div>
        <div className="skeleton h-2.5 w-24 rounded mb-3.5" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-[#111116] p-5 flex flex-col gap-2.5">
              <div className="skeleton h-9 w-9 rounded-lg" />
              <div className="skeleton h-2 w-12 rounded" />
              <div className="skeleton h-3.5 w-28 rounded" />
              <div className="skeleton h-2.5 w-full rounded" />
              <div className="skeleton h-2.5 w-4/5 rounded" />
              <div className="skeleton h-5 w-16 rounded mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 flex-1 min-h-0">

        {/* Activity table skeleton */}
        <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden flex flex-col">
          {/* Table header bar */}
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#18181f] px-4 py-3.5">
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          {/* Column headers */}
          <div className="flex gap-4 border-b border-white/[0.07] px-4 py-2.5">
            {[80, 60, 56, 72, 28].map((w, i) => (
              <div key={i} className="skeleton h-2 rounded" style={{ width: w }} />
            ))}
          </div>
          {/* Rows */}
          <div className="flex flex-col">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-white/[0.05] px-4 py-3 last:border-0">
                <div className="skeleton h-3 rounded" style={{ width: `${100 + (i % 3) * 30}px` }} />
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-8 rounded ml-auto" />
              </div>
            ))}
          </div>
        </div>

        {/* Monthly usage skeleton */}
        <div className="rounded-xl border border-white/[0.07] bg-[#111116] flex flex-col overflow-hidden">
          <div className="border-b border-white/[0.07] bg-[#18181f] px-4 py-3 flex items-center justify-between">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-2.5 w-16 rounded" />
          </div>
          <div className="flex flex-col gap-4 px-7 py-5 flex-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <div className="skeleton h-2.5 w-20 rounded" />
                  <div className="skeleton h-2.5 w-12 rounded" />
                </div>
                <div className="h-[3px] w-full rounded-full bg-[#18181f] overflow-hidden">
                  <div
                    className="skeleton h-full rounded-full"
                    style={{ width: `${60 - i * 15}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-auto pt-4 border-t border-white/[0.07] grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-white/[0.07] bg-[#18181f] px-2.5 py-2 flex flex-col gap-1.5">
                  <div className="skeleton h-2 w-10 rounded" />
                  <div className="skeleton h-4 w-6 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();

  const [userData, setUserData]         = useState({});
  const [activityList, setActivityList] = useState([]);
  const [monthlyUsage, setMonthlyUsage] = useState([]);
  const [dataLoading, setDataLoading]   = useState(true);

  const { isLoading, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    if (isLoading) return;

    const fetchUserData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/home/getUserInfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserData(data.userData);
          setActivityList(data.userData.activity || []);
          setMonthlyUsage(data.userData.monthlyUsage || []);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchUserData();
  }, [isLoading, getAccessTokenSilently]);

  const totalTokens   = (Number(userData.totalTokenSent) || 0) + (Number(userData.totalTokenReceived) || 0);
  const noteCount     = activityList.filter(a => a.type === 'note').length;
  const estimatedGens = Math.floor((userData.balance ?? 0) / 6);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">
      <Navbar balance={userData.balance} />

      <div className="flex flex-1 overflow-hidden">
        {isLoading || dataLoading ? (
          <HomeSkeleton />
        ) : (
          <motion.main
            className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden p-6 md:p-8 min-w-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* ── Welcome row ── */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-serif text-[26px] font-normal tracking-[-0.02em] text-[#e8e8ed] mb-1">
                  Welcome back, <span className="text-[#00d4c8]">{userData.username}</span>
                </h1>
                <p className="text-[12px] text-[#9a9aaa]">
                  Last login: <span className="text-[#b4b4c2]">{formatLastLogin(userData.last_login)}</span>
                </p>
              </div>
              <button
                onClick={() => router.push('/pricing')}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-2.5 transition-all hover:border-[rgba(0,212,200,0.2)] hover:bg-[rgba(0,212,200,0.03)]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                <span className="text-[12px] text-[#e8e8ed]">View pricing</span>
              </button>
            </motion.div>

            {/* ── Metric cards ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Notes generated"   value={String(noteCount)}              change={userData.weeklyComparison?.tokenSent?.change} />
              <MetricCard label="Tokens processed"  value={formatNumber(totalTokens)}      change={userData.weeklyComparison?.tokenReceived?.change} />
              {/* Passed the icon layout directly into the value string here! */}
              <MetricCard 
                label="This month spent"  
                value={<span className="inline-flex items-center gap-1.5"><CreditIcon size={20} color="#00d4c8" />{userData.totalCost ?? 0}</span>} 
                change={userData.weeklyComparison?.cost?.change} 
                cyan 
              />
              <MetricCard 
                label="Balance remaining" 
                value={<span className="inline-flex items-center gap-1.5"><CreditIcon size={20} color="#00d4c8" />{userData.balance ?? '—'}</span>} 
                sub={`~${estimatedGens} generations left`} 
                cyan 
              />
            </motion.div>

            {/* ── Pipeline ── */}
            <motion.div variants={itemVariants}>
              <div className="mb-3.5 text-[11px] uppercase tracking-[0.08em] text-[#9a9aaa]">Your pipeline</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {pipeline.map((p) => (
                  <PipelineCard key={p.href} {...p} onClick={() => router.push(p.href)} />
                ))}
              </div>
            </motion.div>

            {/* ── Bottom grid ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 flex-1 min-h-0">

              {/* Activity table */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] surface">
                <div className="flex items-center justify-between border-b border-white/[0.07] bg-[#18181f] px-4 py-3.5">
                  <span className="text-[12px] font-medium tracking-[0.02em] text-[#b4b4c2]">Recent activity</span>
                </div>
                <div className="flex-1 overflow-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#18181f transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {['Title', 'Type', 'Status', 'Date', ''].map((h) => (
                          <th key={h} className="border-b border-white/[0.07] px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] font-normal whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {activityList.map((activity, index) => (
                          <ActivityRow
                            key={activity.id || index}
                            activity={activity}
                            index={index}
                            onView={() => {
                              const base = routeMap[activity.type];
                              if (base && activity.public_id) router.push(`${base}/${activity.public_id}`);
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly usage */}
              <MonthlyUsage data={monthlyUsage} />

            </motion.div>
          </motion.main>
        )}
      </div>
    </div>
  );
}

// ─── ActivityRow ───────────────────────────────────────────────────────────────
function ActivityRow({ activity, index, onView }) {
  const statusLower = activity.status?.toLowerCase();
  const statusStyle =
    statusLower === 'completed'  ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]' :
    statusLower === 'failed'     ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]' :
    statusLower === 'processing' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
    statusLower === 'pending'    ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' : '';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.04, duration: 0.3, ease: 'easeOut' }}
      className="border-b border-white/[0.05] last:border-0 transition-colors hover:bg-white/[0.015]"
    >
      <td className="max-w-[180px] truncate px-4 py-2.5 text-[13px] text-[#e8e8ed]">{activity.title}</td>
      <td className="px-4 py-2.5">
        <span className="rounded border border-white/[0.07] bg-[#18181f] px-1.5 py-0.5 capitalize font-mono text-[10px] text-[#b4b4c2] whitespace-nowrap">
          {typeDisplayMap[activity.type] ?? activity.type}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] capitalize font-medium ${statusStyle}`}>
          <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-current" />
          {activity.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-[#9a9aaa]">
        {new Date(activity.date).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        {' '}
        <span className="text-[#7a7a8a]">
          {new Date(activity.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      </td>
      <td className="px-4 py-2.5">
        <button
          onClick={onView}
          className="flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#00d4c8] opacity-80 transition-opacity hover:opacity-100"
        >
          <EyeIcon className="h-3.5 w-3.5" /> View
        </button>
      </td>
    </motion.tr>
  );
}

// ─── MonthlyUsage ──────────────────────────────────────────────────────────────
function MonthlyUsage({ data }) {
  const counts = USAGE_TYPES.map(t => ({
    ...t,
    count: parseInt(data.find(d => d.type === t.key)?.totalUsage ?? 0),
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] flex flex-col h-full surface">
      <div className="border-b border-white/[0.07] bg-[#18181f] px-4 py-3 flex items-center justify-between">
        <span className="text-[12px] font-medium tracking-[0.02em] text-[#b4b4c2]">Monthly usage</span>
        <span className="text-[10px] text-[#9a9aaa] font-mono">
          {new Date().toLocaleString('en-GB', { month: 'long', timeZone: 'Asia/Bangkok' })}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-5 flex-1 justify-start">
        {counts.map((t) => {
          const pct = Math.round((t.count / max) * 100);
          return (
            <div key={t.key} className="flex flex-col gap-2 px-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#b4b4c2]">{t.label}</span>
                <span className="font-mono text-[#b4b4c2]"><span className="text-[#e8e8ed]">{t.count}</span> calls</span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#18181f]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: t.count > 0 ? '#00d4c8' : 'rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>
          );
        })}
        <div className="mt-auto pt-4 border-t border-white/[0.07] grid grid-cols-3 gap-2">
          {counts.map(({ key, label, count }) => (
            <div key={key} className="flex flex-col gap-1 rounded-lg border border-white/[0.07] bg-[#18181f] px-2.5 py-2">
              <div className="text-[10px] text-[#9a9aaa] truncate">{label}</div>
              <div className="font-mono text-[13px] text-[#e8e8ed]">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, change, cyan, sub }) {
  const hasChange = change !== undefined;
  const up = (change ?? 0) >= 0;
 
  return (
    <div className={`group relative overflow-hidden rounded-xl border px-4 py-4 noise
      ${cyan
        ? 'border-[rgba(0,212,200,0.12)] bg-[#111116] surface-teal'
        : 'border-white/[0.07] bg-[#111116] surface'
      }`}
    >
      {/* Top-edge shimmer on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4c8] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-50" />
 
      {/* Corner radial — fills the dead space, gives cards warmth */}
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full blur-2xl"
        style={{ background: cyan ? 'rgba(0,212,200,0.07)' : 'rgba(255,255,255,0.025)' }}
      />
 
      <div className="relative">
        <div className="mb-2 text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa]">{label}</div>
        <div className={`mb-1.5 font-mono text-[22px] font-medium leading-none ${cyan ? 'text-[#00d4c8]' : 'text-[#e8e8ed]'}`}>
          {value}
        </div>
        {hasChange ? (
          <div className={`flex items-center gap-1 text-[11px] ${up ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 stroke-current fill-none stroke-2">
              {up
                ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>
                : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></>
              }
            </svg>
            {Math.abs(change)}% vs last week
          </div>
        ) : sub ? (
          <div className="text-[11px] text-[#b4b4c2]">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

// ─── PipelineCard ──────────────────────────────────────────────────────────────
function PipelineCard({ step, name, desc, price, isNew, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116] p-5 text-left transition-all duration-200 hover:border-[rgba(0,212,200,0.2)] surface noise"
    >
      <div className="absolute inset-0 bg-[rgba(0,212,200,0.08)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
 
      {isNew && (
        <span className="absolute right-3 top-3 z-10 rounded bg-[#00d4c8] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.04em] text-[#0c0c0e]">
          New
        </span>
      )}
      <div className="relative z-10 mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-colors group-hover:border-[rgba(0,212,200,0.3)]">
        {icon}
      </div>
      <div className="relative z-10 mb-1 text-[9px] uppercase tracking-[0.1em] text-[#9a9aaa]">{step}</div>
      <div className="relative z-10 mb-1 text-[13px] font-medium text-[#e8e8ed]">{name}</div>
      <div className="relative z-10 mb-2.5 text-[11px] leading-snug text-[#b4b4c2]">{desc}</div>
      
      {/* Changed to inline-flex items-center and conditionally rendering the icon! */}
      <span className="relative z-10 inline-flex items-center gap-1 rounded bg-[rgba(0,212,200,0.08)] px-1.5 py-0.5 font-mono text-[10px] text-[#00d4c8]">
        {price !== 'free' && <CreditIcon size={12} color="#00d4c8" />}
        {price}
      </span>
    </button>
  );
}