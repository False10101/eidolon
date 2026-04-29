'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import GeneratingOverlay from '../GeneratingOverlays';
import ErrorModal from '../ErrorModal';
import CreditIcon from '../CreditIcon';
import { useTranslations } from 'next-intl';
import TranscriptorOnboard from './TranscriptorOnboard';

// ─── Constants ─────────────────────────────────────────────────────────────────
const MODELS = [
  {
    value: 'whisper-v3-turbo',
    label: 'Whisper v3 Turbo', descKey: 'turboDesc',
    descKey: 'turboDesc',
    price: '7',
    badge: null
  },
  {
    value: 'whisper-v3',
    label: 'Whisper v3 Large', descKey: 'premiumDesc',
    descKey: 'premiumDesc',
    price: '11',
    badge: 'Premium'
  },
];

const OUTPUT_FORMATS = [
  { value: 'text', label: 'Plain Text', descKey: 'plainTextDesc' },
  { value: 'verbose_json', label: 'With Timestamps', descKey: 'withTimestampsDesc' },
];

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
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

const stageCeilings = {
  uploading: 12,
  waiting: 12,
  active: 88,
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function Transcriptor() {
  const router = useRouter();
  const t = useTranslations("transcriptor");
  const { getAccessTokenSilently } = useAuth0();

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [label, setLabel] = useState('');
  const [model, setModel] = useState('whisper-v3-turbo');
  const [vadEnabled, setVadEnabled] = useState(true);
  const [outputFormat, setOutputFormat] = useState('text');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [diarization, setDiarization] = useState(false);

  const [procStatus, setProcStatus] = useState('idle');
  const [resultId, setResultId] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle');
  const [stageLabel, setStageLabel] = useState('');

  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── File handling ───────────────────────────────────────────────────────────
  const attachFile = useCallback((f) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size, raw: f });
    setError(null);
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
        const res = await fetch(`/api/transcript/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.state === 'waiting') {
          setStage('waiting');
          setStageLabel(data.queuePosition ? t('queuePosition') + ' ' + data.queuePosition : t('waitingInQueue'));
        } else if (data.state === 'active') {
          setStage('active');
          const pct = data.progress || 0;
          if (pct < 20) setStageLabel(t('validatingBalance'));
          else if (pct < 40) setStageLabel(t('readingAudio'));
          else if (pct < 90) setStageLabel(t('transcribing'));
          else setStageLabel(t('savingTranscript'));
        } else if (data.state === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setResultId(data.publicId);
          setProcStatus('done');
        } else if (data.state === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
          setError(t('errorTranscriptionFailed'));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);
  };

  // ── Transcribe ──────────────────────────────────────────────────────────────
  const handleTranscribe = async () => {
    if (!file) return;
    setError(null);
    setProcStatus('processing');
    setStage('uploading');
    setStageLabel(t('uploadingFile'));

    try {
      const token = await getAccessTokenSilently();
      const form = new FormData();
      form.append('file', file.raw);
      form.append('label', label);
      form.append('model', model);
      form.append('vad', vadEnabled);
      form.append('outputFormat', outputFormat);

      if (outputFormat === 'verbose_json' && diarization) {
        form.append('diarization', 'true');
      }

      const res = await fetch('/api/transcript/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        setProcStatus('idle');
        setError(data.error || t('errorStartTranscription'));
        return;
      }

      pollStatus(data.jobId, token);
    } catch (err) {
      console.error(err);
      setProcStatus('idle');
      setError(t('errorConnection'));
    }
  };

  const resetAll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProcStatus('idle');
    setStage('idle');
    setResultId(null);
    removeFile();
    setError(null);
  };

  const selectedModelInfo = MODELS.find(m => m.value === model);
  const estimatedPrice = selectedModelInfo?.price || '7';

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">

      <AnimatePresence>
        {error && <ErrorModal message={error} onClose={() => setError(null)} />}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="relative flex flex-1 flex-col min-w-0">

          {(procStatus === 'processing' || procStatus === 'done') && (
            <GeneratingOverlay
              title={t('transcribing')}
              subtitle={stageLabel}
              targetProgress={procStatus === 'done' ? 100 : stageCeilings[stage] ?? 0}
              smoothed={true}
              done={procStatus === 'done'}
              doneLabel={label || file?.name}
              onView={() => resultId && router.push(`/transcriptor/${resultId}`)}
              onViewLabel={t('viewTranscript')}
              onReset={resetAll}
              onResetLabel={t('newTranscript')}
            />
          )}

          {/* Page header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
              {t('title')}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">
              {t("subtitle")}
            </p>
          </div>

          {/* SCROLLABLE CONTENT - WITHOUT the action bar */}
          <div className="flex-1 overflow-y-auto min-h-0 px-8" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
            <motion.div
              className="flex flex-col gap-3.5 pt-5 pb-6"
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
                        : 'border-[var(--border)] hover:border-[rgba(0,212,200,0.28)] hover:bg-[rgba(0,212,200,0.02)]'}`}
                  >
                    <div className="pointer-events-none absolute inset-0"
                      style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(0,212,200,0.04) 0%, transparent 60%)' }} />
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border transition-all duration-200
                      ${dragging ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}>
                      <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-[1.6] transition-colors ${dragging ? 'stroke-[var(--accent)]' : 'stroke-[var(--fg-3)]'}`}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-[var(--fg)]">{ t("dropAudioHere") }</div>
                      <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('clickToBrowse')}</div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1.5">
                      {['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'].map(t => (
                        <span key={t} className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--fg-3)]">{t}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-3.5 rounded-xl border border-[rgba(0,212,200,0.15)] bg-[var(--surface)] px-5 py-3.5 surface">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[var(--accent)] fill-none stroke-[1.6]">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[14px] font-medium text-[var(--fg)]">{file.name}</div>
                      <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{formatBytes(file.size)} · {file.name.split('.').pop().toUpperCase()}</div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1.5">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)]">
                        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        {t('replace')}
                      </button>
                      <button onClick={removeFile}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-3)] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
                        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.webm" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); }} />

              {/* Config cards */}
              <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                    {t('label')} <span className="normal-case tracking-normal opacity-60 text-[10px]">{t('optional')}</span>
                  </div>
                  <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., AI Game Week 11"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] transition-colors" />
                  <div className="text-[11px] text-[var(--fg-3)]">{t('usedAsTitle')}</div>
                </div>

                {/* Model Toggle Card with Pricing */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('model')}</div>
                  <div className="flex gap-2">
                    {MODELS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setModel(m.value)}
                        className={`relative flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-medium transition-all ${model === m.value
                          ? 'border-[rgba(0,212,200,0.35)] bg-[rgba(0,212,200,0.08)] text-[var(--accent)]'
                          : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--fg-3)] hover:border-[var(--border-hover)] hover:text-[var(--fg-2)]'
                          }`}
                      >
                        {m.badge && (
                          <span className="absolute -top-2 -right-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--on-accent)]">
                            {m.badge}
                          </span>
                        )}
                        <div>{m.label.split(' ').slice(0, 3).join(' ')}</div>
                        <div className={`text-[10px] flex justify-center items-center mt-0.5 ${model === m.value ? 'text-[var(--accent)]/90' : 'text-[var(--fg-3)]'}`}>
                          {m.price} <CreditIcon size={8} className='mx-0.5' color={model === m.value ? '#00d4c8' : 'var(--fg-2)'}/> /hr
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-[var(--fg-3)]">
                    {t(selectedModelInfo?.descKey ?? 'turboDesc')}
                  </div>
                </div>
              </motion.div>

              {/* Advanced Options Toggle */}
              <motion.div variants={itemVariants} className="flex-shrink-0">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-[11px] uppercase tracking-[0.07em] text-[var(--fg-3)] hover:text-[var(--fg)] transition-colors"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-3 w-3 stroke-current fill-none stroke-2 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  {t('advancedOptions')}
                </button>
              </motion.div>

              {/* Advanced Options Panel */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3.5 pb-1">
                      {/* Output Format */}
                      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                        <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('outputFormat')}</div>
                        <select
                          value={outputFormat}
                          onChange={(e) => {
                            setOutputFormat(e.target.value);
                            if (e.target.value !== 'verbose_json') {
                              setDiarization(false);
                            }
                          }}
                          className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-[7px] text-[13px] text-[var(--fg)] outline-none focus:border-[rgba(0,212,200,0.35)] transition-colors"
                        >
                          {OUTPUT_FORMATS.map(f => (
                            <option key={f.value} value={f.value} className="bg-[var(--surface-raised)]">
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <div className="text-[11px] text-[var(--fg-3)]">
                          {t(OUTPUT_FORMATS.find(f => f.value === outputFormat)?.descKey ?? 'plainTextDesc')}
                        </div>
                      </div>

                      {/* Speaker Diarization - Always visible */}
                      <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                        <div className="flex items-center justify-between">
                          <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('speakerDiarization')}</div>
                          <button
                            onClick={() => outputFormat === 'verbose_json' && setDiarization(!diarization)}
                            className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${outputFormat !== 'verbose_json' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            style={{ backgroundColor: diarization && outputFormat === 'verbose_json' ? 'rgba(0, 212, 200, 0.2)' : 'var(--surface-deep)' }}
                            disabled={outputFormat !== 'verbose_json'}
                          >
                            <div
                              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${diarization && outputFormat === 'verbose_json'
                                ? 'left-[18px] bg-[var(--accent)]'
                                : 'left-0.5 bg-white/30'
                                }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 py-[5px]">
                          <span className={`text-[13px] ${diarization && outputFormat === 'verbose_json'
                            ? 'text-[var(--accent)]'
                            : outputFormat !== 'verbose_json'
                              ? 'text-[var(--fg-3)]/70'
                              : 'text-[var(--fg-3)]'
                            }`}>
                            {outputFormat !== 'verbose_json'
                              ? t('requiresTimestamps')
                              : diarization
                                ? t('enabled')
                                : t('disabled')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--fg-3)]">
                          {outputFormat !== 'verbose_json'
                            ? t('switchToTimestamps')
                            : diarization
                              ? model === 'whisper-v3-turbo'
                                ? t('turboMayHallucinate')
                                : t('identifiesSpeakers')
                              : t('enableDiarization')}
                        </div>
                      </div>

                      {/* Warning Banner */}
                      <AnimatePresence>
                        {diarization && model === 'whisper-v3-turbo' && outputFormat === 'verbose_json' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="col-span-2 overflow-hidden"
                          >
                            <div className="flex items-center gap-3 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] px-4 py-3">
                              <div className="flex-shrink-0">
                                <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#f59e0b] fill-none stroke-2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="8" x2="12" y2="12" />
                                  <circle cx="12" cy="16" r="0.5" fill="#f59e0b" stroke="none" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="text-[13px] font-medium text-[#f59e0b]">{t('turboMayHallucinateBanner')}</div>
                                <div className="text-[12px] text-[var(--fg-2)]"><span className="text-[var(--fg)] font-medium">{t('transcriptionModel')}</span> {t('whisperV3LargeAccurate')}</div>
                              </div>
                              <button
                                onClick={() => setModel('whisper-v3')}
                                className="flex-shrink-0 rounded-lg bg-[#f59e0b] px-3 py-1.5 text-[12px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-85"
                              >
                                {t('switchToV3')}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* VAD Filter Toggle */}
                      <div className="col-span-2 flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                        <div className="flex items-center justify-between">
                          <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('vadFilter')}</div>
                          <button
                            onClick={() => setVadEnabled(!vadEnabled)}
                            className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200"
                            style={{ backgroundColor: vadEnabled ? 'rgba(0, 212, 200, 0.2)' : 'var(--surface-deep)' }}
                          >
                            <div
                              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200 ${vadEnabled ? 'left-[18px] bg-[var(--accent)]' : 'left-0.5 bg-white/30'
                                }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 py-[5px]">
                          <span className={`text-[13px] ${vadEnabled ? 'text-[var(--accent)]' : 'text-[var(--fg-3)]'}`}>
                            {vadEnabled ? t('enabled') : t('disabled')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--fg-3)]">{t('silenceRemoval')}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* STICKY ACTION BAR AT THE BOTTOM */}
          <div className="flex-shrink-0 px-8 pb-6 pt-2">
            <motion.div variants={itemVariants}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 surface shadow-xl shadow-black/40"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('summary')}</div>
                <div className="text-[13px] text-[var(--fg)]">
                  {file
                    ? <><span className="text-[var(--accent)]">{label || file.name}</span> · {selectedModelInfo?.label}</>
                    : t('noFileSelected')}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('pricePerHour')}</div>
                  <div className="font-mono text-[15px] font-medium flex justify-end items-center ">
                    <span className="text-[var(--accent)]">{estimatedPrice}<CreditIcon size={15.5} className='ml-1'/></span>
                  </div>
                </div>
                <button onClick={handleTranscribe} disabled={!file || procStatus === 'processing'}
                  className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-2.5 text-[13px] font-medium text-[var(--on-accent)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25 whitespace-nowrap">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                  {t('transcribe')}
                </button>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
      <TranscriptorOnboard />
    </div>
  );
}