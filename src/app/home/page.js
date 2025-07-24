'use client';

import { DocumentTextIcon, PencilSquareIcon, BoltIcon, CurrencyDollarIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import ProgressBar from '@ramonak/react-progress-bar';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const [userData, setUserData] = useState({});
  const [activityList, setActivityList] = useState([]);
  const [monthlyUsageData, setMonthlyUsageData] = useState([]);
  const [monthlyTokenUsageData, setMonthlyTokenUsageData] = useState([]);

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
          credentials: 'include'
        });
        if (res.status === 200) {
          const data = await res.json();
          setUserData(data.userData);
          setActivityList(data.userData.activity || []);
          setMonthlyUsageData(data.userData.monthlyUsage || []);
          setMonthlyTokenUsageData(data.userData.monthlyTokenUsage || []);
        } else {
          console.error('Failed to fetch user data');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    }
    getUserData();
  }, [])

  const dummyStatusData = [
    { "api": "Murf.AI", "status": "Connected" },
    { "api": "Ideogram", "status": "Connected" },
    { "api": "Gemini 2.5 pro", "status": "Connected" }
  ];

  return (
    <div className="h-full w-full dashboard-container flex overflow-hidden">
      {/* --- Main Content (80%) --- */}
      <div className="w-[80%] h-full flex flex-col px-4 2xl:px-8 main-content" style={{ backgroundImage: 'linear-gradient(to bottom, #000000 0%, #1A2242 70%)' }}>

        <div className="welcome-section h-[25%] flex flex-col ">
          {/* This inner div is now the flex container for the title and the card list */}
          <div className="pt-6 flex flex-col h-full">

            {/* The title takes its natural height and will not shrink */}
            <div className="text-3xl font-extrabold pl-3 text-white h-min text-glow pb-1 flex-shrink-0" style={{ textShadow: '0 0 6px #BECFFF, 0 0 12px #BECFFF' }} >Welcome Back, {userData.username}</div>

            {/* The stat-list now takes up all remaining vertical space (flex-1) and aligns its items */}
            <div className="stat-list flex-1 min-h-0 mt-4 grid grid-cols-4 gap-4 px-3 items-stretch">

              <div className="total-token-sent-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Token Sent</div>
                      <div className="text-xl 2xl:text-2xl pt-1 font-extrabold">{userData.totalTokenSent}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#3366FF]/[20%] rounded-full ml-auto flex-shrink-0 flex '> <DocumentTextIcon className='size-7 2xl:size-8 text-[#3366FF] m-auto ' /></div>
                  </div>
                  <span className='grid w-full text-xs 2xl:text-sm text-white/[50%] pt-2'>+20% from last week</span>
                </div>
              </div>
              <div className="total-token-recieved-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Token Recieved</div>
                      <div className="text-xl 2xl:text-2xl pt-1 font-extrabold">{userData.totalTokenReceived}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#E27FDF]/[20%] rounded-full ml-auto flex-shrink-0 flex '> <PencilSquareIcon className='size-7 2xl:size-8 text-[#9664E5] m-auto ' /></div>
                  </div>
                  <span className='grid w-full text-xs 2xl:text-sm text-white/[50%] pt-2'>+22% from last week</span>
                </div>
              </div>
              <div className="api-calls-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total API Calls</div>
                      <div className="text-xl 2xl:text-2xl pt-1 font-extrabold">{userData.totalAPICalls}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#6A5ACD]/[20%] rounded-full ml-auto flex-shrink-0 flex '> <BoltIcon className='size-7 2xl:size-8 text-[#6A5ACD] m-auto ' /></div>
                  </div>
                  <span className='grid w-full text-xs 2xl:text-sm text-white/[50%] pt-2'>-11% from last month</span>
                </div>
              </div>
              <div className="total-cost-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col p-4 2xl:p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }}>
                <div className='flex flex-col m-auto justify-between w-full h-full'>
                  <div className='flex flex-row w-full items-center'>
                    <div className='flex flex-col items-start'>
                      <div className="text-xs 2xl:text-base text-white/[70%] w-max tracking-wide">Total Cost this month</div>
                      <div className="text-xl 2xl:text-2xl pt-1 font-extrabold">${userData.totalCost}</div>
                    </div>
                    <div className='w-12 h-12 2xl:w-14 2xl:h-14 bg-[#5ACBCD]/[20%] rounded-full ml-auto flex-shrink-0 flex '> <CurrencyDollarIcon className='size-7 2xl:size-8 text-[#5AA5CD] m-auto ' /></div>
                  </div>
                  <span className='grid w-full text-xs 2xl:text-sm text-white/[50%] pt-2'>-10% from last month</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Navigation Section (30% Height) --- */}
        <div className="navigation-section h-[30%] flex flex-col justify-center overflow-hidden">
          <div className='pt-4'>
            <div className='text-white text-lg font-bold 2xl:font-semibold pl-3 2xl:text-2xl'>Navigation</div>

            {/* ADDED "items-start" to align all buttons to the top of the grid */}
            <div className='navigation-list grid grid-cols-6 items-start px-6 mx-3 mt-3 2xl:mt-4 border-[1px] border-[#395CAE]/[55%] rounded-xl h-max bg-[#000000]/[10%] py-4 content-center'>

              <button onClick={() => { router.push('/document'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#3366FF]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#3366FF] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <DocumentTextIcon className='size-7 text-[#3366FF] m-auto group-hover:text-black' />
                </div>
                {/* REMOVED align-top */}
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Document Generator</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Create documents from prompts</div>
              </button>
              <button onClick={() => { router.push('/note'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#437FBC]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5A83B8] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <PencilSquareIcon className='size-7 text-[#5A83B8] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Inclass Notes</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Transcribe notes from transcripts</div>
              </button>
              <button onClick={() => { router.push('/textbook-explainer'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#5651A3]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5B6CC6] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <BookOpenIcon className='size-7 text-[#5B6CC6] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Textbook Explainer</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Simplify content from textbook</div>
              </button>
              <button onClick={() => { router.push('/tts'); }} className=' group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#3E49BD]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#4A60DE] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <SpeakerWaveIcon className='size-7 text-[#4A60DE] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>TTS with Subtitles</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Convert text to audio</div>
              </button>
              <button onClick={() => { router.push('/image-gen'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#1E76A9]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#8AD3CC] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <PhotoIcon className='size-7 text-[#8AD3CC]/[65%] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Image Generator</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Generate images from prompts</div>
              </button>
              <button onClick={() => { router.push('/chatbot'); }} className='group grid items-center justify-center p-1 2xl:p-2'>
                <div className='w-14 h-14 2xl:w-16 2xl:h-16 bg-[#2C4C7F]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#7796C7] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                  <ChatBubbleLeftIcon className='size-7 text-[#7796C7] m-auto group-hover:text-black' />
                </div>
                <div className='font-bold text-sm 2xl:text-lg truncate 2xl:font-semibold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>AI Chatbot</div>
                <div className='text-xs 2xl:text-sm text-white/[50%] text-wrap w-[90%] mx-auto text-center'>Ask anything to AI</div>
              </button>
            </div>
          </div>
        </div>

        {/* --- Activity Section (45% Height) --- */}
        <div className="activity-section h-[45%] mx-3 flex flex-col overflow-hidden">
          <div className="py-4 flex flex-col flex-1 min-h-0">
            <div className='text-white font-bold text-lg 2xl:font-semibold 2xl:text-2xl'>Recent Activity</div>
            {/* This is the main flex container that will manage the layout */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden my-3 border-2 border-white/[10%] rounded-xl bg-[#0f142e]">

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
                {activityList.map((activity, index) => (
                  <div key={index} className={`flex w-full ${index == activityList.length - 1 ? "" : "border-b-[1px]"} border-white/[10%] h-min py-3 text-white/[80%] hover:bg-[#2d355e]/[60%]`}>
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
                    <div className='flex px-7 w-[23.5%] items-center'>{activity.date}</div>
                    <div className='flex px-7 w-[15%] text-[#00CED1] hover:underline items-center'><EyeIcon className='size-5 2xl:size-6 text-[#00CED1] mr-2' /> View More</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* --- Status Bar (20%) --- */}
      <div className="status-bar w-[20%] bg-[#000000]/[0.3] flex flex-col px-4 pt-5 pb-6">
        <div className='text-[#00BFFF] text-lg font-bold flex-shrink-0 2xl:text-2xl px-1 pb-2'>System Status</div>
        <div className="flex-1 min-h-0 flex flex-col justify-between pt-3 pb-1">

          <div className='api-status-card rounded-xl flex h-[22%] px-2 2xl:px-4 py-4 bg-[#20232F]/[64%] overflow-hidden'>
            {/* FIX: This div now fills the card's height and spaces its content out */}
            <div className='flex flex-col h-full justify-between mx-3 w-full'>
              <h1 className='text-base font-extrabold w-full 2xl:text-xl 2xl:font-semibold'>API Status</h1>
              {dummyStatusData.map((api, index) => (
                <div key={index} className="text-xs 2xl:text-sm text-white/[70%] w-full flex justify-between">
                  <div className="flex-grow">{api.api}</div>
                  <div className={` ${api.status === "Connected" ? "text-[#4ADE80]" : "text-white/[50%]"}`}>
                    ● {api.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='monthly-usage-card flex h-[35%] bg-[#20232F]/[64%] px-2 2xl:px-4 py-4 items-center rounded-xl overflow-hidden'>
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
          </div>

          <div className='monthly-token-usage-card flex h-[35%] bg-[#20232F]/[64%] px-2 2xl:px-4 py-4 rounded-xl overflow-hidden'>
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
          </div>

        </div>
      </div>
    </div>
  )
}