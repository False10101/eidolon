'use client';

import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState, createContext, useContext } from 'react';
import "./globals.css";
import { ArrowRightStartOnRectangleIcon, Cog6ToothIcon, BoltIcon, HomeIcon, DocumentTextIcon, PencilSquareIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon, LockClosedIcon, LanguageIcon, MusicalNoteIcon } from "@heroicons/react/24/solid";
import { match } from 'path-to-regexp';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { motion, AnimatePresence } from 'framer-motion';

const AdminContext = createContext();

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within RootLayout');
  return context;
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- ANIMATION VARIANTS ---
const navVariants = {
  hidden: { y: -50, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

const sidebarVariants = {
  hidden: { x: -100, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 20, staggerChildren: 0.1 } },
};

const pageVariants = {
  initial: { opacity: 0, x: 50 },
  in: { opacity: 1, x: 0 },
  out: { opacity: 0, x: -50 },
};

const historyItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};


export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();


  const [tokenCount, setTokenCount] = useState("Unlimited");
  const [groupedHistory, setGroupedHistory] = useState({});

  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = async () => {
    await fetch(`/api/auth/logout`, { method: 'POST' });
    router.push('/auth/login');
  };

  const [pageTitle, setPageTitle] = useState('Eidolon');

  useEffect(() => {
    const getPageTitle = () => {
      if (pathname === '/') return 'Eidolon';
      if (pathname.startsWith('/setting')) return 'Settings | Eidolon';
      if (pathname.startsWith('/auth/login')) return 'Login | Eidolon';
      if (pathname.startsWith('/auth/signup')) return 'Sign Up | Eidolon';
      if (pathname === '/home') return 'Dashboard | Eidolon';
      if (pathname === '/document') return 'Document Generator | Eidolon';
      if (pathname.startsWith('/document/')) return `Document ID: ${pathname.split('/')[2]} | Eidolon`;
      if (pathname === '/note') return 'Inclass Notetaker | Eidolon';
      if (pathname.startsWith('/note/')) return `Note ${pathname.split('/')[2]} | Eidolon`;
      if (pathname === '/textbook-explainer') return 'Textbook Explainer | Eidolon';
      if (pathname.startsWith('/textbook-explainer/')) return `Textbook ID: #${pathname.split('/')[2]} | Eidolon`;
      if (pathname === '/tts') return 'Text-to-Speech | Eidolon';
      if (pathname.startsWith('/tts/')) return `TTS ID: #${pathname.split('/')[2]} | Eidolon`;
      if (pathname === '/image-gen') return 'Image Generator | Eidolon';
      if (pathname.startsWith('/image-gen/')) return `Image ID: #${pathname.split('/')[2]} | Eidolon`;
      if (pathname === '/chatbot') return 'AI Chat | Eidolon';
      return 'Eidolon';
    };

    const title = getPageTitle();
    setPageTitle(title);
    document.title = title;
  }, [pathname]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`/api/auth/login`, {
          method: 'GET',
          credentials: 'include'
        });
        if (res.status != 200) {
          router.push('/auth/login');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    setGroupedHistory({});
    if (pathname.includes('/note')) {
      const getHistory = async () => {
        try {
          const response = await fetch(`/api/note/getRecentHistory`, {
            method: 'GET',
            credentials: 'include',
          });

          const data = await response.json();

          if (Array.isArray(data.response)) {

            // Process the data and set the new grouped state
            const groupedData = groupHistoryByDate(data.response);
            setGroupedHistory(groupedData);
          } else {
            setGroupedHistory({}); // Reset or handle cases where no data is returned
          }
        } catch (error) {
          console.error(error);
        }
      }

      getHistory();
    }
    else if (pathname.includes('/textbook')) {
      const getHistory = async () => {
        try {
          const response = await fetch(`/api/textbook/getRecentHistory`, {
            method: 'GET',
            credentials: 'include',
          });

          const data = await response.json();

          if (Array.isArray(data.response)) {

            // Process the data and set the new grouped state
            const groupedData = groupHistoryByDate(data.response);
            setGroupedHistory(groupedData);
          } else {
            setGroupedHistory({}); // Reset or handle cases where no data is returned
          }
        } catch (error) {
          console.error(error);
        }
      }

      getHistory();
    }

    else if (pathname.includes('/document')) {
      const getHistory = async () => {
        try {
          const response = await fetch(`/api/document/getRecentHistory`, {
            method: 'GET',
            credentials: 'include',
          });

          const data = await response.json();

          if (Array.isArray(data.response)) {

            // Process the data and set the new grouped state
            const groupedData = groupHistoryByDate(data.response);
            setGroupedHistory(groupedData);
          } else {
            setGroupedHistory({}); // Reset or handle cases where no data is returned
          }
        } catch (error) {
          console.error(error);
        }
      }

      getHistory();
    }
  }, [pathname])

  useEffect(() => {
    const getTokenCount = async () => {
      try {
        setTokenCount("Unlimited"); // Reset token count before fetching

        let apiType = '';
        if (pathname.includes('/document')) {
          apiType = 'Document';
        } else if (pathname.includes('/note')) {
          apiType = 'Inclass Notes';
        } else if (pathname.includes('/textbook')) {
          apiType = 'Textbook Explainer';
        } else {
          setTokenCount("Unlimited");
          return; // Skip fetch for other routes
        }

        const response = await fetch(`/api/navbar/getAPITokenCount?type=${encodeURIComponent(apiType)}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setTokenCount(data.tokenCount || "Unlimited");
        } else {
          console.error('Failed to fetch token count:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching token count:', error);
      }
    };

    getTokenCount();
  }, [pathname]);

  const isAuthRoute = pathname.startsWith('/auth');
  const isHomeRoute = pathname.startsWith('/home');

  const matchers = [
    match('/'),
    match('/auth/login'),
    match('/auth/signup'),
    match('/home'),
    match('/document'),
    match('/document/:documentId'),
    match('/note'),
    match('/note/:noteId'),
    match('/textbook-explainer'),
    match('/textbook-explainer/:textbookId'),
    match('/audioConverter'),
    match('/transcriptor'),
  ];

  function isKnownRoute(pathname) {
    return matchers.some(m => m(pathname));
  }

  const isNotFoundPage = !isKnownRoute(pathname);

  const activeId = params ? Object.values(params)[0] : null;

  const basePath = pathname.split('/')[1] || 'home';

  var routeDisplayName = isHomeRoute ? "Ai Suite" : pathname.startsWith('/document') ? "Document Generator" : pathname.startsWith('/auth') ? "Authentication" : pathname.startsWith('/note') ? "Note Taker" : pathname.startsWith('/textbook-explainer') ? "Textbook Explainer" : pathname.startsWith('/tts') ? "Text-To-Speech" : pathname.startsWith('/image-gen') ? "Image Generation" : pathname.startsWith('/chatbot') ? "Chatbot" : "";

  console.log(isAdmin);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>{pageTitle}</title>
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen bg-black text-slate-200 flex flex-col`}
        style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
      >

        {!isNotFoundPage && (
          <motion.nav
            className="h-16 flex-shrink-0 w-full bg-[#020617]/80 backdrop-blur-md text-slate-200 flex items-center flex-row px-7 border-b border-cyan-900/30 shadow-[0_4px_30px_rgba(0,0,0,0.1)] z-50"
            variants={navVariants}
            initial="hidden"
            animate="visible"
          >
            <div onClick={() => { router.push('/home'); }} className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 font-extrabold text-xl 2xl:text-2xl h-min pr-5 my-auto cursor-pointer drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] transition-all hover:scale-105">Eidolon</div>
            <span className="text-slate-500 h-min text-xs 2xl:text-sm border-l border-slate-700 px-5 my-auto font-mono tracking-wider uppercase">{routeDisplayName}</span>
            {!isAuthRoute &&
              <div className="flex flex-row ml-auto my-auto">
                <div className="flex items-center justify-center mr-4 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700/50">
                  <BoltIcon className="h-4 w-4 text-cyan-400 mr-2 animate-pulse" />
                  <span className="text-slate-400 text-xs 2xl:text-sm font-mono">API Usage : <span className="text-cyan-400 font-bold ml-1">{!isHomeRoute ? tokenCount : "Unlimited"}</span></span>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { router.push('/admin-panel'); }} className={`${isAdmin ? "flex" : "hidden"} cursor-pointer align-center justify-center p-2 rounded-full hover:bg-slate-800 transition-colors`}>
                  <LockClosedIcon className="h-5 w-5 text-indigo-400" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { router.push('/setting'); }} className="flex cursor-pointer align-center justify-center p-2 rounded-full hover:bg-slate-800 transition-colors">
                  <Cog6ToothIcon className="h-6 w-6 text-slate-400 hover:text-cyan-400 transition-colors" />
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleLogout} className="flex align-center justify-center p-2 rounded-full hover:bg-slate-800 transition-colors ml-2">
                  <ArrowRightStartOnRectangleIcon className="h-6 w-6 text-rose-500/80 hover:text-rose-400 transition-colors" />
                </motion.button>
              </div>
            }
          </motion.nav>
        )}

        <div className="flex flex-row flex-1 min-h-0 relative">
          {!isAuthRoute && !isHomeRoute && !isNotFoundPage && (
            <motion.aside
              className="w-[15vw] flex-shrink-0 bg-[#0b101c]/80 backdrop-blur-md px-4 border-r border-cyan-900/30 flex flex-col z-40"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
            >

              <motion.div variants={sidebarVariants} className="flex flex-col py-4 w-full justify-center h-max border-b border-cyan-900/30 space-y-1">

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/home'); }} className={`px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group hover:bg-cyan-900/20 hover:border hover:border-cyan-500/30`}>
                  <HomeIcon className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <span className="ml-3 truncate text-sm 2xl:text-base text-slate-300 group-hover:text-cyan-100 font-medium">Home</span>
                </motion.button>

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/audioConverter'); }} className={`${pathname.startsWith("/audioConverter") ? "bg-cyan-900/30 text-cyan-400 rounded-xl border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-200 hover:border hover:border-cyan-500/30"} px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group border border-transparent`}>
                  <MusicalNoteIcon className={`h-5 w-5 flex-shrink-0 ${pathname.startsWith("/audioConverter") ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
                  <span className="ml-3 truncate text-sm 2xl:text-base font-medium">Audio Converter</span>
                </motion.button>

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/transcriptor'); }} className={`${pathname.startsWith("/transcriptor") ? "bg-cyan-900/30 text-cyan-400 rounded-xl border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-200 hover:border hover:border-cyan-500/30"} px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group border border-transparent`}>
                  <LanguageIcon className={`h-5 w-5 flex-shrink-0 ${pathname.startsWith("/transcriptor") ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
                  <span className="ml-3 truncate text-sm 2xl:text-base font-medium">Audio Transcriptor</span>
                </motion.button>

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/document'); }} className={`${pathname.startsWith("/document") ? "bg-cyan-900/30 text-cyan-400 rounded-xl border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-200 hover:border hover:border-cyan-500/30"} px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group border border-transparent`}>
                  <DocumentTextIcon className={`h-5 w-5 flex-shrink-0 ${pathname.startsWith("/document") ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
                  <span className="ml-3 truncate text-sm 2xl:text-base font-medium">Document Generator</span>
                </motion.button>

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/note'); }} className={`${pathname.startsWith("/note") ? "bg-cyan-900/30 text-cyan-400 rounded-xl border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-200 hover:border hover:border-cyan-500/30"} px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group border border-transparent`}>
                  <PencilSquareIcon className={`h-5 w-5 flex-shrink-0 ${pathname.startsWith("/note") ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
                  <span className="ml-3 truncate text-sm 2xl:text-base font-medium">Inclass Notes</span>
                </motion.button>

                <motion.button variants={historyItemVariants} onClick={() => { router.push('/textbook-explainer'); }} className={`${pathname.startsWith("/textbook-explainer") ? "bg-cyan-900/30 text-cyan-400 rounded-xl border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-300 hover:bg-cyan-900/20 hover:text-cyan-200 hover:border hover:border-cyan-500/30"} px-2 w-full py-2.5 flex items-center overflow-hidden rounded-xl transition-all duration-200 group border border-transparent`}>
                  <BookOpenIcon className={`h-5 w-5 flex-shrink-0 ${pathname.startsWith("/textbook-explainer") ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-400"}`} />
                  <span className="ml-3 truncate text-sm 2xl:text-base font-medium">Textbook Explainer</span>
                </motion.button>

              </motion.div>
              <div className="flex-1 min-h-0 overflow-y-auto mt-1 gap-y-3 custom-scrollbar">
                {Object.keys(groupedHistory).map(groupName => (
                  groupedHistory[groupName].length > 0 && (
                    <motion.div key={groupName} className=" space-y-1" variants={sidebarVariants}>
                      <h2 className="font-semibold px-2 text-cyan-500 text-xs uppercase tracking-widest pt-4 pb-1 font-mono">{groupName}</h2>
                      {groupedHistory[groupName].map(history => (
                        <motion.div
                          variants={historyItemVariants}
                          onClick={() => { router.push(`/${basePath}/${history.id}`) }}
                          key={history.id}
                          className={`py-2.5 2xl:py-3 px-3 rounded-xl cursor-pointer transition-colors duration-200 ${activeId == history.id ? "bg-cyan-900/30 border-cyan-500/30 border text-cyan-200" : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"}`}
                        >
                          <div className="truncate text-sm 2xl:text-base">{history.name}</div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                ))}
                {
                  Object.keys(groupedHistory).length === 0 &&
                  <div className="text-center mt-[40%] text-slate-600 font-semibold text-lg italic">No History Found</div>
                }
              </div>
            </motion.aside>
          )}

          <motion.main
            key={pathname}
            className="flex-1 min-w-0 overflow-y-auto"
            variants={pageVariants}
            initial="initial"
            animate="in"
            exit="out"
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Analytics />
            <AdminContext.Provider value={{ isAdmin, setIsAdmin }}>
              {children}
            </AdminContext.Provider>
            <SpeedInsights />
          </motion.main>
        </div>
      </body>
    </html>
  );
}

const groupHistoryByDate = (historyList) => {
  const groups = {
    Today: [],
    'Last Week': [],
    'Last Month': [],
    'Months Ago': [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  historyList.forEach(item => {
    const itemDate = new Date(item.created_at);

    if (itemDate >= today) {
      groups.Today.push(item);
    } else if (itemDate >= lastWeek) {
      groups['Last Week'].push(item);
    } else if (itemDate >= lastMonth) {
      groups['Last Month'].push(item);
    } else {
      groups['Months Ago'].push(item);
    }
  });

  return groups;
};
