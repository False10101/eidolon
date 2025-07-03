'use client';

import { DocumentTextIcon, PencilSquareIcon, BoltIcon, CurrencyDollarIcon, BookOpenIcon, SpeakerWaveIcon, PhotoIcon, ChatBubbleLeftIcon, EyeIcon } from '@heroicons/react/24/outline';
import ProgressBar from '@ramonak/react-progress-bar';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function home() {
    const router = useRouter();

    const [userData, setUserData] = useState({});

    const [activityList, setActivityList] = useState([]);

    const [monthlyUsageData, setMonthlyUsageData] = useState([]);

    const [monthlyTokenUsageData, setMonthlyTokenUsageData] = useState([]);


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
            const getUserData = async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/home/getUserInfo`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (res.status === 200) {
                        const data = await res.json();
                        setUserData(data.userData);
                        setActivityList(data.userData.activity || []);
                        setMonthlyUsageData(data.userData.monthlyUsage || []);
                        setMonthlyTokenUsageData(data.userData.monthlyTokenUsage || []);
                        console.log('User data fetched successfully:', data);
                    } else {
                        console.error('Failed to fetch user data');
                    }
                } catch (err) {
                    console.error('Error fetching user data:', err);
                }
            }

            getUserData();
        },[])

    

    const dummyStatusData = [
        {
            "api": "Claude Sonnet 4",
            "status": "Connected"
        },
        {
            "api": "Murf.AI",
            "status": "Connected"
        },
        {
            "api": "Ideogram",
            "status": "Connected"
        },
        {
            "api": "Deepseek R1",
            "status": "Connected"
        }
    ];


    
    return (
        <div className="flex h-full w-full">
            <div className="w-[80%] h-full flex flex-col px-8" style={{ backgroundImage: 'linear-gradient(to bottom, #000000 0%, #1A2242 70%)' }}>
                <div className="welcome-section h-[25%] flex flex-col pt-6">
                    <div className="text-3xl font-extrabold pl-3 text-white h-min text-glow pb-1" style={{ textShadow: '0 0 6px #BECFFF, 0 0 12px #BECFFF' }} >Welcome Back, {userData.username}</div>
                    <div className="stat-list mt-4 flex flex-grow space-x-10 px-3">
                        <div className="total-token-sent-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col flex-grow p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }} >
                            <div className='flex flex-col m-auto justify-between w-full h-full'>
                                <div className='flex flex-row w-full'>
                                    <div className='flex flex-col items-start justify-center gap-y-2 '>
                                        <div className="text-sm text-white/[70%] w-max tracking-wide">Total Token Sent</div>
                                        <div className="text-2xl pt-1 pb-5 font-extrabold">{userData.totalTokenSent}</div>
                                    </div>
                                    <div className='w-15 h-15 bg-[#3366FF]/[20%] rounded-full ml-auto flex '> <DocumentTextIcon className='size-8 text-[#3366FF] m-auto ' /></div>
                                </div>
                                <span className='grid w-full text-sm text-white/[50%]'>+20% from last week</span>
                            </div>

                        </div>
                        <div className="total-token-recieved-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col flex-grow p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }} >
                            <div className='flex flex-col m-auto justify-between w-full h-full'>
                                <div className='flex flex-row w-full'>
                                    <div className='flex flex-col items-start justify-center gap-y-2 '>
                                        <div className="text-sm text-white/[70%] w-max tracking-wide">Total Token Recieved</div>
                                        <div className="text-2xl pt-1 pb-5 font-extrabold">{userData.totalTokenReceived}</div>
                                    </div>
                                    <div className='w-15 h-15 bg-[#E27FDF]/[20%] rounded-full ml-auto flex '> <PencilSquareIcon className='size-8 text-[#9664E5] m-auto ' /></div>
                                </div>
                                <span className='grid w-full text-sm text-white/[50%]'>+22% from last week</span>
                            </div>
                        </div>
                        <div className="api-calls-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col flex-grow p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }} >
                            <div className='flex flex-col m-auto justify-between w-full h-full'>
                                <div className='flex flex-row w-full'>
                                    <div className='flex flex-col items-start justify-center gap-y-2 '>
                                        <div className="text-sm text-white/[70%] w-max tracking-wide">Total API Calls</div>
                                        <div className="text-2xl pt-1 pb-5 font-extrabold">{userData.totalAPICalls}</div>
                                    </div>
                                    <div className='w-15 h-15 bg-[#6A5ACD]/[20%] rounded-full ml-auto flex '> <BoltIcon className='size-8 text-[#6A5ACD] m-auto ' /></div>
                                </div>
                                <span className='grid w-full text-sm text-white/[50%]'>-11% from last month</span>
                            </div>
                        </div>
                        <div className="total-cost-card border-[1px] border-white/[0.1] rounded-[12px] bg-[#060a21] flex flex-col flex-grow p-8" style={{ boxShadow: 'inset 0 0px 32px rgba(0, 0, 0, 1), 0 8px 32px rgba(31, 38, 135, 0.42)' }} >
                            <div className='flex flex-col m-auto justify-between w-full h-full'>
                                <div className='flex flex-row w-full'>
                                    <div className='flex flex-col items-start justify-center gap-y-2 '>
                                        <div className="text-sm text-white/[70%] w-max tracking-wide">Total Cost this month</div>
                                        <div className="text-2xl pt-1 pb-5 font-extrabold">${userData.totalCost}</div>
                                    </div>
                                    <div className='w-15 h-15 bg-[#5ACBCD]/[20%] rounded-full ml-auto flex '> <CurrencyDollarIcon className='size-8 text-[#5AA5CD] m-auto ' /></div>
                                </div>
                                <span className='grid w-full text-sm text-white/[50%]'>-10% from last month</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="navigation-section h-[30%]">
                    <div className='flex flex-col h-full pt-6'>
                        <div className='text-white text-xl font-bold pl-3'>Navigation</div>
                        <div className='navigation-list grid grid-cols-6 justify-items-center gap-x-12 px-12 mx-3 mt-4 border-[1px] border-[#395CAE]/[55%] rounded-xl items-center h-full bg-[#000000]/[10%]'>
                            <button onClick={()=>{router.push('/document');}} className='group grid h-[80%] items-center justify-center'>
                                <div className='w-15 h-15 bg-[#3366FF]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#3366FF] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <DocumentTextIcon className='size-8 text-[#3366FF] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Document
                                </div>
                                <div className='flex font-bold text-center mx-auto mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Generator
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Create professional documents</div>
                                </div>
                            </button>
                            <button onClick={()=>{router.push('/note');}} className='group grid h-[80%] items-center justify-center'>
                                <div className='w-15 h-15 bg-[#437FBC]/[20%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5A83B8] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <PencilSquareIcon className='size-8 text-[#5A83B8] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Inclass
                                </div>
                                <div className='flex font-bold text-center mx-auto mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Notes
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Transcribe and Organize Notes</div>
                                </div>
                            </button>
                            <button onClick={() => { router.push('/textbook-explainer'); }} className='group grid h-[80%] items-center justify-center'>
                                <div className='w-15 h-15 bg-[#5651A3]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#5B6CC6] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <BookOpenIcon className='size-8 text-[#5B6CC6] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Textbook
                                </div>
                                <div className='flex font-bold mx-auto text-center mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Explainer
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Simplify Complex Content</div>
                                </div>
                            </button>
                            <button className=' group grid h-[80%] items-center justify-center'>
                                <div className=' w-15 h-15 bg-[#3E49BD]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#4A60DE] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <SpeakerWaveIcon className='size-8 text-[#4A60DE] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold mx-auto text-center mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    TTS with
                                </div>
                                <div className='flex font-bold mx-auto text-center mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Subtitles
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Convert Text to Audio</div>
                                </div>
                            </button>
                            <button className='group grid h-[80%] items-center justify-center'>
                                <div className='w-15 h-15 bg-[#1E76A9]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#8AD3CC] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <PhotoIcon className='size-8 text-[#8AD3CC]/[65%] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Image
                                </div>
                                <div className='flex font-bold text-center mx-auto mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Generator
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Generate High Quality Images</div>
                                </div>
                            </button>
                            <button className='group grid h-[80%] items-center justify-center'>
                                <div className='w-15 h-15 bg-[#2C4C7F]/[30%] rounded-full mx-auto flex justify-center items-center filter group-hover:bg-[#7796C7] group-hover:shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    <ChatBubbleLeftIcon className='size-8 text-[#7796C7] m-auto group-hover:text-black' />
                                </div>
                                <div className='flex font-bold text-center mx-auto mt-2 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Chat with
                                </div>
                                <div className='flex font-bold text-center mx-auto mb-1 group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>
                                    Ai
                                </div>
                                <div>
                                    <div className='text-sm text-white/[50%] text-wrap w-[80%] mx-auto text-center group-hover:text-shadow-[0_0px_10px_rgba(162,218,255,1)]'>Ask anything to Ai Chatbot</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="activity-section h-[38%]  mx-3 py-4">
                    <div className='flex flex-col h-full overflow-hidden'>
                        <div className='text-white font-bold text-xl'>Recent Activity</div>
                        <div className='flex flex-col flex-grow my-3 border-2 border-white/[10%] rounded-xl bg-[#0f142e] overflow-y-scroll'>
                            <div className='flex w-full border-b-[1px] border-white/[10%] h-min py-3 text-white/[70%]'>
                                <div className='flex px-7 w-[20%]'>Type</div>
                                <div className='flex px-7 w-[30%]'>Title</div>
                                <div className='flex px-7 w-[12.5%]'>Status</div>
                                <div className='flex px-7 w-[20%]'>Date</div>
                                <div className='flex px-7 w-[18.5%]'>More Info</div>
                            </div>
                            <div className='flex flex-col w-full overflow-y-auto h-full '>
                                {activityList.map((activity, index)=>(
                                    <div key={index} className={`flex w-full ${index == activityList.length-1 ? "" : "border-b-[1px]"} border-white/[10%] h-min py-4 text-white/[70%] hover:bg-[#2d355e]/[60%]`}>
                                        <div className='flex px-7 w-[20%]'>{
                                            activity.type === "Document" ? <DocumentTextIcon className='size-6 text-[#3366FF] mr-4' /> :
                                            activity.type === "Inclass Notes" ? <PencilSquareIcon className='size-6 text-[#5A83B8] mr-4' /> :
                                            activity.type === "Textbook Explainer" ? <BookOpenIcon className='size-6 text-[#5B6CC6] mr-4' /> :
                                            activity.type === "TTS with Subtitles" ? <SpeakerWaveIcon className='size-6 text-[#4A60DE] mr-4' /> :
                                            activity.type === "Image Generation" ? <PhotoIcon className='size-6 text-[#8AD3CC]/[65%] mr-4' /> :
                                            activity.type === "Chat with AI" ? <ChatBubbleLeftIcon className='size-6 text-[#7796C7] mr-4' /> : null
                                        }{
                                            activity.type === "Document" ? "Document" :
                                            activity.type === "Inclass Notes" ? "Inclass Notes" :
                                            activity.type === "Textbook Explainer" ? "Textbook Explainer" :
                                            activity.type === "TTS with Subtitles" ? "TTS with Subtitles" :
                                            activity.type === "Image Generation" ? "Image Generation" :
                                            activity.type === "Chat with AI" ? "Chat with AI" : null
                                        }</div>
                                <div className={`flex px-7 w-[30%] font-bold ${activity.type === "Document" ? "text-[#3366FF]": 
                                    activity.type === "Inclass Notes" ? "text-[#5A83B8]" :  
                                    activity.type === "Textbook Explainer" ? "text-[#6A5ACD]" :
                                    activity.type === "TTS with Subtitles" ? "text-[#4A60DE]" :
                                    activity.type === "Image Generation" ? "text-[#8AD3CC]" :
                                    activity.type === "Chat with AI" ? "text-[#7796C7]" : ""
                                }`}>{activity.title}</div>
                                <div className="flex px-4 w-[12.5%]">
                                    <span className={`px-3 ${activity.status == "Completed" ? "bg-[#22C55E]/[20%] text-[#4ADE80] rounded-2xl" : 
                                        activity.status == "Processing" ? "bg-[#FBBF24]/[20%] text-[#F59E0B] rounded-2xl" : 
                                        activity.status == "Failed" ? "bg-[#EF4444]/[20%] text-[#DC2626] rounded-2xl" : ""  
                                    }`}>
                                        {activity.status}
                                    </span>
                                </div>
                                <div className='flex px-7 w-[20%]'>{activity.date}</div>
                                <div className='flex px-7 w-[18.5%] justify-center text-[#00CED1] hover:underline'><EyeIcon className='size-6 text-[#00CED1]'/> View More</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="status-bar w-[20%] h-full bg-[#000000]/[0.3] flex flex-col px-5 py-3">
                <div className='text-[#00BFFF] text-2xl font-bold'>System Status</div>
                <div className='api-status-card rounded-lg flex h-[20%] my-6 pb-2 bg-[#20232F]/[64%] '>
                    <div className='flex flex-col space-y-2 mx-4 h-max my-auto w-full'>
                        <h1 className='text-xl font-extrabold my-2  w-full'>API Status</h1>
                        {dummyStatusData.map((api, index) => (
                          <div key={index} className="text-white/[70%] w-full flex justify-between items-center">
                            <div className="flex-grow">{api.api}</div>
                            <div className={`text-sm ${
                              api.status === "Connected" ? "text-[#4ADE80]" :
                              api.status === "Failed" ? "text-[#EF4444]" :
                              api.status === "Processing" ? "text-[#FACC15]" :
                              "text-white/[50%]"
                            }`}>
                              ● {api.status}
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
                <div className='monthly-usage-card flex h-[30%] bg-[#20232F]/[64%] rounded-lg'>
                    <div className='flex flex-col space-y-2 mx-4 h-max my-auto w-full'>
                        <h1 className='text-xl font-extrabold  w-full'>Monthly Usage</h1>
                        {monthlyUsageData.map((api, index) => (
                          <div key={index} className="text-white/[70%] w-full flex flex-col justify-between items-center">
                            <div className='flex flex-row w-full pb-0.5 pr-2 text-sm'> 
                                <div className="flex-grow">{api.type}</div>
                                <div className='flex'>{api.totalUsage}/<span className={`text-[${api.color}]`}>∞</span></div>
                            </div>
                            <div className={`text-sm w-full`}>
                                <ProgressBar 
                                    completed={parseInt(api.totalUsage)} 
                                    maxCompleted={parseInt(api.totalUsage)} 
                                    bgColor={api.color} 
                                    baseBgColor="#1E293B" 
                                    height="0.39em" 
                                    width="100%" 
                                    labelAlignment="outside" 
                                    labelSize="0px"
                                />
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
                <div className='monthly-token-usage-card flex h-[30%]  my-6 bg-[#20232F]/[64%] rounded-lg'>
                        <div className='flex flex-col space-y-2 mx-4 h-max my-auto w-full'>
                        <h1 className='text-xl font-extrabold  w-full'>Monthly Token Usage</h1>
                        {monthlyTokenUsageData.map((api, index) => (
                          <div key={index} className="text-white/[70%] w-full flex flex-col justify-between items-center">
                            <div className='flex flex-row w-full pb-0.5 pr-2 text-sm'> 
                                <div className="flex-grow">{api.type}</div>
                                <div className='flex'>{api.totalTokenUsage}/<span className={`text-[${api.color}]`}>∞</span></div>
                            </div>
                            <div className={`text-sm w-full`}>
                                <ProgressBar 
                                    completed={parseInt(api.totalTokenUsage)} 
                                    maxCompleted={parseInt(api.totalTokenUsage)} 
                                    bgColor={api.color} 
                                    baseBgColor="#1E293B" 
                                    height="0.39em" 
                                    width="100%" 
                                    labelAlignment="outside" 
                                    labelSize="0px"
                                />
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}