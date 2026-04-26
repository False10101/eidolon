'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDuration(seconds) {
    if (!seconds) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TranscriptSourcePicker({ onFileChange, onTranscriptChange, onLabelChange }) {
    const { getAccessTokenSilently } = useAuth0();
    const fileInputRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedTranscript, setSelectedTranscript] = useState(null);
    const [transcripts, setTranscripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const mode = file ? 'file' : selectedTranscript ? 'transcript' : null;

    useEffect(() => {
        const fetchTranscripts = async () => {
            try {
                const token = await getAccessTokenSilently();
                const res = await fetch('/api/transcript/getHistory', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setTranscripts(data.history ?? []);
            } catch (err) {
                console.error('Failed to fetch transcripts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTranscripts();
    }, [getAccessTokenSilently]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const handleFile = (f) => {
        if (!f || f.type !== 'text/plain') return;
        setFile(f);
        setSelectedTranscript(null);
        onFileChange?.(f);
        onTranscriptChange?.(null);
        onLabelChange?.(f.name.replace(/\.[^/.]+$/, ''));
        setOpen(false);
    };

    const handleTranscriptSelect = (tx) => {
        setSelectedTranscript(tx);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onFileChange?.(null);
        onTranscriptChange?.(tx.public_id);
        onLabelChange?.((tx.label ?? tx.filename ?? '').replace(/\.[^/.]+$/, ''));
        setOpen(false);
    };

    const clearSelection = (e) => {
        e.stopPropagation();
        setFile(null);
        setSelectedTranscript(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onFileChange?.(null);
        onTranscriptChange?.(null);
    };

    const filtered = transcripts.filter(tx =>
        (tx.label ?? tx.filename ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* ── Strip — click to open modal ── */}
            <div
                onClick={() => setOpen(true)}
                className="relative flex flex-shrink-0 cursor-pointer items-center gap-5 overflow-hidden rounded-xl border-[1.5px] border-dashed px-5 py-3.5 transition-all duration-200 border-white/[0.08] hover:border-[rgba(0,212,200,0.28)] hover:bg-[rgba(0,212,200,0.02)]"
            >
                <div className="pointer-events-none absolute inset-0"
                    style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(0,212,200,0.04) 0%, transparent 60%)' }} />

                {!mode && (
                    <>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-white/[0.07] bg-[#18181f]">
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.6] stroke-[#9a9aaa]">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="text-[14px] font-medium text-[#e8e8ed]">Choose transcript source</div>
                            <div className="mt-0.5 text-[12px] text-[#9a9aaa]">Upload a .txt file or pick from your transcripts</div>
                        </div>
                        <span className="rounded-md border border-white/[0.07] bg-[#18181f] px-2 py-0.5 font-mono text-[10.5px] text-[#9a9aaa] uppercase">.txt</span>
                    </>
                )}

                {mode === 'file' && (
                    <>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[#00d4c8] fill-none stroke-[1.6]">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-[14px] font-medium text-[#e8e8ed]">{file.name}</div>
                            <div className="mt-0.5 text-[12px] text-[#9a9aaa]">{(file.size / 1024).toFixed(1)} KB · TXT</div>
                        </div>
                        <button onClick={clearSelection}
                            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#9a9aaa] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
                            Remove
                        </button>
                    </>
                )}

                {mode === 'transcript' && (
                    <>
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[#00d4c8] fill-none stroke-[1.6]">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="truncate text-[14px] font-medium text-[#e8e8ed]">
                                {selectedTranscript.label ?? selectedTranscript.filename}
                            </div>
                            <div className="mt-0.5 text-[12px] text-[#9a9aaa]">
                                In-app transcript{formatDuration(selectedTranscript.duration) ? ` · ${formatDuration(selectedTranscript.duration)}` : ''}
                            </div>
                        </div>
                        <button onClick={clearSelection}
                            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#9a9aaa] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444]">
                            Remove
                        </button>
                    </>
                )}
            </div>

            <input ref={fileInputRef} type="file" accept=".txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {/* ── Modal ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
                        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="w-full max-w-[720px] mx-6 rounded-2xl border border-white/[0.1] bg-[#111116] shadow-2xl overflow-hidden surface"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-[#18181f]">
                                <div>
                                    <div className="text-[14px] font-medium text-[#e8e8ed]">Choose transcript source</div>
                                    <div className="mt-0.5 text-[12px] text-[#9a9aaa]">Upload a file or select from your existing transcripts</div>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="group flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#111116] transition-all hover:border-[rgba(239,68,68,0.3)]"
                                >
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-[#9a9aaa] fill-none stroke-[2] group-hover:stroke-[#ef4444] transition-colors">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {/* Two columns */}
                            <div className="grid grid-cols-2 divide-x divide-white/[0.07]" style={{ minHeight: 320 }}>

                                {/* LEFT — Upload */}
                                <div className="flex flex-col p-5">
                                    <div className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">Upload file</div>
                                    <div
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed transition-all duration-200
                      ${isDragging
                                                ? 'border-[rgba(0,212,200,0.4)] bg-[rgba(0,212,200,0.04)]'
                                                : 'border-white/[0.08] hover:border-[rgba(0,212,200,0.3)] hover:bg-[rgba(0,212,200,0.02)]'}`}
                                    >
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-all ${isDragging ? 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.08)]' : 'border-white/[0.07] bg-[#18181f]'}`}>
                                            <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-[1.6] transition-colors ${isDragging ? 'stroke-[#00d4c8]' : 'stroke-[#9a9aaa]'}`}>
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[13px] font-medium text-[#e8e8ed]">Drop .txt file here</div>
                                            <div className="mt-0.5 text-[12px] text-[#9a9aaa]">or click to browse</div>
                                        </div>
                                        <span className="rounded-md border border-white/[0.07] bg-[#18181f] px-2 py-0.5 font-mono text-[10.5px] text-[#9a9aaa] uppercase">.txt</span>
                                    </div>
                                </div>

                                {/* RIGHT — Transcript list */}
                                <div className="flex flex-col p-5">
                                    <div className="mb-3 text-[10px] uppercase tracking-[0.08em] text-[#9a9aaa] select-none">Pick transcript</div>

                                    {/* Search */}
                                    <div className="relative mb-3 flex-shrink-0">
                                        <svg viewBox="0 0 24 24" className="absolute left-2.5 top-1/2 -translate-y-1/2 stroke-[#9a9aaa] fill-none stroke-[1.8]" style={{ width: 13, height: 13 }}>
                                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search transcripts…"
                                            className="w-full rounded-lg border border-white/[0.07] bg-[#18181f] py-2 pl-8 pr-3 text-[12px] text-[#e8e8ed] outline-none placeholder:text-[#9a9aaa] focus:border-[rgba(0,212,200,0.3)] transition-colors"
                                        />
                                    </div>

                                    {/* List */}
                                    <div
                                        className="flex-1 overflow-y-auto flex flex-col gap-1.5"
                                        style={{ maxHeight: 220, scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
                                    >
                                        {loading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="h-4 w-4 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
                                            </div>
                                        ) : filtered.length === 0 ? (
                                            <div className="flex items-center justify-center py-8">
                                                <p className="text-[12px] text-[#9a9aaa]">
                                                    {transcripts.length === 0 ? 'No transcripts yet' : 'No results found'}
                                                </p>
                                            </div>
                                        ) : filtered.map((tx) => (
                                            <button
                                                key={tx.public_id}
                                                onClick={() => handleTranscriptSelect(tx)}
                                                className="group flex w-full items-center gap-3 rounded-lg border border-white/[0.06] bg-[#18181f] px-3.5 py-2.5 text-left transition-all duration-100 hover:border-[rgba(0,212,200,0.25)] hover:bg-[rgba(0,212,200,0.03)]"
                                            >
                                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.07] group-hover:border-[rgba(0,212,200,0.25)] bg-[#111116]">
                                                    <svg viewBox="0 0 24 24" className="stroke-[#9a9aaa] group-hover:stroke-[#00d4c8]  fill-none stroke-[1.8] transition-colors" style={{ width: 13, height: 13 }}>
                                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate text-[12.5px] font-medium text-[#e8e8ed] group-hover:text-[#00d4c8] transition-colors">
                                                        {tx.label ?? tx.filename}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {formatDuration(tx.duration) && (
                                                            <>
                                                                <span className="text-[11px] text-[#9a9aaa]">{formatDuration(tx.duration)}</span>
                                                                <span className="text-[#9a9aaa]">·</span>
                                                            </>
                                                        )}
                                                        <span className="text-[11px] text-[#9a9aaa]">{formatDate(tx.created_at)}</span>
                                                    </div>
                                                </div>
                                                <svg viewBox="0 0 24 24"
                                                    className="h-3.5 w-3.5 flex-shrink-0 stroke-[#9a9aaa] fill-none stroke-[1.8] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <polyline points="9 18 15 12 9 6" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}