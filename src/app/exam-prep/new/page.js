'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import GeneratingOverlay from '../../GeneratingOverlays';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import { useTranslations, useLocale } from 'next-intl';
import ExamPrepOnboard from '../ExamPrepOnboard';

// ─── Constants ─────────────────────────────────────────────────────────────────
const stepMap = { pending: 0, reading: 1, generating: 2, writing: 3, saving: 4 };
const stageCeilings = {
  pending: 15,
  reading: 35,
  generating: 88,
  writing: 92,
  saving: 96,
  completed: 100,
};

const QUESTION_TYPES = [
  { key: 'tf', labelKey: 'trueOrFalse', descKey: 'tfDesc' },
  { key: 'mcq', labelKey: 'multipleChoice', descKey: 'mcqDesc' },
  { key: 'theory', labelKey: 'theory', descKey: 'theoryDesc' },
  { key: 'scenario', labelKey: 'scenario', descKey: 'scenarioDesc' },
  { key: 'calculation', labelKey: 'calculation', descKey: 'calculationDesc' },
];

const DIFFICULTY_OPTS = [
  { key: 'easy', labelKey: 'easy', descKey: 'easyDesc' },
  { key: 'normal', labelKey: 'normal', descKey: 'normalDesc' },
  { key: 'hard', labelKey: 'hard', descKey: 'hardDesc' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts, locale) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString(locale || 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NewExamPrepPage() {
  const router = useRouter();
  const t = useTranslations("examPrep");
  const locale = useLocale();
  const { getAccessTokenSilently } = useAuth0();
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [label, setLabel] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [questionTypes, setQuestionTypes] = useState({
    tf: true, mcq: true, theory: true, scenario: true, calculation: true,
  });
  const [difficulty, setDifficulty] = useState('normal');

  const [procStatus, setProcStatus] = useState('idle');
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [error, setError] = useState(null);

  const isReady = selectedNotes.length > 0 || uploadedFiles.length > 0;
  const totalSources = selectedNotes.length + uploadedFiles.length;

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/note/getHistory', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setNotes([...(data.individual ?? []), ...(data.group ?? [])]);
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      } finally {
        setNotesLoading(false);
      }
    };
    fetchNotes();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [getAccessTokenSilently]);

  const toggleNote = (note) => {
    setSelectedNotes(prev => {
      const exists = prev.find(n => n.public_id === note.public_id);
      const next = exists ? prev.filter(n => n.public_id !== note.public_id) : [...prev, note];
      if (!exists && next.length === 1) setLabel(note.name);
      if (next.length === 0 && uploadedFiles.length === 0) setLabel('');
      return next;
    });
  };

  const handleFiles = (files) => {
    const txts = Array.from(files).filter(f => f.type === 'text/plain');
    setUploadedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const added = txts.filter(f => !existing.has(f.name));
      if (prev.length === 0 && selectedNotes.length === 0 && added.length > 0) {
        setLabel(added[0].name.replace(/\.[^/.]+$/, ''));
      }
      return [...prev, ...added];
    });
  };


  const removeFile = (name) => setUploadedFiles(prev => prev.filter(f => f.name !== name));

  const pollStatus = (publicId, token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/exam-prep/status/${publicId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const status = data.status?.toLowerCase();
        setCurrentStatus(status);
        if (status === 'completed') {
          clearInterval(intervalRef.current);
          router.push(`/exam-prep/${publicId}`);
        } else if (status === 'failed') {
          clearInterval(intervalRef.current);
          setProcStatus('idle');
          setError(t('errorGenerationFailed'));
        }
      } catch (err) { console.error('Polling error:', err); }
    }, 2000);
  };

  // Unified — endpoint is the only difference
  const handleGenerate = async (mode = 'individual') => {
    if (!isReady) return;
    setError(null);
    setProcStatus('processing');
    try {
      const token = await getAccessTokenSilently();
      const form = new FormData();
      Object.entries(questionTypes).filter(([, v]) => v).forEach(([k]) => form.append('question_types[]', k));
      form.append('label', label);
      form.append('difficulty', difficulty);
      selectedNotes.forEach(n => form.append('note_ids[]', n.public_id));
      uploadedFiles.forEach(f => form.append('files[]', f));

      const endpoint = mode === 'group'
        ? '/api/exam-prep/generate/group'
        : '/api/exam-prep/generate/individual';

      const res = await fetch(endpoint, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      const data = await res.json();
      if (!res.ok) { setProcStatus('idle'); setError(data.error ?? t('errorStartGeneration')); return; }
      pollStatus(data.publicId, token);
    } catch (err) {
      console.error(err);
      setProcStatus('idle');
      setError(t('errorGeneric'));
    }
  };

  const getStepText = (status) => {
    switch (status) {
      case 'reading': return t('stepReadingSource');
      case 'generating': return t('stepGeneratingQuestions');
      case 'writing': return t('stepWritingSolutions');
      case 'saving': return t('stepSaving');
      default: return t('stepValidating');
    }
  };

  const filteredNotes = notes.filter(n => (n.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()));
  const activeTypeLabels = Object.entries(questionTypes).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">

      <AnimatePresence>
        {error && <ErrorModal message={error} onClose={() => setError(null)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="relative flex flex-1 flex-col overflow-hidden min-w-0">

          {procStatus === 'processing' && (
            <GeneratingOverlay
              variant="document"
              title={t('generating')}
              subtitle={getStepText(currentStatus)}
              targetProgress={stageCeilings[currentStatus] ?? 15}
              smoothed={true}
              onCancel={null}
            />
          )}

          {/* Header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
              {t('newExamPrep')}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden min-h-0">

            {/* Scrollable content */}
            <motion.div
              className="flex flex-col gap-3.5 overflow-y-auto px-8 pt-5 pb-3 flex-1 min-h-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >

              {/* Source section */}
              <motion.div variants={itemVariants} className="flex-shrink-0 grid grid-cols-2 gap-3.5">

                {/* LEFT — notes picker */}
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('fromNotes')}</div>
                    {selectedNotes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--accent)] font-mono text-[10px] font-medium text-[var(--on-accent)]">
                          {selectedNotes.length}
                        </span>
                        <button onClick={() => setSelectedNotes([])}
                          className="text-[11px] text-[var(--fg-3)] hover:text-[#ef4444] transition-colors">
                          {t('clearSelection')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="relative flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[var(--fg-3)] fill-none stroke-[1.8]" style={{ width: 13, height: 13 }}>
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchNotes')}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-8 pr-3 text-[12px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.3)] transition-colors"
                    />
                  </div>

                  {/* Note list */}
                  <div className="flex flex-col gap-1.5 overflow-y-auto"
                    style={{ maxHeight: 150, scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                    {notesLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-[12px] text-[var(--fg-3)]">
                        <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
                        {t('loadingDot')}
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <p className="text-center py-4 text-[12px] text-[var(--fg-3)]">
                        {notes.length === 0 ? t('noNotesYet') : t('noResults')}
                      </p>
                    ) : filteredNotes.map(note => {
                      const selected = !!selectedNotes.find(n => n.public_id === note.public_id);
                      return (
                        <button key={note.public_id} onClick={() => toggleNote(note)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all
                            ${selected ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.06)]' : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]'}`}
                        >
                          <div className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border transition-all
                            ${selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/[0.2]'}`}>
                            {selected && (
                              <svg viewBox="0 0 24 24" className="stroke-[var(--on-accent)] fill-none stroke-[2.5]" style={{ width: 9, height: 9 }}>
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`truncate text-[12px] font-medium transition-colors ${selected ? 'text-[var(--fg)]' : 'text-[var(--fg-2)]'}`}>
                              {note.name}
                            </div>
                            <div className="text-[10.5px] text-[var(--fg-3)] capitalize">
                              {note.style ?? 'Standard'} · {formatDate(note.created_at, locale)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT — file upload */}
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)] flex-shrink-0">{t('uploadFiles')}</div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-shrink-0 cursor-pointer items-center gap-4 rounded-xl border-[1.5px] border-dashed px-5 py-4 transition-all duration-200
                      ${isDragging ? 'border-[rgba(0,212,200,0.4)] bg-[rgba(0,212,200,0.04)]' : 'border-[var(--border)] hover:border-[rgba(0,212,200,0.3)] hover:bg-[rgba(0,212,200,0.02)]'}`}
                  >
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border transition-all
                      ${isDragging ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}>
                      <svg viewBox="0 0 24 24" className={`h-[17px] w-[17px] fill-none stroke-[1.6] transition-colors ${isDragging ? 'stroke-[var(--accent)]' : 'stroke-[var(--fg-3)]'}`}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-[var(--fg)]">{t("dropTxtFiles")}</div>
                      <div className="text-[11.5px] text-[var(--fg-3)]">{t('orClickToBrowse')}</div>
                    </div>
                    <span className="flex-shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--fg-3)] uppercase">.txt</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".txt" multiple className="hidden"
                    onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }} />

                  {uploadedFiles.length > 0 && (
                    <div className="flex flex-col gap-1.5 overflow-y-auto"
                      style={{ maxHeight: 100, scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
                      {uploadedFiles.map(f => (
                        <div key={f.name} className="flex items-center gap-2.5 rounded-lg border border-[rgba(0,212,200,0.15)] bg-[var(--surface-raised)] px-3 py-2">
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-[var(--accent)] fill-none stroke-[1.8]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span className="flex-1 min-w-0 truncate text-[11.5px] text-[var(--fg-2)]">{f.name}</span>
                          <span className="flex-shrink-0 text-[10.5px] text-[var(--fg-3)]">{(f.size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => removeFile(f.name)}
                            className="flex-shrink-0 text-[var(--fg-3)] hover:text-[#ef4444] transition-colors">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2]">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Config */}
              <motion.div variants={itemVariants} className="flex-shrink-0 grid grid-cols-2 gap-3.5 items-start">

                {/* Question types */}
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                    {t('questionTypes')} <span className="normal-case tracking-normal opacity-60">{t('selectAllThatApply')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {QUESTION_TYPES.map(({ key, labelKey, descKey }) => {
                      const on = questionTypes[key];
                      return (
                        <button key={key}
                          onClick={() => {
                            const active = Object.values(questionTypes).filter(Boolean).length;
                            if (on && active === 1) return;
                            setQuestionTypes(prev => ({ ...prev, [key]: !prev[key] }));
                          }}
                          className={`flex flex-col gap-2 rounded-lg border px-3.5 py-3 text-left transition-all duration-150
                            ${on ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.06)]' : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-hover)]'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded border transition-all
                                ${on ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-white/[0.2] bg-transparent'}`}>
                              {on && (
                                <svg viewBox="0 0 24 24" className="stroke-[var(--on-accent)] fill-none stroke-[3]" style={{ width: 9, height: 9 }}>
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-[12.5px] font-medium transition-colors ${on ? 'text-[var(--fg)]' : 'text-[var(--fg-2)]'}`}>
                              {t(labelKey)}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-[1.6] ${on ? 'text-[var(--fg-3)]' : 'text-[var(--fg-3)]'}`}>{t(descKey)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT — two stacked cards */}
                <div className="flex flex-col gap-3.5 h-full">

                  {/* Difficulty */}
                  <div className="flex flex-1 flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                    <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('difficulty')}</div>
                    <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                      {DIFFICULTY_OPTS.map(opt => (
                        <button key={opt.key} onClick={() => setDifficulty(opt.key)}
                          className={`flex-1 rounded-md py-1.5 text-[11.5px] transition-all
                            ${difficulty === opt.key ? 'bg-[var(--surface-deep)] text-[var(--fg)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-2)]'}`}>
                          {t(opt.labelKey)}
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-[var(--fg-3)] leading-[1.6]">
                      {t(DIFFICULTY_OPTS.find(o => o.key === difficulty)?.descKey)}
                    </div>
                  </div>

                  {/* Label */}
                  <div className="flex flex-1 flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                    <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                      {t('label')} <span className="text-[#ef4444]">*</span>
                    </div>
                    <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                      placeholder={t('labelPlaceholder')}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                  </div>

                </div>
              </motion.div>

            </motion.div>

            {/* Action bar — outside scroll */}
            <div className="flex-shrink-0 px-8 pb-6 pt-3">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 surface shadow-xl shadow-black/40">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('summaryLabel')}</div>
                  <div className="text-[13px] text-[var(--fg)]">
                    {isReady
                      ? <><span className="text-[var(--accent)]">{totalSources} {totalSources > 1 ? t('sourcesUnit') : t('sourceUnit')}</span> · {activeTypeLabels.map(kl => t(QUESTION_TYPES.find(q => q.key === kl).labelKey)).join(', ')} · {t(difficulty)}</>
                      : t('selectAtLeastOne')
                    }
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('estCost')}</div>
                    <div className="font-mono text-[13px] text-[var(--accent)] flex items-center">17 - 37 <CreditIcon size={14} className='ml-1' /></div>
                  </div>
                  <button onClick={() => handleGenerate('group')} disabled={!isReady || procStatus === 'processing'}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-2.5 text-[13px] font-medium text-[var(--fg-2)] transition-all hover:border-[rgba(0,212,200,0.25)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-20 whitespace-nowrap">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {t('groupGenerate')}
                  </button>
                  <button onClick={() => handleGenerate('individual')} disabled={!isReady || procStatus === 'processing'}
                    className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[13px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25 whitespace-nowrap">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-[2.2]">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    {t('generate')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ExamPrepOnboard />
    </div>
  );
}