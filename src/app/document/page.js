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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#141B3C] border border-[#00BFFF]/30 rounded-xl p-8 max-w-sm mx-4 shadow-2xl text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 mx-auto mb-6 border-4 border-t-4 border-[#00BFFF] border-t-transparent rounded-full" />
                    <h3 className="text-xl font-semibold text-white/90 mb-2">Processing...</h3>
                    <p className="text-white/70">{message}</p>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const AlertModal = ({ isOpen, onClose, title, message }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-[#141B3C] border border-red-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h3 className="text-xl font-semibold text-red-400 mb-2">{title}</h3>
                    <p className="text-white/80 mb-6">{message}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors">Close</motion.button>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const SuccessModal = ({ isOpen, onClose, title, message }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="bg-[#141B3C] border border-[#00BFFF]/30 rounded-xl p-8 max-w-sm mx-4 shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[#00BFFF]/10 rounded-full flex items-center justify-center">
                         <DocumentDuplicateIcon className="h-8 w-8 text-[#00BFFF]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#00BFFF] mb-2">{title}</h3>
                    <p className="text-white/80 mb-6">{message}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-6 py-2 bg-[#00BFFF] hover:bg-[#0099CC] rounded-lg text-white font-medium transition-colors">Close</motion.button>
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
        <motion.div className="flex h-full w-full justify-center items-center bg-gradient-to-r from-[#000120] to-[#18214E]" variants={containerVariants} initial="hidden" animate="visible">
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />
            <SuccessModal isOpen={successModal.isOpen} title={successModal.title} message={successModal.message} onClose={closeSuccess} />

            <motion.div className="flex flex-col w-[21.5%] h-full border-r-[1px] border-white/[25%] p-4 bg-[#141B3C]/[64%]" variants={containerVariants}>
                <motion.h1 variants={itemVariants} className="text-xl text-[#00BFFF] font-bold w-max pb-7">Document Settings</motion.h1>
                <motion.h2 variants={itemVariants} className="w-max text-sm">Document Title</motion.h2>
                <motion.input variants={itemVariants} onChange={(e) => setName(e.target.value)} type="text" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] mt-3 mb-7 py-2 px-3 text-sm" placeholder="Enter document title" />
                <motion.h2 variants={itemVariants} className="w-max text-sm">Prompt Template</motion.h2>
                {promptTemplates.map((template, index) => (
                    <motion.button
                        key={index}
                        variants={itemVariants}
                        onClick={() => setPromptTemplate(index)}
                        className={`w-full cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm relative overflow-hidden`}
                        whileHover={{ scale: 1.03, y: -2 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        {promptTemplate === index && (
                            <motion.div layoutId="template-highlight" className="absolute inset-0 bg-[#3366FF]/30 border-l-4 border-[#00BFFF]" />
                        )}
                        <div className="relative z-10">
                            <h3 className={`text-sm font-bold ${promptTemplate === index ? 'text-[#00BFFF]' : ''}`}>{template.title}</h3>
                            <span className="text-xs text-white/50">{template.description}</span>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            <motion.div className="flex flex-col w-[39.5%] h-full border-r-[1px] border-white/[25%] bg-black/10" variants={rightPanelVariants}>
                <div className="flex w-full h-[8%] border-b border-white/[25%] items-center px-3">
                    <h1 className="font-semibold font-stretch-normal">Input Prompt</h1>
                    <span className="bg-[#3366FF]/[20%] text-[#00BFFF] text-xs rounded-full py-0.5 px-2 ml-2">Gemini</span>
                </div>
                <div className="flex flex-col w-full h-[92%] py-3">
                    <div className="alert-box cursor-none mx-3 flex h-[6%] border-[1px] border-white/[25%] bg-black/20 rounded-md mb-3 justify-start items-center p-3">
                        <InformationCircleIcon className="w-5 h-5 text-white/[70%] inline-block mr-2" />
                        <span className="text-white/[50%] text-sm">Be specific with your prompts for better results!</span>
                    </div>
                    <textarea className="mx-3 h-max min-h-[40%] max-h-[70%] bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] px-4 py-3 text-sm" placeholder="Enter your prompt here..." onChange={handleInputChange} value={inputText} />
                    <div className="flex mx-3 flex-col justify-between items-end mt-3">
                        <span className="text-white/[70%] text-xs">Word Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{wordCount}</span></span>
                        <span className="text-white/[70%] text-xs">Character Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{charCount}</span></span>
                    </div>
                    <div className="flex mt-auto border-t border-white/[25%] justify-evenly pt-3 px-3 space-x-2">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyInputText} className="cursor-pointer text-sm w-[23%] flex items-center justify-center border-r border-white/[25%] bg-[#00CED1]/[80%] hover:bg-[#00CED1]/[60%] transition-colors rounded-md px-2 py-2">
                            <DocumentDuplicateIcon className="w-4 h-4 mr-1" /><span className="text-xs font-semibold text-white/[70%]">Copy</span>
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setInputText(""); setWordCount(0); setCharCount(0); }} className="cursor-pointer text-sm w-[23%] flex items-center justify-center bg-red-500/[70%] hover:bg-red-500/[60%] transition-colors rounded-md px-2 py-2">
                            <TrashIcon className="w-4 h-4 mr-1" /><span className="text-xs font-semibold text-white/[70%]">Clear</span>
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 5px 15px rgba(0, 191, 255, 0.4)" }} whileTap={{ scale: 0.95 }} onClick={handleGenerateDocument} className="cursor-pointer bg-[#00BFFF] w-[60%] text-black rounded-md px-4 py-2 hover:bg-[#0099CC] transition-colors">
                            <BoltIcon className="w-4 h-4 inline-block mr-2" />
                            <span className="text-sm font-semibold">Generate Document</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            <motion.div className="flex flex-col w-[39.5%] h-full bg-[#1F2687]/[37%]" variants={rightPanelVariants}>
                <div className="w-full h-full bg-[#000831] flex flex-col">
                    <div className="h-[8%] border-b w-full border-white/[25%] bg-black/20">
                        <h1 className="text-xl text-[#00BFFF] font-semibold w-max p-3">Generated Document</h1>
                    </div>
                    <div className="flex flex-col flex-grow justify-center items-center text-center">
                        <DocumentTextIcon className="w-12 h-12 text-white/[50%] mb-3" />
                        <h1 className="mb-3 text-white/[50%]">No document generated yet!</h1>
                        <span className="text-white/[50%] text-xs">Once you generate a document, it will appear here...</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    )
}
