'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import GeneratingOverlay from '../../GeneratingOverlays';
import TranscriptSourcePicker from '@/app/TranscriptSourcePicker';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import { useTranslations } from 'next-intl';
import NotesOnboard from '../NotesOnboard';

// ─── Constants ─────────────────────────────────────────────────────────────────
const COMPACTNESS_OPTIONS = [
  {
    value: 'exam',
    label: 'Exam Note', labelKey: 'examNote', badgeKey: 'compact',
    
    description: 'Ultra-condensed for limited exam note allowances. Definitions, key terms, and formulas only — no elaboration.',
  },
  {
    value: 'standard',
    label: 'Standard', labelKey: 'standard', badgeKey: 'recap',
    
    description: 'A high-level overview of the lecture. Perfect for quick reviews, but heavily summarizes complex concepts and skips granular details.',
  },
  {
    value: 'textbook',
    label: 'Textbook', labelKey: 'textbook', badgeKey: 'recommended',
    
    description: 'The go-to choice for learning the material. A comprehensive, detailed breakdown with full explanations and examples. Nothing gets left behind.',
  },
];

const costMap = {
  exam: '9',
  standard: '9 – 17',
  textbook: '9 – 29',
};

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detect (Same as transcript)' },
  { value: 'English', label: 'English' },
  { value: 'Simplified Chinese', label: 'Simplified Chinese (Mandarin)' },
  { value: 'Traditional Chinese', label: 'Traditional Chinese (Cantonese)' },
  { value: 'Thai', label: 'Thai' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Indonesian', label: 'Indonesian' },
  { value: 'Malay', label: 'Malay' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Persian', label: 'Persian' }
];

const NOTE_STEPS_KEYS = ['stepReadingTranscript', 'stepGeneratingNote', 'stepSavingNote'];
const stepMap = { pending: 0, reading: 0, generating: 1, saving: 2 };

const stageCeilings = {
  pending:    15,
  reading:    35,
  generating: 88,
  saving:     96,
  completed:  100,
};

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
export default function NewNotePage() {
  const router = useRouter();
  const t = useTranslations("notes");
  const { getAccessTokenSilently } = useAuth0();

  const [file, setFile] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [outputLanguage, setOutputLanguage] = useState('auto');
  const [compactness, setCompactness] = useState('standard');
  const [transcriptId, setTranscriptId] = useState(null);

  const [procStatus, setProcStatus] = useState('idle');
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const isReady = (file || transcriptId) && courseName.trim().length > 0;

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pollStatus = (publicId, token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/note/status/${publicId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCurrentStatus(data.status);

        const status = data.status?.toLowerCase();
        if (status === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          router.push(`/note/${publicId}`);
        } else if (status === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
          setError(t('errorGenerationFailed'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  // Unified generate — endpoint is the only difference between individual and group
  const handleGenerate = async (mode = 'individual') => {
    if (!isReady) return;
    setError(null);
    setProcStatus('processing');

    try {
      const token = await getAccessTokenSilently();
      const form = new FormData();
      if (file) form.append('file', file);
      if (transcriptId) form.append('transcript_id', transcriptId);
      form.append('name', courseName);
      form.append('style', compactness);
      form.append('target_language', outputLanguage);

      const endpoint = mode === 'group'
        ? '/api/note/generate/group'
        : '/api/note/generate/individual';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setProcStatus('idle');
        setError(data.error ?? t('errorStartGeneration'));
        return;
      }

      pollStatus(data.publicId, token);
    } catch (err) {
      console.error(err);
      setProcStatus('idle');
      setError(t('errorGeneric'));
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">

      <AnimatePresence>
        {error && <ErrorModal message={error} onClose={() => setError(null)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="relative flex flex-1 flex-col overflow-hidden min-w-0">

          {/* Document variant — text lines instead of waveform */}
          {procStatus === 'processing' && (
            <GeneratingOverlay
              variant="document"
              title={t('generatingNote')}
              subtitle={t(NOTE_STEPS_KEYS[stepMap[currentStatus]]) ?? 'Processing…'}
              targetProgress={stageCeilings[currentStatus] ?? 15}
              smoothed={true}
            />
          )}

          {/* Page header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
              {t('newInclassNote')}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">
              {t('generateNotes')}
            </p>
          </div>

          {/* Content */}
          <motion.div
            className="flex flex-1 flex-col gap-3.5 overflow-hidden px-8 pb-6 pt-5 min-h-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >

            {/* Source picker */}
            <motion.div variants={itemVariants}>
              <TranscriptSourcePicker
                onFileChange={(f) => setFile(f)}
                onTranscriptChange={(id) => setTranscriptId(id)}
                onLabelChange={(label) => setCourseName(label)}
              />
            </motion.div>

            {/* Metadata fields (2 Columns) */}
            <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-2 gap-3.5">

              {/* Course Name */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                  {t('courseNameLabel')} <span className="text-[#ef4444]">*</span>
                </div>
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)}
                  placeholder={t('courseNamePlaceholder')}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
              </div>

              {/* {t('outputLanguageLabel')} */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                  {t('outputLanguageLabel')}
                </div>
                <div className="relative">
                  <select
                    value={outputLanguage}
                    onChange={(e) => setOutputLanguage(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 pr-10 text-[13px] text-[var(--fg)] outline-none focus:border-[rgba(0,212,200,0.35)] transition-colors cursor-pointer"
                  >
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value === 'auto' ? t('autoDetect') : opt.label}
                      </option>
                    ))}
                  </select>
                  {/* Custom SVG arrow for the select box to match dark mode theme */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--fg-3)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

            </motion.div>

            {/* Note style */}
            <motion.div variants={itemVariants} className="flex-shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
              <div className="mb-3 text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('noteStyleLabel')}</div>
              <div className="grid grid-cols-3 gap-2.5">
                {COMPACTNESS_OPTIONS.map((opt) => {
                  const active = compactness === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setCompactness(opt.value)}
                      className={`flex flex-col gap-2 rounded-lg border px-4 py-3.5 text-left transition-all duration-150
                        ${active
                          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.06)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-hover)]'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] font-medium transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--fg-2)]'}`}>
                          {t(opt.labelKey)}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.06em] transition-colors
                          ${active ? 'border-[rgba(0,212,200,0.3)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--fg-3)]'}`}>
                          {t(opt.badgeKey)}
                        </span>
                      </div>
                      <p className="flex-1 text-[11.5px] leading-[1.6] text-[var(--fg-3)]">{t(opt.labelKey + 'Desc')}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className={`text-[11px] font-mono transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--fg-3)]'}`}>
                          {costMap[opt.value]} <CreditIcon size={12}/>
                        </span>

                        <span
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/note/sample?style=${opt.value}`);
                          }}
                          className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.05em] transition-colors hover:text-[#00ebd9] cursor-pointer ${active ? 'text-[var(--accent-muted)]' : 'text-[var(--fg-3)]'}`}
                        >
                          {t('seeExample')}
                          <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <div className="flex-1" />

            {/* Action bar */}
            <motion.div
              variants={itemVariants}
              className="flex flex-shrink-0 items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 surface shadow-xl shadow-black/40"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('estimatedCostLabel')}</div>
                <span className="font-mono text-[20px] font-semibold text-[var(--accent)]">{costMap[compactness]} <CreditIcon size={20}/></span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerate('group')}
                  disabled={!isReady || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-2.5 text-[13px] font-medium text-[var(--fg-2)] transition-all hover:border-[rgba(0,212,200,0.25)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-20 whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {t("groupGenerate")}
                </button>
                <button
                  onClick={() => handleGenerate('individual')}
                  disabled={!isReady || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-7 py-2.5 text-[13px] font-semibold text-[var(--on-accent)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-20 whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-[2.2]">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {t("generateNote")}
                </button>
              </div>
            </motion.div>

          </motion.div>
        </main>
      </div>
      <NotesOnboard />
    </div>
  );
}