'use client';

import React, { createContext, useContext, useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter } from 'next/navigation';
import "./globals.css";
import { motion } from 'framer-motion';
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
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
// Visibility controlled by CSS (globals.css). Motion only on the card — one
// subtle fade-up. Nothing else moves. That's intentional.
const DeviceBlockScreen = ({ variant, className }) => {
  const isMobile = variant === 'mobile';

  return (
    <div
      className={`${className} bg-black text-rose-500 h-screen w-screen flex-col items-center justify-center overflow-hidden font-mono p-6 text-center fixed inset-0 z-50`}
      style={{ backgroundImage: 'radial-gradient(circle at center, #2e0202 0%, #000000 100%)' }}
    >
      {/* CRT scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #ff000005 3px)' }}
      />

      {/* One animation, one element, done. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="border border-rose-600/50 bg-[#1a0505]/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.2)] max-w-lg z-10"
      >
        <ExclamationTriangleIcon className="w-20 h-20 text-rose-500 mx-auto mb-6 animate-pulse" />

        <h1 className="text-3xl font-extrabold mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
          {isMobile ? 'ACCESS DENIED' : 'ROTATE DEVICE'}
        </h1>

        <p className="text-rose-200/70 mb-8 text-sm uppercase tracking-wide border-b border-rose-900/50 pb-6">
          {isMobile
            ? 'System Protocol Violation: Unsupported Hardware'
            : 'Landscape Mode Required for Tablet Access'}
        </p>

        <div className="flex justify-center items-center space-x-8 mb-8 opacity-80">
          <div className="flex flex-col items-center">
            <DevicePhoneMobileIcon className="w-12 h-12 text-rose-500/40" />
            <span className="text-xs text-rose-500/40 mt-2 line-through">MOBILE</span>
          </div>

          <div className="flex flex-col items-center">
            <DeviceTabletIcon className={`w-12 h-12 ${!isMobile ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-rose-500/40'}`} />
            <span className={`text-xs mt-2 ${!isMobile ? 'text-amber-400 font-bold' : 'text-rose-500/40 line-through'}`}>
              {!isMobile ? 'LANDSCAPE ✓' : 'TABLET'}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <ComputerDesktopIcon className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-xs text-emerald-400 mt-2 font-bold">DESKTOP ✓</span>
          </div>
        </div>

        <p className="text-xs text-rose-400/60">
          {isMobile
            ? <> This terminal requires a high-resolution desktop interface.<br />Please switch to a desktop or laptop to proceed. </>
            : <> Rotate your tablet to landscape mode to continue.<br />Desktop access is always fully supported. </>}
        </p>
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
      ['/admin',           'Admin | Eidolon'],
      ['/profile',         'Profile | Eidolon'],
      ['/top-up',          'Top Up | Eidolon'],
      ['/pricing',         'Pricing | Eidolon'],
      ['/exam-prep',       'Exam Prep | Eidolon'],
      ['/transcriptor',    'Transcriptor | Eidolon'],
      ['/audio-converter', 'Audio Converter | Eidolon'],
      ['/note',            'Inclass Notetaker | Eidolon'],
      ['/home',            'Dashboard | Eidolon'],
    ];

    const match = titleMap.find(([path]) => pathname === path || pathname.startsWith(path + '/'));
    document.title = match ? match[1] : 'Eidolon';
  }, [pathname]);

  // Auth guard + DB sync
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-slate-200`}
      >
        <Auth0Provider
          domain={process.env.NEXT_PUBLIC_AUTH0_DOMAIN}
          clientId={process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID}
          cacheLocation="localstorage"
          authorizationParams={{
            redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
            audience: 'https://eidolon.api',
          }}
          skipRedirectCallback={
            typeof window !== 'undefined' &&
            window.location.search.includes('line=true')
          }
        >
          <AppLayout>{children}</AppLayout>
        </Auth0Provider>
      </body>
    </html>
  );
}