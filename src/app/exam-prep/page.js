'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import ErrorModal from '../ErrorModal';

// ─── Constants ─────────────────────────────────────────────────────────────────
const TYPE_STYLES = {
  tf:          { label: 'T/F',      bg: 'bg-[rgba(34,197,94,0.1)]',  text: 'text-[#22c55e]', border: 'border-[rgba(34,197,94,0.2)]' },
  mcq:         { label: 'MCQ',      bg: 'bg-[rgba(139,92,246,0.1)]', text: 'text-[#a78bfa]', border: 'border-[rgba(139,92,246,0.2)]' },
  theory:      { label: 'Theory',   bg: 'bg-[rgba(0,212,200,0.08)]', text: 'text-[#00d4c8]', border: 'border-[rgba(0,212,200,0.2)]' },
  scenario:    { label: 'Scenario', bg: 'bg-[rgba(249,115,22,0.1)]', text: 'text-[#fb923c]', border: 'border-[rgba(249,115,22,0.2)]' },
  calculation: { label: 'Calc',     bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[#f59e0b]', border: 'border-[rgba(245,158,11,0.2)]' },
};

const difficultyColors = {
  easy:   'border-[rgba(34,197,94,0.25)]  text-[#22c55e]  bg-[rgba(34,197,94,0.07)]',
  normal: 'border-[rgba(0,212,200,0.25)]  text-[#00d4c8]  bg-[rgba(0,212,200,0.07)]',
  hard:   'border-[rgba(239,68,68,0.25)]  text-[#ef4444]  bg-[rgba(239,68,68,0.07)]',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getTier(tokens) {
  if (!tokens)          return 'T0';
  if (tokens <= 25000)  return 'T1';
  if (tokens <= 50000)  return 'T2';
  if (tokens <= 75000)  return 'T3';
  return 'T4';
}

function formatDate(ts) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(str).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};


// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ExamPrepSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-5 flex flex-col gap-7">
      {/* Group skeleton */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-2.5 w-12 rounded" />
          <div className="flex-1 h-px bg-white/[0.05]" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.07] bg-[#111116] p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="skeleton h-9 w-9 rounded-lg" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-3.5 w-36 rounded" />
                  <div className="flex gap-1">
                    {[32, 40, 36].map((w, j) => <div key={j} className="skeleton h-4 rounded-full" style={{ width: w }} />)}
                  </div>
                </div>
                <div className="skeleton h-5 w-14 rounded-full" />
              </div>
              <div className="flex justify-between">
                <div className="skeleton h-2.5 w-20 rounded" />
                <div className="skeleton h-2.5 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual skeleton */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-2.5 w-16 rounded" />
          <div className="flex-1 h-px bg-white/[0.05]" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
        <div className="flex items-center gap-4 px-5">
          {[36, 120, 80, 40, 64, 112].map((w, i) => (
            <div key={i} className="skeleton h-2 rounded flex-shrink-0" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-4">
            <div className="skeleton h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="skeleton h-3.5 rounded" style={{ width: `${120 + (i % 3) * 40}px` }} />
              <div className="flex gap-1">
                {[32, 40].map((w, j) => <div key={j} className="skeleton h-4 rounded-full" style={{ width: w }} />)}
              </div>
            </div>
            <div className="skeleton h-5 w-20 rounded-full flex-shrink-0" />
            <div className="skeleton h-3 w-10 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-16 rounded flex-shrink-0" />
            <div className="skeleton h-3 w-28 rounded flex-shrink-0" />
            <div className="skeleton h-3.5 w-3.5 rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function TypeChips({ questionType }) {
  const types = (questionType ?? '').split(',').filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => {
        const s = TYPE_STYLES[t];
        if (!s) return null;
        return (
          <span key={t} className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.05em] ${s.bg} ${s.text} ${s.border}`}>
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181f] mb-3">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#6b6b7a] fill-none stroke-[1.6]">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <p className="text-[12px] text-[#6b6b7a]">{message}</p>
    </div>
  );
}

function SectionDivider({ label, count, unit = 'items' }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#6b6b7a] opacity-60 select-none">{label}</span>
      <div className="flex-1 h-px bg-white/[0.05]" />
      {count != null && (
        <span className="text-[11px] text-[#6b6b7a] opacity-40 select-none">
          {count} {count === 1 ? unit.replace(/s$/, '') : unit}
        </span>
      )}
    </div>
  );
}

function IndividualRow({ ep, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-4 text-left transition-colors duration-150 hover:border-white/[0.12] hover:bg-[#14141a] surface noise"
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-colors group-hover:border-[rgba(0,212,200,0.2)] group-hover:bg-[rgba(0,212,200,0.05)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#6b6b7a] fill-none stroke-[1.6] transition-colors group-hover:stroke-[#00d4c8]">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="truncate text-[13.5px] font-medium text-[#e8e8ed] group-hover:text-[#00d4c8] transition-colors">{ep.label}</div>
        <div className="mt-1"><TypeChips questionType={ep.question_type} /></div>
      </div>

      <span className={`w-20 text-center flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] capitalize ${difficultyColors[ep.difficulty] ?? 'border-white/[0.07] text-[#6b6b7a]'}`}>
        {ep.difficulty}
      </span>

      <span className="w-10 text-center flex-shrink-0 font-mono text-[11px] text-[#6b6b7a]">
        {getTier(ep.total_tokens)}
      </span>

      {ep.charge_amount != null && (
        <span className="w-16 text-center flex-shrink-0 font-mono text-[12px] text-[#00d4c8]">
          ฿ {ep.charge_amount}
        </span>
      )}

      <span className="w-28 text-center flex-shrink-0 text-[11.5px] text-[#6b6b7a]">
        {formatDate(ep.created_at)}
      </span>

      <svg viewBox="0 0 24 24"
        className="h-3.5 w-3.5 flex-shrink-0 stroke-[#6b6b7a] fill-none stroke-[1.8] opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function GroupCard({ ep, locked, onUnlock, unlocking }) {
  const router = useRouter();

  if (locked) {
    return (
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-white/[0.05] bg-[#111116] p-5 surface">
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-[#0c0c0e]/50 backdrop-blur-[1px]" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f]">
            <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#6b6b7a] fill-none stroke-[1.6]">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-[13px] font-medium text-[#6b6b7a]">{ep.label}</div>
            <div className="mt-1 opacity-40"><TypeChips questionType={ep.question_type} /></div>
          </div>
          <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.05em] capitalize opacity-40 ${difficultyColors[ep.difficulty] ?? 'border-white/[0.07] text-[#6b6b7a]'}`}>
            {ep.difficulty}
          </span>
        </div>
        <div className="relative flex items-center justify-between gap-3">
          <div className="text-[11.5px] text-[#4a4a57]">Group exam prep · {formatDate(ep.created_at)}</div>
          <button
            onClick={() => onUnlock(ep)}
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
                Unlock · ฿ {ep.unlock_price}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => router.push(`/exam-prep/${ep.public_id}`)}
      className="group flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#111116] p-5 text-left transition-colors duration-150 hover:border-white/[0.12] hover:bg-[#14141a] surface noise"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.06)] transition-colors group-hover:border-[rgba(0,212,200,0.3)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#00d4c8] fill-none stroke-[1.6]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-medium text-[#e8e8ed] group-hover:text-[#00d4c8] transition-colors">{ep.label}</div>
          <div className="mt-1"><TypeChips questionType={ep.question_type} /></div>
        </div>
        <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.05em] capitalize ${difficultyColors[ep.difficulty] ?? 'border-white/[0.07] text-[#6b6b7a]'}`}>
          {ep.difficulty}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] text-[#6b6b7a]">{formatDate(ep.created_at)}</div>
        {ep.charge_amount != null && (
          <span className="font-mono text-[12px] text-[#00d4c8]">฿ {ep.charge_amount}</span>
        )}
      </div>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ExamPrepListPage() {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();

  const [individual, setIndividual]   = useState([]);
  const [group, setGroup]             = useState([]);
  const [lockedGroup, setLockedGroup] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [unlockingId, setUnlockingId] = useState(null);
  const [unlockError, setUnlockError] = useState(null);

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
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publicId: ep.public_id }),
      });
      const data = await res.json();
      if (!res.ok) { setUnlockError(data.error ?? 'Unlock failed.'); return; }
      setLockedGroup(prev => prev.filter(e => e.public_id !== ep.public_id));
      setGroup(prev => [{ ...ep }, ...prev]);
      router.push(`/exam-prep/${ep.public_id}`);
    } catch {
      setUnlockError('Something went wrong. Please try again.');
    } finally {
      setUnlockingId(null);
    }
  };

  const hasGroup = group.length > 0 || lockedGroup.length > 0;

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
                Exam <span className="text-[#00d4c8]">Prep</span>
              </h1>
              <p className="mt-0.5 text-[12.5px] text-[#6b6b7a]">Your generated practice questions and group library.</p>
            </div>
            <button
              onClick={() => router.push('/exam-prep/new')}
              className="flex items-center gap-2 rounded-lg bg-[#00d4c8] px-5 py-2.5 text-[13px] font-semibold text-[#0c0c0e] transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.5]">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Exam Prep
            </button>
          </div>

          {loading ? (
            <ExamPrepSkeleton />
          ) : (
            <motion.div
              className="flex-1 overflow-y-auto px-8 py-5 flex flex-col gap-7"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Group section */}
              {hasGroup && (
                <motion.section variants={itemVariants} className="flex flex-col gap-3">
                  <SectionDivider label="Group" count={group.length + lockedGroup.length} unit="exam preps" />
                  <div className="grid grid-cols-2 gap-3">
                    {group.map(ep => <GroupCard key={ep.public_id} ep={ep} locked={false} />)}
                    {lockedGroup.map(ep => (
                      <GroupCard key={ep.public_id} ep={ep} locked onUnlock={handleUnlock} unlocking={unlockingId === ep.public_id} />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Individual section */}
              <motion.section variants={itemVariants} className="flex flex-col gap-3">
                <SectionDivider label="Individual" count={individual.length} unit="exam preps" />
                {individual.length === 0 ? (
                  <EmptyState message="No individual exam preps yet. Generate one to get started." />
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 px-5 text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-50 select-none">
                      <div className="w-9 flex-shrink-0" />
                      <div className="flex-1">Label</div>
                      <div className="w-20 text-center flex-shrink-0">Difficulty</div>
                      <div className="w-10 text-center flex-shrink-0">Tier</div>
                      <div className="w-16 text-center flex-shrink-0">Cost</div>
                      <div className="w-28 text-center flex-shrink-0">Date</div>
                      <div className="w-3.5 flex-shrink-0" />
                    </div>
                    {individual.map(ep => (
                      <IndividualRow key={ep.public_id} ep={ep} onClick={() => router.push(`/exam-prep/${ep.public_id}`)} />
                    ))}
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