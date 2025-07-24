'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    UserCircleIcon,
    KeyIcon,
    ChartBarIcon,
    DocumentTextIcon,
    CpuChipIcon,
    ShieldExclamationIcon,
    TrashIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/solid';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);


/**
 * Reusable Confirmation Modal for Destructive Actions
 */
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        // Backdrop
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity">
            {/* Modal Panel */}
            <div className="bg-[#141B3C] rounded-2xl shadow-xl w-full max-w-md m-4 p-8 text-white transform transition-all animate-fade-in-up">
                <div className="flex flex-col items-center text-center">
                    <div className="p-3 rounded-full bg-red-500/10 mb-4">
                        <ShieldExclamationIcon className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Delete Account Confirmation</h2>
                    <p className="text-white/70 mb-6 text-sm">
                        Are you absolutely sure? All data will be permanently erased.
                        <strong className="block text-red-400 mt-2">This action is irreversible.</strong>
                    </p>
                    <div className="flex justify-center gap-4 w-full ">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-bold"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            {/* Simple fade-in-up animation */}
            <style jsx>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};


export default function Setting() {
    const router = useRouter();

    // State to manage the delete confirmation modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [name, setName] = useState("Jane Eidolon");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const usageData = {
        documentsCreated: 78,
        wordsGenerated: 156000,
    };

    // This function will be called when the user confirms deletion in the modal.
    const handleDeleteAccount = () => {
        console.log("Account deletion confirmed. Implement API call here.");
        // Close the modal after action
        setIsDeleteModalOpen(false);
        // Here you would typically redirect the user after successful deletion
        // For example: router.push('/logout');
    };


    return (
        <main className="flex w-full min-h-screen justify-center bg-gradient-to-r from-[#000120] to-[#18214E] text-white p-4 sm:p-6 lg:p-8">

            {/* Render the modal */}
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
            />

            <div className="w-full max-w-7xl mx-auto">
                <div className="flex items-center mb-8">
                    <button
                        onClick={() => router.back()}
                        aria-label="Go back to previous page"
                        className="p-2 mr-4 rounded-full bg-white/[8%] hover:bg-white/[15%] transition-colors duration-200"
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-[#00BFFF]" />
                    </button>
                    <h1 className="text-3xl font-bold text-[#00BFFF]">Settings</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-3 space-y-8 grid lg:grid-cols-2 gap-8 h-max">
                        <section className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full">
                            <h2 className="text-xl font-semibold mb-6 flex items-center"><UserCircleIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> Profile Details</h2>
                            {/* ... Profile inputs ... */}
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-white/80 mb-2">Full Name</label>
                                    <input type="text" id="fullName" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="Enter your full name" />
                                </div>
                                <h2 className="text-lg font-semibold mb-6 flex items-center pt-4"><KeyIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> Change Password</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="currentPassword" className="block text-sm font-medium text-white/80 mb-2">Current Password</label>
                                        <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                    </div>
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-white/80 mb-2">New Password</label>
                                        <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">Confirm New Password</label>
                                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button className="bg-[#00BFFF] hover:bg-[#0099CC] transition-colors text-white font-bold py-2 px-6 rounded-md text-sm">Update Password</button>
                                </div>
                            </div>
                        </section>

                        <section className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full">
                            <h2 className="text-lg font-semibold mb-6 flex items-center"><KeyIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> API Keys</h2>
                             {/* ... API Key inputs ... */}
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="gemini_api_key" className="block text-sm font-medium text-white/80 mb-2">GEMINI API KEY <span className='text-red-500 font-bold'>*</span></label>
                                    <input type="password" id="gemini_api_key" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label htmlFor="ideogram_api_key" className="block text-sm font-medium text-white/80 mb-2">IDEOGRAM API <span className='text-red-500 font-bold'>*</span></label>
                                    <input type="password" id="ideogram_api_key" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label htmlFor="murf_api_key" className="block text-sm font-medium text-white/80 mb-2">MURF API <span className='text-red-500 font-bold'>*</span></label>
                                    <input type="password" id="murf_api_key" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm" placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button className="bg-[#00BFFF] hover:bg-[#0099CC] transition-colors text-white font-bold py-2 px-6 rounded-md text-sm">Update API Keys</button>
                            </div>
                            
                            <section className="bg-[#4C132A]/[40%] border border-red-500/50 rounded-2xl p-6 shadow-xl lg:col-span-2 mt-6">
                                <h2 className="text-xl font-semibold mb-4 flex items-center text-red-400"><ShieldExclamationIcon className="w-6 h-6 mr-3" /> Danger Zone</h2>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="font-bold">Delete Account</h3>
                                        <p className="text-sm text-white/60 max-w-lg">Once you delete your account, all of your data will be permanently removed. This action cannot be undone.</p>
                                    </div>
                                    {/* MODIFIED: This button now opens the modal */}
                                    <button
                                        onClick={() => setIsDeleteModalOpen(true)}
                                        className="flex items-center justify-center mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 bg-red-600/80 hover:bg-red-600 transition-colors text-white font-bold py-2 px-4 rounded-md text-sm"
                                    >
                                        <TrashIcon className="w-4 h-4 mr-2" />
                                        Delete My Account
                                    </button>
                                </div>
                            </section>
                        </section>
                    </div>

                    <h1 className="text-3xl font-bold text-[#00BFFF] my-8 lg:col-span-3">Usage</h1>

                    <aside className="lg:col-span-3 grid lg:grid-cols-3 gap-8">
                        {['Document Generator', 'Textbook Explainer', 'Inclass Note Taker', 'Text-to-speech', 'Image Generator', 'Chatbot'].map((service) => (
                             <section key={service} className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full">
                                <h2 className="text-xl font-semibold mb-6 flex items-center"><ChartBarIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> {service} Usage</h2>
                                {/* ... Usage card content ... */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="bg-black/20 p-4 rounded-lg">
                                            <DocumentTextIcon className="w-8 h-8 mx-auto text-[#00BFFF]/80 mb-2" />
                                            <p className="text-2xl font-bold">{usageData.documentsCreated}</p>
                                            <p className="text-xs text-white/60">Jobs Created</p>
                                        </div>
                                        <div className="bg-black/20 p-4 rounded-lg">
                                            <CpuChipIcon className="w-8 h-8 mx-auto text-[#00BFFF]/80 mb-2" />
                                            <p className="text-2xl font-bold">{usageData.wordsGenerated.toLocaleString()}</p>
                                            <p className="text-xs text-white/60">Tokens Generated</p>
                                        </div>
                                    </div>
                                    <div>
                                        <Line data={{labels:['Mon','Tues','Wed','Thurs','Fri','Sat','Sun'],datasets:[{label:'Tokens Used',data:[100000,600000,300000,400000,100000,200000,400000].map(d=>d*Math.random()),borderColor:'#00BFFF',backgroundColor:'rgba(0, 191, 255, 0.2)',tension:0.3,fill:true}]}} options={{responsive:true,plugins:{legend:{display:false},title:{display:true,text:'Usage This Week',color:'#FFFFFF',position:'bottom'}},scales:{y:{ticks:{color:'rgba(255,255,255,0.7)'}},x:{ticks:{color:'rgba(255,255,255,0.7)'}}}}}/>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </aside>
                </div>
            </div>
        </main>
    );
}