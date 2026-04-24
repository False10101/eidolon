'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';
import GeneratingOverlay from '../GeneratingOverlays';
import ErrorModal from '../ErrorModal';

// ─── Constants ─────────────────────────────────────────────────────────────────
const FORMATS = ['MP3', 'WAV', 'M4A'];
const BITRATES = ['128 kbps', '192 kbps', '256 kbps'];

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function fmtTimeInput(val) {
  const digits = val.replace(/[^0-9]/g, '');
  let out = digits;
  if (out.length >= 3) out = out.slice(0, 2) + ':' + out.slice(2);
  if (out.length >= 6) out = out.slice(0, 5) + ':' + out.slice(5);
  return out.slice(0, 8);
}

function getStepLabel(pct) {
  if (pct < 20) return 'Uploading to server';
  if (pct < 50) return 'Extracting audio track';
  if (pct < 85) return 'Encoding audio';
  return 'Uploading to storage';
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
export default function AudioConverter() {
  const { getAccessTokenSilently } = useAuth0();

  // File
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Config
  const [format, setFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState('192 kbps');
  const [trimEnabled, setTrimEnabled] = useState(false);
  const [trimStart, setTrimStart] = useState('');
  const [trimEnd, setTrimEnd] = useState('');

  // Conversion
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [convStep, setConvStep] = useState('');
  const [convertedName, setConvertedName] = useState('');
  const [error, setError] = useState(null);

  // Refs — avoids stale closure bug where state reads null inside callbacks
  const intervalRef = useRef(null);
  const completedJobIdRef = useRef(null); // stores jobId synchronously, never stale
  const formatRef = useRef(format); // keeps format in sync for download

  // Keep formatRef in sync with format state
  const handleSetFormat = (f) => {
    setFormat(f);
    formatRef.current = f;
  };

  // ── File handling ───────────────────────────────────────────────────────────
  const attachFile = useCallback((f) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size, raw: f });
    setError(null);
  }, []);

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Poll ────────────────────────────────────────────────────────────────────
  const pollStatus = (jobId, token, fileName) => {
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/audio-converter/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (data.state === 'waiting') {
          const pos = data.queuePosition;
          setConvStep(pos ? `Queue position: ${pos}` : 'Waiting in queue');
          setProgress(0);
        } else if (data.state === 'completed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          completedJobIdRef.current = jobId;
          setConvertedName(`${fileName.split('.')[0]}.${formatRef.current.toLowerCase()}`);
          setProgress(100);
          setStatus('done');
        } else if (data.state === 'failed') {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setStatus('idle');
          setError('Conversion failed. Check your file format and try again.');
        } else {
          const pct = 20 + Math.round((data.progress || 0) * 0.8);
          setProgress(pct);
          setConvStep(getStepLabel(pct));
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);
  };

  // ── Convert ─────────────────────────────────────────────────────────────────
  const handleConvert = async () => {
    if (!file) return;
    setError(null);
    setStatus('converting');
    setProgress(0);
    setConvStep('Uploading to server');

    try {
      const token = await getAccessTokenSilently();
      const form = new FormData();
      form.append('file', file.raw);
      form.append('format', format);
      form.append('bitrate', bitrate);
      if (trimEnabled) {
        form.append('start', trimStart);
        form.append('end', trimEnd);
      }

      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/audio-converter/convert');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Upload is ~first 20% of the whole flow
            const uploadPct = Math.round((e.loaded / e.total) * 20);
            setProgress(uploadPct);
          }
        };

        xhr.onload = () => resolve(JSON.parse(xhr.responseText));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(form);
      });

      if (!data.jobId) {
        setStatus('idle');
        setError(data.error || 'Failed to start conversion.');
        return;
      }

      pollStatus(data.jobId, token, file.name);
    } catch (err) {
      console.error('Conversion error:', err);
      setStatus('idle');
      setError('Something went wrong. Please try again.');
    }
  };

  // ── Download ─────────────────────────────────────────────────────────────────
  // Reads jobId from ref — always current, never stale
  const handleDownload = async () => {
    const jobId = await completedJobIdRef.current;
    if (!jobId) {
      setError('Download reference lost. Please convert again.');
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`/api/audio-converter/download/${jobId}/${formatRef.current.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError('Your file has expired. Please convert again.');
        resetAll();
        return;
      }

      const a = document.createElement('a');
      a.href = data.url;
      a.download = convertedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Download failed. Please try again.');
    }
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetAll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    completedJobIdRef.current = null;
    setStatus('idle');
    setProgress(0);
    setConvStep('');
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

          {(status === 'converting' || status === 'done') && (
            <GeneratingOverlay
              title="Converting your file…"
              subtitle={convStep}
              targetProgress={progress}
              onCancel={null}
              done={status === 'done'}
              doneLabel={convertedName}
              onView={handleDownload}
              onViewLabel="Download file"
              onReset={resetAll}
              onResetLabel="Convert another"
              smoothed={false}
            />
          )}

          {/* Page header */}
          <div className="flex-shrink-0 px-8 pt-6">
            <h1 className="font-serif text-[22px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
              Audio <span className="text-[#00d4c8]">Converter</span>
            </h1>
            <p className="mt-0.5 text-[12.5px] text-[#6b6b7a]">
              Extract audio from your lecture recording. Free — nothing is stored on the server.
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] font-medium text-[#9898a8]">Drop your lecture recording here</div>
                    <div className="mt-0.5 text-[12px] text-[#6b6b7a]">or click to browse — .mp4, .mov, .mkv · No size limit</div>
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    {['.mp4', '.mov', '.mkv'].map(t => (
                      <span key={t} className="rounded-md border border-white/[0.07] bg-[#18181f] px-2 py-0.5 font-mono text-[10.5px] text-[#6b6b7a]">{t}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-shrink-0 items-center gap-3.5 rounded-xl border border-[rgba(0,212,200,0.15)] bg-[#111116] px-5 py-3.5 surface">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.07)]">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-[#00d4c8] fill-none stroke-[1.6]">
                      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
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

            <input ref={fileInputRef} type="file" accept=".mp4,.mov,.mkv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) attachFile(f); }} />

            {/* Config cards */}
            <motion.div variants={itemVariants} className="grid flex-shrink-0 grid-cols-3 gap-3.5">

              {/* Output format */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Output format</div>
                <div className="flex gap-1">
                  {FORMATS.map(f => (
                    <button key={f} onClick={() => handleSetFormat(f)}
                      className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all duration-100
                        ${format === f
                          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                          : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-[#6b6b7a] opacity-50">MP3 is recommended for Whisper transcription.</div>
              </div>

              {/* Bitrate */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Bitrate</div>
                <div className="flex gap-1">
                  {BITRATES.map(b => (
                    <button key={b} onClick={() => setBitrate(b)}
                      className={`flex-1 rounded-lg border py-[7px] text-center text-[12px] transition-all duration-100
                        ${bitrate === b
                          ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.07)] text-[#00d4c8]'
                          : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a] hover:border-white/[0.14] hover:text-[#9898a8]'}`}>
                      {b}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-[#6b6b7a] opacity-50">192 kbps balances quality and file size.</div>
              </div>

              {/* Trim */}
              <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-4 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-65">Trim</div>
                <button onClick={() => setTrimEnabled(v => !v)} className="flex items-center gap-2 py-0.5">
                  <div className={`relative h-4 w-7 flex-shrink-0 rounded-full transition-colors duration-200 ${trimEnabled ? 'bg-[#00d4c8]' : 'bg-[#1e1e27]'}`}>
                    <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all duration-200 ${trimEnabled ? 'left-[14px]' : 'left-0.5'}`} />
                  </div>
                  <span className={`text-[13px] transition-colors ${trimEnabled ? 'text-[#00d4c8]' : 'text-[#9898a8]'}`}>
                    {trimEnabled ? 'Enabled' : 'Trim audio'}
                  </span>
                </button>
                <div className={`grid grid-cols-2 gap-2 overflow-hidden transition-all duration-200 ${trimEnabled ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {[
                    { label: 'Start', val: trimStart, set: setTrimStart },
                    { label: 'End', val: trimEnd, set: setTrimEnd },
                  ].map(({ label, val, set }) => (
                    <div key={label}>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.05em] text-[#6b6b7a] opacity-55">{label}</div>
                      <div className="flex items-center overflow-hidden rounded-lg border border-white/[0.07] bg-[#18181f] focus-within:border-[rgba(0,212,200,0.35)] transition-colors">
                        <input type="text" value={val} onChange={(e) => set(fmtTimeInput(e.target.value))}
                          placeholder="00:00:00" maxLength={8}
                          className="min-w-0 flex-1 bg-transparent px-2.5 py-[7px] font-mono text-[12.5px] text-[#e8e8ed] outline-none placeholder:text-[#6b6b7a] placeholder:opacity-40" />
                        <span className="px-2 text-[10px] text-[#6b6b7a] opacity-50 select-none">h:m:s</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-[#6b6b7a] opacity-50">
                  {trimEnabled ? 'Set start and end times.' : 'Leave blank to convert the full file.'}
                </div>
              </div>

            </motion.div>

            <div className="flex-1" />

            {/* Action bar */}
            <motion.div
              variants={itemVariants}
              className="flex flex-shrink-0 items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-[#111116] px-5 py-3.5 surface shadow-xl shadow-black/40"
            >
              <div className="flex flex-col gap-0.5">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-55">Summary</div>
                <div className="text-[13px] text-[#9898a8]">
                  {file
                    ? <><span className="text-[#00d4c8]">{file.name}</span> → {format} · {bitrate}{trimEnabled ? ' · Trimmed' : ''}</>
                    : 'No file selected'}
                </div>
              </div>
              <button
                onClick={handleConvert}
                disabled={!file || status === 'converting'}
                className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-[#00d4c8] px-6 py-2.5 text-[13px] font-medium text-[#0c0c0e] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-current fill-none stroke-[2.2]">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Convert file
              </button>
            </motion.div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}