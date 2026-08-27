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
import LocalCreditPrice from '../LocalCreditPrice';
import CategoryBadge from '../CategoryBadge';

const TABS = ['all', 'individual', 'group'];

function formatDate(ts, locale) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(str).toLocaleString(locale || 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
    hour12: false,
  });
}

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

function getDisplayedPaidAmount(transcript) {
  return transcript._type === 'group'
    ? (transcript.viewer_paid_amount ?? 0)
    : transcript.charge_amount;
}

function TranscriptRow({ transcript, onOpen, onUnlock, unlocking }) {
  const locale = useLocale();
  const t = useTranslations('transcriptor');
  const isGroup = transcript._type === 'group';
  const paidAmount = getDisplayedPaidAmount(transcript);

  if (transcript._locked) {
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

        {/* Name + meta stacked */}
        <div className="relative flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
          <div className="flex items-center gap-2">
            <div className="truncate text-[13.5px] font-medium text-[var(--fg-3)]">
              {transcript.label}
            </div>
            <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.04)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--fg-4)]">
              {t('group')}
            </span>
          </div>
          {transcript.categorization && (
            <div className="flex items-start">
              <CategoryBadge category={transcript.categorization} muted />
            </div>
          )}
        </div>

        {/* Duration — muted */}
        <span className="relative w-20 flex-shrink-0 text-right font-mono text-[12px] text-[var(--fg-4)] pr-[18px]">
          {formatDuration(transcript.duration)}
        </span>

        {/* Unlock button */}
        <button
          onClick={() => onUnlock(transcript)}
          disabled={unlocking}
          className="relative flex flex-shrink-0 w-[142px] justify-center items-center gap-1.5 rounded-lg border border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--accent)] transition-all hover:bg-[rgba(0,212,200,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {unlocking ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
              Unlock...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2]">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
              Unlock · {transcript.unlock_price} <CreditIcon size={11} />
              <LocalCreditPrice credits={transcript.unlock_price} />
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
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] transition-colors group-hover:border-[rgba(0,212,200,0.2)] group-hover:bg-[rgba(0,212,200,0.05)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[1.6] transition-colors group-hover:stroke-[var(--accent)]">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>

      {/* Name + meta stacked */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 py-0.5">
        <div className="flex items-center gap-2">
          <div className="truncate text-[13.5px] font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
            {transcript.label}
          </div>
          {isGroup && (
            <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.07)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--accent)]">
              {t('group')}
            </span>
          )}
        </div>
        {transcript.categorization && (
          <div className="flex items-start">
            <CategoryBadge category={transcript.categorization} />
          </div>
        )}
      </div>

      <span className="w-20 flex-shrink-0 text-right font-mono text-[12px] text-[var(--accent)] pr-[18px]">
        {formatDuration(transcript.duration)}
      </span>

      <span className="flex w-28 flex-shrink-0 flex-col items-end text-right font-mono text-[12px] text-[var(--accent)]">
        {paidAmount != null ? <><span>{paidAmount}<CreditIcon size={11} className="ml-0.5" /></span><LocalCreditPrice credits={paidAmount} /></> : '—'}
      </span>

      <span className="w-28 flex-shrink-0 text-right text-[11.5px] text-[var(--fg-3)] pr-3">
        {formatDate(transcript.created_at, locale)}
      </span>

      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-[1.8] opacity-0 transition-all duration-150 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function SortHeader({ label, col, sortKey, sortDir, onSort, className = '' }) {
  const active = sortKey === col;

  return (
    <div
      onClick={() => onSort(col)}
      className={`group flex cursor-pointer items-center gap-1.5 select-none text-[10px] uppercase tracking-[0.07em] transition-colors
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

function TranscriptListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden px-8 py-4">
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="skeleton h-8 flex-1 rounded-lg" />
      </div>
      <div className="flex flex-shrink-0 items-center gap-4 px-5">
        {[36, 140, 80, 112, 14].map((w, i) => (
          <div key={i} className="skeleton h-2 rounded" style={{ width: w }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5">
            <div className="skeleton h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-2 py-0.5">
              <div className="flex items-center gap-2">
                <div className="skeleton h-3.5 rounded" style={{ width: `${120 + (i % 5) * 30}px` }} />
                {i % 3 === 0 && <div className="skeleton h-3 w-10 rounded flex-shrink-0" />}
              </div>
              <div className="skeleton h-2.5 rounded" style={{ width: `${60 + (i % 3) * 20}px` }} />
            </div>
            <div className="skeleton h-3 w-14 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-24 rounded flex-shrink-0" />
            <div className="skeleton h-3.5 w-3.5 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="select-none py-16 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] mx-auto">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[1.6]">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      <p className="text-[12.5px] text-[var(--fg-3)]">{message}</p>
      {sub && <p className="mt-1 text-[11.5px] text-[var(--fg-4)]">{sub}</p>}
    </div>
  );
}

export default function TranscriptListPage() {
  const router = useRouter();
  const t = useTranslations('transcriptor');
  const { getAccessTokenSilently } = useAuth0();

  const [individual, setIndividual]   = useState([]);
  const [group, setGroup]             = useState([]);
  const [lockedGroup, setLockedGroup] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState(null);
  const [search, setSearch]           = useState('');
  const [activeTab, setActiveTab]     = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortKey, setSortKey]         = useState('created_at');
  const [sortDir, setSortDir]         = useState('desc');

  useEffect(() => {
    const fetchList = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/transcript/getHistory', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setIndividual(data.individual ?? []);
        setGroup(data.group?.filter(tr => tr.is_unlocked) ?? []);
        setLockedGroup(data.group?.filter(tr => !tr.is_unlocked) ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [getAccessTokenSilently]);

  const handleUnlock = async (tr) => {
    setUnlockingId(tr.public_id);
    setUnlockError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/transcript/unlock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: tr.public_id }),
      });
      const data = await res.json();
      if (!res.ok) { setUnlockError(data.error ?? 'Unlock failed'); return; }

      setLockedGroup(prev => prev.filter(e => e.public_id !== tr.public_id));
      setGroup(prev => [{ ...tr }, ...prev]);
      router.push(`/transcriptor/${tr.public_id}`);
    } catch {
      setUnlockError('An error occurred');
    } finally {
      setUnlockingId(null);
    }
  };

  const allItems = useMemo(() => [
    ...individual.map(tr => ({ ...tr, _type: 'individual', _locked: false })),
    ...group.map(tr => ({ ...tr, _type: 'group', _locked: false })),
    ...lockedGroup.map(tr => ({ ...tr, _type: 'group', _locked: true })),
  ], [individual, group, lockedGroup]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const tabCounts = useMemo(() => ({
    all:        allItems.length,
    individual: allItems.filter(tr => tr._type === 'individual').length,
    group:      allItems.filter(tr => tr._type === 'group').length,
  }), [allItems]);

  const categoryOptions = useMemo(() => {
    const byId = new Map();
    allItems.forEach((item) => {
      if (item.categorization) byId.set(String(item.categorization.id), item.categorization);
    });
    return [...byId.values()].sort((a, b) => {
      const left = `${a.course_name ?? ''} ${a.period_label ?? ''}`;
      const right = `${b.course_name ?? ''} ${b.period_label ?? ''}`;
      return left.localeCompare(right);
    });
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = allItems
      .filter(tr => activeTab === 'all' || tr._type === activeTab)
      .filter((item) => activeCategory === 'all'
        || (activeCategory === 'uncategorized' && !item.categorization)
        || String(item.categorization?.id) === activeCategory)
      .filter((item) => !q
        || item.label?.toLowerCase().includes(q)
        || item.categorization?.course_name?.toLowerCase().includes(q)
        || item.categorization?.period_label?.toLowerCase().includes(q));

    return [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'label':
          return dir * (a.label ?? '').toLowerCase().localeCompare((b.label ?? '').toLowerCase());
        case 'duration':
          return dir * ((Number(a.duration) || 0) - (Number(b.duration) || 0));
        case 'charge_amount':
          return dir * (Number(getDisplayedPaidAmount(a) ?? 0) - Number(getDisplayedPaidAmount(b) ?? 0));
        case 'created_at':
        default:
          return dir * (new Date(a.created_at) - new Date(b.created_at));
      }
    });
  }, [allItems, search, activeTab, activeCategory, sortKey, sortDir]);

  const tabLabel = (key) => {
    if (key === 'all') return 'All';
    if (key === 'individual') return 'Individual';
    return 'Group';
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <AnimatePresence>
        {unlockError && <ErrorModal message={unlockError} onClose={() => setUnlockError(null)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
          <div className="flex flex-shrink-0 items-center justify-between px-8 pt-6 pb-0">
            <div>
              <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                {t('title')}
              </h1>
              <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">{t('subtitle')}</p>
            </div>
            <button
              onClick={() => router.push('/transcriptor/new')}
              className="btn-accent flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('newTranscript')}
            </button>
          </div>

          {loading ? (
            <TranscriptListSkeleton />
          ) : (
            <motion.div
              className="flex flex-1 flex-col gap-3 overflow-hidden px-8 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[var(--fg-3)] fill-none stroke-[2]">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search transcripts…"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1.5 text-[12px] text-[var(--fg)] placeholder-[var(--fg-4)] outline-none focus:border-[var(--border-hover)] transition-colors"
                  />
                </div>

                {/* Custom Styled Select Dropdown */}
                <div className="relative flex-shrink-0">
                  <select
                    value={activeCategory}
                    onChange={(event) => setActiveCategory(event.target.value)}
                    aria-label="Filter transcripts by category"
                    className="w-[200px] appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-3 pr-8 py-1.5 text-[12px] text-[var(--fg)] outline-none focus:border-[var(--border-hover)] transition-colors cursor-pointer"
                  >
                    <option value="all">All categories</option>
                    <option value="uncategorized">Uncategorized</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.course_name}{category.period_label ? ` / ${category.period_label}` : ''}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[var(--fg-4)] fill-none stroke-[2]">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
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
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium leading-none
                        ${activeTab === key ? 'bg-[var(--fg)] text-[var(--bg)]' : 'bg-[var(--border-strong)] text-[var(--fg-4)]'}`}
                      >
                        {tabCounts[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length > 0 && (
                <div className="flex flex-shrink-0 items-center gap-4 px-5">
                  <div className="w-9 flex-shrink-0" />
                  <SortHeader label="Label" col="label" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1 min-w-0" />
                  <SortHeader label="Duration" col="duration" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-20 flex-shrink-0 justify-end" />
                  <SortHeader label="Cost" col="charge_amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28 flex-shrink-0 justify-end" />
                  <SortHeader label="Date" col="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="w-28 flex-shrink-0 justify-end pr-3" />
                  <div className="w-3.5 flex-shrink-0" />
                </div>
              )}

              {filtered.length === 0 ? (
                <EmptyState
                  message={search || activeCategory !== 'all' ? 'No transcripts match these filters' : t('noTranscriptsYet')}
                  sub={search || activeCategory !== 'all' ? 'Try a different search or category' : undefined}
                />
              ) : (
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                  {filtered.map((transcript, i) => (
                    <motion.div
                      key={transcript.public_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.03, ease: 'easeOut' }}
                    >
                      <TranscriptRow
                        transcript={transcript}
                        onOpen={() => router.push(`/transcriptor/${transcript.public_id}`)}
                        onUnlock={handleUnlock}
                        unlocking={unlockingId === transcript.public_id}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
