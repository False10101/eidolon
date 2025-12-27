'use client';

import { DocumentTextIcon, PencilSquareIcon, BoltIcon, CurrencyDollarIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import ProgressBar from '@ramonak/react-progress-bar';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useContext } from 'react';
import { useAdmin } from '../layout';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageIcon, MusicalNoteIcon } from '@heroicons/react/24/solid';

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 14,
    },
  },
};

// UPDATED: Futuristic Cyan Glow on Hover
const cardHoverEffect = {
  y: -5,
  boxShadow: '0 0px 25px rgba(6, 182, 212, 0.25), inset 0 0 10px rgba(6, 182, 212, 0.1)',
  borderColor: 'rgba(6, 182, 212, 0.5)',
  transition: { type: 'spring', stiffness: 300 }
};

const buttonHoverEffect = {
  scale: 1.05,
  textShadow: '0 0 8px rgb(6, 182, 212)',
  transition: { type: 'spring', stiffness: 400, damping: 10 }
};

const buttonTapEffect = {
  scale: 0.95
};

function formatLastLogin(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  
  // Date comparison (ignore time)
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
  
  return (
    <>
      <span className="mr-1">
        {isToday ? 'Today' : 
         isYesterday ? 'Yesterday' : 
         date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })},
      </span>
      <span>
        {date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}
      </span>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [activityList, setActivityList] = useState([]);
  const [monthlyUsageData, setMonthlyUsageData] = useState([]);
  const [monthlyTokenUsageData, setMonthlyTokenUsageData] = useState([]);

  const { setIsAdmin } = useAdmin();

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
    const getUserData = async () => {
      try {
        const res = await fetch(`/api/home/getUserInfo`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.status === 200) {
          const data = await res.json();

          console.log('User Data:', data.userData);
          setUserData(data.userData);
          setActivityList(data.userData.activity || []);
          setMonthlyUsageData(data.userData.monthlyUsage || []);
          setMonthlyTokenUsageData(data.userData.monthlyTokenUsage || []);
          if(data.userData.type === 'admin'){
            setIsAdmin(true);
          } else{
            setIsAdmin(false);
          }

        } else {
          console.error('Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
    getUserData();
  }, [])

  return (
    <motion.div
      className="h-full w-full dashboard-container flex overflow-hidden bg-black text-slate-200 font-sans"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* --- Main Content (80%) --- */}
      <motion.div
        className="w-[80%] h-full flex flex-col px-4 2xl:px-8 main-content"
        // UPDATED: Deep space radial gradient
        style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
        variants={containerVariants}
      >
        <motion.div className="welcome-section h-[25%] flex flex-col" variants={itemVariants}>
          <div className="pt-6 flex flex-col h-full">
            <div className='w-full h-min flex items-end'>
              <motion.div
              className="text-3xl font-extrabold pl-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 h-min flex-shrink-0"
              // UPDATED: Neon Text Shadow
              style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              Welcome Back, <span className="text-white">{userData.username}</span>
            </motion.div>
            <div className='w-max h-min flex items-center justify-center mt-1 ml-auto font-medium text-slate-400 mr-3 text-sm'>
              Last login : <span className='ml-2 font-mono'>{formatLastLogin(userData.last_login)}</span>
            </div>
            </div>
            

            {/* The stat-list now takes up all remaining vertical space (flex-1) and aligns its items */}
            <motion.div
              className="stat-list flex-1 min-h-0 mt-4 grid grid-cols-4 gap-4 px-3 items-stretch"
              variants={containerVariants}
            >
              {/* Total Token Sent */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-token-sent-card border border-cyan-900/40 rounded-[12px] bg-[#0b1221]/80 backdrop-blur-sm flex flex-col p-4 2xl:p-8 relative overflow-hidden group">
                 {/* Decorative Glow */}
                 <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className='flex flex-col m-auto justify-between w-full h-full relative z-10'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-cyan-200/60 w-max tracking-widest uppercase font-mono">Tokens Sent</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-bold text-white drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">{userData.totalTokenSent}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-cyan-950/50 border border-cyan-500/30 rounded-lg ml-auto flex-shrink-0 flex shadow-[0_0_15px_rgba(6,182,212,0.15)]'>
                      <DocumentTextIcon className='size-6 2xl:size-7 text-cyan-400 m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 font-mono`}>
                    <span className={`${userData.weeklyComparison?.tokenSent.change >= 0 ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.5)]'} mr-2`}>{userData.weeklyComparison?.tokenSent.change >= 0 ? '▲' : '▼'} {Math.abs(userData.weeklyComparison?.tokenSent.change || 0)}%</span>
                    <span className="text-slate-500">vs last week</span>
                  </span>
                </div>
              </motion.div>

              {/* Total Token Received */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-token-recieved-card border border-fuchsia-900/40 rounded-[12px] bg-[#0b1221]/80 backdrop-blur-sm flex flex-col p-4 2xl:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-fuchsia-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className='flex flex-col m-auto justify-between w-full h-full relative z-10'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-fuchsia-200/60 w-max tracking-widest uppercase font-mono">Tokens Recvd</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-bold text-white drop-shadow-[0_0_5px_rgba(217,70,239,0.5)]">{userData.totalTokenReceived}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-fuchsia-950/50 border border-fuchsia-500/30 rounded-lg ml-auto flex-shrink-0 flex shadow-[0_0_15px_rgba(192,38,211,0.15)]'>
                      <PencilSquareIcon className='size-6 2xl:size-7 text-fuchsia-400 m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 font-mono`}>
                    <span className={`${userData.weeklyComparison?.tokenReceived.change >= 0 ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.5)]'} mr-2`}>{userData.weeklyComparison?.tokenReceived.change >= 0 ? '▲' : '▼'} {Math.abs(userData.weeklyComparison?.tokenReceived.change || 0)}%</span>
                    <span className="text-slate-500">vs last week</span>
                  </span>
                </div>
              </motion.div>

              {/* Total API Calls */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="api-calls-card border border-indigo-900/40 rounded-[12px] bg-[#0b1221]/80 backdrop-blur-sm flex flex-col p-4 2xl:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className='flex flex-col m-auto justify-between w-full h-full relative z-10'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-indigo-200/60 w-max tracking-widest uppercase font-mono">API Calls</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-bold text-white drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]">{userData.totalAPICalls}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-indigo-950/50 border border-indigo-500/30 rounded-lg ml-auto flex-shrink-0 flex shadow-[0_0_15px_rgba(99,102,241,0.15)]'>
                      <BoltIcon className='size-6 2xl:size-7 text-indigo-400 m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 font-mono`}>
                    <span className={`${userData.weeklyComparison?.apiCalls.change >= 0 ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.5)]'} mr-2`}>{userData.weeklyComparison?.apiCalls.change >= 0 ? '▲' : '▼'} {Math.abs(userData.weeklyComparison?.apiCalls.change || 0)}%</span>
                    <span className="text-slate-500">vs last week</span>
                  </span>
                </div>
              </motion.div>

              {/* Total Cost */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-cost-card border border-sky-900/40 rounded-[12px] bg-[#0b1221]/80 backdrop-blur-sm flex flex-col p-4 2xl:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className='flex flex-col m-auto justify-between w-full h-full relative z-10'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-sky-200/60 w-max tracking-widest uppercase font-mono">Current Cost</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-bold text-white drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]">${userData.totalCost}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-sky-950/50 border border-sky-500/30 rounded-lg ml-auto flex-shrink-0 flex shadow-[0_0_15px_rgba(14,165,233,0.15)]'>
                      <CurrencyDollarIcon className='size-6 2xl:size-7 text-sky-400 m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 font-mono`}>
                    <span className={`${userData.weeklyComparison?.cost.change >= 0 ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]' : 'text-rose-400 drop-shadow-[0_0_3px_rgba(251,113,133,0.5)]'} mr-2`}>{userData.weeklyComparison?.cost.change >= 0 ? '▲' : '▼'} {Math.abs(userData.weeklyComparison?.cost.change || 0)}%</span>
                    <span className="text-slate-500">vs last week</span>
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* --- Navigation Section (30% Height) --- */}
        <motion.div className="navigation-section h-[30%] flex flex-col justify-center overflow-hidden" variants={itemVariants}>
          <div className='pt-4'>
            <div className='text-white text-lg font-bold 2xl:font-semibold pl-3 2xl:text-2xl flex items-center'>
              <span className="w-1 h-6 bg-cyan-500 mr-3 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
              Navigation
            </div>

            {/* ADDED "items-start" to align all buttons to the top of the grid */}
            <motion.div
              // UPDATED: Navigation Background
              className='navigation-list grid grid-cols-5 items-start px-6 mx-3 mt-3 2xl:mt-4 border border-cyan-500/20 rounded-xl h-max bg-[#0b101c]/60 py-4 content-center shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md'
              variants={containerVariants}
            >

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/document'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-blue-950/40 border border-blue-500/20 rounded-xl mx-auto flex justify-center items-center transition-all duration-300 group-hover:bg-blue-600 group-hover:border-blue-400 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.6)]'>
                  <DocumentTextIcon className='size-7 text-blue-400 m-auto group-hover:text-white transition-colors' />
                </div>
                {/* REMOVED align-top */}
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 text-slate-300 group-hover:text-blue-400 transition-colors'>Document Generator</div>
                <div className='text-xs 2xl:text-sm text-slate-500 text-wrap w-[90%] mx-auto text-center mt-1'>Create documents from prompts</div>
              </motion.button>

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/note'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-cyan-950/40 border border-cyan-500/20 rounded-xl mx-auto flex justify-center items-center transition-all duration-300 group-hover:bg-cyan-600 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(8,145,178,0.6)]'>
                  <PencilSquareIcon className='size-7 text-cyan-400 m-auto group-hover:text-white transition-colors' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 text-slate-300 group-hover:text-cyan-400 transition-colors'>Inclass Notes</div>
                <div className='text-xs 2xl:text-sm text-slate-500 text-wrap w-[90%] mx-auto text-center mt-1'>Transcribe notes from transcripts</div>
              </motion.button>

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/textbook-explainer'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-violet-950/40 border border-violet-500/20 rounded-xl mx-auto flex justify-center items-center transition-all duration-300 group-hover:bg-violet-600 group-hover:border-violet-400 group-hover:shadow-[0_0_15px_rgba(124,58,237,0.6)]'>
                  <BookOpenIcon className='size-7 text-violet-400 m-auto group-hover:text-white transition-colors' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 text-slate-300 group-hover:text-violet-400 transition-colors'>Textbook Explainer</div>
                <div className='text-xs 2xl:text-sm text-slate-500 text-wrap w-[90%] mx-auto text-center mt-1'>Simplify content from textbook</div>
              </motion.button>

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/audioConverter'); }} className=' group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-indigo-950/40 border border-indigo-500/20 rounded-xl mx-auto flex justify-center items-center transition-all duration-300 group-hover:bg-indigo-600 group-hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(79,70,229,0.6)]'>
                  <MusicalNoteIcon className='size-7 text-indigo-400 m-auto group-hover:text-white transition-colors' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 text-slate-300 group-hover:text-indigo-400 transition-colors'>Audio Conversion</div>
                <div className='text-xs 2xl:text-sm text-slate-500 text-wrap w-[90%] mx-auto text-center mt-1'>Convert video to mp3</div>
              </motion.button>

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/transcriptor'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-teal-950/40 border border-teal-500/20 rounded-xl mx-auto flex justify-center items-center transition-all duration-300 group-hover:bg-teal-600 group-hover:border-teal-400 group-hover:shadow-[0_0_15px_rgba(20,184,166,0.6)]'>
                  <LanguageIcon className='size-7 text-teal-400 m-auto group-hover:text-white transition-colors' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 text-slate-300 group-hover:text-teal-400 transition-colors'>Audio Transcriptor</div>
                <div className='text-xs 2xl:text-sm text-slate-500 text-wrap w-[90%] mx-auto text-center mt-1'>Speech to Text Transcriptor</div>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* --- Activity Section (45% Height) --- */}
        <motion.div className="activity-section h-[45%] mx-3 flex flex-col overflow-hidden" variants={itemVariants}>
          <div className="py-4 flex flex-col flex-1 min-h-0">
            <div className='text-white font-bold text-lg 2xl:font-semibold 2xl:text-2xl flex items-center'>
               <span className="w-1 h-6 bg-cyan-500 mr-3 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
               Recent Activity
            </div>
            {/* This is the main flex container that will manage the layout */}
            {/* UPDATED: Table Container Style */}
            <motion.div className="flex flex-col flex-1 min-h-0 overflow-hidden my-3 border border-slate-700/50 rounded-xl bg-[#0b101c]/80 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.4)]" variants={itemVariants}>

              {/* 1. The Header is now a direct child. It has a fixed height based on its content. */}
              <div className='w-full flex border-b border-cyan-500/20 bg-[#0f172a]/90 h-min py-3 text-sm 2xl:text-base text-cyan-100/70 font-mono tracking-wider uppercase'>
                <div className='flex px-7 w-[20%]'>Type</div>
                <div className='flex px-7 w-[30%]'>Title</div>
                <div className='flex px-7 w-[12.5%]'>Status</div>
                <div className='flex px-7 w-[23.5%]'>Date</div>
                <div className='flex px-8 w-[15%]'>More Info</div>
              </div>

              {/* 2. This body container is now a sibling to the header. */}
              {/* 'flex-1' makes it fill the remaining space, and 'overflow-y-auto' makes it scrollable. */}
              <div className='w-full flex-1 overflow-y-auto text-sm 2xl:text-base custom-scrollbar'>
                <AnimatePresence>
                  {activityList.map((activity, index) => (
                    <motion.div
                      key={activity.id || index}
                      // UPDATED: Row Styles
                      className={`flex w-full ${index === activityList.length - 1 && activityList.length > 6 ? "" : "border-b border-slate-800/60"} h-min py-3 text-slate-300 hover:bg-cyan-900/10 transition-colors duration-200`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className='flex px-7 w-[20%] items-center'>{
                        activity.type === "Document" ? <DocumentTextIcon className='size-4 2xl:size-5 text-blue-400 mr-3 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' /> :
                          activity.type === "Inclass Notes" ? <PencilSquareIcon className='size-4 2xl:size-5 text-cyan-400 mr-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' /> :
                            activity.type === "Textbook Explainer" ? <BookOpenIcon className='size-4 2xl:size-5 text-violet-400 mr-3 drop-shadow-[0_0_5px_rgba(167,139,250,0.5)]' /> :
                              activity.type === "TTS with Subtitles" ? <SpeakerWaveIcon className='size-4 2xl:size-5 text-indigo-400 mr-3 drop-shadow-[0_0_5px_rgba(129,140,248,0.5)]' /> :
                                activity.type === "Image Generation" ? <PhotoIcon className='size-4 2xl:size-5 text-teal-400 mr-3 drop-shadow-[0_0_5px_rgba(45,212,191,0.5)]' /> :
                                  activity.type === "Chat with AI" ? <ChatBubbleLeftIcon className='size-4 2xl:size-5 text-sky-400 mr-3 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]' /> : null
                      }{
                          activity.type === "Document" ? "Document" :
                            activity.type === "Inclass Notes" ? "Inclass Notes" :
                              activity.type === "Textbook Explainer" ? "Textbook Explainer" :
                                activity.type === "TTS with Subtitles" ? "TTS" :
                                  activity.type === "Image Generation" ? "Image" :
                                    activity.type === "Chat with AI" ? "Chat" : null
                        }</div>
                      <div className={`flex px-7 w-[30%] font-medium items-center truncate ${activity.type === "Document" ? "text-blue-300" :
                        activity.type === "Inclass Notes" ? "text-cyan-300" :
                          activity.type === "Textbook Explainer" ? "text-violet-300" :
                            activity.type === "TTS with Subtitles" ? "text-indigo-300" :
                              activity.type === "Image Generation" ? "text-teal-300" :
                                activity.type === "Chat with AI" ? "text-sky-300" : ""
                        }`}>{activity.title}</div>
                      <div className="flex px-4 w-[12.5%] items-center">
                        <span className={`px-3 2xl:px-4 py-0.5 2xl:py-1 text-xs 2xl:text-sm border ${activity.status.toLowerCase() == "completed" ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-400 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.2)]" :
                          activity.status.toLowerCase() == "processing" ? "bg-amber-950/30 border-amber-500/30 text-amber-400 rounded-md shadow-[0_0_8px_rgba(245,158,11,0.2)]" :
                            activity.status.toLowerCase() == "pending" ? "bg-amber-950/30 border-amber-500/30 text-amber-400 rounded-md" :
                              activity.status.toLowerCase() == "failed" ? "bg-rose-950/30 border-rose-500/30 text-rose-400 rounded-md shadow-[0_0_8px_rgba(244,63,94,0.2)]" : ""
                          }`}>
                          {activity.status}
                        </span>
                      </div>
                      <div className='flex px-7 w-[23.5%] items-center font-mono text-xs 2xl:text-sm text-slate-400 justify-start'>
                        <span>
                          {new Date(activity.date).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className=' ml-2 text-slate-500'>
                          {new Date(activity.date).toLocaleString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const routeMap = {
                            'Document': '/document',
                            'Inclass Notes': '/note',
                            'Textbook Explainer': '/textbook-explainer',
                            'TTS with Subtitles': '/tts',
                            'Image Generation': '/image-gen',
                            'Chat with AI': '/chat'
                          };

                          const baseRoute = routeMap[activity.type];
                          if (!baseRoute || !activity.respective_table_id) {
                            console.error("Missing route or ID:", activity);
                            return;
                          }
                          console.log(`Navigating to: ${baseRoute}/${activity.respective_table_id}`);
                          router.push(`${baseRoute}/${activity.respective_table_id}`);
                        }}
                        className="flex px-7 w-[15%] text-cyan-400 hover:text-cyan-300 hover:underline items-center transition-colors"
                      >
                        <EyeIcon className="size-5 2xl:size-6 mr-2" />
                        View
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>

      </motion.div>

      {/* --- Status Bar (20%) --- */}
      {/* UPDATED: Right Sidebar with Glassmorphism */}
      <motion.div className="status-bar w-[20%] bg-[#02040a]/80 border-l border-cyan-900/30 backdrop-blur-xl flex flex-col px-4 pt-5 pb-6" variants={containerVariants}>
        <motion.div className='text-cyan-400 text-lg font-bold flex-shrink-0 2xl:text-2xl px-1 pb-2 flex items-center drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' variants={itemVariants}>
            <BoltIcon className="size-6 mr-2 animate-pulse"/>
            System Status
        </motion.div>
        <div className="flex-1 min-h-0 flex flex-col justify-between pt-3 pb-1">

          {/* UPDATED: API Status Card */}
          <motion.div className='api-status-card rounded-xl flex h-[22%] px-2 2xl:px-4 py-4 bg-[#0f172a]/60 border border-slate-700/50 shadow-inner overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold text-slate-200'>API Gateways</h1>

              <div className="text-xs 2xl:text-sm text-slate-400 w-full flex justify-between font-mono">
                <div className="flex-grow">Gemini 2.5 Pro</div>
                <div className={` ${userData.gemini_api ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "text-rose-500"}`}>
                  ● {userData.gemini_api ? "ONLINE" : "OFFLINE"}
                </div>
              </div>

              <div className="text-xs 2xl:text-sm text-slate-400 w-full flex justify-between font-mono">
                <div className="flex-grow">Murf.AI</div>
                <div className={` ${userData.murf_api ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "text-rose-500"}`}>
                  ● {userData.murf_api ? "ONLINE" : "OFFLINE"}
                </div>
              </div>

              <div className="text-xs 2xl:text-sm text-slate-400 w-full flex justify-between font-mono">
                <div className="flex-grow">Dall-E</div>
                <div className={` ${userData.dall_e_api ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "text-rose-500"}`}>
                  ● {userData.dall_e_api ? "ONLINE" : "OFFLINE"}
                </div>
              </div>

            </div>
          </motion.div>

          <motion.div className='monthly-usage-card flex h-[35%] bg-[#0f172a]/60 border border-slate-700/50 px-2 2xl:px-4 py-4 items-center rounded-xl overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between space-y-1 mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold text-slate-200'>Monthly Usage</h1>
              {monthlyUsageData.map((api, index) => (
                <div key={index} className="text-xs 2xl:text-sm text-slate-400 w-full flex flex-col justify-between items-center">
                  <div className='flex flex-row w-full pb-0.5 pr-1 font-mono text-[10px] 2xl:text-xs tracking-wider'>
                    <div className="flex-grow uppercase">{api.type}</div>
                    <div className='flex'>{api.totalUsage} / <span className={`text-[${api.color}] ml-1`}>∞</span></div>
                  </div>
                  <div className="w-full">
                    <ProgressBar completed={parseInt(api.totalUsage)} maxCompleted={parseInt(api.totalUsage)} bgColor={api.color} baseBgColor="#020617" height="4px" width="100%" labelAlignment="outside" labelSize="0px" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className='monthly-token-usage-card flex h-[35%] bg-[#0f172a]/60 border border-slate-700/50 px-2 2xl:px-4 py-4 rounded-xl overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between space-y-1 mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold text-slate-200'>Token Usage</h1>
              {monthlyTokenUsageData.map((api, index) => (
                <div key={index} className="text-xs 2xl:text-sm text-slate-400 w-full flex flex-col justify-between items-center">
                  <div className='flex flex-row w-full pb-0.5 pr-1 font-mono text-[10px] 2xl:text-xs tracking-wider'>
                    <div className="flex-grow uppercase">{api.type}</div>
                    <div className='flex'>{api.totalTokenUsage} / <span className={`text-[${api.color}] ml-1`}>∞</span></div>
                  </div>
                  <div className="w-full">
                    <ProgressBar completed={parseInt(api.totalTokenUsage)} maxCompleted={parseInt(api.totalTokenUsage)} bgColor={api.color} baseBgColor="#020617" height="4px" width="100%" labelAlignment="outside" labelSize="0px" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </motion.div >
  )
}