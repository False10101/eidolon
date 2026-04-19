'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../navbar';
import Sidebar from '../sidebar';

const LINE_OA_ID = '@669nrzlg';

// ─── Motion ────────────────────────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Confirm modal ─────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-[rgba(239,68,68,0.18)] bg-[#111116] p-7 surface"
      >
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full blur-2xl" style={{ background: 'rgba(239,68,68,0.08)' }} />
        <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#ef4444] fill-none stroke-[1.8]">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="relative mb-1.5 text-[15px] font-medium text-[#e8e8ed]">{title}</div>
        <p className="relative mb-6 text-[13px] leading-[1.7] text-[#6b6b7a]">{message}</p>
        <div className="relative flex gap-2">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] text-[#9898a8] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2.5 text-[13px] font-medium text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)]">
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function TopupPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { getAccessTokenSilently } = useAuth0();
  const exchangedRef = useRef(false);

  const [balance, setBalance]           = useState(null);
  const [lineConnected, setLineConnected] = useState(false);
  const [lineProfile, setLineProfile]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [connecting, setConnecting]     = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [toast, setToast]               = useState(null);

  // ── Fetch user ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch('/api/profile/balance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data  = await res.json();
        setBalance(data.balance);
        setLineConnected(!!data.line_user_id);
        setLineProfile(data.line_display_name ?? null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [getAccessTokenSilently]);

  // ── LINE OAuth callback ───────────────────────────────────────────────────────
  useEffect(() => {
    const code   = searchParams.get('code');
    const isLine = searchParams.get('line');
    if (!code || !isLine || exchangedRef.current) return;
    exchangedRef.current = true;

    const run = async () => {
      setConnecting(true);
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch('/api/topup/line-connect', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body:    JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setLineConnected(true);
        setLineProfile(data.display_name ?? null);
        showToast('LINE account connected!');
        router.replace('/topup');
      } catch {
        showToast('Failed to connect LINE. Try again.');
      } finally {
        setConnecting(false);
      }
    };
    run();
  }, [searchParams, getAccessTokenSilently]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleLineConnect = () => {
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('line_oauth_state', state);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID,
      redirect_uri:  `${window.location.origin}/topup?line=true`,
      state,
      scope: 'profile',
    });
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`;
  };

  const handleLineDisconnect = async () => {
    setConfirmDisconnect(false);
    setDisconnecting(true);
    try {
      const token = await getAccessTokenSilently();
      await fetch('/api/topup/line-disconnect', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setLineConnected(false);
      setLineProfile(null);
      showToast('LINE account disconnected.');
    } catch {
      showToast('Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const copyID = () => {
    navigator.clipboard.writeText(LINE_OA_ID).catch(() => {});
    showToast('LINE OA ID copied');
  };

  const STEPS = [
    {
      n: '01',
      title: 'Connect your LINE account',
      desc: 'One-time setup. Click "Connect LINE" above to link your LINE ID to your Eidolon account.',
      done: lineConnected,
      active: !lineConnected,
    },
    {
      n: '02',
      title: 'Transfer via PromptPay',
      desc: 'Send any amount to the PromptPay ID shown on the left. Screenshot your slip after.',
      done: false,
      active: lineConnected,
    },
    {
      n: '03',
      title: 'Send slip to LINE OA',
      desc: `Open LINE, search for "${LINE_OA_ID}" and send your payment screenshot as an image.`,
      done: false,
      active: lineConnected,
    },
    {
      n: '04',
      title: 'Balance auto-credited',
      desc: 'Slip2Go verifies your slip instantly with the bank API. Your balance updates automatically within minutes.',
      done: false,
      active: lineConnected,
    },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] font-sans text-sm">

      <AnimatePresence>
        {confirmDisconnect && (
          <ConfirmModal
            title="Disconnect LINE?"
            message="You won't be able to submit payment slips until you reconnect your LINE account."
            confirmLabel="Disconnect"
            onConfirm={handleLineDisconnect}
            onCancel={() => setConfirmDisconnect(false)}
          />
        )}
      </AnimatePresence>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex flex-1 overflow-hidden min-w-0">

          {/* ── Left panel ── */}
          <div className="flex w-[300px] flex-shrink-0 flex-col border-r border-white/[0.05]">
            <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-white/[0.07]">
              <h1 className="font-serif text-[19px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
                Top <span className="text-[#00d4c8]">Up</span>
              </h1>
              <p className="mt-0.5 text-[12px] text-[#6b6b7a]">
                Transfer via PromptPay, then send your slip to our LINE OA.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}>

              {lineConnected ? (
                <div className="flex flex-col gap-2">
                  <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-60 select-none">Scan to pay</div>
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.07] bg-[#111116] p-4 surface noise">
                    <div className="rounded-xl overflow-hidden bg-white">
                      <img src="/qr.png" alt="PromptPay QR" className="w-[200px] h-[300px] object-cover" />
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] text-[#6b6b7a]">Scan with any Thai banking app</div>
                      <div className="text-[11px] text-[#6b6b7a] mt-0.5">Any amount accepted</div>
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText('004999155988446'); showToast('PromptPay ID copied'); }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[11px] text-[#6b6b7a] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[1.8]">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy PromptPay ID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#18181f] px-4 py-10 text-center">
                  <svg viewBox="0 0 24 24" className="h-8 w-8 stroke-[#6b6b7a] fill-none stroke-[1.4] opacity-30">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <div className="text-[12.5px] text-[#6b6b7a]">Connect LINE to view payment details</div>
                  <div className="text-[11px] text-[#4b4b5a]">Your PromptPay QR will appear here</div>
                </div>
              )}
            </div>

            {/* Balance footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.07]">
              <div className="flex items-center justify-between rounded-lg border border-[rgba(0,212,200,0.12)] bg-[rgba(0,212,200,0.04)] px-3.5 py-2.5">
                <span className="text-[12px] text-[#6b6b7a]">Current balance</span>
                <span className="font-mono text-[14px] font-medium text-[#00d4c8]">฿ {balance ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">

            {/* Toolbar */}
            <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-b border-white/[0.07] bg-[#18181f]">
              <span className="text-[13px] font-medium text-[#9898a8]">Payment via LINE OA</span>
              {lineConnected && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e]">
                  <div className="h-[5px] w-[5px] rounded-full bg-current" />
                  LINE connected{lineProfile ? ` · ${lineProfile}` : ''}
                </div>
              )}
            </div>

            <motion.div
              className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e1e27 transparent' }}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >

              {/* LINE connect card */}
              <motion.div variants={itemVariants}
                className={`rounded-xl border overflow-hidden ${lineConnected ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.04)]' : 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.03)]'}`}>
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${lineConnected ? 'border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.1)]' : 'border-[rgba(0,212,200,0.2)] bg-[rgba(0,212,200,0.08)]'}`}>
                      <svg viewBox="0 0 24 24" className={`h-5 w-5 fill-none stroke-[1.8] ${lineConnected ? 'stroke-[#22c55e]' : 'stroke-[#00d4c8]'}`}>
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                    </div>
                    <div>
                      <div className={`text-[13px] font-medium ${lineConnected ? 'text-[#22c55e]' : 'text-[#e8e8ed]'}`}>
                        {lineConnected ? 'LINE account connected' : 'Connect your LINE account'}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-[#6b6b7a]">
                        {lineConnected
                          ? `Linked as ${lineProfile ?? 'LINE user'}`
                          : 'Required to send slips via LINE OA'}
                      </div>
                    </div>
                  </div>
                  {lineConnected ? (
                    <button
                      onClick={() => setConfirmDisconnect(true)}
                      disabled={disconnecting}
                      className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3 py-1.5 text-[12px] text-[#6b6b7a] transition-all hover:border-[rgba(239,68,68,0.3)] hover:text-[#ef4444] disabled:opacity-40"
                    >
                      {disconnecting && <div className="h-3 w-3 animate-spin rounded-full border border-transparent border-t-current" />}
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={handleLineConnect}
                      disabled={connecting}
                      className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-[#06c755] px-4 py-2 text-[12.5px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {connecting && <div className="h-3.5 w-3.5 animate-spin rounded-full border border-transparent border-t-white" />}
                      {connecting ? 'Connecting…' : 'Connect LINE'}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Steps */}
              <motion.div variants={itemVariants}>
                <div className="mb-3 text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-60 select-none">How to top up</div>
                <div className="flex flex-col">
                  {STEPS.map((step, i, arr) => (
                    <div key={step.n} className="flex items-start gap-3.5 relative">
                      {i < arr.length - 1 && (
                        <div className="absolute left-[10px] top-[22px] bottom-0 w-px bg-white/[0.07]" />
                      )}
                      <div className={`relative z-10 flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full border font-mono text-[10px] transition-all
                        ${step.done
                          ? 'border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                          : step.active
                            ? 'border-[rgba(0,212,200,0.3)] bg-[rgba(0,212,200,0.08)] text-[#00d4c8]'
                            : 'border-white/[0.07] bg-[#18181f] text-[#6b6b7a]'}`}>
                        {step.done
                          ? <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[2.5]"><polyline points="20 6 9 17 4 12" /></svg>
                          : step.n
                        }
                      </div>
                      <div className="pb-5 pt-0.5 flex-1 min-w-0">
                        <div className={`text-[13px] font-medium ${step.active || step.done ? 'text-[#e8e8ed]' : 'text-[#6b6b7a]'}`}>
                          {step.title}
                        </div>
                        <div className="mt-0.5 text-[12px] leading-[1.6] text-[#6b6b7a]">{step.desc}</div>
                        {step.n === '03' && lineConnected && (
                          <button onClick={copyID}
                            className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-2.5 py-1.5 text-[11px] text-[#6b6b7a] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-current fill-none stroke-[1.8]">
                              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy LINE OA ID ({LINE_OA_ID})
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Info box */}
              <motion.div variants={itemVariants}
                className="rounded-xl border border-white/[0.07] bg-[#111116] px-4 py-3.5 flex flex-col gap-1.5 surface noise">
                <div className="text-[10.5px] uppercase tracking-[0.07em] text-[#6b6b7a] opacity-60 mb-1 select-none">Good to know</div>
                {[
                  'Verification is instant — Slip2Go checks directly with the bank API.',
                  'Duplicate slips are automatically rejected.',
                  'If auto-verification fails, your slip is queued for manual admin review.',
                  'Top-ups are non-refundable once credited.',
                ].map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11.5px] text-[#6b6b7a]">
                    <span className="mt-[5px] h-[4px] w-[4px] flex-shrink-0 rounded-full bg-[#6b6b7a] opacity-40" />
                    {note}
                  </div>
                ))}
              </motion.div>

            </motion.div>
          </div>
        </main>
      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#18181f] px-3.5 py-2 text-[12.5px] text-[#9898a8] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'}`}>
        <svg viewBox="0 0 24 24" className="h-3 w-3 stroke-[#22c55e] fill-none stroke-[2.2]">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {toast}
      </div>
    </div>
  );
}

export default function Topup() {
  return (
    <Suspense>
      <TopupPage />
    </Suspense>
  );
}