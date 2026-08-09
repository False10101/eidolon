'use client';

import {
  DocumentTextIcon,
  PencilSquareIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import { MusicalNoteIcon, LanguageIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import Navbar from '../navbar';
import CreditIcon from '../CreditIcon';
import LocalCreditPrice from '../LocalCreditPrice';
import { useTranslations, useLocale } from 'next-intl';
import HomeOnboard from '../HomeOnboard';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatLastLogin(dateString, t, locale) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dayLabel =
    date.toDateString() === now.toDateString() ? t('today') :
    date.toDateString() === yesterday.toDateString() ? t('yesterday') :
    date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });

  const timeLabel = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true });
  return t('bangkokTime', { day: dayLabel, time: timeLabel });
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const pipeline = [
  {
    step: 'Step 01', nameKey: 'pipeline1Name', href: '/audio-converter',
    descKey: 'pipeline1Desc', priceKey: 'pipeline1Price', isFree: true, isNew: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    step: 'Step 02', nameKey: 'pipeline2Name', href: '/transcriptor',
    descKey: 'pipeline2Desc', priceKey: 'pipeline2Price', isFree: false, isNew: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
      </svg>
    ),
  },
  {
    step: 'Step 03', nameKey: 'pipeline3Name', href: '/note',
    descKey: 'pipeline3Desc', priceKey: 'pipeline3Price', isFree: false, isNew: false,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    step: 'Step 04', nameKey: 'pipeline4Name', href: '/exam-prep',
    descKey: 'pipeline4Desc', priceKey: 'pipeline4Price', isFree: false, isNew: false, comingSoon: true,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

const routeMap = {
  note:       '/note',
  transcript: '/transcriptor',
  exam_prep:  '/exam-prep',
};

const USAGE_TYPES = [
  { key: 'note',       labelKey: 'usageNotes' },
  { key: 'transcript', labelKey: 'usageTranscriptor' },
  { key: 'exam_prep',  labelKey: 'usageExamPrep' },
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
    <div className="flex flex-1 flex-col gap-6 md:gap-8 overflow-y-auto overflow-x-hidden p-6 md:p-8 min-w-0">
      {/* Dashboard Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 w-full flex flex-col justify-center">
          <div className="skeleton h-3 w-40 rounded mb-3" />
          <div className="skeleton h-8 md:h-10 w-64 rounded-lg mb-2.5" />
          <div className="skeleton h-3 w-52 rounded" />
        </div>
        <div className="w-full md:w-auto md:min-w-[340px] flex items-center justify-between gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex flex-col">
            <div className="skeleton h-2.5 w-24 rounded mb-2" />
            <div className="skeleton h-7 w-20 rounded mb-2.5" />
            <div className="skeleton h-2.5 w-32 rounded" />
          </div>
          <div className="flex flex-col gap-2 w-full md:w-auto min-w-[120px]">
            <div className="skeleton h-8 w-full rounded-lg" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Pipeline Skeleton */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="h-px flex-1 bg-[var(--border)]"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 flex flex-col">
              <div className="skeleton h-10 w-10 rounded-lg mb-5" />
              <div className="skeleton h-2.5 w-16 rounded mb-2" />
              <div className="skeleton h-4 w-28 rounded mb-2.5" />
              <div className="skeleton h-3 w-full rounded mb-1" />
              <div className="skeleton h-3 w-4/5 rounded mb-6" />
              <div className="skeleton h-6 w-20 rounded-md mt-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 flex-1 min-h-0">
        {/* Activity table skeleton */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3.5">
            <div className="skeleton h-3 w-24 rounded" />
          </div>
          <div className="flex gap-4 border-b border-[var(--border)] px-4 py-2.5">
            {[80, 60, 56, 72].map((w, i) => (
              <div key={i} className="skeleton h-2 rounded" style={{ width: w }} />
            ))}
          </div>
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-[var(--border-faint)] px-4 py-3.5 last:border-0">
                <div className="skeleton h-3 rounded" style={{ width: `${100 + (i % 3) * 30}px` }} />
                <div className="skeleton h-4 w-20 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Monthly usage skeleton */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 flex items-center justify-between">
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
                <div className="h-[3px] w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                  <div
                    className="skeleton h-full rounded-full"
                    style={{ width: `${60 - i * 15}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-auto pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2 flex flex-col gap-1.5">
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
  const t = useTranslations("home");
  const locale = useLocale();

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

  const estimatedGens = Math.floor((userData.balance ?? 0) / 6);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar balance={userData.balance} />

      <div className="flex flex-1 overflow-hidden">
        {isLoading || dataLoading ? (
          <HomeSkeleton />
        ) : (
          <motion.main
            className="flex flex-1 flex-col gap-6 md:gap-8 overflow-y-auto overflow-x-hidden p-6 md:p-8 min-w-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* ── Dashboard Header ── */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">

              {/* Left Box: Welcome */}
              <div className="flex-1 w-full flex flex-col justify-center">

                {/* Decorative Status Pill */}
                <div className="mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                  </span>
                  System Online <span className="text-[var(--fg-4)]">|</span> {new Date().toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
                </div>

                <h1 className="font-serif text-[28px] md:text-[34px] font-normal tracking-[-0.02em] text-[var(--fg)] mb-2.5 leading-none">
                  {t("welcomeBack")} <span className="text-[var(--accent)]">{userData.username}</span>
                </h1>

                {/* Clean inline meta info */}
                <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--fg-3)]">
                  <p>
                    { t("lastLogin") } <span className="text-[var(--fg-2)]">{formatLastLogin(userData.last_login, t, locale)}</span>
                  </p>
                  <span className="text-[var(--border)]">{'//'}</span>
                  <p>
                    PLAN: <span className="text-[var(--fg-2)]">{userData.plan ? String(userData.plan).toUpperCase() : 'PAY-AS-YOU-GO'}</span>
                  </p>
                </div>
              </div>

              {/* Right Box: Balance & Actions (Flattened) */}
              <div data-onboard="balance" className="w-full md:w-auto md:min-w-[340px] flex items-center justify-between gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
                <div className="flex flex-col">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)]">{t("balanceRemaining")}</div>
                  <div className="flex items-center gap-2 font-mono text-[24px] font-medium leading-none text-[var(--accent)]">
                    <CreditIcon size={20} color="var(--accent)" />
                    {userData.balance ?? '—'}
                  </div>
                  <div className="mt-1.5 text-[11px] text-[var(--fg-2)]">
                    ~{estimatedGens} {t('generationsLeft')}
                  </div>
                </div>

              <div className="flex flex-col gap-2 w-full md:w-auto">
                <button
                  onClick={() => router.push('/topup')}
                  className="btn-accent flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-medium transition-all whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Top Up
                </button>
                <button
                  onClick={() => router.push('/pricing')}
                  className="btn-surface flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-medium transition-all whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  {t('viewPricing')}
                </button>
              </div>
              </div>
            </motion.div>

            {/* ── Pipeline ── */}
            <motion.div variants={itemVariants}>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-3)]">{ t("yourPipeline") }</span>
                <span className="h-px flex-1 bg-[var(--border)]"></span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-onboard="pipeline">
                {pipeline.map((p) => {
                  let dataOnboard = null;
                  if (p.href === '/audio-converter') dataOnboard = "step-01";
                  if (p.href === '/note') dataOnboard = "step-03";
                  return <PipelineCard key={p.href} {...p} dataOnboard={dataOnboard} onClick={p.comingSoon ? undefined : () => router.push(p.href)} />;
                })}
              </div>
            </motion.div>

            {/* ── Bottom grid ── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 flex-1 min-h-0">

              {/* Activity table */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3.5">
                  <span className="text-[12px] font-medium tracking-[0.02em] text-[var(--fg-2)]">{t("recentActivity")}</span>
                </div>
                <div className="flex-1 overflow-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-raised) transparent' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {[t('colTitle'), t('colType'), t('colStatus'), t('colDate')].map((h) => (
                          <th key={h} className="border-b border-[var(--border)] px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.08em] text-[var(--fg-3)] font-normal whitespace-nowrap">
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
                            onView={
                              routeMap[activity.type] && activity.public_id
                                ? () => router.push(`${routeMap[activity.type]}/${activity.public_id}`)
                                : null
                            }
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* {t("monthlyUsage")} */}
              <MonthlyUsage data={monthlyUsage} />

            </motion.div>
          </motion.main>
        )}
      </div>

      <HomeOnboard />
    </div>
  );
}

// ─── ActivityRow ───────────────────────────────────────────────────────────────
function ActivityRow({ activity, index, onView }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const typeDisplayMap = {
    note:       t('typeNote'),
    transcript: t('typeTranscript'),
    exam_prep:  t('typeExamPrep'),
    topup:      t('typeTopup'),
    rebate:     t('typeRebate'),
  };
  const statusLower = activity.status?.toLowerCase();
  const statusStyle =
    statusLower === 'completed'  ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]' :
    statusLower === 'failed'     ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]' :
    statusLower === 'processing' ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
    statusLower === 'pending'    ? 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' : '';
  const clickable = typeof onView === 'function';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index, 5) * 0.04, duration: 0.3, ease: 'easeOut' }}
      onClick={clickable ? onView : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView();
        }
      } : undefined}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      className={`border-b border-[var(--border-faint)] last:border-0 transition-colors ${
        clickable ? 'cursor-pointer hover:bg-[var(--surface-raised)] focus-visible:bg-[var(--surface-raised)] focus-visible:outline-none' : ''
      }`}
    >
      <td className="max-w-[180px] truncate px-4 py-3 text-[13px] text-[var(--fg)]">{activity.title}</td>
      <td className="px-4 py-3">
        <span className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-1.5 py-0.5 capitalize font-mono text-[10px] text-[var(--fg-2)] whitespace-nowrap">
          {typeDisplayMap[activity.type] ?? activity.type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] capitalize font-medium ${statusStyle}`}>
          <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-current" />
          {activity.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[var(--fg-3)]">
        {new Date(activity.date).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: '2-digit' })}
        {' '}
        <span className="text-[var(--fg-4)]">
          {new Date(activity.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
      </td>
    </motion.tr>
  );
}

// ─── MonthlyUsage ──────────────────────────────────────────────────────────────
function MonthlyUsage({ data }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const counts = USAGE_TYPES.map(c => ({
    ...c,
    label: t(c.labelKey),
    count: parseInt(data.find(d => d.type === c.key)?.totalUsage ?? 0),
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 flex items-center justify-between">
        <span className="text-[12px] font-medium tracking-[0.02em] text-[var(--fg-2)]">{t("monthlyUsage")}</span>
        <span className="text-[10px] text-[var(--fg-3)] font-mono">
          {new Date().toLocaleString(locale, { month: 'long', timeZone: 'Asia/Bangkok' })}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 px-4 py-5 flex-1 justify-start">
        {counts.map((c) => {
          const pct = Math.round((c.count / max) * 100);
          return (
            <div key={c.key} className="flex flex-col gap-2 px-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--fg-2)]">{c.label}</span>
                <span className="font-mono text-[var(--fg-2)]"><span className="text-[var(--fg)]">{c.count}</span> {t('calls')}</span>
              </div>
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: c.count > 0 ? 'var(--accent)' : 'transparent' }}
                />
              </div>
            </div>
          );
        })}
        <div className="mt-auto pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-2">
          {counts.map(({ key, label, count }) => (
            <div key={key} className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-2">
              <div className="text-[10px] text-[var(--fg-3)] truncate">{label}</div>
              <div className="font-mono text-[13px] text-[var(--fg)]">{count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PipelineCard ──────────────────────────────────────────────────────────────
function PipelineCard({ step, nameKey, descKey, priceKey, isFree, isNew, comingSoon, icon, onClick, dataOnboard }) {
  const t = useTranslations("home");
  return (
    <button
      onClick={onClick}
      disabled={comingSoon}
      data-onboard={dataOnboard}
      // Flat, solid background. Hover effect relies entirely on border color now.
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left transition-colors duration-200 ${comingSoon ? 'cursor-not-allowed opacity-65' : 'hover:border-[rgba(0,212,200,0.5)] hover:bg-[var(--surface-raised)]'}`}
    >
      {isNew && (
        <span className="absolute right-4 top-4 z-10 rounded border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.1)] px-1.5 py-0.5 text-[9px] font-medium tracking-[0.04em] text-[var(--accent)]">
          {t('newBadge')}
        </span>
      )}
      {comingSoon && (
        <span className="absolute right-4 top-4 z-10 rounded border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.08)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.05em] text-[var(--accent)]">
          Coming Soon
        </span>
      )}

      {/* Flattened Icon Container: no gradients, just a solid dark box with a border */}
      <div className="relative z-10 mb-5 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-colors duration-200 group-hover:border-[rgba(0,212,200,0.3)]">
        {icon}
      </div>

      <div className="relative z-10 mb-1 text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] font-medium">{step}</div>
      <div className="relative z-10 mb-1.5 text-[15px] font-medium text-[var(--fg)]">{t(nameKey)}</div>
      <div className="relative z-10 mb-5 text-[12px] leading-relaxed text-[var(--fg-2)]">{t(descKey)}</div>

      {/* Flat pill badge at the bottom */}
      <span className="relative z-10 mt-auto self-start w-fit inline-flex items-center gap-1.5 rounded-md border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.05)] px-2.5 py-1 font-mono text-[10px] text-[var(--accent)]">
        {!comingSoon && !isFree && <CreditIcon size={12} color="var(--accent)" />}
        {comingSoon ? 'Coming Soon' : t(priceKey)}
        {!comingSoon && !isFree && <LocalCreditPrice credits={t(priceKey)} />}
      </span>
    </button>
  );
}
