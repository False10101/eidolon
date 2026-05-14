'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import ErrorModal from '../ErrorModal';
import CreditIcon from '../CreditIcon';

// ─── Constants ─────────────────────────────────────────────────────────────────
const TYPE_STYLES = {
  tf:          { label: 'T/F',      bg: 'bg-[rgba(34,197,94,0.1)]',  text: 'text-[#22c55e]',       border: 'border-[rgba(34,197,94,0.2)]' },
  mcq:         { label: 'MCQ',      bg: 'bg-[rgba(139,92,246,0.1)]', text: 'text-[#a78bfa]',        border: 'border-[rgba(139,92,246,0.2)]' },
  theory:      { label: 'Theory',   bg: 'bg-[rgba(0,212,200,0.08)]', text: 'text-[var(--accent)]',  border: 'border-[rgba(0,212,200,0.2)]' },
  scenario:    { label: 'Scenario', bg: 'bg-[rgba(249,115,22,0.1)]', text: 'text-[#fb923c]',        border: 'border-[rgba(249,115,22,0.2)]' },
  calculation: { label: 'Calc',     bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[#f59e0b]',        border: 'border-[rgba(245,158,11,0.2)]' },
};

const difficultyColors = {
  easy:   'border-[rgba(34,197,94,0.25)]  text-[#22c55e]       bg-[rgba(34,197,94,0.07)]',
  normal: 'border-[rgba(0,212,200,0.25)]  text-[var(--accent)] bg-[rgba(0,212,200,0.07)]',
  hard:   'border-[rgba(239,68,68,0.25)]  text-[#ef4444]       bg-[rgba(239,68,68,0.07)]',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts, locale) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(str).toLocaleString(locale || 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

// ─── Type chips ────────────────────────────────────────────────────────────────
function TypeChips({ questionType, muted }) {
  const types = (questionType ?? '').split(',').filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => {
        const s = TYPE_STYLES[t];
        if (!s) return null;
        return (
          <span key={t} className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.05em] ${s.bg} ${s.text} ${s.border} ${muted ? 'opacity-50' : ''}`}>
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Unified row ───────────────────────────────────────────────────────────────
function ExamPrepRow({ ep, onOpen, onUnlock, unlocking }) {
  const t = useTranslations('examPrep');
  const locale = useLocale();
  const isGroup = ep._type === 'group';

  if (ep._locked) {
    return (
      <div className="relative flex w-full items-center gap-4 rounded-xl border border-[var(--border-faint)] bg-[var(--surface)] px-5 py-3.5">
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--bg)]/25" />

        {/* Lock icon */}
        <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[var(--fg-4)] fill-none stroke-[1.6]">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Label + group badge */}
        <div className="relative flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="truncate text-[13.5px] font-medium text-[var(--fg-3)]">{ep.label}</div>
            <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.04)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--fg-4)]">
              {t('groupSection')}
            </span>
          </div>
          <TypeChips questionType={ep.question_type} muted />
        </div>

        {/* Difficulty — muted */}
        {ep.difficulty && (
          <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] capitalize opacity-40 ${difficultyColors[ep.difficulty] ?? 'border-[var(--border)] text-[var(--fg-3)]'}`}>
            {t(ep.difficulty)}
          </span>
        )}

        {/* Unlock button */}
        <button
          onClick={() => onUnlock(ep)}
          disabled={unlocking}
          className="relative flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--accent)] transition-all hover:bg-[rgba(0,212,200,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {unlocking ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
              {t('unlocking')}
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              {t('unlock')} · {ep.unlock_price} <CreditIcon size={11} />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 text-left transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)] surface noise"
    >
      {/* Icon */}
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors
        ${isGroup
          ? 'border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.06)] group-hover:border-[rgba(0,212,200,0.3)]'
          : 'border-[var(--border)] bg-[var(--surface-raised)] group-hover:border-[rgba(0,212,200,0.2)] group-hover:bg-[rgba(0,212,200,0.05)]'
        }`}
      >
        {isGroup ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--accent)] fill-none stroke-[1.6]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[1.6] transition-colors group-hover:stroke-[var(--accent)]">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )}
      </div>

      {/* Label + group badge + type chips */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="truncate text-[13.5px] font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
            {ep.label}
          </div>
          {isGroup && (
            <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.07)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--accent)]">
              {t('groupSection')}
            </span>
          )}
        </div>
        <TypeChips questionType={ep.question_type} />
      </div>

      {/* Difficulty */}
      {ep.difficulty && (
        <span className={`flex-shrink-0 w-20 text-center rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] capitalize ${difficultyColors[ep.difficulty] ?? 'border-[var(--border)] text-[var(--fg-3)]'}`}>
          {t(ep.difficulty)}
        </span>
      )}

      {/* Cost */}
      <span className="flex-shrink-0 w-16 text-right font-mono text-[12px] text-[var(--accent)]">
        {ep.charge_amount != null ? <>{ep.charge_amount}<CreditIcon size={11} className="ml-0.5" /></> : '—'}
      </span>

      {/* Date */}
      <span className="flex-shrink-0 w-28 text-right text-[11.5px] text-[var(--fg-3)]">
        {formatDate(ep.created_at, locale)}
      </span>

      {/* Arrow */}
      <svg viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-[1.8] opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Sort header ───────────────────────────────────────────────────────────────
function SortHeader({ label, col, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === col;
  return (
    <div
      onClick={() => onSort(col)}
      className={`group flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-[0.07em] transition-colors select-none
        ${active ? 'text-[var(--accent)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'}
        ${className}`}
    >
      {label}
      <svg viewBox="0 0 24 24" className={`h-3 w-3 flex-shrink-0 stroke-current fill-none stroke-[2.5] transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
        {active && sortDir === 'asc'
          ? <polyline points="18 15 12 9 6 15" />
          : <polyline points="6 9 12 15 18 9" />
        }
      </svg>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ExamPrepSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-8 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="skeleton h-8 flex-1 rounded-lg" />
        <div className="skeleton h-8 w-52 rounded-lg" />
      </div>
      <div className="flex items-center gap-4 px-5 flex-shrink-0">
        {[36, 120, 80, 60, 64, 112, 14].map((w, i) => (
          <div key={i} className="skeleton h-2 rounded" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5">
            <div className="skeleton h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="skeleton h-3.5 rounded" style={{ width: `${120 + (i % 5) * 30}px` }} />
              <div className="flex gap-1">
                {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                  <div key={j} className="skeleton h-4 w-9 rounded-full" />
                ))}
              </div>
            </div>
            <div className="skeleton h-5 w-16 rounded-full flex-shrink-0" />
            <div className="skeleton h-3 w-12 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-24 rounded flex-shrink-0" />
            <div className="skeleton h-3.5 w-3.5 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] mb-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[1.6]">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <p className="text-[12.5px] text-[var(--fg-3)]">{message}</p>
      {sub && <p className="mt-1 text-[11.5px] text-[var(--fg-4)]">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['all', 'individual', 'group'];

export default function ExamPrepListPage() {
  const router = useRouter();
  const t = useTranslations('examPrep');
  const { getAccessTokenSilently } = useAuth0();

  const [individual, setIndividual]   = useState([]);
  const [group, setGroup]             = useState([]);
  const [lockedGroup, setLockedGroup] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState(null);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('all');
  const [sortKey, setSortKey]         = useState('created_at');
  const [sortDir, setSortDir]         = useState('desc');

  useEffect(() => {
    const fetchList = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch('/api/exam-prep/getList', { headers: { Authorization: `Bearer ${token}` } });
        const data  = await res.json();
        setIndividual(data.individual ?? []);
        setGroup(data.group?.filter(ep => ep.is_unlocked) ?? []);
        setLockedGroup(data.group?.filter(ep => !ep.is_unlocked) ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [getAccessTokenSilently]);

  const handleUnlock = async (ep) => {
    setUnlockingId(ep.public_id);
    setUnlockError(null);
    try {
      const token = await getAccessTokenSilently();
      const res   = await fetch('/api/exam-prep/unlock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: ep.public_id }),
      });
      const data = await res.json();
      if (!res.ok) { setUnlockError(data.error ?? t('errorUnlockFailed')); return; }
      setLockedGroup(prev => prev.filter(e => e.public_id !== ep.public_id));
      setGroup(prev => [{ ...ep }, ...prev]);
      router.push(`/exam-prep/${ep.public_id}`);
    } catch {
      setUnlockError(t('errorGeneric'));
    } finally {
      setUnlockingId(null);
    }
  };

  // Merge (unsorted — sorting happens in filtered)
  const allItems = useMemo(() => [
    ...individual.map(ep => ({ ...ep, _type: 'individual', _locked: false })),
    ...group.map(ep => ({ ...ep, _type: 'group', _locked: false })),
    ...lockedGroup.map(ep => ({ ...ep, _type: 'group', _locked: true })),
  ], [individual, group, lockedGroup]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const tabCounts = useMemo(() => ({
    all:        allItems.length,
    individual: allItems.filter(ep => ep._type === 'individual').length,
    group:      allItems.filter(ep => ep._type === 'group').length,
  }), [allItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = allItems
      .filter(ep => activeTab === 'all' || ep._type === activeTab)
      .filter(ep => !q || ep.label?.toLowerCase().includes(q) || ep.difficulty?.toLowerCase().includes(q));

    const diffOrder = { easy: 0, normal: 1, hard: 2 };
    return [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'label':
          return dir * (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase());
        case 'difficulty':
          return dir * ((diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9));
        case 'charge_amount':
          return dir * (Number(a.charge_amount ?? 0) - Number(b.charge_amount ?? 0));
        case 'created_at':
        default:
          return dir * (new Date(a.created_at) - new Date(b.created_at));
      }
    });
  }, [allItems, search, activeTab, sortKey, sortDir]);

  const tabLabel = (key) => {
    if (key === 'all') return 'All';
    if (key === 'individual') return t('individualSection');
    return t('groupSection');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">

      <AnimatePresence>
        {unlockError && <ErrorModal message={unlockError} onClose={() => setUnlockError(null)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">

          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-8 pt-6 pb-0">
            <div>
              <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                {t('title')}
              </h1>
              <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">{t('subtitle')}</p>
            </div>
            <button
              onClick={() => router.push('/exam-prep/new')}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[13px] font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('newExamPrep')}
            </button>
          </div>

          {loading ? (
            <ExamPrepSkeleton />
          ) : (
            <motion.div
              className="flex-1 overflow-hidden px-8 py-4 flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {/* Search + tabs */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[var(--fg-3)] fill-none stroke-[2]">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search exam preps…"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1.5 text-[12px] text-[var(--fg)] placeholder-[var(--fg-4)] outline-none focus:border-[var(--border-hover)] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
                  {TABS.map(key => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[12px] transition-all duration-150
                        ${activeTab === key
                          ? 'bg-[var(--surface-raised)] text-[var(--fg)]'
                          : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'
                        }`}
                    >
                      {tabLabel(key)}
                      <span className={`font-mono text-[10px] ${activeTab === key ? 'text-[var(--accent)]' : 'text-[var(--fg-4)]'}`}>
                        {tabCounts[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Column headers */}
              {filtered.length > 0 && (
                <div className="flex items-center gap-4 px-5 flex-shrink-0">
                  <div className="w-9 flex-shrink-0" />
                  <SortHeader label={t('labelHeader')} col="label" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1 min-w-0" />
                  <SortHeader label={t('difficultyHeader')} col="difficulty" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-20 justify-center" />
                  <SortHeader label={t('costHeader')} col="charge_amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-16 justify-end" />
                  <SortHeader label={t('dateHeader')} col="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-28 justify-end" />
                  <div className="w-3.5 flex-shrink-0" />
                </div>
              )}

              {/* List */}
              {filtered.length === 0 ? (
                <EmptyState
                  message={search ? 'No exam preps match your search' : t('noExamPrepsYet')}
                  sub={search ? 'Try a different keyword' : undefined}
                />
              ) : (
                <div
                  className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                >
                  <AnimatePresence initial={false}>
                    {filtered.map((ep, i) => (
                      <motion.div
                        key={ep.public_id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.03, ease: 'easeOut' }}
                      >
                        <ExamPrepRow
                          ep={ep}
                          onOpen={() => router.push(`/exam-prep/${ep.public_id}`)}
                          onUnlock={handleUnlock}
                          unlocking={unlockingId === ep.public_id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
