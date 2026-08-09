'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/app/navbar';
import Sidebar from '@/app/sidebar';
import GeneratingOverlay from '@/app/GeneratingOverlays';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import LocalCreditPrice from '@/app/LocalCreditPrice';
import GroupMemberModal from '@/app/GroupMemberModal';
import CategorizationPicker from '@/app/CategorizationPicker';
import { useTranslations } from 'next-intl';
import TranscriptorOnboard from '../TranscriptorOnboard';

const MODELS = [
  {
    value: 'openai/whisper-large-v3-turbo',
    label: 'Whisper v3 Turbo',
    descKey: 'turboDesc',
    price: '0.04',
    badge: null,
  },
  {
    value: 'openai/whisper-large-v3',
    label: 'Whisper v3 Large',
    descKey: 'premiumDesc',
    price: '0.09',
    badge: 'Premium',
  },
];

const OUTPUT_FORMATS = [
  { value: 'text', label: 'Plain Text', descKey: 'plainTextDesc' },
  { value: 'verbose_json', label: 'With Timestamps', descKey: 'withTimestampsDesc' },
];

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function ceilToTwoDecimals(value) {
  return Math.ceil(value * 100) / 100;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const stageProgress = {
  idle: 0,
  uploading: 10,
  waiting: 10,
};

export default function TranscriptorCreatorPage() {
  const router = useRouter();
  const t = useTranslations('transcriptor');
  const tc = useTranslations('common');
  const { getAccessTokenSilently, user } = useAuth0();

  const [file, setFile] = useState(null);
  const [fileDurationSeconds, setFileDurationSeconds] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [label, setLabel] = useState('');
  const [model, setModel] = useState('openai/whisper-large-v3-turbo');
  const [outputFormat, setOutputFormat] = useState('text');
  const [groupMembers, setGroupMembers] = useState([]);
  const [freeGenerations, setFreeGenerations] = useState(0);

  const [procStatus, setProcStatus] = useState('idle');
  const [resultId, setResultId] = useState(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('idle');
  const [stageLabel, setStageLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const [genMode, setGenMode] = useState('individual');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [categorization, setCategorization] = useState(null);

  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const attachFile = useCallback((f) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size, raw: f });
    setFileDurationSeconds(null);
    setError(null);
    setLabel(f.name.replace(/\.[^/.]+$/, ''));
  }, []);

  const removeFile = () => {
    setFile(null);
    setFileDurationSeconds(null);
    setLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/user/getBalance', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setFreeGenerations(data.free_generations_remaining || 0);
        }
      } catch (err) {}
    };
    fetchUserData();

    const fetchMembers = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/group/group-members', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? t('errorGeneric'));
          return;
        }

        setGroupMembers(data.group_members ?? []);
      } catch (err) {
        console.error('Failed to fetch group members:', err);
        setError(t('errorGeneric'));
      }
    };

    fetchMembers();
  }, [getAccessTokenSilently, t]);

  useEffect(() => {
    if (!file?.raw) return;

    let cancelled = false;
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file.raw);

    const cleanup = () => {
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(objectUrl);
    };

    audio.preload = 'metadata';
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      if (!cancelled && Number.isFinite(audio.duration)) {
        setFileDurationSeconds(audio.duration);
      }
      cleanup();
    };

    audio.onerror = () => {
      if (!cancelled) {
        setFileDurationSeconds(null);
      }
      cleanup();
    };

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [file]);

  const pollStatus = (jobId, token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/transcript/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.state === 'waiting') {
          setStage('waiting');
          setStageLabel(data.queuePosition ? `${t('queuePosition')} ${data.queuePosition}` : t('waitingInQueue'));
          setProgress(stageProgress.waiting);
        } else if (data.state === 'active') {
          setStage('active');
          const pct = data.progress || 0;
          setProgress(pct);
          if (data.progressLabel) {
            setStageLabel(data.progressLabel);
          } else if (pct < 20) setStageLabel(t('validatingBalance'));
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

  const handleTranscribe = async (mode = 'individual', selectedMemberIds = []) => {
    if (!file) return;
    setError(null);
    setProcStatus('processing');
    setStage('uploading');
    setStageLabel(t('uploadingFile'));
    setProgress(stageProgress.uploading);

    try {
      const token = await getAccessTokenSilently();
      const form = new FormData();
      form.append('file', file.raw);
      form.append('label', label);
      form.append('model', model);
      form.append('outputFormat', outputFormat);
      form.append('generation_type', mode);
      if (categorization) {
        form.append('categorization_id', categorization.id);
      }

      if (mode === 'group' && selectedMemberIds.length > 0) {
        form.append('member_ids', JSON.stringify(selectedMemberIds));
      }

      const endpoint = mode === 'group' ? '/api/transcript/transcribe/group' : '/api/transcript/transcribe/individual';
      const res = await fetch(endpoint, {
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
    setProgress(0);
    setResultId(null);
    removeFile();
    setError(null);
  };

  const selectedModelInfo = MODELS.find((m) => m.value === model);
  const selectedRate = Number(selectedModelInfo?.price || '0.04');
  const selectedHourlyRate = (selectedRate * 60).toFixed(1);
  const estimatedPrice = fileDurationSeconds != null
    ? ceilToTwoDecimals((fileDurationSeconds / 60) * selectedRate).toFixed(2)
    : null;

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
              targetProgress={procStatus === 'done' ? 100 : (stage === 'active' ? progress : (stageProgress[stage] ?? 0))}
              smoothed={false}
              done={procStatus === 'done'}
              doneLabel={label || file?.name}
              onView={() => resultId && router.push(`/transcriptor/${resultId}`)}
              onViewLabel={t('viewTranscript')}
              onReset={resetAll}
              onResetLabel={t('newTranscript')}
            />
          )}

          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[var(--fg)]">
              {t('newTranscript')}
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-3)]">
              {t('subtitle')}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 px-8" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>
            <motion.div
              className="flex flex-col gap-3.5 pt-5 pb-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                {!file ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); const droppedFile = e.dataTransfer.files[0]; if (droppedFile) attachFile(droppedFile); }}
                    className={`relative flex flex-shrink-0 cursor-pointer items-center gap-5 overflow-hidden rounded-xl border-[1.5px] border-dashed px-7 py-5 transition-all duration-200
                      ${dragging
                        ? 'border-[rgba(0,212,200,0.28)] bg-[rgba(0,212,200,0.02)]'
                        : 'border-[var(--border)] hover:border-[rgba(0,212,200,0.28)] hover:bg-[rgba(0,212,200,0.02)]'}`}
                  >
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(0,212,200,0.04) 0%, transparent 60%)' }}
                    />
                    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border transition-all duration-200
                      ${dragging ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]' : 'border-[var(--border)] bg-[var(--surface-raised)]'}`}>
                      <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-[1.6] transition-colors ${dragging ? 'stroke-[var(--accent)]' : 'stroke-[var(--fg-3)]'}`}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-[var(--fg)]">{t('dropAudioHere')}</div>
                      <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('clickToBrowse')}</div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1.5">
                      {['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm'].map((ext) => (
                        <span key={ext} className="rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--fg-3)]">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-shrink-0 items-center gap-3.5 rounded-xl border border-[rgba(0,212,200,0.15)] bg-[var(--surface)] px-5 py-3.5 surface">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[var(--accent)] fill-none stroke-[1.6]">
                        <path d="M9 18V5l12-2v13" />
                        <circle cx="6" cy="18" r="3" />
                        <circle cx="18" cy="16" r="3" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[14px] font-medium text-[var(--fg)]">{file.name}</div>
                      <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">
                        {formatBytes(file.size)} · {file.name.split('.').pop().toUpperCase()}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-1.5">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-surface flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {t('replace')}
                      </button>
                      <button
                        onClick={removeFile}
                        className="btn-danger flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.m4a,.ogg,.flac,.aac,.webm"
                className="hidden"
                onChange={(e) => { const selectedFile = e.target.files?.[0]; if (selectedFile) attachFile(selectedFile); }}
              />

              <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-1 gap-3.5 lg:grid-cols-2">
                <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                    {t('label')}
                  </div>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., AI Game Week 11"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] focus:border-[rgba(0,212,200,0.35)] transition-colors"
                  />
                  <div className="text-[11px] text-[var(--fg-3)]">{t('usedAsTitle')}</div>
                </div>

                <div className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('model')}</div>
                  <div className="flex gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setModel(m.value)}
                        className={`relative flex-1 rounded-lg border px-3 py-2 text-center text-[13px] font-medium transition-all ${model === m.value ? 'btn-option-active' : 'btn-option'}`}
                      >
                        {m.badge && (
                          <span className="absolute -top-2 -right-1 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-[var(--on-accent)]">
                            {m.badge}
                          </span>
                        )}
                        <div>{m.label.split(' ').slice(0, 3).join(' ')}</div>
                        <div className={`mt-0.5 flex items-center justify-center text-[10px] ${model === m.value ? 'text-[var(--accent)]/90' : 'text-[var(--fg-3)]'}`}>
                          {(Number(m.price) * 60).toFixed(1)}
                          <CreditIcon size={8} className="mx-0.5" color={model === m.value ? '#00d4c8' : 'var(--fg-2)'} />
                          /hr
                        </div>
                        <LocalCreditPrice credits={Number(m.price) * 60} suffix="/hr" className="mt-0.5 block text-[9px]" />
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-[var(--fg-3)]">
                    {t(selectedModelInfo?.descKey ?? 'turboDesc')}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex-shrink-0">
                <CategorizationPicker
                  value={categorization}
                  onChange={setCategorization}
                  userId={user?.sub ?? 'local-user'}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 surface noise">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('outputFormat')}</div>
                    <div className="mt-1 text-[12px] text-[var(--fg-3)]">
                      Choose whether you want a clean reading transcript or segment timestamps for navigation and subtitles.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {OUTPUT_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setOutputFormat(format.value)}
                      className={`rounded-xl border px-4 py-3 text-left transition-all ${outputFormat === format.value ? 'btn-option-active' : 'btn-option'}`}
                    >
                      <div className={`text-[13px] font-medium ${outputFormat === format.value ? 'text-[var(--accent)]' : 'text-[var(--fg)]'}`}>
                        {format.label}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--fg-3)]">
                        {t(format.descKey)}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="flex-shrink-0 px-8 pb-6 pt-2">
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 surface shadow-xl shadow-black/40"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('summary')}</div>
                <div className="text-[13px] text-[var(--fg)]">
                  {file ? <><span className="text-[var(--accent)]">{label || file.name}</span> · {selectedModelInfo?.label}</> : t('noFileSelected')}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1">
                  <button
                    onClick={() => setGenMode('individual')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap
                      ${genMode === 'individual'
                        ? 'bg-[rgba(var(--accent-rgb),0.18)] text-[var(--accent)]'
                        : 'text-[var(--fg-4)] hover:text-[var(--fg-2)]'}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[1.8]">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    {tc('individual')}
                  </button>
                  <button
                    onClick={() => setGenMode('group')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all whitespace-nowrap
                      ${genMode === 'group'
                        ? 'bg-[rgba(var(--accent-rgb),0.18)] text-[var(--accent)]'
                        : 'text-[var(--fg-4)] hover:text-[var(--fg-2)]'}`}
                  >
                    <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[1.8]">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    {tc('group')}
                  </button>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.07em] text-[var(--fg-3)]">
                    {freeGenerations > 0 && genMode === 'individual' ? 'Cost (Trial)' : estimatedPrice ? 'Estimated cost' : 'Price per hour'}
                  </div>
                  <div className="flex items-center justify-end font-mono text-[15px] font-medium">
                    {freeGenerations > 0 && genMode === 'individual' ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[var(--fg-4)] line-through decoration-1 text-[12px] leading-none mb-0.5 mt-1">
                          {estimatedPrice || selectedHourlyRate} <CreditIcon size={12} className="ml-0.5 opacity-50 inline-block mb-0.5" />
                        </span>
                        <LocalCreditPrice credits={estimatedPrice || selectedHourlyRate} suffix={estimatedPrice ? '' : '/hr'} className="mt-0.5" />
                        <span className="text-[#22c55e] font-bold text-[14px] uppercase tracking-wide leading-none">
                          FREE
                        </span>
                      </div>
                    ) : estimatedPrice ? (
                      <span className="flex flex-col items-end text-[var(--accent)]">
                        <span>{estimatedPrice}<CreditIcon size={15.5} className="ml-1" /></span>
                        <LocalCreditPrice credits={estimatedPrice} className="mt-0.5" />
                      </span>
                    ) : (
                      <span className="flex flex-col items-end text-[var(--accent)]">
                        <span>{selectedHourlyRate}<CreditIcon size={15.5} className="ml-1" />{' '} /hr</span>
                        <LocalCreditPrice credits={selectedHourlyRate} suffix="/hr" className="mt-0.5" />
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (genMode === 'group') {
                      if (groupMembers.length === 0) {
                        setError('No group members found for group transcription.');
                        return;
                      }
                      setIsGroupModalOpen(true);
                    } else {
                      handleTranscribe('individual');
                    }
                  }}
                  disabled={!file || procStatus === 'processing'}
                  className="btn-accent flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-25 whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                  </svg>
                  {t('transcribe')}
                </button>

                <GroupMemberModal
                  isOpen={isGroupModalOpen}
                  onClose={() => setIsGroupModalOpen(false)}
                  members={groupMembers}
                  estimatedCost={estimatedPrice ?? selectedHourlyRate}
                  onConfirm={(selectedIds) => {
                    setIsGroupModalOpen(false);
                    handleTranscribe('group', selectedIds);
                  }}
                />
              </div>
            </motion.div>
          </div>
        </main>
      </div>
      <TranscriptorOnboard />
    </div>
  );
}
