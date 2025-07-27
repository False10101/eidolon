'use client';

import { DocumentTextIcon, PencilSquareIcon, BoltIcon, CurrencyDollarIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import ProgressBar from '@ramonak/react-progress-bar';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useContext } from 'react';
import { useAdmin } from '../layout';
import { motion, AnimatePresence } from 'framer-motion';

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

const cardHoverEffect = {
  y: -5,
  boxShadow: '0 10px 30px rgba(31, 38, 135, 0.5)',
  transition: { type: 'spring', stiffness: 300 }
};

const buttonHoverEffect = {
  scale: 1.05,
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
      className="h-full w-full dashboard-container flex overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* --- Main Content (80%) --- */}
      <motion.div
        className="w-[80%] h-full flex flex-col px-4 2xl:px-8 main-content"
        style={{ backgroundImage: 'linear-gradient(to bottom, #000000 0%, #1A2242 70%)' }}
        variants={containerVariants}
      >
        <motion.div className="welcome-section h-[25%] flex flex-col" variants={itemVariants}>
          {/* This inner div is now the flex container for the title and the card list */}
          <div className="pt-6 flex flex-col h-full">
            <div className='w-full h-min flex'>
              <motion.div
              className="text-3xl font-extrabold pl-3 text-white h-min text-glow pb-1 flex-shrink-0"
              style={{ textShadow: '0 0 6px #BECFFF, 0 0 12px #BECFFF' }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              Welcome Back, {userData.username}
            </motion.div>
            <div className='w-max h-min flex items-center justify-center mt-1 ml-auto font-semibold text-white/80 mr-3'>
              Last login : <span className='ml-1'>{formatLastLogin(userData.last_login)}</span>
            </div>
            </div>
            {/* The title takes its natural height and will not shrink */}
            

            {/* The stat-list now takes up all remaining vertical space (flex-1) and aligns its items */}
            <motion.div
              className="stat-list flex-1 min-h-0 mt-4 grid grid-cols-4 gap-4 px-3 items-stretch"
              variants={containerVariants}
            >
              {/* Total Token Sent */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-token-sent-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Token Sent</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-extrabold">{userData.totalTokenSent}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#3366FF]/[20%] rounded-full ml-auto flex-shrink-0 flex'>
                      <DocumentTextIcon className='size-7 2xl:size-8 text-[#3366FF] m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 `}>
                    <span className={`${userData.weeklyComparison?.tokenSent.change >= 0 ? 'text-green-400' : 'text-red-400'} mr-1`}>{userData.weeklyComparison?.tokenSent.change >= 0 ? '+' : '-'}{Math.abs(userData.weeklyComparison?.tokenSent.change || 0)}%</span>
                    from last week
                  </span>
                </div>
              </motion.div>

              {/* Total Token Received */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-token-recieved-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Token Received</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-extrabold">{userData.totalTokenReceived}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#E27FDF]/[20%] rounded-full ml-auto flex-shrink-0 flex'>
                      <PencilSquareIcon className='size-7 2xl:size-8 text-[#9664E5] m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 `}>
                    <span className={`${userData.weeklyComparison?.tokenReceived.change >= 0 ? 'text-green-400' : 'text-red-400'} mr-1`}>{userData.weeklyComparison?.tokenReceived.change >= 0 ? '+' : '-'}{Math.abs(userData.weeklyComparison?.tokenReceived.change || 0)}%</span>
                    from last week
                  </span>
                </div>
              </motion.div>

              {/* Total API Calls */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="api-calls-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total API Calls</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-extrabold">{userData.totalAPICalls}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#6A5ACD]/[20%] rounded-full ml-auto flex-shrink-0 flex'>
                      <BoltIcon className='size-7 2xl:size-8 text-[#6A5ACD] m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 `}>
                    <span className={`${userData.weeklyComparison?.apiCalls.change >= 0 ? 'text-green-400' : 'text-red-400'} mr-1`}>{userData.weeklyComparison?.apiCalls.change >= 0 ? '+' : '-'}{Math.abs(userData.weeklyComparison?.apiCalls.change || 0)}%</span>
                    from last week
                  </span>
                </div>
              </motion.div>

              {/* Total Cost */}
              <motion.div variants={itemVariants} whileHover={cardHoverEffect} className="total-cost-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Cost this month</div>
                      <div className="text-xl 2xl:text-2xl pt-1 ml-0.5 font-extrabold">${userData.totalCost}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#5ACBCD]/[20%] rounded-full ml-auto flex-shrink-0 flex'>
                      <CurrencyDollarIcon className='size-7 2xl:size-8 text-[#5AA5CD] m-auto' />
                    </div>
                  </div>
                  <span className={`flex w-full text-xs 2xl:text-sm pt-2 `}>
                    <span className={`${userData.weeklyComparison?.cost.change >= 0 ? 'text-green-400' : 'text-red-400'} mr-1`}>{userData.weeklyComparison?.cost.change >= 0 ? '+' : '-'}{Math.abs(userData.weeklyComparison?.cost.change || 0)}%</span>
                    from last week
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* --- Navigation Section (30% Height) --- */}
        <motion.div className="navigation-section h-[30%] flex flex-col justify-center overflow-hidden" variants={itemVariants}>
          <div className='pt-4'>
            <div className='text-white text-lg font-bold 2xl:font-semibold pl-3 2xl:text-2xl'>Navigation</div>

            {/* ADDED "items-start" to align all buttons to the top of the grid */}
            <motion.div
              className='navigation-list grid grid-cols-6 items-start px-6 mx-3 mt-3 2xl:mt-4 border-[1px] border-[#395CAE]/[55%] rounded-xl h-max bg-[#000000]/[10%] py-4 content-center'
              variants={containerVariants}
            >

              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/document'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#3366FF]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#3366FF] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <DocumentTextIcon className='size-7 text-[#3366FF] m-auto group-hover:text-black' />
                </div>
                {/* REMOVED align-top */}
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Document Generator</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Create documents from prompts</div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/note'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#437FBC]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5A83B8] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <PencilSquareIcon className='size-7 text-[#5A83B8] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Inclass Notes</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Transcribe notes from transcripts</div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/textbook-explainer'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#5651A3]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5B6CC6] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <BookOpenIcon className='size-7 text-[#5B6CC6] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Textbook Explainer</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Simplify content from textbook</div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/tts'); }} className=' group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#3E49BD]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#4A60DE] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <SpeakerWaveIcon className='size-7 text-[#4A60DE] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>TTS with Subtitles</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Convert text to audio</div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/image-gen'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#1E76A9]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#8AD3CC] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <PhotoIcon className='size-7 text-[#8AD3CC]/[65%] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Image Generator</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Generate images from prompts</div>
              </motion.button>
              <motion.button variants={itemVariants} whileHover={buttonHoverEffect} whileTap={buttonTapEffect} onClick={() => { router.push('/chatbot'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#2C4C7F]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#7796C7] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <ChatBubbleLeftIcon className='size-7 text-[#7796C7] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>AI Chatbot</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Ask anything to AI</div>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* --- Activity Section (45% Height) --- */}
        <motion.div className="activity-section h-[45%] mx-3 flex flex-col overflow-hidden" variants={itemVariants}>
          <div className="py-4 flex flex-col flex-1 min-h-0">
            <div className='text-white font-bold text-lg 2xl:font-semibold 2xl:text-2xl'>Recent Activity</div>
            {/* This is the main flex container that will manage the layout */}
            <motion.div className="flex flex-col flex-1 min-h-0 overflow-hidden my-3 border-2 border-white/[10%] rounded-xl bg-[#0f142e]" variants={itemVariants}>

              {/* 1. The Header is now a direct child. It has a fixed height based on its content. */}
              <div className='w-full flex border-b-[1px] border-white/[10%] bg-[#0f142e] h-min py-2 text-sm 2xl:text-base text-white/[70%]'>
                <div className='flex px-7 w-[20%]'>Type</div>
                <div className='flex px-7 w-[30%]'>Title</div>
                <div className='flex px-7 w-[12.5%]'>Status</div>
                <div className='flex px-7 w-[23.5%]'>Date</div>
                <div className='flex px-8 w-[15%]'>More Info</div>
              </div>

              {/* 2. This body container is now a sibling to the header. */}
              {/* 'flex-1' makes it fill the remaining space, and 'overflow-y-auto' makes it scrollable. */}
              <div className='w-full flex-1 overflow-y-auto text-sm 2xl:text-base'>
                <AnimatePresence>
                  {activityList.map((activity, index) => (
                    <motion.div
                      key={activity.id || index}
                      className={`flex w-full ${index === activityList.length - 1 && activityList.length > 6 ? "" : "border-b-[1px]"} border-white/[10%] h-min py-3 text-white/[80%] hover:bg-[#2d355e]/[60%]`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className='flex px-7 w-[20%] items-center'>{
                        activity.type === "Document" ? <DocumentTextIcon className='size-4 2xl:size-5 text-[#3366FF] mr-3' /> :
                          activity.type === "Inclass Notes" ? <PencilSquareIcon className='size-4 2xl:size-5 text-[#5A83B8] mr-3' /> :
                            activity.type === "Textbook Explainer" ? <BookOpenIcon className='size-4 2xl:size-5 text-[#5B6CC6] mr-3' /> :
                              activity.type === "TTS with Subtitles" ? <SpeakerWaveIcon className='size-4 2xl:size-5 text-[#4A60DE] mr-3' /> :
                                activity.type === "Image Generation" ? <PhotoIcon className='size-4 2xl:size-5 text-[#8AD3CC]/[65%] mr-3' /> :
                                  activity.type === "Chat with AI" ? <ChatBubbleLeftIcon className='size-4 2xl:size-5 text-[#7796C7] mr-3' /> : null
                      }{
                          activity.type === "Document" ? "Document" :
                            activity.type === "Inclass Notes" ? "Inclass Notes" :
                              activity.type === "Textbook Explainer" ? "Textbook Explainer" :
                                activity.type === "TTS with Subtitles" ? "TTS" :
                                  activity.type === "Image Generation" ? "Image" :
                                    activity.type === "Chat with AI" ? "Chat" : null
                        }</div>
                      <div className={`flex px-7 w-[30%] font-semibold items-center ${activity.type === "Document" ? "text-[#3366FF]" :
                        activity.type === "Inclass Notes" ? "text-[#5A83B8]" :
                          activity.type === "Textbook Explainer" ? "text-[#6A5ACD]" :
                            activity.type === "TTS with Subtitles" ? "text-[#4A60DE]" :
                              activity.type === "Image Generation" ? "text-[#8AD3CC]" :
                                activity.type === "Chat with AI" ? "text-[#7796C7]" : ""
                        }`}>{activity.title}</div>
                      <div className="flex px-4 w-[12.5%] items-center">
                        <span className={`px-3 2xl:px-4 py-0.5 2xl:py-1 text-xs 2xl:text-sm ${activity.status.toLowerCase() == "completed" ? "bg-[#22C55E]/[20%] text-[#4ADE80] rounded-2xl" :
                          activity.status.toLowerCase() == "processing" ? "bg-[#FBBF24]/[20%] text-[#F59E0B] rounded-2xl" :
                            activity.status.toLowerCase() == "pending" ? "bg-[#FBBF24]/[20%] text-[#F59E0B] rounded-2xl" :
                              activity.status.toLowerCase() == "failed" ? "bg-[#EF4444]/[20%] text-[#DC2626] rounded-2xl" : ""
                          }`}>
                          {activity.status}
                        </span>
                      </div>
                      <div className='flex px-7 w-[23.5%] items-center uppercase justify-start'>
                        <span>
                          {new Date(activity.date).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        <span className=' ml-2'>
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

                          // DEBUG: Log the full URL before navigating
                          console.log(`Navigating to: ${baseRoute}/${activity.respective_table_id}`);

                          router.push(`${baseRoute}/${activity.respective_table_id}`);
                        }}
                        className="flex px-7 w-[15%] text-[#00CED1] hover:underline items-center"
                      >
                        <EyeIcon className="size-5 2xl:size-6 text-[#00CED1] mr-2" />
                        View More
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
      <motion.div className="status-bar w-[20%] bg-[#000000]/[0.3] flex flex-col px-4 pt-5 pb-6" variants={containerVariants}>
        <motion.div className='text-[#00BFFF] text-lg font-bold flex-shrink-0 2xl:text-2xl px-1 pb-2' variants={itemVariants}>System Status</motion.div>
        <div className="flex-1 min-h-0 flex flex-col justify-between pt-3 pb-1">

          <motion.div className='api-status-card rounded-xl flex h-[22%] px-2 2xl:px-4 py-4 bg-[#20232F]/[64%] overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold'>API Status</h1>

              <div className="text-xs 2xl:text-sm text-white/[70%] w-full flex justify-between">
                <div className="flex-grow">Gemini 2.5 Pro</div>
                <div className={` ${userData.gemini_api ? "text-[#4ADE80]" : "text-red-500/90"}`}>
                  ● {userData.gemini_api ? "Connected" : "Failed"}
                </div>
              </div>

              <div className="text-xs 2xl:text-sm text-white/[70%] w-full flex justify-between">
                <div className="flex-grow">Murf.AI</div>
                <div className={` ${userData.murf_api ? "text-[#4ADE80]" : "text-red-500/90"}`}>
                  ● {userData.murf_api ? "Connected" : "Failed"}
                </div>
              </div>

              <div className="text-xs 2xl:text-sm text-white/[70%] w-full flex justify-between">
                <div className="flex-grow">Dall-E</div>
                <div className={` ${userData.dall_e_api ? "text-[#4ADE80]" : "text-red-500/90"}`}>
                  ● {userData.dall_e_api ? "Connected" : "Failed"}
                </div>
              </div>

            </div>
          </motion.div>

          <motion.div className='monthly-usage-card flex h-[35%] bg-[#20232F]/[64%] px-2 2xl:px-4 py-4 items-center rounded-xl overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between space-y-1 mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold'>Monthly Usage</h1>
              {monthlyUsageData.map((api, index) => (
                <div key={index} className="text-xs 2xl:text-sm text-white/[70%] w-full flex flex-col justify-between items-center">
                  <div className='flex flex-row w-full pb-0.5 pr-1'>
                    <div className="flex-grow">{api.type}</div>
                    <div className='flex'>{api.totalUsage}/<span className={`text-[${api.color}]`}>∞</span></div>
                  </div>
                  <div className="w-full">
                    <ProgressBar completed={parseInt(api.totalUsage)} maxCompleted={parseInt(api.totalUsage)} bgColor={api.color} baseBgColor="#1E293B" height="0.3em" width="100%" labelAlignment="outside" labelSize="0px" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div className='monthly-token-usage-card flex h-[35%] bg-[#20232F]/[64%] px-2 2xl:px-4 py-4 rounded-xl overflow-hidden' variants={itemVariants} whileHover={cardHoverEffect}>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between space-y-1 mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold'>Monthly Token Usage</h1>
              {monthlyTokenUsageData.map((api, index) => (
                <div key={index} className="text-xs 2xl:text-sm text-white/[70%] w-full flex flex-col justify-between items-center">
                  <div className='flex flex-row w-full pb-0.5 pr-1'>
                    <div className="flex-grow">{api.type}</div>
                    <div className='flex'>{api.totalTokenUsage}/<span className={`text-[${api.color}]`}>∞</span></div>
                  </div>
                  <div className="w-full">
                    <ProgressBar completed={parseInt(api.totalTokenUsage)} maxCompleted={parseInt(api.totalTokenUsage)} bgColor={api.color} baseBgColor="#1E293B" height="0.3em" width="100%" labelAlignment="outside" labelSize="0px" />
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