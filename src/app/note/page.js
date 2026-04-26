'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import ErrorModal from '../ErrorModal';
import CreditIcon from '../CreditIcon';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const styleLabels = { exam: 'Exam', standard: 'Standard', textbook: 'Textbook' };
const styleBadgeColors = {
  exam: 'border-[rgba(251,191,36,0.25)] text-[#fbbf24] bg-[rgba(251,191,36,0.07)]',
  standard: 'border-[rgba(0,212,200,0.25)]  text-[#00d4c8] bg-[rgba(0,212,200,0.07)]',
  textbook: 'border-[rgba(139,92,246,0.25)] text-[#a78bfa] bg-[rgba(139,92,246,0.07)]',
};

function getTier(tokens) {
  if (!tokens) return null;
  if (tokens <= 25000) return 'T1';
  if (tokens <= 50000) return 'T2';
  if (tokens <= 75000) return 'T3';
  return 'T4';
}

function formatDate(ts) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function NoteListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-8 py-5 flex flex-col gap-4">
      {/* Group skeleton — 40% */}
      <div className="flex flex-col gap-2 min-h-0" style={{ flex: '40 40 0%' }}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="skeleton h-2.5 w-12 rounded" />
          <div className="flex-1 h-px bg-white/[0.05]" />
          <div className="skeleton h-2.5 w-10 rounded" />
        </div>
        <div className="skeleton h-8 w-full rounded-lg flex-shrink-0" />
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.07] bg-[#111116] p-5 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="skeleton h-9 w-9 rounded-lg" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="skeleton h-3.5 w-40 rounded" />
                    <div className="skeleton h-2.5 w-24 rounded" />
                  </div>
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="flex justify-between">
                  <div className="skeleton h-2.5 w-20 rounded" />
                  <div className="skeleton h-2.5 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual skeleton — 60% */}
      <div className="flex flex-col gap-2 min-h-0" style={{ flex: '60 60 0%' }}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="skeleton h-2.5 w-16 rounded" />
          <div className="flex-1 h-px bg-white/[0.05]" />
          <div className="skeleton h-2.5 w-10 rounded" />
        </div>
        <div className="skeleton h-8 w-full rounded-lg flex-shrink-0" />
        <div className="flex items-center gap-4 px-5 flex-shrink-0">
          {[36, 120, 96, 40, 64, 112].map((w, i) => (
            <div key={i} className="skeleton h-2 rounded flex-shrink-0" style={{ width: w }} />
          ))}
        </div>
        <div className="flex-1 overflow-hidden flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-4 flex-shrink-0">
              <div className="skeleton h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="skeleton h-3.5 rounded" style={{ width: `${140 + (i % 3) * 40}px` }} />
                <div className="skeleton h-2.5 w-24 rounded" />
              </div>
              <div className="skeleton h-5 w-24 rounded-full flex-shrink-0" />
              <div className="skeleton h-3 w-10 rounded flex-shrink-0" />
              <div className="skeleton h-3 w-16 rounded flex-shrink-0" />
              <div className="skeleton h-3 w-28 rounded flex-shrink-0" />
              <div className="skeleton h-3.5 w-3.5 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181f] mb-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#9a9aaa] fill-none stroke-[1.6]">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <p className="text-[12px] text-[#9a9aaa]">{message}</p>
    </div>
  );
}

// ─── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ label, count }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
      {count != null && (
        <span className="text-[11px] text-[#9a9aaa] select-none">{count} {count === 1 ? 'note' : 'notes'}</span>
      )}
    </div>
  );
}

// ─── Individual row ────────────────────────────────────────────────────────────
function IndividualRow({ note, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-4 text-left transition-colors duration-150 hover:border-white/[0.12] hover:bg-[#14141a] surface noise"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-colors group-hover:border-[rgba(0,212,200,0.2)] group-hover:bg-[rgba(0,212,200,0.05)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#9a9aaa] fill-none stroke-[1.6] transition-colors group-hover:stroke-[#00d4c8]">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="truncate text-[13.5px] font-medium text-[#e8e8ed] group-hover:text-[rgba(0,212,200)]">{note.name}</div>
      </div>

      <span className={`w-24 text-center flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] ${styleBadgeColors[note.style] ?? 'border-white/[0.07] text-[#9a9aaa]'}`}>
        {styleLabels[note.style] ?? note.style}
      </span>

      {getTier(note.total_tokens) && (
        <span className="w-10 text-center flex-shrink-0 font-mono text-[11px] text-[#9a9aaa]">
          {getTier(note.total_tokens)}
        </span>
      )}

      {note.charge_amount != null && (
        <span className="w-16 text-center flex-shrink-0 font-mono text-[12px] text-[#00d4c8]">
          {note.charge_amount} <CreditIcon size={12}/>
        </span>
      )}

      <span className="w-28 text-center flex-shrink-0 text-[11.5px] text-[#9a9aaa]">
        {formatDate(note.created_at)}
      </span>

      {/* Arrow — only translate, no conflict with transition-colors on parent */}
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 stroke-[#9a9aaa] fill-none stroke-[1.8] opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Group card ────────────────────────────────────────────────────────────────
function GroupCard({ note, locked, onUnlock, unlocking }) {
  const router = useRouter();

  if (locked) {
    return (
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.05] bg-[#111116] p-5 surface">
        {/* Frosted lock overlay */}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[#0c0c0e]/50 backdrop-blur-[1px]" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#9a9aaa] fill-none stroke-[1.6]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-[13px] font-medium text-[#9a9aaa]">{note.name}</div>
            {note.lecture_topic && (
              <div className="mt-0.5 truncate text-[11px] text-[#7a7a8a]">{note.lecture_topic}</div>
            )}
          </div>
          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.05em] opacity-60 ${styleBadgeColors[note.style] ?? 'border-white/[0.07] text-[#9a9aaa]'}`}>
            {styleLabels[note.style] ?? note.style}
          </span>
        </div>

        <div className="relative flex items-center justify-between gap-3">
          <div className="text-[11.5px] text-[#7a7a8a]">
            Group note · {formatDate(note.created_at)}
          </div>
          <button
            onClick={() => onUnlock(note)}
            disabled={unlocking}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] px-3 py-1.5 text-[11.5px] font-medium text-[#00d4c8] transition-all hover:bg-[rgba(0,212,200,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unlocking ? (
              <>
                <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
                Unlocking…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2]">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                </svg>
                Unlock · {note.unlock_price} <CreditIcon size={12}/>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push(`/note/${note.public_id}`)}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#111116] p-5 text-left transition-colors duration-150 hover:border-white/[0.12] hover:bg-[#14141a] surface noise"
    >
      {/* Icon — spans full height naturally */}
      <div className="flex h-full items-center justify-center self-stretch">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.06)] transition-colors group-hover:border-[rgba(0,212,200,0.3)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#00d4c8] fill-none stroke-[1.6]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
      </div>

      {/* 2-col grid: left=name/date, right=style/price */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto]">
        <div className="truncate text-[13px] font-medium text-[#e8e8ed] group-hover:text-[#00d4c8] transition-colors mt-auto">
          {note.name}
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2 text-[10px] uppercase tracking-[0.05em] mb-1.5 ${styleBadgeColors[note.style] ?? 'border-white/[0.07] text-[#9a9aaa]'}`}>
          {styleLabels[note.style] ?? note.style}
        </span>

        <div className="text-[11.5px] text-[#9a9aaa] mb-auto">{formatDate(note.created_at)}</div>
        {note.charge_amount != null
          ? <span className="font-mono text-[12px] text-[#00d4c8] justify-self-end mt-1.5 mr-3">{note.charge_amount} <CreditIcon size={12}/></span>
          : <span />
        }
      </div>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function NoteListPage() {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();

  const [individual, setIndividual] = useState([]);
  const [group, setGroup] = useState([]);
  const [lockedGroup, setLockedGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState(null);
  const [groupSearch, setGroupSearch] = useState('');
  const [individualSearch, setIndividualSearch] = useState('');

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
        setUnlockError(data.error ?? 'Unlock failed.');
        return;
      }
      setLockedGroup(prev => prev.filter(n => n.public_id !== note.public_id));
      setGroup(prev => [{ ...note }, ...prev]);
      router.push(`/note/${note.public_id}`);
    } catch {
      setUnlockError('Something went wrong. Please try again.');
    } finally {
      setUnlockingId(null);
    }
  };

  const hasGroup = group.length > 0 || lockedGroup.length > 0;

  const gq = groupSearch.toLowerCase();
  const filteredGroup = group.filter(n => n.name?.toLowerCase().includes(gq) || n.lecture_topic?.toLowerCase().includes(gq));
  const filteredLockedGroup = lockedGroup.filter(n => n.name?.toLowerCase().includes(gq) || n.lecture_topic?.toLowerCase().includes(gq));

  const iq = individualSearch.toLowerCase();
  const filteredIndividual = individual.filter(n => n.name?.toLowerCase().includes(iq) || n.lecture_topic?.toLowerCase().includes(iq));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">

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
              <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                Inclass <span className="text-[#00d4c8]">Notes</span>
              </h1>
              <p className="mt-0.5 text-[12.5px] text-[#9a9aaa]">Your generated notes and group library.</p>
            </div>
            <button
              onClick={() => router.push('/note/new')}
              className="flex items-center gap-2 rounded-lg bg-[#00d4c8] px-5 py-2.5 text-[13px] font-semibold text-[#0c0c0e] transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Note
            </button>
          </div>

          {loading ? (
            <NoteListSkeleton />
          ) : (
            <motion.div
              className="flex-1 overflow-hidden px-8 py-5 flex flex-col gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Group section — 40% height */}
              {hasGroup && (
                <motion.section variants={itemVariants} className="flex flex-col gap-2 min-h-0" style={{ flex: '40 40 0%' }}>
                  <SectionDivider label="Group" count={group.length + lockedGroup.length} />
                  <div className="relative flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[#9a9aaa] fill-none stroke-[2]">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      value={groupSearch}
                      onChange={e => setGroupSearch(e.target.value)}
                      placeholder="Search group notes…"
                      className="w-full rounded-lg border border-white/[0.07] bg-[#111116] pl-8 pr-3 py-1.5 text-[12px] text-[#e8e8ed] placeholder-[#6b6b7a] outline-none focus:border-white/[0.15] transition-colors"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                    <div className="grid grid-cols-2 gap-3">
                      {filteredGroup.map(note => (
                        <GroupCard key={note.public_id} note={note} locked={false} />
                      ))}
                      {filteredLockedGroup.map(note => (
                        <GroupCard
                          key={note.public_id}
                          note={note}
                          locked
                          onUnlock={handleUnlock}
                          unlocking={unlockingId === note.public_id}
                        />
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Individual section — 60% height */}
              <motion.section variants={itemVariants} className="flex flex-col gap-2 min-h-0" style={{ flex: hasGroup ? '60 60 0%' : '1 1 0%' }}>
                <SectionDivider label="Individual" count={individual.length} />
                <div className="relative flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 stroke-[#9a9aaa] fill-none stroke-[2]">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={individualSearch}
                    onChange={e => setIndividualSearch(e.target.value)}
                    placeholder="Search individual notes…"
                    className="w-full rounded-lg border border-white/[0.07] bg-[#111116] pl-8 pr-3 py-1.5 text-[12px] text-[#e8e8ed] placeholder-[#6b6b7a] outline-none focus:border-white/[0.15] transition-colors"
                  />
                </div>

                {individual.length === 0 ? (
                  <EmptyState message="No individual notes yet. Generate one to get started." />
                ) : (
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-4 px-5 text-[10px] uppercase tracking-[0.07em] text-[#9a9aaa] select-none">
                        <div className="w-9 flex-shrink-0" />
                        <div className="flex-1">Name</div>
                        <div className="w-24 text-center flex-shrink-0">Style</div>
                        <div className="w-10 text-center flex-shrink-0">Tier</div>
                        <div className="w-16 text-center flex-shrink-0">Cost</div>
                        <div className="w-28 text-center flex-shrink-0">Date</div>
                        <div className="w-3.5 flex-shrink-0" />
                      </div>
                      {filteredIndividual.map(note => (
                        <IndividualRow
                          key={note.public_id}
                          note={note}
                          onClick={() => router.push(`/note/${note.public_id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>

            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}