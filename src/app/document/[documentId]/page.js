'use client';
import React, { useState, useEffect, useRef } from "react";
import { InformationCircleIcon, BoltIcon, DocumentDuplicateIcon, TrashIcon, DocumentTextIcon, DocumentArrowDownIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from "@/app/timeHelper";
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};
const rightPanelVariants = {
    hidden: { x: 20, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

// --- MODAL COMPONENTS ---
const LoadingModal = ({ message, isOpen }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0b101c] border border-cyan-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 mx-auto mb-6 border-4 border-t-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
                    <h3 className="text-xl font-bold text-slate-200 mb-2">Processing</h3>
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

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-[#0b101c] border border-rose-500/30 rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.15)] w-full max-w-md m-4 p-8 text-slate-200">
                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 rounded-full bg-rose-950/30 border border-rose-500/30 mb-4 shadow-[0_0_10px_rgba(225,29,72,0.2)]"><TrashIcon className="w-12 h-12 text-rose-500" /></div>
                        <h2 className="text-xl font-bold mb-2 text-rose-400">Delete Document</h2>
                        <p className="text-slate-400 mb-6 text-sm">Are you sure you want to permanently delete this document? <strong className="block text-rose-500 mt-2 font-mono tracking-wide">This action is irreversible.</strong></p>
                        <div className="flex justify-center gap-4 w-full">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full py-2.5 px-4 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors font-semibold text-slate-300">Cancel</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="w-full py-2.5 px-4 rounded-md bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 transition-colors font-bold text-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.2)]">Delete</motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

const SaveStatusModal = ({ status }) => (
    <AnimatePresence>
        {status !== 'idle' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#0b101c]/90 p-8 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center border border-cyan-500/30 min-w-[250px]">
                    {status === 'saving' && (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-t-4 border-b-4 border-cyan-500 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"></motion.div><p className="text-cyan-400 text-xl mt-5 font-bold tracking-wide">Saving...</p><p className="text-slate-400 text-sm mt-1 font-mono">Synchronizing data</p></>)}
                    {status === 'success' && (<><motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}><svg className="w-20 h-20 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><motion.path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} /></svg></motion.div><p className="text-emerald-400 text-xl mt-5 font-bold tracking-wide">Saved!</p></>)}
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);

export default function Document() {
    const [name, setName] = useState("");
    const [inputText, setInputText] = useState("");
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [promptTemplate, setPromptTemplate] = useState(0);
    const [documentText, setDocumentText] = useState("");
    const [timeCreated, setTimeCreated] = useState("");
    const [creationTimestamp, setCreationTimestamp] = useState("");

    const params = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingDocumentId, setPollingDocumentId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState('idle');
    
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
            showSuccess("Copied!", "Input prompt copied to clipboard!");
        } catch (err) {
            console.error('Failed to copy text: ', err);
            showAlert("Copy Failed", "Failed to copy text.");
        }
    };

    const handleInputChange = (e) => {
        const inputText = e.target.value;
        const wordCount = wordCounter(inputText);
        const charCount = charCounter(inputText);
        setInputText(inputText);
        setWordCount(wordCount);
        setCharCount(charCount);

        console.log("Input text changed:", inputText);
    };

    function wordCounter(text) {
        if (!text) return 0;
        const words = text.trim().split(/\s+/);
        return words.filter(word => word.length > 0).length;
    }
    function charCounter(text) {
        if (!text) return 0;
        return text.length;
    }

    const handleSaveText = async () => {
        if (!documentText) {
            showAlert("No Content", "There is no content to save.");
            return;
        }

        setSaveStatus('saving');
        try {
            const response = await fetch('/api/document/edit/textMd', {
                method: 'POST',
                body: JSON.stringify({
                    textMd: documentText,
                    documentId: params.documentId,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                showAlert("Save Failed", `Error saving document: ${errorData.error || 'Unknown error'}`);
                return;
            }
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (error) {
            console.error("Error saving document:", error);
            showAlert("Save Failed", "Failed to save document. Please try again later.");
            setSaveStatus('idle');

        }
    };

    const handleDeleteDocument = async (e) => {
        e.preventDefault();
        setIsDeleteModalOpen(false); // Close modal before processing
        try {
            const response = await fetch(`/api/document/delete?id=${params.documentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.status === 200) {
                router.push('/document/');
            }
            else {
                const errorData = await response.json();
                showAlert("Deletion Failed", `Error deleting document: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            showAlert("Deletion Failed", "Failed to delete document. Please try again later.");
        }
    }

    const handleRegenerateDocument = async (e) => {
        e.preventDefault();

        if (!name || !inputText) {
            showAlert("Missing Information", "Please enter a document title and input text.");
            return;
        }
        setLoadingMessage("Starting document generation...");
        setLoading(true);

        try {
            const response = await fetch('/api/document/edit/re-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    user_prompt: inputText,
                    format_type: promptTemplate === 0 ? 'research_paper' :
                        promptTemplate === 1 ? 'business_proposal' :
                            promptTemplate === 2 ? 'cover_letter' :
                                promptTemplate === 3 ? 'formal_report' :
                                    promptTemplate === 4 ? 'general_essay' : 'research_paper',
                    documentId: params.documentId,
                }),
            });
            if (response.status !== 200) {
                const errorData = await response.json();
                showAlert("Regeneration Failed", `Error generating document: ${errorData.error || 'Unknown error'}`);
                setLoading(false); // Stop loading on failure
                return;
            }
            const data = await response.json();
            setPollingDocumentId(data.documentId);
            setLoadingMessage("Generating document...");
        } catch (error) {
            console.log("Error starting document generation:", error);
            showAlert("Regeneration Error", "An unexpected error occurred.");
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!documentText) {
            showAlert("No Content", "No document generated yet to download.");
            return;
        }

        setLoading(true);
        setLoadingMessage("Preparing PDF download...");

        try {
            const response = await fetch('/api/document/downloadDocument', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mdText: documentText,
                    fileName: name || 'document',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to download PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const sanitizedFileName = (name || 'document').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
            a.download = `${sanitizedFileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            showAlert("Download Failed", `Failed to download PDF: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchDocument = async () => {
            setLoading(true);
            setLoadingMessage("Loading document settings...");
            try {
                if (!params.documentId || params.documentId === 'undefined' || params.documentId === 'null') {
                    router.push('/document/');
                    return;
                }
                const response = await fetch(`/api/document/getDocumentDetails?document_id=${params.documentId}`, { method: 'GET', credentials: 'include' });
                if (response.status != 200) {
                    router.push('/document/');
                    return;
                }
                const data = await response.json();
                setInputText(data.user_prompt || "");
                setDocumentText(data.files.documentFile.content || "");
                setName(data.name || "");
                setPromptTemplate(data.format_type === 'research_paper' ? 0 : data.format_type === 'business_proposal' ? 1 : data.format_type === 'cover_letter' ? 2 : data.format_type === 'formal_report' ? 3 : data.format_type === 'general_essay' ? 4 : 0);
                setWordCount(wordCounter(data.user_prompt || ""));
                setCharCount(charCounter(data.user_prompt || ""));
                setCreationTimestamp(data.created_at || "");
            } catch (error) {
                console.error("Error fetching document details:", error);
                showAlert("Loading Error", "Could not load document details.");
            } finally {
                setLoading(false);
            }
        };
        fetchDocument();
    }, [params.documentId]);

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
                    window.location.reload();
                } else if (data.status === 'FAILED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    showAlert("Generation Failed", `Document generation failed: ${data.errorMessage || 'An unknown error occurred.'}`);
                    setPollingDocumentId(null);
                }
            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                showAlert("Status Check Error", 'An error occurred while checking the Document status.');
                setPollingDocumentId(null);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [pollingDocumentId]);

    useEffect(() => {
        if (!creationTimestamp) return;
        setTimeCreated(formatTimeAgo(creationTimestamp));
        const intervalId = setInterval(() => setTimeCreated(formatTimeAgo(creationTimestamp)), 1000);
        return () => clearInterval(intervalId);
    }, [creationTimestamp]);

    const promptTemplates = [
        { title: "Research Paper", description: "Academic format with citations" },
        { title: "Business Proposal", description: "Professional format with executive summary" },
        { title: "Cover Letter", description: "Professional job application" },
        { title: "Formal Report", description: "Structured findings with clear sections" },
        { title: "General Essay", description: "Informative or opinionated writing" },
    ];

    return (
        <motion.div 
            className="flex h-full w-full justify-center items-center bg-black font-sans text-slate-200" 
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
        >
            <SaveStatusModal status={saveStatus} />
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />
            <SuccessModal isOpen={successModal.isOpen} title={successModal.title} message={successModal.message} onClose={closeSuccess} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteDocument} />

            {/* --- LEFT PANEL (Settings) --- */}
            <motion.div className="flex flex-col w-[21.5%] h-full border-r border-cyan-900/30 p-4 bg-[#0b1221]/80 backdrop-blur-sm" variants={containerVariants}>
                <motion.h1 variants={itemVariants} className="text-xl text-cyan-400 font-extrabold w-max pb-7 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] flex items-center">
                    <BoltIcon className="w-6 h-6 mr-2" />
                    Document Settings
                </motion.h1>
                <motion.h2 variants={itemVariants} className="w-max text-sm text-slate-400 font-semibold uppercase tracking-wider">Document Title</motion.h2>
                <motion.input 
                    variants={itemVariants} 
                    onChange={(e) => setName(e.target.value)} 
                    type="text" 
                    className="w-full bg-[#0f172a]/60 border border-slate-700 rounded-md text-white focus:outline-none focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(6,182,212,0.3)] mt-3 mb-7 py-2 px-3 text-sm transition-all" 
                    placeholder="Enter document title" 
                    value={name} 
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
                        {promptTemplate === index && (<motion.div layoutId="template-highlight" className="absolute inset-0 bg-cyan-900/20 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]" />)}
                        <div className="relative z-10 group-hover:pl-1 transition-all">
                            <h3 className={`text-sm font-bold ${promptTemplate === index ? 'text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]' : 'text-slate-300 group-hover:text-cyan-200'}`}>{template.title}</h3>
                            <span className="text-xs text-slate-500 group-hover:text-slate-400">{template.description}</span>
                        </div>
                    </motion.button>
                ))}
            </motion.div>

            {/* --- MIDDLE PANEL (Input) --- */}
            <motion.div className="flex flex-col w-[37.5%] h-full border-r border-cyan-900/30 bg-[#020617]/50 pb-3" variants={rightPanelVariants}>
                <div className="flex w-full h-[8%] border-b border-cyan-900/30 items-center px-3 bg-[#0f172a]/40">
                    <h1 className="font-semibold font-stretch-normal text-slate-200">Input Prompt</h1>
                    <span className="bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-xs rounded-full py-0.5 px-2 ml-2 shadow-[0_0_5px_rgba(6,182,212,0.2)]">Gemini</span>
                </div>
                <div className="flex flex-col w-full h-[82%] py-3">
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
                </div>
                <div className="flex mt-auto border-t border-cyan-900/30 justify-evenly pt-3 px-3 space-x-2 h-[7%] bg-gradient-to-t from-[#020617] to-transparent">
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyInputText} className="cursor-pointer text-sm w-[30%] flex items-center justify-center border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-cyan-400 hover:text-cyan-400 transition-all rounded-md px-2 py-2 group">
                        <DocumentDuplicateIcon className="w-4 h-4 mr-1 text-slate-400 group-hover:text-cyan-400" /><span className="text-xs font-semibold text-slate-300 group-hover:text-cyan-400">Copy Text</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {setInputText(""); setWordCount(0); setCharCount(0);}} className="cursor-pointer text-sm w-[30%] flex items-center justify-center border border-slate-600 bg-slate-800/50 hover:bg-slate-700 hover:border-rose-400 hover:text-rose-400 transition-all rounded-md px-2 py-2 group">
                        <TrashIcon className="w-4 h-4 mr-1 text-slate-400 group-hover:text-rose-400" /><span className="text-xs font-semibold text-slate-300 group-hover:text-rose-400">Clear Text</span>
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(6, 182, 212, 0.4)" }} 
                        whileTap={{ scale: 0.95 }} 
                        onClick={handleRegenerateDocument} 
                        className="cursor-pointer bg-cyan-600 w-[60%] text-white rounded-md px-4 py-2 hover:bg-cyan-500 transition-colors items-center justify-center flex shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/50"
                    >
                        <BoltIcon className="w-4 h-4 inline-block mr-2 animate-pulse" />
                        <span className="text-sm font-bold tracking-wide">Regenerate</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* --- RIGHT PANEL (Editor) --- */}
            <motion.div className="flex flex-col w-[42.5%] h-full bg-[#02040a]" variants={rightPanelVariants}>
                <div className="w-full h-full bg-[#02040a] flex flex-col pb-3 relative">
                     {/* Decorative ambient glow */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl pointer-events-none z-0"></div>

                    <div className="h-[8%] border-b w-full border-cyan-900/30 bg-[#0f172a]/40 flex items-center z-10">
                        <h1 className="text-xl text-slate-200 font-semibold w-max p-3 flex items-center">
                             <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2 shadow-[0_0_5px_cyan]"></span>
                             Generated Document
                        </h1>
                        <motion.button 
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(51, 65, 85, 0.8)", borderColor: "rgba(34, 211, 238, 0.5)", color: "rgba(34, 211, 238, 1)" }} 
                            whileTap={{ scale: 0.95 }} 
                            onClick={handleSaveText} 
                            className="text-xs bg-slate-800 border border-slate-700 py-1.5 2xl:py-2 px-3 rounded-md ml-auto text-slate-400 mr-3 transition-all font-mono"
                        >
                            Save Text
                        </motion.button>
                    </div>
                    
                    <div className="flex flex-col flex-grow justify-center items-center text-center h-[84%] z-10" data-color-mode="dark">
                        {/* Wrapper to ensure dark background for MDEditor */}
                        <div className="w-full h-full bg-[#0d1117]">
                            <MDEditor value={documentText} onChange={setDocumentText} height="100%" className="w-full" preview="live" style={{ background: '#0d1117' }} />
                        </div>
                    </div>

                    <div className="h-[7%] items-center border-t border-cyan-900/30 flex pt-3 space-x-2 px-3 bg-[#02040a] z-10">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDeleteModalOpen(true)} className="flex w-[25%] bg-rose-950/40 border border-rose-500/30 py-2 text-rose-400 rounded-md hover:bg-rose-900/60 hover:border-rose-400 transition-colors items-center justify-center group shadow-[0_0_10px_rgba(225,29,72,0.1)]">
                            <TrashIcon className="w-4 h-4 mr-2 flex group-hover:text-rose-200" /><span className="text-sm flex mr-1 group-hover:text-rose-200">Delete</span>
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadPdf} className="flex w-[35%] bg-cyan-600 px-2 py-2 text-white font-bold rounded-md hover:bg-cyan-500 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-colors items-center justify-center">
                            <DocumentArrowDownIcon className="w-4 h-4 mr-1" /><span className="text-sm">Export (PDF)</span>
                        </motion.button>
                        <span className="flex items-center justify-start text-slate-500 w-[70%] mr-3 font-mono">
                            <span className="mx-2 text-slate-600 text-sm">Created: </span>
                            <span className="text-cyan-400 text-sm font-semibold">{timeCreated}</span>
                        </span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}