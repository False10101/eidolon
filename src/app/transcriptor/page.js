'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import GeneratingOverlay from '../GeneratingOverlays';
import ErrorModal from '../ErrorModal';

// ─── Constants ─────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'Thai',     soon: true },
  { value: 'zh', label: 'Chinese',  soon: true },
  { value: 'ja', label: 'Japanese', soon: true },
  { value: 'ko', label: 'Korean',   soon: true },
  { value: 'fr', label: 'French',   soon: true },
  { value: 'de', label: 'German',   soon: true },
  { value: 'es', label: 'Spanish',  soon: true },
];

const PROC_STEPS = [
  'Validating balance',
  'Processing audio',
  'Saving transcript',
  'Finishing up',
];

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Transcriptor() {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();

  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [label, setLabel]       = useState('');
  const [language, setLanguage] = useState('en');

  const [progress, setProgress]     = useState(0);
  const [procStatus, setProcStatus] = useState('idle');
  const [procStep, setProcStep]     = useState(0);
  const [resultId, setResultId]     = useState(null);
  const [error, setError]           = useState(null);

  const intervalRef  = useRef(null);
  const fileInputRef = useRef(null);

  // ── File handling ───────────────────────────────────────────────────────────
  const attachFile = useCallback((f) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size, raw: f });
    setError(null);
    // Auto-fill label from filename, strip extension
    setLabel(f.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const removeFile = () => {
    setFile(null);
    setLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Poll ────────────────────────────────────────────────────────────────────
  const pollStatus = (jobId, token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/transcript/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.state === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setResultId(data.publicId);
          setProcStatus('done');
        } else if (data.state === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
          setError('Transcription failed. Check your file format and try again.');
        } else {
          const pct = data.progress || 0;
          setProgress(pct);
          if      (pct < 20) setProcStep(0);
          else if (pct < 60) setProcStep(1);
          else if (pct < 90) setProcStep(2);
          else               setProcStep(3);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 500);
  };

  // ── Transcribe ──────────────────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!file) return;
    setError(null);
    setProcStatus('processing');
    setProcStep(0);
    setProgress(0);

    try {
      const token = await getAccessTokenSilently();
      const form  = new FormData();
      form.append('file',     file.raw);
      form.append('label',    label);
      form.append('language', 'en');

      const res  = await fetch('/api/transcript/transcribe', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });
      const data = await res.json();

      if (!res.ok) {
        setProcStatus('idle');
        setError(data.error || 'Failed to start transcription.');
        return;
      }

      pollStatus(data.jobId, token);
    } catch (err) {
      console.error(err);
      setProcStatus('idle');
      setError('Something went wrong. Please check your connection and try again.');
    }
  };

  const resetAll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProcStatus('idle');
    setProgress(0);
    setProcStep(0);
    setResultId(null);
    removeFile();
    setError(null);
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

          {/* Processing AND done states — both handled by GeneratingOverlay now */}
          {(procStatus === 'processing' || procStatus === 'done') && (
            <GeneratingOverlay
              title="Transcribing audio…"
              subtitle={PROC_STEPS[procStep]}
              progress={progress}
              onCancel={null}
              done={procStatus === 'done'}
              doneLabel={label || file?.name}
              onView={() => resultId && router.push(`/transcriptor/${resultId}`)}
              onViewLabel="View transcript"
              onReset={resetAll}
              onResetLabel="New transcript"
            />
          )}

          {/* Page header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
              Audio <span className="text-[#00d4c8]">Transcriptor</span>
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#6b6b7a]">
              Upload your lecture audio and get a clean transcript via Whisper.
            </p>
          </div>

          {/* Content */}
          <motion.div
            className="flex flex-1 flex-col gap-3.5 overflow-hidden px-8 pb-6 pt-5 min-h-0"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Upload zone */}
            <motion.div variants={itemVariants}>
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) attachFile(f); }}
                  className={`relative flex flex-shrink-0 cursor-pointer items-center gap-5 overflow-hidden rounded-xl border-[1.5px] border-dashed px-7 py-5 transition-all duration-200
                    ${dragging
                      ? 'border-[rgba(0,212,200,0.28)] bg-[rgba(0,212,200,0.02)]'
                      : 'border-white/[0.08] hover:border-[rgba(0,212,200,0.28)] hover:bg-[rgba(0,212,200,0.02)]'}`}
                >
                  <div className="pointer-events-none absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(0,212,200,0.04) 0%, transparent 60%)' }} />
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border transition-all duration-200
                    ${dragging ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]' : 'border-white/[0.07] bg-[#18181f]'}`}>
                    <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-[1.6] transition-colors ${dragging ? 'stroke-[#00d4c8]' : 'stroke-[#6b6b7a]'}`}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-[#9898a8]">Drop your audio file here</div>
                    <div className="mt-0.5 text-[12px] text-[#6b6b7a]">or click to browse — .mp3, .wav, .m4a</div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    {['.mp3', '.wav', '.m4a'].map(t => (
                      <span key={t} className="rounded-md border border-white/[0.07] bg-[#18181f] px-2 py-0.5 font-mono text-[10.5px] text-[#6b6b7a]">{t}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-shrink-0 items-center gap-3.5 rounded-xl border border-[rgba(0,212,200,0.15)] bg-[#111116] px-5 py-3.5 surface">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[#00d4c8] fill-none stroke-[1.6]">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[14px] font-medium text-[#e8e8ed]">{file.name}</div>
                    <div className="mt-0.5 text-[12px] text-[#6b6b7a]">{formatBytes(file.size)} · {file.name.split('.').pop().toUpperCase()}</div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#6b6b7a] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      Replace
                    </button>
                    <button onClick={removeFile}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#6b6b7a] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); }} />

            {/* Config cards */}
            <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-3 gap-3.5">
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">
                  Label <span className="normal-case tracking-normal opacity-60 text-[10px]">(optional)</span>
                </div>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., AI Game Week 11"
                  className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-2 text-[13px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] placeholder:opacity-50 focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                <div className="text-[11px] text-[#6b6b7a] opacity-50">Used as the transcript title.</div>
              </div>

              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Language</div>
                <div className="relative">
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-[7px] text-[13px] text-[#e8e8ed] outline-none transition-colors focus:border-[rgba(0,212,200,0.35)]">
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value} disabled={l.soon} className="bg-[#18181f]">
                        {l.label}{l.soon ? ' (soon)' : ''}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 stroke-[#6b6b7a] fill-none stroke-2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
                <div className="text-[11px] text-[#6b6b7a] opacity-50">More languages coming soon.</div>
              </div>

              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.05] bg-[#111116] px-4 py-4 surface noise">
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-50">Speaker diarization</div>
                  <span className="rounded-full border border-white/[0.07] bg-[#18181f] px-2 py-0.5 text-[9px] uppercase tracking-[0.06em] text-[#6b6b7a]">Soon</span>
                </div>
                <div className="flex items-center gap-2 py-[7px] opacity-35 select-none">
                  <div className="relative h-4 w-7 flex-shrink-0 rounded-full bg-[#1e1e27]">
                    <div className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white/30" />
                  </div>
                  <span className="text-[13px] text-[#6b6b7a]">Disabled</span>
                </div>
                <div className="text-[11px] text-[#6b6b7a] opacity-40">Multi-speaker labeling — coming soon.</div>
              </div>
            </motion.div>

            <div className="flex-1" />

            {/* Action bar */}
            <motion.div variants={itemVariants}
              className="flex flex-shrink-0 items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-3.5 surface shadow-xl shadow-black/40">
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-55">Summary</div>
                <div className="text-[13px] text-[#9898a8]">
                  {file
                    ? <><span className="text-[#00d4c8]">{label || file.name}</span> · English</>
                    : 'No file selected'}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-55">Est. cost</div>
                  <div className="font-mono text-[13px]">
                    <span className="text-[#00d4c8]">฿ 2</span>
                    <span className="text-[#6b6b7a]"> – </span>
                    <span className="text-[#00d4c8]">฿ 8+</span>
                  </div>
                </div>
                <button onClick={handleTranscribe} disabled={!file || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg bg-[#00d4c8] px-6 py-2.5 text-[13px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25 whitespace-nowrap">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                  Transcribe
                </button>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}