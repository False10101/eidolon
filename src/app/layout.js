'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import "./globals.css";
import { ArrowRightStartOnRectangleIcon, Cog6ToothIcon, BoltIcon, HomeIcon, DocumentTextIcon, PencilSquareIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/solid";
import { match } from 'path-to-regexp';
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();


  const [tokenCount, setTokenCount] = useState("Unlimited");
  const [groupedHistory, setGroupedHistory] = useState({});

  const handleLogout = async () => {
    await fetch(`/api/auth/logout`, { method: 'POST' });
    router.push('/auth/login');
  };

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
      if (pathname.includes('/document')) {
        try {
          setTokenCount("Unlimited"); // Reset token count before fetching
          const response = await fetch(`/api/navbar/getAPITokenCount?type=document`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setTokenCount(data.tokenCount || "Unlimited"); // Set token count from response
          } else {
            console.error('Failed to fetch token count:', response.statusText);
          }
        } catch (error) {
          console.error('Error fetching token count:', error);
        }
      } else {
        setTokenCount("Unlimited"); // Reset token count for other routes
      }
    }

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
    match('/tts'),
    match('/image-gen'),
    match('/chatbot'),
  ];

  function isKnownRoute(pathname) {
    return matchers.some(m => m(pathname));
  }

  const isNotFoundPage = !isKnownRoute(pathname);

  const activeId = params ? Object.values(params)[0] : null;

  const basePath = pathname.split('/')[1] || 'home';

  var routeDisplayName = isHomeRoute ? "Ai Suite" : pathname.startsWith('/document') ? "Document Generator" : pathname.startsWith('/auth') ? "Authentication" : pathname.startsWith('/note') ? "Note Taker" : pathname.startsWith('/textbook-explainer') ? "Textbook Explainer" : pathname.startsWith('/tts') ? "Text-To-Speech" : pathname.startsWith('/image-gen') ? "Image Generation" : pathname.startsWith('/chatbot') ? "Chatbot" : "";

  return (
    <html lang="en">
      {/* 1. The <body> is the master container. It controls the overall page structure. */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen bg-gradient-to-r from-[#0B0F2E] to-[#081022] text-white flex flex-col`}>

        {/* 2. The <nav> has a fixed height and will NOT shrink. */}
        {!isNotFoundPage && (
          <nav className="h-16 flex-shrink-0 w-full bg-[#000000]/[20%] text-white flex items-center flex-row px-7 border-b-[1px] border-white/[0.2]">
            <div className="text-[#00BFFF] font-extrabold text-xl 2xl:text-2xl h-min pr-5 my-auto">Eidolon</div>
            <span className="text-white/[70%] h-min text-xs 2xl:text-sm border-l-[1px] border-white/[25%] px-5 my-auto">{routeDisplayName}</span>
            {!isAuthRoute &&
              <div className="flex flex-row ml-auto my-auto">
                <div className="flex items-center justify-center mr-4">
                  <BoltIcon className="h-4 w-4 text-[#00BFFF] ml-6 my-auto mr-2 font-extrabold" />
                  <span className="text-white/[70%] text-xs 2xl:text-sm">API Usage : <span className="text-[#00BFFF]">{!isHomeRoute ? tokenCount : "Unlimited"}</span></span>
                </div>
                <button className="flex align-center justify-center">
                  <Cog6ToothIcon className="h-6 w-6 text-[#00BFFF] ml-6 my-auto font-extrabold" />
                </button>
                <button onClick={handleLogout} className="flex align-center justify-center">
                  <ArrowRightStartOnRectangleIcon className="h-6 w-6 text-[#00BFFF] ml-6 my-auto mr-4 font-extrabold" />
                </button>
              </div>
            }
          </nav>
        )}

        {/* 3. This main <div> takes up all remaining VERTICAL space and arranges its children (sidebar, content) in a ROW. */}
        <div className="flex flex-row flex-1 min-h-0">
          {!isAuthRoute && !isHomeRoute && !isNotFoundPage && (
            // 4. The <aside> has a fixed width, does NOT shrink, and handles its own internal scrolling.
            <aside className="w-[15vw] flex-shrink-0 bg-[#000000]/[30%] px-4 border-r-[1px] border-white/[0.2] flex flex-col">
              <div className="flex flex-col py-4 w-full justify-center h-max border-b-[1px] border-white/[25%]">
                <button onClick={() => { router.push('/home'); }} className={`px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <HomeIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Home</span>
                </button>

                <button onClick={() => { router.push('/document'); }} className={`${pathname.startsWith("/document") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <DocumentTextIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Document Generator</span>
                </button>

                <button onClick={() => { router.push('/note'); }} className={`${pathname.startsWith("/note") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <PencilSquareIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Inclass Notes</span>
                </button>

                <button onClick={() => { router.push('/textbook-explainer'); }} className={`${pathname.startsWith("/textbook-explainer") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <BookOpenIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Textbook Explainer</span>
                </button>

                <button onClick={() => { router.push('/tts'); }} className={`${pathname.startsWith("/tts") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <SpeakerWaveIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">TTS</span>
                </button>

                <button onClick={() => { router.push('/image-gen'); }} className={`${pathname.startsWith("/image") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <PhotoIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Image Gen</span>
                </button>

                <button onClick={() => { router.push('/chatbot'); }} className={`${pathname.startsWith("/chat") ? "bg-[#3366FF]/[30%]! text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]! " : ""}px-2 hover:cursor-pointer hover:border-white/[50%] hover:bg-gray-400/[15%] hover:rounded-xl w-full py-2.5 flex items-center overflow-hidden`}>
                  <ChatBubbleLeftIcon className="h-6 w-5 flex-shrink-0" />
                  <span className="ml-2 truncate text-sm 2xl:text-base">Chatbot</span>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto mt-1 gap-y-3">
                {Object.keys(groupedHistory).map(groupName => (
                  groupedHistory[groupName].length > 0 && (
                    <div key={groupName} className=" space-y-1">
                      <h2 className=" font-semibold px-1 text-[#00BFFF] text-lg pt-3 pb-1">{groupName}</h2>
                      {groupedHistory[groupName].map(history => (
                        <div
                          onClick={() => { router.push(`/${basePath}/${history.id}`) }}
                          key={history.id}
                          className={`py-2.5 2xl:py-3 px-3 rounded-xl cursor-pointer ${activeId == history.id ? "bg-[#3366FF]/[30%] border-white/[10%] border-[1px]" : "hover:bg-white/10"}`}
                        >
                          <div className="truncate text-sm 2xl:text-base">{history.name}</div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
                {
                  Object.keys(groupedHistory).length === 0 &&
                  <div className="text-center mt-[40%] text-white/[50%] font-semibold text-xl italic">No History Found</div>
                }
              </div>
            </aside>
          )}

          {/* 5. The {children} container takes all remaining HORIZONTAL space and handles its own internal scrolling. */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            <Analytics />
            {children}
            <SpeedInsights />
          </main>
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