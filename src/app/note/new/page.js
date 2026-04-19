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

// ─── Constants ─────────────────────────────────────────────────────────────────
const COMPACTNESS_OPTIONS = [
  {
    value: 'exam',
    label: 'Exam Note',
    badge: 'Compact',
    description: 'Ultra-condensed for limited exam note allowances. Definitions, key terms, and formulas only — no elaboration.',
  },
  {
    value: 'standard',
    label: 'Standard',
    badge: 'Recap',
    description: 'A high-level overview of the lecture. Perfect for quick reviews, but heavily summarizes complex concepts and skips granular details.',
  },
  {
    value: 'textbook',
    label: 'Textbook',
    badge: 'Recommended',
    description: 'The go-to choice for learning the material. A comprehensive, detailed breakdown with full explanations and examples. Nothing gets left behind.',
  },
];

const costMap = {
  exam: '฿ 3',
  standard: '฿ 3 – 6',
  textbook: '฿ 6 – 10',
};

const NOTE_STEPS = ['Reading transcript', 'Generating note', 'Saving note'];
const stepMap = { pending: 0, reading: 0, generating: 1, saving: 2 };
const progressMap = { pending: 5, reading: 20, generating: 60, saving: 90, completed: 100 };

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
  const { getAccessTokenSilently } = useAuth0();

  const [file, setFile] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [instructorName, setInstructorName] = useState('');
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
          setError('Generation failed. Please try again.');
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
      form.append('topic', topicName);
      form.append('instructor', instructorName);
      form.append('style', compactness);

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
        setError(data.error ?? 'Failed to start generation.');
        return;
      }

      pollStatus(data.publicId, token);
    } catch (err) {
      console.error(err);
      setProcStatus('idle');
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">

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
              title="Generating your note…"
              subtitle={NOTE_STEPS[stepMap[currentStatus]] ?? 'Processing…'}
              progress={progressMap[currentStatus] ?? 5}
              onCancel={null}
            />
          )}

          {/* Page header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
              New <span className="text-[#00d4c8]">Inclass Note</span>
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#6b6b7a]">
              Generate structured study notes from your lecture transcripts.
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

            {/* Metadata fields */}
            <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-3 gap-3.5">
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">
                  Course name <span className="text-[#ef4444]">*</span>
                </div>
                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g., CSC531 Data Mining"
                  className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[13px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
              </div>
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">
                  Topic <span className="normal-case opacity-40">(optional)</span>
                </div>
                <input type="text" value={topicName} onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Clustering"
                  className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[13px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
              </div>
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">
                  Instructor <span className="normal-case opacity-40">(optional)</span>
                </div>
                <input type="text" value={instructorName} onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="e.g., Dr. Smith"
                  className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[13px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
              </div>
            </motion.div>

            {/* Note style */}
            <motion.div variants={itemVariants} className="flex-shrink-0 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
              <div className="mb-3 text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Note style</div>
              <div className="grid grid-cols-3 gap-2.5">
                {COMPACTNESS_OPTIONS.map((opt) => {
                  const active = compactness === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setCompactness(opt.value)}
                      className={`flex flex-col gap-2 rounded-lg border px-4 py-3.5 text-left transition-all duration-150
                        ${active
                          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.06)]'
                          : 'border-white/[0.07] bg-[#18181f] hover:border-white/[0.14]'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[13px] font-medium transition-colors ${active ? 'text-[#00d4c8]' : 'text-[#9898a8]'}`}>
                          {opt.label}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9.5px] uppercase tracking-[0.06em] transition-colors
                          ${active ? 'border-[rgba(0,212,200,0.3)] text-[#00d4c8]' : 'border-white/[0.07] text-[#6b6b7a]'}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="flex-1 text-[11.5px] leading-[1.6] text-[#6b6b7a]">{opt.description}</p>
                      <div className={`text-[11px] font-mono transition-colors ${active ? 'text-[#00d4c8]' : 'text-[#6b6b7a]'}`}>
                        {costMap[opt.value]}
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
              className="flex flex-shrink-0 items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-3.5 surface shadow-xl shadow-black/40"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-55">Estimated cost</div>
                <span className="font-mono text-[20px] font-semibold text-[#00d4c8]">{costMap[compactness]}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGenerate('group')}
                  disabled={!isReady || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#18181f] px-5 py-2.5 text-[13px] font-medium text-[#9898a8] transition-all hover:border-[rgba(0,212,200,0.25)] hover:text-[#00d4c8] disabled:cursor-not-allowed disabled:opacity-20 whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[1.8]">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Group Generate
                </button>
                <button
                  onClick={() => handleGenerate('individual')}
                  disabled={!isReady || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg bg-[#00d4c8] px-7 py-2.5 text-[13px] font-semibold text-[#0c0c0e] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-20 whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-[2.2]">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate Note
                </button>
              </div>
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}