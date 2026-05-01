'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import ConfirmModal from '@/app/ConfirmModal';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';
import { useTranslations, useLocale } from 'next-intl';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCreatedAt(ts, locale) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString(locale || 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatWordCount(content, t) {
  if (!content) return '—';
  return content.trim().split(/\s+/).length.toLocaleString() + ' ' + (t ? t('words') : 'words');
}

function formatTranscriptContent(tx) {
  if (tx.segments && tx.output_format === 'verbose_json') {
    try {
      const segments = typeof tx.segments === 'string'
        ? JSON.parse(tx.segments)
        : tx.segments;

      if (Array.isArray(segments) && segments.length > 0) {
        return segments.map(segment => {
          const startTime = formatTime(segment.start);
          const endTime = formatTime(segment.end);
          const speaker = segment.speaker_id ? `${segment.speaker_id}: ` : '';
          return `[${startTime} → ${endTime}]\n${speaker}${segment.text}`;
        }).join('\n\n');
      }
    } catch (e) {
      return tx.content;
    }
  }
  return tx.content;
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, icon, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-[12px] text-[var(--fg-3)] transition-all hover:border-[var(--border-hover)] hover:text-[var(--fg)] disabled:opacity-40 disabled:cursor-not-allowed
        ${danger ? 'hover:!border-[rgba(239,68,68,0.3)] hover:!text-[#ef4444]' : ''}`}
    >
      {icon}{children}
    </button>
  );
}

// ─── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{label}</div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[13px] text-[var(--fg)]">
        {value}
      </div>
    </div>
  );
}

function normalizeTranscriptModel(model) {
  const value = String(model || '').toLowerCase();
  if (value.includes('turbo')) return 'turbo';
  if (value.includes('large-v3') || value.includes('whisper-v3') || value.includes('premium')) return 'premium';
  return 'unknown';
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function TranscriptSkeleton() {
  return (
    <main className="flex flex-1 overflow-hidden min-w-0">
      {/* Left panel */}
      <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border)]">
        <div className="flex-shrink-0 border-b border-[var(--border)] px-[22px] pb-[18px] pt-[22px] flex flex-col gap-2">
          <div className="skeleton h-6 w-40 rounded-lg" />
          <div className="skeleton h-3 w-52 rounded" />
        </div>
        <div className="flex flex-1 flex-col gap-4 px-[22px] py-[18px]">
          <div className="skeleton h-16 w-full rounded-xl" />
          {[null, null, null].map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="skeleton h-2.5 w-20 rounded" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          ))}
          <div className="skeleton h-28 w-full rounded-xl" />
        </div>
      </div>
      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-[22px] py-4">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="flex gap-1.5">
            {[52, 80, 52].map((w, i) => (
              <div key={i} className="skeleton h-7 rounded-lg" style={{ width: w }} />
            ))}
          </div>
        </div>
        <div className="flex-1 px-8 py-7 flex flex-col gap-3">
          <div className="flex gap-3 mb-3">
            {[120, 60, 80].map((w, i) => (
              <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="skeleton h-4 rounded" style={{ width: i % 3 === 2 ? '70%' : '100%' }} />
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TranscriptViewer({ params }) {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();
  const { id } = use(params);
  const t = useTranslations('transcriptor');
  const locale = useLocale();

  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetch_ = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/transcript/getDetail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTx(data.detail);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [id]);

  const copyTranscript = () => {
    navigator.clipboard.writeText(tx?.content ?? '').catch(() => { });
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  };

  const downloadTranscript = () => {
    if (!tx?.content) return;
    const blob = new Blob([tx.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tx.label ?? 'transcript'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/transcript/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteModal(false);
        setDeleteError(data.error);
        setDeleting(false);
        return;
      }
      router.push('/transcriptor');
    } catch {
      setDeleteModal(false);
      setDeleteError(t('errorDelete'));
      setDeleting(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Error state */}
        {!loading && error && (
          <main className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-[14px] font-medium text-[var(--fg)]">{t('failedToLoad')}</div>
              <div className="mb-4 text-[12px] text-[var(--fg-3)]">{error}</div>
              <button onClick={() => router.push('/transcriptor')}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[13px] text-[var(--fg-2)] transition-all hover:text-[var(--fg)]">
                {t('backToTranscriptor')}
              </button>
            </div>
          </main>
        )}

        {/* Loading skeleton */}
        {loading && <TranscriptSkeleton />}

        {/* Content */}
        {!loading && tx && (
          <motion.main
            className="flex flex-1 overflow-hidden min-w-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >

            {/* ── Left panel ── */}
            <div className="flex w-[300px] flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-faint)]">

              {/* Header */}
              <div className="flex-shrink-0 border-b border-[var(--border)] px-[22px] pb-[18px] pt-[22px]">
                <div className="font-serif text-[19px] font-normal tracking-[-0.02em] text-[var(--fg)]">
                  {t('transcriptDetails')}
                </div>
                <div className="mt-0.5 text-[12px] text-[var(--fg-3)]">{t('sourceInfo')}</div>
              </div>

              {/* Details */}
              <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-[22px] py-[18px]"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}>

                {/* Source file card */}
                <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 surface noise">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[var(--accent)] fill-none stroke-[1.8]">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--fg)]">{tx.filename}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--fg-3)]">
                      {tx.filename?.split('.').pop().toUpperCase()} · {formatDuration(tx.duration)}
                    </div>
                  </div>
                </div>

                <DetailRow label={t('formatType')} value={tx.output_format === 'verbose_json' ? t('formatSegmented') : tx.output_format === 'text' ? t('formatText') : tx.output_format ?? '—'} />
                <DetailRow label={t('transcriptionModel')} value={normalizeTranscriptModel(tx.model) === 'premium' ? t('whisperLargeV3') : normalizeTranscriptModel(tx.model) === 'turbo' ? t('whisperLargeV3Turbo') : tx.model ?? '-'} />
                <DetailRow label={t('createdAt')} value={formatCreatedAt(tx.created_at, locale)} />
                <DetailRow label={t('wordCount')} value={formatWordCount(tx.content, t)} />

                {/* Cost breakdown */}
                <div className="flex flex-col gap-1.5 rounded-xl border border-[rgba(0,212,200,0.1)] bg-[var(--surface)] px-4 py-3.5 mt-2 surface-teal">
                  <div className="pb-1 text-[10.5px] uppercase tracking-[0.07em] text-[var(--fg-3)]">{t('costBreakdown')}</div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--fg-3)]">{t('duration')}</span>
                    <span className="font-mono text-[12px] text-[var(--fg)]">{formatDuration(tx.duration)}</span>
                  </div>
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-[var(--fg-3)]">{t('rate')}</span>
                    <span className="font-mono text-[12px] text-[var(--fg)]">
                      <CreditIcon size={12} className='mr-1' color='#b4b4c2' />{normalizeTranscriptModel(tx.model) === 'turbo' ? '2.4/hr' : normalizeTranscriptModel(tx.model) === 'premium' ? '5.4/hr' : '—'}
                    </span>
                  </div>
                  <div className="h-px bg-[var(--surface-tint)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium text-[var(--fg-2)]">{t('totalCharged')}</span>
                    <span className="font-mono text-[16px] font-medium text-[var(--accent)]">{tx.charge_amount} <CreditIcon size={16} className='mr-1' /></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">

              {/* Viewer header */}
              <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-[22px] py-4 bg-[var(--surface)] nav-surface">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="truncate text-[13px] font-medium text-[var(--fg)]">{tx.label}</span>
                  <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                    <div className="h-[5px] w-[5px] rounded-full bg-current flex-shrink-0" />
                    {t('completed')}
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <ActionBtn onClick={copyTranscript} icon={
                    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  }>{t('copy')}</ActionBtn>
                  <ActionBtn onClick={downloadTranscript} icon={
                    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  }>{t('download')}</ActionBtn>
                  <ActionBtn danger onClick={() => setDeleteModal(true)} icon={
                    <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
                    </svg>
                  }>{deleting ? t('deleting') : t('delete')}
                  </ActionBtn>
                </div>
              </div>

              {/* Viewer body */}
              <div
                className="flex-1 overflow-y-auto px-10 py-7"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--surface-deep) transparent' }}
              >
                {/* Meta chips */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {[
                    {
                      label: formatCreatedAt(tx.created_at),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                    },
                    {
                      label: formatDuration(tx.duration),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                    },
                    {
                      label: formatWordCount(tx.content),
                      icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="15" y2="18" /></svg>,
                    },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
                      {m.icon}{m.label}
                    </div>
                  ))}
                </div>

                {/* Transcript content */}
                <div className="max-w-[800px] text-[14px] leading-[2] text-[var(--fg-body)] whitespace-pre-wrap">
                  {formatTranscriptContent(tx)}
                </div>
              </div>
            </div>

          </motion.main>
        )}
      </div>

      <AnimatePresence>
        {deleteError && <ErrorModal message={deleteError} onClose={() => setDeleteError(null)} />}
        {deleteModal && (
          <ConfirmModal
            title={t('deleteTranscript')}
            message={t('deleteTranscriptConfirm')}
            confirmLabel={t('delete')}
            loadingLabel={t('deleting')}
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => { if (!deleting) setDeleteModal(false); }}
          />
        )}
      </AnimatePresence>

      {/* Copy toast */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3.5 py-2 text-[12.5px] text-[var(--fg-2)] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t('copiedToClipboard')}
      </div>
    </div>
  );
}
