'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { motion, AnimatePresence } from 'framer-motion';
import CreditIcon from './CreditIcon';

// ─── Route display names ────────────────────────────────────────────────────────
const ROUTE_LABELS = {
  '/home':            'Academic Suite',
  '/note':            'Inclass Notes',
  '/audio-converter': 'Audio Converter',
  '/transcriptor':    'Transcriptor',
  '/exam-prep':       'Exam Preparation',
  '/pricing':         'Pricing',
  '/groups':          'Groups',
  '/profile':         'Profile',
  '/topup':           'Top Up',
  '/admin':           'Admin',
};

function getRouteLabel(pathname) {
  const base = '/' + pathname.split('/')[1];
  return ROUTE_LABELS[base] ?? 'Academic Suite';
}

// ─── Logout confirm modal ───────────────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.1] bg-[#111116] p-7 surface"
      >
        <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-[#18181f]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-[#b4b4c2] fill-none stroke-[1.8]">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </div>
        <div className="relative mb-1.5 text-[15px] font-medium text-[#e8e8ed]">Sign out?</div>
        <p className="relative mb-6 text-[13px] leading-[1.7] text-[#9a9aaa]">
          You'll be returned to the login page. <span className="text-[#e8e8ed] font-medium">Any unsaved changes will be lost.</span>
        </p>
        <div className="relative flex gap-2">
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-white/[0.07] bg-[#18181f] py-2.5 text-[13px] text-[#b4b4c2] transition-all hover:border-white/[0.14] hover:text-[#e8e8ed]">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] py-2.5 text-[13px] font-medium text-[#ef4444] transition-all hover:bg-[rgba(239,68,68,0.14)]">
            Sign out
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Icon button ────────────────────────────────────────────────────────────────
function NavIconBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="group flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#18181f] transition-all hover:border-[rgba(0,212,200,0.25)] hover:bg-[rgba(0,212,200,0.04)]"
    >
      {children}
    </button>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────────
export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const { logout, getAccessTokenSilently } = useAuth0();

  const [balance, setBalance]           = useState(null);
  const [logoutModal, setLogoutModal]   = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res   = await fetch('/api/user/getBalance', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setBalance(data.balance?.balance ?? '—');
      } catch {
        setBalance('—');
      }
    };

    fetchBalance();

    const refresh = () => fetchBalance();
    window.addEventListener('balance:refresh', refresh);
    return () => window.removeEventListener('balance:refresh', refresh);
  }, [getAccessTokenSilently]);

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <>
      <AnimatePresence>
        {logoutModal && (
          <LogoutModal
            onConfirm={handleLogout}
            onCancel={() => setLogoutModal(false)}
          />
        )}
      </AnimatePresence>

      <nav className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#111116] px-8 z-50 nav-surface">

        {/* Left — brand + route label */}
        <div className="flex items-center gap-4 select-none">
          <span
            onClick={() => router.push('/home')}
            className="font-serif text-[20px] tracking-[-0.02em] text-[#00d4c8] cursor-pointer"
          >
            Eidolon
            <sup className="text-[11px] font-sans font-medium tracking-normal opacity-75 ml-0.5">v2</sup>
          </span>
          <div className="h-4 w-px bg-white/[0.07]" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-[#b4b4c2]">
            {getRouteLabel(pathname)}
          </span>
        </div>

        {/* Right — balance + actions */}
        <div className="flex items-center gap-3">

          {/* Balance pill */}
          <div className="flex items-center gap-2 rounded-full align-middle border border-white/[0.07] bg-[#18181f] px-3.5 py-1.5 text-[12px] text-[#b4b4c2] surface select-none">
            Balance:
            <span className="font-mono text-[13px] font-medium text-[#00d4c8]">
             {balance ?? '—'} <CreditIcon size={13} />
            </span>
            <button
              onClick={() => router.push('/topup')}
              className="border-l border-white/[0.07] pl-2 text-[11px] text-[#b4b4c2] transition-colors hover:text-[#00d4c8]"
            >
              + Top up
            </button>
          </div>

          {/* Groups */}
          <NavIconBtn onClick={() => router.push('/groups')} title="Groups">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[#9a9aaa] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#00d4c8]">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </NavIconBtn>

          {/* Profile */}
          <NavIconBtn onClick={() => router.push('/profile')} title="Profile">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[#9a9aaa] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#00d4c8]">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </NavIconBtn>

          {/* Logout */}
          <NavIconBtn onClick={() => setLogoutModal(true)} title="Sign out">
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] stroke-[#9a9aaa] fill-none stroke-[1.8] transition-colors group-hover:stroke-[#ef4444]">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </NavIconBtn>

        </div>
      </nav>
    </>
  );
}