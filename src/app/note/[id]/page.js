'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'motion/react'
import Navbar from '../../navbar';
import Sidebar from '../../sidebar';
import MDEditor from '@uiw/react-md-editor';
import GeneratingOverlay from '@/app/GeneratingOverlays';
import ConfirmModal from '@/app/ConfirmModal';
import ErrorModal from '@/app/ErrorModal';
import CreditIcon from '@/app/CreditIcon';


// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCreatedAt(ts) {
  if (!ts) return '—';
  const withZ = ts.toString().replace(' ', 'T').split('.')[0] + 'Z';
  return new Date(withZ).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Bangkok', hour12: false,
  });
}

function getTier(tokens) {
  if (!tokens || tokens <= 25000) return { label: 'Tier 1', price: 9 };
  if (tokens <= 50000) return { label: 'Tier 2', price: 17 };
  if (tokens <= 75000) return { label: 'Tier 3', price: 29 };
  return { label: 'Tier 4', price: 37 };
}

const styleLabels = { exam: 'Exam Note', standard: 'Standard', textbook: 'Textbook' };

// ─── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({ children, onClick, icon, danger, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-all
        ${active
          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
          : 'border-white/[0.07] bg-[#18181f] text-[#b4b4c2] hover:border-white/[0.14] hover:text-[#e8e8ed]'}
        ${danger ? 'hover:!border-[rgba(239,68,68,0.3)] hover:!text-[#ef4444]' : ''}`}
    >
      {icon}{children}
    </button>
  );
}

// ─── Detail field ──────────────────────────────────────────────────────────────
function DetailField({ label, value, editing, editValue, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] uppercase tracking-[0.07em] text-[#9a9aaa]">{label}</div>
      {editing ? (
        <input
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '—'}
          className="bg-[#18181f] border border-[rgba(0,212,200,0.25)] rounded-lg px-2.5 py-1.5 text-[12px] text-[#e8e8ed] outline-none focus:border-[rgba(0,212,200,0.5)] transition-colors w-full placeholder:text-[#9a9aaa] min-h-[32px]"
        />
      ) : (
        <div className="bg-[#18181f] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-[12px] text-[#e8e8ed] min-h-[32px] capitalize truncate">
          {value || '—'}
        </div>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function NoteViewer({ params }) {
  const router = useRouter();
  const { getAccessTokenSilently } = useAuth0();
  const { id } = use(params);

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [editName, setEditName] = useState('');

  const [procStatus, setProcStatus] = useState('idle');
  const [currentStatus, setCurrentStatus] = useState('pending');
  const intervalRef = useRef(null);
  const progressBarRef = useRef(null);

  const NOTE_STEPS = ['Reading transcript', 'Generating note', 'Saving note'];
  const stepMap = { pending: 0, reading: 0, generating: 1, saving: 2 };
  const progressMap = { pending: 5, reading: 20, generating: 60, saving: 90, completed: 100 };

  const handleReaderScroll = (e) => {
    const el = e.target;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${Math.min(100, pct)}%`;
    }
  };

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchNote = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch(`/api/note/getDetail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setError(data.error ?? 'Note not found.');
          setLoading(false);
          return;
        }
        setNote(data.detail);
        setEditName(data.detail.name ?? '');
        setEditContent(data.detail.content ?? '');
      } catch (err) {
        setError('Failed to load note.');
      } finally {
        setLoading(false);
      }
    };
    fetchNote();
  }, [id, getAccessTokenSilently]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const copyNote = () => {
    navigator.clipboard.writeText(note?.content ?? '').catch(() => { });
    setToast(true);
    setTimeout(() => setToast(false), 2200);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/edit/content', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent, publicId: id,
          name: editName
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNote(prev => ({ ...prev, content: editContent, name: editName}));
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/delete', {
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
      router.push('/note');
    } catch {
      setDeleteModal(false); 
      setDeleteError('Something went wrong. Please try again.');
      setDeleting(false);
    }
  };

  const pollStatus = (token) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/note/status/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const status = data.status?.toLowerCase();
        setCurrentStatus(status);

        if (status === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
          router.refresh();
          const res2 = await fetch(`/api/note/getDetail/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          const data2 = await res2.json();
          if (!data2.error) {
            setNote(data2.detail);
            setEditContent(data2.detail.content ?? '');
          }
        } else if (status === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setProcStatus('idle');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleRegenerate = async () => {
    setProcStatus('processing');
    setCurrentStatus('pending');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/note/regenerate/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicId: id }),
      });
      const data = await res.json();
      if (data.error) { setProcStatus('idle'); return; }
      pollStatus(token);
    } catch (err) {
      console.error('Regenerate failed:', err);
      setProcStatus('idle');
    }
  };

  const tier = note ? getTier(note.total_tokens ?? 0) : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">

          {/* ── Loading skeleton ── */}
          {loading && (
            <>
              <div className="flex-shrink-0 flex items-end justify-between px-7 pt-5 pb-0 gap-4">
                <div className="skeleton h-7 w-48 rounded-lg" />
                <div className="skeleton h-6 w-64 rounded-full" />
              </div>
              <div className="flex flex-1 overflow-hidden gap-3.5 p-5 px-7 min-h-0">
                <div className="flex w-[280px] flex-shrink-0 flex-col gap-3">
                  <div className="skeleton h-20 w-full rounded-xl" />
                  <div className="skeleton h-48 w-full rounded-xl" />
                  <div className="skeleton h-28 w-full rounded-xl" />
                  <div className="skeleton h-10 w-full rounded-lg" />
                </div>
                <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#111116]">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
                    <div className="skeleton h-5 w-32 rounded" />
                    <div className="flex gap-1.5">
                      {[60, 52, 52, 72, 52].map((w, i) => (
                        <div key={i} className="skeleton h-7 rounded-lg" style={{ width: w }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 px-10 py-8 flex flex-col gap-4">
                    <div className="flex gap-3 mb-2">
                      {[120, 80, 100].map((w, i) => <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />)}
                    </div>
                    <div className="skeleton h-8 w-3/4 rounded" />
                    {[1, 0.9, 1, 0.85, 1, 0.5, 1, 0.75, 1].map((w, i) => (
                      <div key={i} className="skeleton h-4 rounded" style={{ width: `${w * 100}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-[14px] font-medium text-[#e8e8ed]">Failed to load note</div>
                <div className="mb-4 text-[12px] text-[#9a9aaa]">{error}</div>
                <button onClick={() => router.push('/note')}
                  className="rounded-lg border border-white/[0.07] bg-[#18181f] px-4 py-2 text-[13px] text-[#b4b4c2] transition-all hover:text-[#e8e8ed]">
                  Back to notes
                </button>
              </div>
            </div>
          )}

          {/* ── Content ── */}
          {!loading && note && (
            <motion.div
              className="relative flex flex-1 flex-col overflow-hidden min-w-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              {procStatus === 'processing' && (
                <GeneratingOverlay
                  variant="document"
                  title="Regenerating your note…"
                  subtitle={NOTE_STEPS[stepMap[currentStatus]] ?? 'Processing…'}
                  progress={progressMap[currentStatus] ?? 5}
                  onCancel={null}
                />
              )}

              {/* Page header */}
              <div className="flex-shrink-0 flex items-center justify-between px-7 pt-5 pb-0 gap-4">
                <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed] select-none truncate">
                  {note.name}
                </h1>
                <div className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[11px] text-[#9a9aaa] select-none">
                  Last generated: <span className="text-[#b4b4c2]">{formatCreatedAt(note.created_at)}</span>
                </div>
              </div>

              {/* Workspace */}
              <div className="flex flex-1 overflow-hidden gap-3.5 p-5 px-7 min-h-0">

                {/* ── Left panel ── */}
                <div
                  className="flex w-[280px] flex-shrink-0 flex-col gap-3 overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
                >
                  {/* Source file */}
                  <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface noise">
                    <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] uppercase tracking-[0.07em] text-[#9a9aaa] select-none">
                      Source file
                    </div>
                    <div className="p-3.5">
                      <div className="flex items-center gap-3 bg-[#18181f] border border-white/[0.07] rounded-lg px-3 py-2.5">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-[#00d4c8] fill-none stroke-[1.8]">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-[12.5px] font-medium text-[#e8e8ed]">
                            {note.uploaded_filename ?? note.transcriptName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#9a9aaa]">
                            {note.uploaded_filename ? 'Uploaded file' : 'In-app transcript'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="rounded-xl border border-white/[0.07] bg-[#111116] overflow-hidden surface noise">
                    <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between select-none">
                      <div className="text-[10px] uppercase tracking-[0.07em] text-[#9a9aaa]">Details</div>
                      {isEditing && <div className="text-[10px] text-[#00d4c8] opacity-70">Editing</div>}
                    </div>
                    <div className="p-3 flex flex-col gap-2">
                      <DetailField label="Name" value={note.name} editing={isEditing} editValue={editName} onChange={setEditName} />
                      <DetailField label="Language" value={note.language} editing={false} />
                      <DetailField label="Generation Type" value={note.generation_type} editing={false}/>
                      <DetailField label="Note style" value={styleLabels[note.style] ?? note.style} editing={false} />
                    </div>
                  </div>

                  {/* Token breakdown */}
                  <div className="rounded-xl border border-[rgba(0,212,200,0.1)] bg-[#111116] overflow-hidden surface-teal">
                    <div className="px-4 py-2.5 border-b border-white/[0.07] text-[10px] uppercase tracking-[0.07em] text-[#9a9aaa] select-none">
                      Usage
                    </div>
                    <div className="p-3.5 flex flex-col gap-1.5">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-[#9a9aaa]">Total tokens</span>
                        <span className="font-mono text-[12px] text-[#e8e8ed]">{note.total_tokens?.toLocaleString() ?? '—'}</span>
                      </div>
                      <div className="flex justify-between text-[12.5px]">
                        <span className="text-[#9a9aaa]">Tier</span>
                        <span className="font-mono text-[12px] text-[#e8e8ed]">{tier.label}</span>
                      </div>
                      <div className="h-px bg-white/[0.07] my-1" />
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-medium text-[#b4b4c2]">Charged</span>
                        <span className="font-mono text-[16px] font-medium text-[#00d4c8] flex items-center">{note.charge_amount} <CreditIcon size={16} className='ml-1.5'/></span>
                      </div>
                    </div>
                  </div>

                  {/* Regenerate */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleRegenerate}
                      disabled={procStatus === 'processing'}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00d4c8] py-2.5 text-[13px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current fill-none stroke-2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Regenerate note
                    </button>
                  </div>
                </div>

                {/* ── Right panel ── */}
                <div className="flex flex-1 flex-col overflow-hidden min-w-0 rounded-xl border border-white/[0.07] bg-[#111116] surface">

                  {/* Viewer header */}
                  <div className="flex-shrink-0 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#18181f] px-5 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[13px] font-medium text-[#b4b4c2]">Generated note</span>
                      <div className="flex items-center gap-1.5 rounded-full bg-[rgba(34,197,94,0.1)] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                        <div className="h-[5px] w-[5px] rounded-full bg-current" />
                        Completed
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <ActionBtn
                        onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        active={isEditing || saved}
                        icon={
                          saved ? (
                            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[2]">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          )
                        }
                      >
                        {saving ? 'Saving…' : saved ? 'Saved' : isEditing ? 'Save' : 'Edit'}
                      </ActionBtn>

                      {isEditing && (
                        <ActionBtn onClick={() => { setIsEditing(false); setEditContent(note.content); }} icon={
                          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        }>Cancel</ActionBtn>
                      )}

                      <ActionBtn onClick={copyNote} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      }>Copy</ActionBtn>

                      <ActionBtn onClick={() => setIsFullscreen(true)} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                      }>Fullscreen</ActionBtn>

                      <ActionBtn danger onClick={() => setDeleteModal(true)} icon={
                        <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M9 6V4h6v2" />
                        </svg>
                      }>
                        {deleting ? 'Deleting…' : 'Delete'}
                      </ActionBtn>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-hidden" data-color-mode="dark">
                    {isEditing ? (
                      <MDEditor
                        value={editContent}
                        onChange={setEditContent}
                        height="100%"
                        preview="edit"
                        style={{ background: '#111116', borderRadius: 0, border: 'none', height: '100%' }}
                      />
                    ) : (
                      <div
                        className="h-full overflow-y-auto px-10 py-8"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
                      >
                        {/* Meta chips */}
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                          {[
                            {
                              label: formatCreatedAt(note.created_at),
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
                            },
                            {
                              label: styleLabels[note.style] ?? note.style,
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
                            },
                            {
                              label: note.instructor ?? note.name,
                              icon: <svg viewBox="0 0 24 24" className="h-[11px] w-[11px] stroke-current fill-none stroke-2"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
                            },
                          ].map((m, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#9a9aaa]">
                              {m.icon}{m.label}
                            </div>
                          ))}
                        </div>

                        <div className="max-w-[720px]">
                          <MDEditor.Markdown
                            source={note.content}
                            style={{ background: 'transparent', color: '#b0b0bc', fontSize: '14px', lineHeight: '2' }}
                            rehypePlugins={[]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* ── Fullscreen reader ── */}
      <AnimatePresence>
        {deleteError && <ErrorModal message={deleteError} onClose={() => setDeleteError(null)} />}
        {deleteModal && (
          <ConfirmModal
            title="Delete this note?"
            message="This note will be permanently deleted and cannot be recovered."
            confirmLabel="Delete"
            loadingLabel="Deleting…"
            loading={deleting}
            onConfirm={handleDelete}
            onCancel={() => { if (!deleting) setDeleteModal(false); }}
          />
        )}
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-[#0c0c0e] flex flex-col"
          >
            <nav className="h-14 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/[0.05] bg-[#111116] nav-surface">
              <div className="flex items-center gap-4 select-none">
                <span className="font-serif text-[18px] text-[#00d4c8]">Eidolon</span>
                <div className="h-4 w-px bg-white/[0.07]" />
                <span className="text-[12px] text-[#b4b4c2] truncate max-w-[400px]">
                  {note.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyNote}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#b4b4c2] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
                  <svg viewBox="0 0 24 24" className="h-[13px] w-[13px] stroke-current fill-none stroke-[1.8]">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy all
                </button>
                <button onClick={() => setIsFullscreen(false)}
                  className="group flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-all hover:border-[rgba(239,68,68,0.3)]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-2 stroke-[#9a9aaa] group-hover:stroke-[#ef4444] transition-colors">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </nav>

            {/* Reading progress bar */}
            <div className="h-[2px] w-full bg-[#1e1e27] flex-shrink-0 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full bg-[#00d4c8]"
                style={{ width: '0%', transition: 'width 60ms linear', willChange: 'width' }}
              />
            </div>

            <div
              className="flex-1 overflow-y-auto py-16 px-8 flex justify-center"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
              onScroll={handleReaderScroll}
            >
              <div className="w-full max-w-[680px]">
                <div className="text-[11px] uppercase tracking-[0.08em] text-[#9a9aaa] mb-3 select-none">
                  {note.name}
                  <span className="text-[#9a9aaa] mx-1">·</span>
                  {formatCreatedAt(note.created_at)}
                </div>
                <div className="text-[12px] text-[#9a9aaa] mb-8 flex items-center gap-2 select-none">
                  Generated by Eidolon <span className="text-[#9a9aaa]">·</span> {note.charge_amount}<CreditIcon size={12} color='#9a9aaa'/>
                </div>
                <div data-color-mode="dark">
                  <MDEditor.Markdown
                    source={note.content}
                    style={{ background: 'transparent', color: '#b0b0bc', fontSize: '15px', lineHeight: '1.95' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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