'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { usePathname, useRouter, useParams } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import "./globals.css";
import { ArrowRightStartOnRectangleIcon, Cog6ToothIcon, BoltIcon, HomeIcon, DocumentTextIcon, PencilSquareIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/solid";
import { match } from 'path-to-regexp';


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
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, { method: 'POST' });
    router.push('/auth/login');
  };

  useEffect(() => {
      const checkAuth = async () => {
          try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
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
    if (pathname.includes('/note')) {
      const getHistory = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/note/getRecentHistory`, {
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
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/navbar/getAPITokenCount?type=document`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            setTokenCount(data.tokenCount || Unlimited); // Set token count from response
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
    match('/note'),
    match('/note/:noteId'),
    match('/textbook-explainer')
  ];

  function isKnownRoute(pathname) {
    return matchers.some(m => m(pathname));
  }

  const isNotFoundPage = !isKnownRoute(pathname);


  var routeDisplayName = isHomeRoute ? "Ai Suite" : pathname.startsWith('/document') ? "Document Generator" : pathname.startsWith('/auth') ? "Authentication" : pathname.startsWith('/note') ? "Note Taker" : "";

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen overflow-hidden m-0 bg-gradient-to-r from-[#0B0F2E] to-[#081022]  text-white`}>
        <div className="flex flex-col h-max">
          {!isNotFoundPage && (
            <nav className="h-[7vh] w-full bg-[#000000]/[20%] text-white flex items-center flex-row flex-grow px-7 border-b-[1px] border-white/[0.2]">
              <div className="text-[#00BFFF] font-extrabold text-2xl h-min pr-5 my-auto">Eidolon</div>
              <span className="text-white/[70%] h-min text-sm border-l-[1px] border-white/[25%] px-5 my-auto">{routeDisplayName}</span>
              {!isAuthRoute &&
                <div className="flex flex-row ml-auto my-auto">
                  <div className="flex items-center justify-center mr-4">
                    <BoltIcon className="h-4 w-4 text-[#00BFFF] ml-6 my-auto mr-2 font-extrabold" />
                    <span className="text-white/[70%] text-sm">API Usage : <span className="text-[#00BFFF]">{!isHomeRoute ? tokenCount : "Unlimited"}</span></span>
                  </div>
                  <button className="flex  align-center justify-center">
                    <Cog6ToothIcon className="h-6 w-6 text-[#00BFFF] ml-6 my-auto font-extrabold" />
                  </button>
                  <button onClick={handleLogout} className="flex  align-center justify-center">
                    <ArrowRightStartOnRectangleIcon className="h-6 w-6 text-[#00BFFF] ml-6 my-auto mr-4 font-extrabold" />
                  </button>
                </div>
              }
            </nav>
          )}</div>
        <div className="h-[93%] flex ">
          {!isAuthRoute && !isHomeRoute && !isNotFoundPage && (
            <aside className="w-[17vw] bg-[#000000]/[30%] px-4 border-r-[1px] border-white/[0.2] flex flex-col h-full">
              <div className="flex flex-col py-4 w-full justify-center h-[40%] items-center border-b-[1px] border-white/[25%]">
                <button onClick={() => { router.push('/home'); }} className={`px-3 w-full py-3 flex flex-grow`}><HomeIcon className="h-6 w-6" /> <span className="ml-4">Home</span> </button>
                <button onClick={() => { router.push('/document'); }} className={`${pathname.startsWith("/document") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><DocumentTextIcon className="h-6 w-6" /> <span className="ml-4">Document Generator</span> </button>
                <button onClick={() => { router.push('/note'); }} className={`${pathname.startsWith("/note") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><PencilSquareIcon className="h-6 w-6" /> <span className="ml-4">Inclass Notes</span></button>
                <button onClick={() => { router.push('/textbook-explainer'); }} className={`${pathname.startsWith("/textbook-explainer") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><BookOpenIcon className="h-6 w-6" /> <span className="ml-4">Textbook Explainer</span></button>
                <button className={`${pathname.startsWith("/tts") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><SpeakerWaveIcon className="h-6 w-6" /> <span className="ml-4">TTS</span></button>
                <button className={`${pathname.startsWith("/image") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><PhotoIcon className="h-6 w-6" /> <span className="ml-4">Image Gen</span></button>
                <button className={`${pathname.startsWith("/chat") ? "bg-[#3366FF]/[30%] text-[#00BFFF] rounded-xl border-[1px] border-[#3366FF]/[40%]" : ""} px-3 w-full py-3 flex flex-grow`}><ChatBubbleLeftIcon className="h-6 w-6" /> <span className="ml-4">Chatbot</span></button>
              </div>
              <div className="flex flex-col h-[60%] mt-5 overflow-y-auto gap-y-3">

                {/* Use Object.keys to loop over your groups: ['Today', 'Last Week', ...] */}
                {Object.keys(groupedHistory).map(groupName => (

                  // Only render a group section if it has items
                  groupedHistory[groupName].length > 0 && (
                    <div key={groupName} className=" space-y-1">
                      <h2 className=" font-semibold px-1 text-[#00BFFF] text-xl font-semibold">{groupName}</h2>

                      {/* Now, map over the items within that specific group */}
                      {groupedHistory[groupName].map(history => (
                        <div
                          onClick={()=>{router.push(`/note/${history.id}`)}}
                          key={history.id}
                          className={`py-3 px-3 rounded-xl cursor-pointer ${params.noteId == history.id ? "bg-[#3366FF]/[30%] border-white/[10%] border-[1px]" : "hover:bg-white/10"}`}
                        >
                          {/* It's good practice to truncate long names */}
                          <div className="truncate">{history.name}</div>
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
          <div className={` ${!isHomeRoute ? "" : ""} w-full`}>{children}</div>
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
