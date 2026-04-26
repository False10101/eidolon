'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import CreditIcon from '@/app/CreditIcon';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '—';
  const str = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(str).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok',
  });
}

const TYPE_STYLES = {
  tf:          { label: 'T/F',      bg: 'bg-[rgba(34,197,94,0.1)]',  text: 'text-[#22c55e]', border: 'border-[rgba(34,197,94,0.2)]' },
  mcq:         { label: 'MCQ',      bg: 'bg-[rgba(139,92,246,0.1)]', text: 'text-[#a78bfa]', border: 'border-[rgba(139,92,246,0.2)]' },
  theory:      { label: 'Theory',   bg: 'bg-[rgba(0,212,200,0.08)]', text: 'text-[#00d4c8]', border: 'border-[rgba(0,212,200,0.2)]' },
  scenario:    { label: 'Scenario', bg: 'bg-[rgba(249,115,22,0.1)]', text: 'text-[#fb923c]', border: 'border-[rgba(249,115,22,0.2)]' },
  calculation: { label: 'Calc',     bg: 'bg-[rgba(245,158,11,0.1)]', text: 'text-[#f59e0b]', border: 'border-[rgba(245,158,11,0.2)]' },
};

function TypeTag({ type }) {
  const s = TYPE_STYLES[type] ?? { label: type, bg: 'bg-[#18181f]', text: 'text-[#9a9aaa]', border: 'border-white/[0.07]' };
  return (
    <span className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] font-medium mt-0.5 ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

// ─── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[#111116] p-7 surface"
      >
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl"
          style={{ background: 'rgba(239,68,68,0.08)' }} />
        <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#ef4444] fill-none stroke-[1.8]">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
          </svg>
        </div>
        <div className="relative mb-1.5 text-[15px] font-medium text-[#e8e8ed]">Delete exam prep?</div>
        <p className="relative mb-6 text-[13px] leading-[1.7] text-[#9a9aaa]">{message}</p>
        <div className="relative flex gap-2">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] text-[#b4b4c2] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2.5 text-[13px] font-medium text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)]">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Edit label modal ──────────────────────────────────────────────────────────
function EditLabelModal({ value, onChange, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={{    opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] mx-6 rounded-2xl border border-white/[0.1] bg-[#111116] shadow-2xl overflow-hidden surface"
      >
        <div className="px-6 py-4 border-b border-white/[0.07] bg-[#18181f]">
          <div className="text-[14px] font-medium text-[#e8e8ed]">Edit label</div>
          <div className="mt-0.5 text-[12px] text-[#9a9aaa]">This is the title shown on the exam prep.</div>
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          <input
            autoFocus value={value} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onClose(); }}
            className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2.5 text-[13px] text-[#e8e8ed] outline-none focus:border-[rgba(0,212,200,0.35)] transition-colors"
          />
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose}
              className="rounded-lg border border-white/[0.07] bg-[#18181f] px-4 py-2 text-[12.5px] text-[#9a9aaa] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
              Cancel
            </button>
            <button onClick={onSave}
              className="rounded-lg bg-[#00d4c8] px-4 py-2 text-[12.5px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-90">
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ExamPrepSkeleton() {
  return (
    <main className="flex flex-1 overflow-hidden min-w-0">
      <div className="flex w-[260px] flex-shrink-0 flex-col border-r border-white/[0.07]">
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.07] flex flex-col gap-3">
          <div className="skeleton h-5 w-40 rounded" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
        <div className="flex-1 px-5 py-4 flex flex-col gap-5">
          {[null, null, null].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="skeleton h-2.5 w-16 rounded" />
              {[null, null].map((__, j) => <div key={j} className="skeleton h-9 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.07]">
          <div className="flex gap-2">
            <div className="skeleton h-7 w-36 rounded-lg" />
            <div className="skeleton h-7 w-24 rounded-lg" />
          </div>
          <div className="skeleton h-7 w-24 rounded-lg" />
        </div>
        <div className="flex-1 px-8 py-6 flex flex-col gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 pb-6 border-b border-white/[0.05]">
              <div className="flex items-start gap-3">
                <div className="skeleton h-6 w-8 rounded-md" />
                <div className="skeleton h-6 w-12 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
              </div>
              <div className="ml-[70px] flex flex-col gap-1.5">
                {[null, null, null, null].map((__, j) => <div key={j} className="skeleton h-9 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Question block ────────────────────────────────────────────────────────────
// isOpen and onToggle are fully controlled from parent — no internal state
function QuestionBlock({ q, index, isOpen, onToggle }) {
  return (
    <div className="pb-6 mb-6 border-b border-white/[0.05] last:border-0 last:mb-0 last:pb-0">

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {q.source_lectures?.map((lec, i) => (
          <span key={i} className="text-[10px] text-[#9a9aaa] bg-[#111116] border border-white/[0.06] rounded px-2 py-0.5 truncate max-w-[300px]">{lec}</span>
        ))}
        {q.topic && (
          <span className="text-[10.5px] text-[#7a7a8a] bg-[#18181f] border border-white/[0.05] rounded-md px-2 py-0.5">{q.topic}</span>
        )}
        {q.cross_lecture && (
          <span className="text-[10px] text-[#a78bfa] bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.2)] rounded-md px-2 py-0.5 uppercase tracking-[0.05em]">Cross-lecture</span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 font-mono text-[11px] text-[#9a9aaa] bg-[#18181f] border border-white/[0.07] rounded-md px-2 py-0.5 mt-0.5">Q{index + 1}</span>
        <TypeTag type={q.type} />
        <p className="flex-1 text-[13.5px] leading-[1.75] text-[#e8e8ed]">{q.question}</p>
      </div>

      {/* MCQ options */}
      {q.type === 'mcq' && q.options && (
        <div className="ml-[70px] flex flex-col gap-1.5 mb-3">
          {Object.entries(q.options).map(([letter, text]) => {
            const isCorrect = q.answer === letter;
            return (
              <div key={letter} className={`flex flex-col rounded-lg border px-3 py-2 text-[12.5px] transition-all
                ${isOpen && isCorrect  ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)]'  : ''}
                ${isOpen && !isCorrect ? 'border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)]' : ''}
                ${!isOpen             ? 'border-white/[0.06] bg-[#18181f]'                          : ''}`}>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 font-mono text-[11px] text-[#9a9aaa] mt-0.5">{letter}.</span>
                  <span className={`flex-1 ${isOpen && isCorrect ? 'text-[#e8e8ed]' : isOpen ? 'text-[#9a9aaa]' : 'text-[#b4b4c2]'}`}>{text}</span>
                  {isOpen && isCorrect  && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[#22c55e] fill-none stroke-[2.5] mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>}
                  {isOpen && !isCorrect && <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[#ef4444] fill-none stroke-[2] mt-0.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                </div>
                {isOpen && q.option_explanations?.[letter] && (
                  <p className={`mt-1.5 ml-5 text-[11.5px] leading-[1.6] ${isCorrect ? 'text-[#22c55e] opacity-80' : 'text-[#9a9aaa]'}`}>
                    {q.option_explanations[letter]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TF options */}
      {q.type === 'tf' && (
        <div className="ml-[70px] flex gap-2 mb-3">
          {['True', 'False'].map(opt => (
            <div key={opt} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition-all
              ${isOpen && q.answer === opt ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.06)] text-[#22c55e]'
                : isOpen ? 'border-[rgba(239,68,68,0.15)] text-[#9a9aaa]'
                : 'border-white/[0.06] bg-[#18181f] text-[#b4b4c2]'}`}>
              {isOpen && q.answer === opt && <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2.5]"><polyline points="20 6 9 17 4 12" /></svg>}
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Solution toggle */}
      <button onClick={onToggle}
        className={`ml-[70px] flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition-all w-fit
          ${isOpen ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.06)] text-[#22c55e]' : 'border-white/[0.07] bg-[#18181f] text-[#9a9aaa] hover:border-white/[0.14] hover:text-[#b4b4c2]'}`}>
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 stroke-current fill-none stroke-[2] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {isOpen ? 'Hide solution' : 'Show solution'}
      </button>

      {/* Solution — non-MCQ */}
      {isOpen && q.type !== 'mcq' && (
        <div className="ml-[70px] mt-3 border-l-2 border-[#22c55e] bg-[#18181f] rounded-r-lg px-4 py-3.5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-[#22c55e] mb-2">Solution</div>
          <p className="text-[13px] leading-[1.75] text-[#b4b4c2] whitespace-pre-wrap">{q.answer}</p>
          {q.answer_steps && (
            <ol className="mt-3 flex flex-col gap-1.5 list-decimal list-inside">
              {q.answer_steps.map((step, i) => (
                <li key={i} className="text-[12.5px] text-[#b4b4c2] leading-[1.6]">{step}</li>
              ))}
            </ol>
          )}
          {q.common_misconception && (
            <div className="mt-3 flex items-start gap-2 text-[11.5px]">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[#f59e0b] fill-none stroke-[1.8] mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span className="text-[#9a9aaa]"><span className="text-[#f59e0b]">Common misconception:</span> {q.common_misconception}</span>
            </div>
          )}
        </div>
      )}

      {/* Misconception — MCQ only */}
      {isOpen && q.type === 'mcq' && q.common_misconception && (
        <div className="ml-[70px] mt-3 flex items-start gap-2 text-[11.5px]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[#f59e0b] fill-none stroke-[1.8] mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-[#9a9aaa]"><span className="text-[#f59e0b]">Common misconception:</span> {q.common_misconception}</span>
        </div>
      )}
    </div>
  );
}

// ─── Reader view — fullscreen, all solutions always visible ───────────────────
function ReaderView({ data, onClose }) {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const copyAll = () => {
    const lines = data.questions.map((q, i) => {
      let out = `Q${i + 1} [${q.type.toUpperCase()}]: ${q.question}`;
      if (q.options) out += '\n' + Object.entries(q.options).map(([l, t]) => `  ${l}. ${t}`).join('\n');
      out += `\nAnswer: ${q.answer}`;
      if (q.answer_steps) out += '\nSteps:\n' + q.answer_steps.map((s, j) => `  ${j + 1}. ${s}`).join('\n');
      return out;
    }).join('\n\n');
    navigator.clipboard.writeText(lines).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex flex-col bg-[#0c0c0e] overflow-hidden"
    >
      <nav className="flex-shrink-0 flex items-center justify-between px-8 h-[52px] border-b border-white/[0.05] bg-[#111116] nav-surface">
        <div className="flex items-center gap-4 min-w-0 select-none">
          <span className="font-serif text-[18px] text-[#00d4c8]">Eidolon</span>
          <div className="h-4 w-px bg-white/[0.07]" />
          <span className="text-[13px] text-[#b4b4c2] truncate">{data.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={copyAll}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#9a9aaa] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy all
          </button>
          <button onClick={onClose}
            className="group flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-all hover:border-[rgba(239,68,68,0.3)]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#9a9aaa] fill-none stroke-[2] group-hover:stroke-[#ef4444] transition-colors">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto flex justify-center px-8 py-12"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
        <div className="w-full max-w-[700px]">
          <div className="text-[11px] uppercase tracking-[0.1em] text-[#9a9aaa] mb-4 select-none">
            Exam Prep · {formatDate(data.created_at)}
          </div>
          <h1 className="font-serif text-[28px] font-normal text-[#e8e8ed] tracking-[-0.02em] mb-2">{data.label}</h1>
          <div className="flex items-center gap-2 text-[13px] text-[#9a9aaa] mb-10 select-none">
            <span>{data.questions?.length ?? 0} questions</span>
            <span className="text-[#9a9aaa]">·</span>
            <span className="capitalize">{data.difficulty}</span>
            <div className="flex-1 h-px bg-white/[0.07] ml-2" />
          </div>
          {/* Fullscreen always shows all solutions — pass isOpen=true, onToggle noop */}
          {(data.questions ?? []).map((q, i) => (
            <QuestionBlock key={q.id ?? i} q={q} index={i} isOpen={true} onToggle={() => {}} />
          ))}
        </div>
      </div>

      <div className={`fixed bottom-6 right-6 z-[210] flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3.5 py-2 text-[12.5px] text-[#b4b4c2] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Copied to clipboard
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ExamPrepViewer() {
  const router   = useRouter();
  const params   = useParams();
  const publicId = params.id;
  const { getAccessTokenSilently } = useAuth0();

  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [readerOpen, setReaderOpen]       = useState(false);
  const [toast, setToast]                 = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editModalOpen, setEditModalOpen]   = useState(false);
  const [editLabelValue, setEditLabelValue] = useState('');

  // ── Lifted open state — each question controlled from here ──────────────────
  const [openStates, setOpenStates] = useState({});

  const questions = data?.questions ?? [];

  // Derived — true only when every question is open
  const allOpen = questions.length > 0 && questions.every((_, i) => openStates[i] === true);

  const toggleAll = () => {
    const next   = !allOpen;
    const states = {};
    questions.forEach((_, i) => { states[i] = next; });
    setOpenStates(states);
  };

  const toggleOne = (i) => {
    setOpenStates(prev => ({ ...prev, [i]: !prev[i] }));
  };

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch(`/api/exam-prep/getDetail/${publicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { router.push('/exam-prep'); return; }
        const d = await res.json();
        setData(d);
        // Default all open on load
        const states = {};
        (d.questions ?? []).forEach((_, i) => { states[i] = false; });
        setOpenStates(states);
      } catch {
        router.push('/exam-prep');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [publicId, getAccessTokenSilently]);

  const handleLabelSave = async () => {
    if (!editLabelValue.trim() || editLabelValue === data.label) { setEditModalOpen(false); return; }
    try {
      const token = await getAccessTokenSilently();
      await fetch('/api/exam-prep/editDetail', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ publicId, label: editLabelValue.trim() }),
      });
      setData(prev => ({ ...prev, label: editLabelValue.trim() }));
    } catch (err) { console.error(err); }
    setEditModalOpen(false);
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      await fetch(`/api/exam-prep/delete/${publicId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/exam-prep');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const copyAll = () => {
    if (!data?.questions) return;
    const lines = data.questions.map((q, i) => {
      let out = `Q${i + 1} [${q.type.toUpperCase()}]: ${q.question}`;
      if (q.options) out += '\n' + Object.entries(q.options).map(([l, t]) => `  ${l}. ${t}`).join('\n');
      out += `\nAnswer: ${q.answer}`;
      return out;
    }).join('\n\n');
    navigator.clipboard.writeText(lines).catch(() => {});
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const typeLabels = (data?.question_type ?? '').split(',').filter(Boolean);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmModal
            message="This exam prep will be permanently deleted. This cannot be undone."
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
        {editModalOpen && (
          <EditLabelModal
            value={editLabelValue}
            onChange={setEditLabelValue}
            onSave={handleLabelSave}
            onClose={() => setEditModalOpen(false)}
          />
        )}
        {readerOpen && <ReaderView data={{ ...data, questions }} onClose={() => setReaderOpen(false)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {loading && <ExamPrepSkeleton />}

        {!loading && data && (
          <motion.main
            className="flex flex-1 overflow-hidden min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* ── Left panel ── */}
            <div className="flex w-[260px] flex-shrink-0 flex-col border-r border-white/[0.05]">

              <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.07]">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h2 className="font-serif text-[16px] font-normal text-[#e8e8ed] tracking-[-0.02em] leading-snug">
                    {data.label}
                  </h2>
                  <button
                    onClick={() => { setEditLabelValue(data.label); setEditModalOpen(true); }}
                    className="flex-shrink-0 mt-0.5 text-[#9a9aaa] hover:text-[#00d4c8] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] px-2.5 py-0.5 text-[11px] text-[#22c55e]">
                  <span className="h-[5px] w-[5px] rounded-full bg-current" />
                  {data.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>

                <div className="flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">Details</div>
                  <div className="rounded-xl border border-[rgba(0,212,200,0.1)] bg-[#111116] overflow-hidden surface-teal">
                    <div className="flex flex-col divide-y divide-white/[0.05]">
                      {[
                        { label: 'Generated', value: formatDate(data.created_at) },
                        { label: 'Questions', value: `${questions.length} questions`, cyan: true },
                        { label: 'Cost',      value: `${Number(data.charge_amount).toFixed(2)}`, cyan: true },
                      ].map(({ label, value, cyan }) => (
                        <div key={label} className="flex items-center justify-between px-3.5 py-2.5 text-[12px]">
                          <span className="text-[#9a9aaa]">{label}</span>
                          <span className={`font-mono text-[11.5px] ${cyan ? 'text-[#00d4c8]' : 'text-[#e8e8ed]'}`}>{value} {label === 'Cost' ? <CreditIcon size={12}/> : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">Configuration</div>
                  <div className="rounded-xl border border-white/[0.07] bg-[#111116] px-3.5 py-3 surface noise">
                    <div className="flex flex-wrap gap-1.5">
                      {typeLabels.map(t => {
                        const s = TYPE_STYLES[t];
                        return s ? (
                          <span key={t} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
                        ) : null;
                      })}
                      <span className="rounded-full border border-white/[0.07] bg-[#18181f] px-2.5 py-0.5 text-[11px] text-[#9a9aaa] capitalize">{data.difficulty}</span>
                    </div>
                  </div>
                </div>

                {data.sources?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">Sources</div>
                    <div className="flex flex-col gap-1.5">
                      {data.sources.map((src, i) => (
                        <div key={i}
                          onClick={() => src.source_type === 'note' && src.note_public_id && router.push(`/note/${src.note_public_id}`)}
                          className={`flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-[#18181f] px-3 py-2.5 transition-all
                            ${src.source_type === 'note' ? 'cursor-pointer hover:border-[rgba(0,212,200,0.2)] hover:bg-[rgba(0,212,200,0.03)]' : ''}`}
                        >
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#111116]">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#9a9aaa] fill-none stroke-[1.8]">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate text-[12px] text-[#e8e8ed]">{src.name}</div>
                            <div className="text-[10.5px] text-[#9a9aaa] capitalize">{src.source_type === 'note' ? 'Inclass note' : 'Uploaded file'}</div>
                          </div>
                          {src.source_type === 'note' && (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[#9a9aaa] fill-none stroke-[1.8]">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 px-5 py-4 border-t border-white/[0.07] flex flex-col gap-2">
                <button onClick={copyAll}
                  className="flex items-center gap-2 w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[12.5px] text-[#b4b4c2] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy all questions
                </button>
                <button onClick={() => setConfirmDelete(true)} disabled={deleting}
                  className="flex items-center gap-2 w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[12.5px] text-[#9a9aaa] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444] disabled:opacity-50">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                  </svg>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/[0.07] bg-[#18181f]">
                <div className="flex items-center gap-2">
                  <button onClick={toggleAll}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] transition-all
                      ${allOpen ? 'border-[rgba(0,212,200,0.25)] bg-[rgba(0,212,200,0.06)] text-[#00d4c8]' : 'border-white/[0.07] bg-[#111116] text-[#9a9aaa] hover:border-white/[0.14]'}`}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    {allOpen ? 'Solutions visible' : 'Solutions hidden'}
                  </button>
                  <span className="rounded-lg border border-white/[0.07] bg-[#111116] px-3 py-1.5 text-[12px] text-[#9a9aaa]">
                    {questions.length} questions
                  </span>
                </div>
                <button onClick={() => setReaderOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#111116] px-3 py-1.5 text-[12px] text-[#9a9aaa] transition-all hover:border-[rgba(0,212,200,0.25)] hover:text-[#00d4c8]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                  Fullscreen
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-6"
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>
                {questions.map((q, i) => (
                  <QuestionBlock
                    key={q.id ?? i}
                    q={q}
                    index={i}
                    isOpen={openStates[i] ?? false}
                    onToggle={() => toggleOne(i)}
                  />
                ))}
              </div>
            </div>
          </motion.main>
        )}
      </div>

      {/* Copy toast */}
      <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3.5 py-2 text-[12.5px] text-[#b4b4c2] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Copied to clipboard
      </div>
    </div>
  );
}