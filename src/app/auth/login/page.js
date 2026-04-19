'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden:  { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 16 } },
};

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
      </svg>
    ),
    title: 'Transcribe any lecture',
    sub: 'Upload your recording — Whisper handles the rest, even messy audio.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Comprehensive notes',
    sub: '10–15 page structured documents that outperform manual notes.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: 'Exam prep',
    sub: 'Turn any note into practice questions — calc, theory, or both.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-[#00d4c8] fill-none stroke-[1.8]">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: 'Pay as you go',
    sub: 'No subscription. Top up with PromptPay, spend only what you use.',
  },
];

export default function Login() {
  const { loginWithRedirect, isAuthenticated, isLoading, error: auth0Error } = useAuth0();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/home');
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleLogin = () => {
    loginWithRedirect({
      authorizationParams: { connection: 'google-oauth2' },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-[#0c0c0e]">
        <div className="h-5 w-5 animate-spin rounded-full border border-transparent border-t-[#00d4c8]" />
        <span className="font-mono text-[11px] tracking-[0.1em] text-[#6b6b7a] opacity-60 uppercase">
          Syncing identity…
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#0c0c0e] text-[#e8e8ed] text-sm">

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(0,212,200,0.04) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(0,212,200,0.03) 0%, transparent 45%)',
      }} />

      {/* ── Left panel ── */}
      <div
        className="relative z-10 hidden md:flex md:w-[320px] lg:w-[420px] flex-shrink-0 flex-col justify-between overflow-hidden border-r border-white/[0.07] p-10"
        style={{
          backgroundColor: '#111116',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      >
        {/* Noise overlay on left panel */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
          mixBlendMode: 'soft-light',
        }} />

        {/* Logo + tagline */}
        <div className="relative z-10">
          <div className="mb-3 font-serif text-[28px] tracking-[-0.03em] text-[#00d4c8]">
            Eidolon
            <sup className="text-[15px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup>
          </div>
          <p className="max-w-[280px] text-[13px] leading-relaxed text-[#6b6b7a]">
            AI-powered lecture notes for students who actually want to learn, not just survive.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 flex flex-col gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-px flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(0,212,200,0.15)] bg-[rgba(0,212,200,0.06)]">
                {f.icon}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#e8e8ed]">{f.title}</div>
                <div className="text-[12px] leading-relaxed text-[#6b6b7a]">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Version */}
        <div className="relative z-10 font-mono text-[11px] text-[#6b6b7a] opacity-40 select-none">
          v2.0 — Academic Suite
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-10 max-md:px-6">
        <motion.div
          className="flex w-full max-w-[380px] flex-col"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Heading */}
          <motion.div variants={itemVariants} className="mb-7">
            <h1 className="mb-1.5 font-serif text-[26px] font-normal tracking-[-0.02em] text-[#e8e8ed]">
              Sign in to{' '}
              <span className="text-[#00d4c8]">
                Eidolon<sup className="text-[13px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup>
              </span>
            </h1>
            <p className="text-[13px] leading-relaxed text-[#6b6b7a]">
              Use your university Google account to get started. No password needed.
            </p>
          </motion.div>

          {/* Auth0 error */}
          {auth0Error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2.5 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.06)] px-3.5 py-3 text-[12.5px] text-[#ef4444]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 stroke-current fill-none stroke-[1.8]">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {auth0Error.message}
            </motion.div>
          )}

          {/* Google button */}
          <motion.button
            variants={itemVariants}
            onClick={handleGoogleLogin}
            className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-white/[0.09] bg-[#111116] px-5 py-3.5 text-[14px] font-medium text-[#e8e8ed] transition-all duration-200 hover:border-white/[0.15] hover:bg-[#18181f]"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent" />
            {/* Top highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
            <svg className="h-[18px] w-[18px] flex-shrink-0 relative z-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="relative z-10">Continue with Google</span>
          </motion.button>

          {/* Divider */}
          <motion.div variants={itemVariants} className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[11px] text-[#6b6b7a] opacity-50 select-none">Access is invite-only</span>
            <div className="h-px flex-1 bg-white/[0.07]" />
          </motion.div>

          {/* Access note */}
          <motion.div
            variants={itemVariants}
            className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-[#111116] p-4 surface"
          >
            <svg viewBox="0 0 24 24" className="mt-px h-3.5 w-3.5 flex-shrink-0 stroke-[#6b6b7a] fill-none stroke-[1.8]">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[12px] leading-relaxed text-[#6b6b7a]">
              Eidolon is currently available to{' '}
              <strong className="font-medium text-[#9898a8]">students</strong> with an approved
              account. Sign in with your Google account — if you have access, you'll be redirected automatically.
            </p>
          </motion.div>

          {/* Footer */}
          <motion.p
            variants={itemVariants}
            className="mt-7 text-center text-[11.5px] leading-relaxed text-[#6b6b7a] opacity-50 select-none"
          >
            By signing in you agree to fair use of the service.<br />
            Balance is non-refundable once consumed.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}