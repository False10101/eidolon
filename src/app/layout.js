'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter } from 'next/navigation';
import "./globals.css";
import { motion } from 'framer-motion';
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import IntlProvider from "./IntlProvider";
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

// ─── Fonts ─────────────────────────────────────────────────────────────────────
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// ─── Admin Context ──────────────────────────────────────────────────────────────
const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within RootLayout');
  return context;
}

// ─── Device Block Screens ───────────────────────────────────────────────────────
const DeviceBlockScreen = ({ variant, className }) => {
  const isMobile = variant === 'mobile';

  return (
    <div
      className={`${className} h-screen w-screen flex-col items-center justify-center overflow-hidden fixed inset-0 z-50`}
      style={{ background: 'var(--bg)' }}
    >
      {/* Subtle radial glow behind card */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,212,200,0.04) 0%, transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mx-6 w-full max-w-sm overflow-hidden rounded-2xl surface noise"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '2rem',
        }}
      >
        {/* Teal catch-light top edge */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,200,0.3), transparent)' }}
        />

        {/* Icon */}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl mb-5"
          style={{
            background: 'rgba(0,212,200,0.07)',
            border: '1px solid rgba(0,212,200,0.2)',
          }}
        >
          {isMobile ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.8]" style={{ stroke: 'var(--accent)' }}>
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12" y2="18.01" strokeLinecap="round" strokeWidth="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.8]" style={{ stroke: 'var(--accent)' }}>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          )}
        </div>

        {/* Title */}
        <div className="mb-1" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
          {isMobile ? 'Desktop only' : 'Rotate your device'}
        </div>

        {/* Subtitle */}
        <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--fg-4)', marginBottom: '1.5rem' }}>
          {isMobile
            ? 'Eidolon requires a desktop or laptop to use. Please switch devices to continue.'
            : 'Eidolon requires landscape orientation on tablets. Rotate your device or switch to a desktop.'}
        </p>

        {/* Device status row */}
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'var(--surface-raised)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Mobile */}
          <div className="flex flex-col items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.6]" style={{ stroke: isMobile ? '#ef4444' : '#3a3a46' }}>
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: isMobile ? '#ef4444' : '#3a3a46' }}>
              {isMobile ? 'blocked' : 'mobile'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.05)' }} />

          {/* Tablet */}
          <div className="flex flex-col items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.6]" style={{ stroke: !isMobile ? '#f59e0b' : '#3a3a46' }}>
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: !isMobile ? '#f59e0b' : '#3a3a46' }}>
              {!isMobile ? 'landscape' : 'tablet'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.05)' }} />

          {/* Desktop */}
          <div className="flex flex-col items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-[1.6]" style={{ stroke: 'var(--accent)' }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)' }}>
              desktop ✓
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── App Layout (inside Auth0Provider) ─────────────────────────────────────────
function AppLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [userRecord, setUserRecord] = useState(null);

  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();

  // Document title
  useEffect(() => {
    const titleMap = [
      ['/admin', 'Admin | Eidolon'],
      ['/profile', 'Profile | Eidolon'],
      ['/top-up', 'Top Up | Eidolon'],
      ['/pricing', 'Pricing | Eidolon'],
      ['/exam-prep', 'Exam Prep | Eidolon'],
      ['/transcriptor', 'Transcriptor | Eidolon'],
      ['/audio-converter', 'Audio Converter | Eidolon'],
      ['/note', 'Inclass Notetaker | Eidolon'],
      ['/home', 'Dashboard | Eidolon'],
    ];

    const match = titleMap.find(([path]) => pathname === path || pathname.startsWith(path + '/'));
    document.title = match ? match[1] : 'Eidolon';
  }, [pathname]);

  // Auth guard + DB sync
  useEffect(() => {
    if (isLoading) return;
    const PUBLIC_ROUTES = ['/landing', '/landing/pricing', '/note/sample'];
    if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
      router.replace('/landing');
      return;
    }

    const syncWithDB = async () => {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/auth/login', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserRecord(data);
          if (data?.role === 'admin') setIsAdmin(true);
        }
      } catch (err) {
        console.error('DB sync failed:', err);
      }
    };

    syncWithDB();
  }, [isAuthenticated, isLoading, getAccessTokenSilently, router]);

  return (
    <>
      {/* CSS in globals.css controls visibility — no JS state needed */}
      <DeviceBlockScreen variant="mobile" className="block-mobile" />
      <DeviceBlockScreen variant="tablet" className="block-tablet-portrait" />

      <div className="app-root flex flex-col h-screen">
        <AdminContext.Provider value={{ isAdmin, setIsAdmin, userRecord }}>
          {children}
        </AdminContext.Provider>
      </div>
    </>
  );
}

// ─── Root Layout ────────────────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint — prevents flash of wrong theme */}
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var stored = localStorage.getItem('theme');
              var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', stored || system);
            } catch(e) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-slate-200`}
      >
        <IntlProvider>
          <Auth0Provider
            domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
            clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
            cacheLocation="localstorage"
            authorizationParams={{
              redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
              audience: 'https://eidolon.api',
            }}
          >
            <AppLayout>{children}</AppLayout>
          </Auth0Provider>
        </IntlProvider>
      </body>
    </html>
  );
}