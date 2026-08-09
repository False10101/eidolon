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

// ─── Helpers ───────────────────────────────────────────────────────────────────
const styleBadgeColors = {
  exam:     'border-[rgba(251,191,36,0.25)] text-[#fbbf24] bg-[rgba(251,191,36,0.07)]',
  standard: 'border-[rgba(0,212,200,0.25)] text-[var(--accent)] bg-[rgba(0,212,200,0.07)]',
  textbook: 'border-[rgba(139,92,246,0.25)] text-[#a78bfa] bg-[rgba(139,92,246,0.07)]',
};

function formatDate(ts, locale) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString(locale || 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

// ─── Unified note row ──────────────────────────────────────────────────────────
function NoteRow({ note, onOpen, onUnlock, unlocking }) {
  const t = useTranslations('notes');
  const locale = useLocale();

  const getStyleLabel = (style) => {
    if (style === 'exam') return t('examNote');
    if (style === 'standard') return t('standard');
    if (style === 'textbook') return t('textbook');
    return style;
  };

  const isGroup = note._type === 'group';

  if (note._locked) {
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

        {/* Name + meta */}
        <div className="relative flex-1 min-w-0 flex items-center gap-2">
          <div className="truncate text-[13.5px] font-medium text-[var(--fg-3)]">{note.name}</div>
          <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.04)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--fg-4)]">
            {t('group')}
          </span>
        </div>

        {/* Style — muted */}
        {note.style && (
          <span className={`relative flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] opacity-40 ${styleBadgeColors[note.style] ?? 'border-[var(--border)] text-[var(--fg-3)]'}`}>
            {getStyleLabel(note.style)}
          </span>
        )}

        {/* Unlock button */}
        <button
          onClick={() => onUnlock(note)}
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
              {t('unlock')} · {note.unlock_price} <CreditIcon size={11} />
              <LocalCreditPrice credits={note.unlock_price} />
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        )}
      </div>

      {/* Name + group badge */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="truncate text-[13.5px] font-medium text-[var(--fg)] group-hover:text-[var(--accent)] transition-colors">
          {note.name}
        </div>
        {isGroup && (
          <span className="flex-shrink-0 rounded border border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.07)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.07em] text-[var(--accent)]">
            {t('group')}
          </span>
        )}
      </div>

      {/* Style badge */}
      {note.style && (
        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] ${styleBadgeColors[note.style] ?? 'border-[var(--border)] text-[var(--fg-3)]'}`}>
          {getStyleLabel(note.style)}
        </span>
      )}

      {/* Cost */}
      <span className="flex w-28 flex-shrink-0 flex-col items-end text-right font-mono text-[12px] text-[var(--accent)]">
        {note.charge_amount != null ? <><span>{note.charge_amount}<CreditIcon size={11} className="ml-0.5" /></span><LocalCreditPrice credits={note.charge_amount} /></> : '—'}
      </span>

      {/* Date */}
      <span className="flex-shrink-0 w-28 text-right text-[11.5px] text-[var(--fg-3)]">
        {formatDate(note.created_at, locale)}
      </span>

      {/* Arrow */}
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--fg-3)] fill-none stroke-[1.8] opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0"
      >
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
function NoteListSkeleton() {
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
              {i % 3 === 0 && <div className="skeleton h-2.5 w-16 rounded" />}
            </div>
            <div className="skeleton h-5 w-20 rounded-full flex-shrink-0" />
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
function EmptyState({ icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center select-none">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] mb-3">
        {icon ?? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--fg-3)] fill-none stroke-[1.6]">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>
      <p className="text-[12.5px] text-[var(--fg-3)]">{message}</p>
      {sub && <p className="mt-1 text-[11.5px] text-[var(--fg-4)]">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['all', 'individual', 'group'];

export default function NoteListPage() {
  const router = useRouter();
  const t = useTranslations('notes');
  const { getAccessTokenSilently } = useAuth0();

  const [individual, setIndividual] = useState([]);
  const [group, setGroup] = useState([]);
  const [lockedGroup, setLockedGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/note/getNotes', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setIndividual(data.individual ?? []);
        setGroup(data.group?.filter(n => n.is_unlocked) ?? []);
        setLockedGroup(data.group?.filter(n => !n.is_unlocked) ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [getAccessTokenSilently]);

  const handleUnlock = async (note) => {
    setUnlockingId(note.public_id);
    setUnlockError(null);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/unlock', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: note.public_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error ?? t('errorUnlockFailed'));
        return;
      }
      setLockedGroup(prev => prev.filter(n => n.public_id !== note.public_id));
      setGroup(prev => [{ ...note }, ...prev]);
      router.push(`/note/${note.public_id}`);
    } catch {
      setUnlockError(t('errorGeneric'));
    } finally {
      setUnlockingId(null);
    }
  };

  // Merge (unsorted — sorting happens in filtered)
  const allNotes = useMemo(() => [
    ...individual.map(n => ({ ...n, _type: 'individual', _locked: false })),
    ...group.map(n => ({ ...n, _type: 'group', _locked: false })),
    ...lockedGroup.map(n => ({ ...n, _type: 'group', _locked: true })),
  ], [individual, group, lockedGroup]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const tabCounts = useMemo(() => ({
    all:        allNotes.length,
    individual: allNotes.filter(n => n._type === 'individual').length,
    group:      allNotes.filter(n => n._type === 'group').length,
  }), [allNotes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = allNotes
      .filter(n => activeTab === 'all' || n._type === activeTab)
      .filter(n => !q || n.name?.toLowerCase().includes(q) || n.lecture_topic?.toLowerCase().includes(q));

    return [...base].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name':
          return dir * (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase());
        case 'style': {
          const order = { exam: 0, standard: 1, textbook: 2 };
          return dir * ((order[a.style] ?? 9) - (order[b.style] ?? 9));
        }
        case 'charge_amount':
          return dir * (Number(a.charge_amount ?? 0) - Number(b.charge_amount ?? 0));
        case 'created_at':
        default:
          return dir * (new Date(a.created_at) - new Date(b.created_at));
      }
    });
  }, [allNotes, search, activeTab, sortKey, sortDir]);

  const tabLabel = (key) => key === 'all' ? 'All' : key === 'individual' ? t('individual') : t('group');

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
              onClick={() => router.push('/note/new')}
              className="btn-accent flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold transition-all"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('newNote')}
            </button>
          </div>

          {loading ? (
            <NoteListSkeleton />
          ) : (
            <motion.div
              className="flex-1 overflow-hidden px-8 py-4 flex flex-col gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {/* Search + tab filter */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Search */}
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[var(--fg-3)] fill-none stroke-[2]">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search notes…"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-8 pr-3 py-1.5 text-[12px] text-[var(--fg)] placeholder-[var(--fg-4)] outline-none focus:border-[var(--border-hover)] transition-colors"
                  />
                </div>

                {/* Tabs */}
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
                  <SortHeader label={t('nameHeader')} col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-1 min-w-0" />
                  <SortHeader label={t('styleHeader')} col="style" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-[88px] justify-center" />
                  <SortHeader label={t('costHeader')} col="charge_amount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-28 justify-end" />
                  <SortHeader label={t('dateHeader')} col="created_at" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} className="flex-shrink-0 w-28 justify-end" />
                  <div className="w-3.5 flex-shrink-0" />
                </div>
              )}

              {/* List */}
              {filtered.length === 0 ? (
                <EmptyState
                  message={search ? 'No notes match your search' : t('noNotesYet')}
                  sub={search ? 'Try a different keyword' : undefined}
                />
              ) : (
                <div
                  className="flex-1 overflow-y-auto flex flex-col gap-2 pb-2"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
                >
                  <AnimatePresence initial={false}>
                    {filtered.map((note, i) => (
                      <motion.div
                        key={note.public_id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.03, ease: 'easeOut' }}
                      >
                        <NoteRow
                          note={note}
                          onOpen={() => router.push(`/note/${note.public_id}`)}
                          onUnlock={handleUnlock}
                          unlocking={unlockingId === note.public_id}
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
