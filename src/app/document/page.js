'use client';
import React, { useState, useEffect } from "react";
import { InformationCircleIcon, BoltIcon, DocumentDuplicateIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

const rightPanelVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
}

// --- MODAL COMPONENTS ---
const LoadingModal = ({ message, isOpen }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0b101c] border border-cyan-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 mx-auto mb-6 border-4 border-t-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
                    <h3 className="text-xl font-bold text-slate-200 mb-2">Processing Data</h3>
                    <p className="text-cyan-400/80 font-mono text-sm">{message}</p>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const AlertModal = ({ isOpen, onClose, title, message }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-[#0b101c] border border-rose-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(225,29,72,0.15)] text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-rose-950/30 border border-rose-500/30 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(225,29,72,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-rose-400 mb-2">{title}</h3>
                    <p className="text-slate-400 mb-6">{message}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-6 py-2 bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 rounded-lg text-rose-200 font-medium transition-colors shadow-[0_0_10px_rgba(225,29,72,0.2)]">Close</motion.button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const SuccessModal = ({ isOpen, onClose, title, message }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-[#0b101c] border border-emerald-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(16,185,129,0.15)] text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-950/30 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                         <DocumentDuplicateIcon className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-emerald-400 mb-2">{title}</h3>
                    <p className="text-slate-400 mb-6">{message}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-6 py-2 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500/50 rounded-lg text-emerald-200 font-medium transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]">Close</motion.button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);


export default function Document() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [inputText, setInputText] = useState("");
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [promptTemplate, setPromptTemplate] = useState(0);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingDocumentId, setPollingDocumentId] = useState(null);
    
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });
    const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });
    const showSuccess = (title, message) => setSuccessModal({ isOpen: true, title, message });
    const closeSuccess = () => setSuccessModal({ isOpen: false, title: '', message: '' });

    const handleCopyInputText = async () => {
        if (!inputText) {
            showAlert("Empty Input", "There is nothing to copy!");
            return;
        }
        try {
            await navigator.clipboard.writeText(inputText);
            showSuccess("Copied!", "Input prompt copied to clipboard.");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showAlert("Copy Failed", "Could not copy text to clipboard.");
        }
    };

    const handleInputChange = (e) => {
        const text = e.target.value;
        setInputText(text);
        setWordCount(text ? text.trim().split(/\s+/).filter(Boolean).length : 0);
        setCharCount(text.length);
    };

    const handleGenerateDocument = async (e) => {
        e.preventDefault();
        if (!name || !inputText) {
            showAlert("Missing Information", "Please enter a document title and input text.");
            return;
        }
        setLoadingMessage("Starting document generation...");
        setLoading(true);
        try {
            const response = await fetch('/api/document/start-generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    user_prompt: inputText,
                    format_type: ['research_paper', 'business_proposal', 'cover_letter', 'formal_report', 'general_essay'][promptTemplate],
                }),
            });
            if (response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Unknown error occurred.');
            }
            const data = await response.json();
            setPollingDocumentId(data.documentId);
            setLoadingMessage("Generating document, please wait...");
        } catch (error) {
            showAlert("Generation Error", error.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pollingDocumentId) return;
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/document/status?id=${pollingDocumentId}`, { credentials: 'include' });
                if (!response.ok) throw new Error('Could not get job status.');
                const data = await response.json();
                if (data.status === 'COMPLETED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    router.push(`/document/${pollingDocumentId}`);
                } else if (data.status === 'FAILED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    showAlert("Generation Failed", data.errorMessage || 'An unknown error occurred.');
                    setPollingDocumentId(null);
                }
            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                showAlert('Status Check Error', 'An error occurred while checking the document status.');
                setPollingDocumentId(null);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [pollingDocumentId, router]);

    const promptTemplates = [
        { title: "Research Paper", description: "Academic format with citations" },
        { title: "Business Proposal", description: "Professional format with executive summary" },
        { title: "Cover Letter", description: "Professional job application" },
        { title: "Formal Report", description: "Structured findings with clear sections" },
        { title: "General Essay", description: "Informative or opinionated writing" },
    ];

    return (
        <AnimatePresence mode="wait">
        <motion.div 
            className="flex h-full w-full justify-center items-center bg-black font-sans text-slate-200" 
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
        >
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />
            <SuccessModal isOpen={successModal.isOpen} title={successModal.title} message={successModal.message} onClose={closeSuccess} />

            {/* --- LEFT PANEL (Settings) --- */}
            <motion.div className="flex flex-col w-[21.5%] h-full border-r border-cyan-900/30 p-4 bg-[#0b1221]/80 backdrop-blur-sm" variants={containerVariants}>
                <motion.div variants={itemVariants} className="text-xl text-cyan-400 font-extrabold w-max pb-7 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] flex items-center">
                    <BoltIcon className="w-6 h-6 mr-2" />
                    Document Settings
                </motion.div>
                
                <motion.h2 variants={itemVariants} className="w-max text-sm text-slate-400 font-semibold uppercase tracking-wider">Document Title</motion.h2>
                <motion.input 
                    variants={itemVariants} 
                    onChange={(e) => setName(e.target.value)} 
                    type="text" 
                    className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] mt-3 mb-7 py-2 px-3 text-sm transition-all" 
                    placeholder="Enter document title" 
                />
                
                <motion.h2 variants={itemVariants} className="w-max text-sm text-slate-400 font-semibold uppercase tracking-wider">Prompt Template</motion.h2>
                {promptTemplates.map((template, index) => (
                    <motion.button
                        key={index}
                        variants={itemVariants}
                        onClick={() => setPromptTemplate(index)}
                        className={`w-full cursor-pointer border ${promptTemplate === index ? 'border-cyan-500/50' : 'border-slate-800'} text-start rounded-lg mt-3 mb-1 py-4 px-3 text-sm relative overflow-hidden group transition-colors`}
                        whileHover={{ scale: 1.03, y: -2 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {promptTemplate === index && (
                            <motion.div layoutId="template-highlight" className="absolute inset-0 bg-cyan-900/20 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" />
                        )}
                        <div className="relative z-10 group-hover:pl-1 transition-all">
                            <h3 className={`text-sm font-bold ${promptTemplate === index ? 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'text-slate-300 group-hover:text-cyan-200'}`}>{template.title}</h3>
                            <span className="text-xs text-slate-500 group-hover:text-slate-400">{template.description}</span>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            {/* --- MIDDLE PANEL (Input) --- */}
            <motion.div className="flex flex-col w-[39.5%] h-full border-r border-cyan-900/30 bg-[#020617]/50" variants={rightPanelVariants}>
                <div className="flex w-full h-[8%] border-b border-cyan-900/30 items-center px-3 bg-[#0f172a]/40">
                    <h1 className="font-semibold font-stretch-normal text-slate-200">Input Prompt</h1>
                    <span className="bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-xs rounded-full py-0.5 px-2 ml-2 shadow-[0_0_5px_rgba(6,182,212,0.2)]">Gemini 2.5 Pro</span>
                </div>
                <div className="flex flex-col w-full h-[92%] py-3">
                    <div className="alert-box cursor-none mx-3 flex h-[6%] border border-cyan-500/20 bg-cyan-950/10 rounded-md mb-3 justify-start items-center p-3 shadow-[inset_0_0_10px_rgba(6,182,212,0.05)]">
                        <InformationCircleIcon className="w-5 h-5 text-cyan-400 inline-block mr-2" />
                        <span className="text-cyan-200/70 text-sm">Be specific with your prompts for better results!</span>
                    </div>
                    
                    <textarea 
                        className="mx-3 h-max min-h-[40%] max-h-[70%] bg-[#0b101c]/80 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] px-4 py-3 text-sm font-mono placeholder-slate-600 custom-scrollbar" 
                        placeholder="Enter your prompt here..." 
                        onChange={handleInputChange} 
                        value={inputText} 
                    />
                    
                    <div className="flex mx-3 flex-col justify-between items-end mt-3 font-mono">
                        <span className="text-slate-500 text-xs">Word Count: <span className={`${wordCount > 0 ? 'text-cyan-400 font-bold' : ''}`}>{wordCount}</span></span>
                        <span className="text-slate-500 text-xs">Character Count: <span className={`${wordCount > 0 ? 'text-cyan-400 font-bold' : ''}`}>{charCount}</span></span>
                    </div>
                    
                    <div className="flex mt-auto border-t border-cyan-900/30 justify-evenly pt-3 px-3 space-x-2 bg-gradient-to-t from-[#020617] to-transparent">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyInputText} className="cursor-pointer text-sm w-[23%] flex items-center justify-center border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-cyan-400 hover:text-cyan-400 transition-all rounded-md px-2 py-2 group">
                            <DocumentDuplicateIcon className="w-4 h-4 mr-1 text-slate-400 group-hover:text-cyan-400" /><span className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400">Copy</span>
                        </motion.button>
                        
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setInputText(""); setWordCount(0); setCharCount(0); }} className="cursor-pointer text-sm w-[23%] flex items-center justify-center border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-rose-400 hover:text-rose-400 transition-all rounded-md px-2 py-2 group">
                            <TrashIcon className="w-4 h-4 mr-1 text-slate-400 group-hover:text-rose-400" /><span className="text-xs font-semibold text-slate-300 group-hover:text-rose-400">Clear</span>
                        </motion.button>
                        
                        <motion.button 
                            whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(6, 182, 212, 0.4)" }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleGenerateDocument} 
                            className="cursor-pointer bg-cyan-600 w-[60%] text-white rounded-md px-4 py-2 hover:bg-cyan-500 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/50"
                        >
                            <BoltIcon className="w-4 h-4 inline-block mr-2 animate-pulse" />
                            <span className="text-sm font-bold tracking-wide">Generate Document</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* --- RIGHT PANEL (Placeholder) --- */}
            <motion.div className="flex flex-col w-[39.5%] h-full bg-[#02040a]" variants={rightPanelVariants}>
                <div className="w-full h-full bg-[#02040a] flex flex-col relative overflow-hidden">
                     {/* Decorative ambient glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="h-[8%] border-b w-full border-cyan-900/30 bg-[#0f172a]/40 z-10">
                        <h1 className="text-xl text-slate-200 font-semibold w-max p-3 flex items-center">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2 shadow-[0_0_5px_cyan]"></span>
                            Generated Document
                        </h1>
                    </div>
                    <div className="flex flex-col flex-grow justify-center items-center text-center z-10">
                        <div className="w-24 h-24 rounded-full bg-slate-800/30 border border-slate-700 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                            <DocumentTextIcon className="w-12 h-12 text-slate-600" />
                        </div>
                        <h1 className="mb-2 text-slate-400 font-bold text-lg">No document generated yet!</h1>
                        <span className="text-slate-600 text-xs font-mono border border-slate-800 rounded-full px-3 py-1 bg-slate-900/50">Status: Idle</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    )
}