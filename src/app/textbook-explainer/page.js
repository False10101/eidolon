'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon, DocumentDuplicateIcon, SparklesIcon } from "@heroicons/react/24/solid";
import dynamic from "next/dynamic";
import Switch from "react-switch";
import { motion, AnimatePresence } from 'framer-motion';

const PDFExtractor = dynamic(() => import('./UploadedPdfComponent'), {
    ssr: false,
    loading: () => <p className="text-white">Loading PDF Viewer...</p>
});

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};


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


export default function TextbookExplainer() {
    const router = useRouter();

    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedText, setExtractedText] = useState(null);
    const [extractionError, setExtractionError] = useState('');
    const [formatOptions, setFormatOptions] = useState({
        simple_analogies: false,
        key_people: false,
        historical_timelines: false,
        flashcards: false,
        practice_questions: false,
        cross_references: false,
        references: false,
        instructions: false,
    });

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingTextbookId, setPollingTextbookId] = useState(null);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });
    const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });

    const copyButtonTextRef = useRef(null);

    const handleCopyText = async () => {
        if (!extractedText) {
            return;
        }
        if (copyButtonTextRef.current && copyButtonTextRef.current.textContent !== 'Copied!') {
            try {
                await navigator.clipboard.writeText(extractedText);
                copyButtonTextRef.current.textContent = 'Copied!';
                setTimeout(() => {
                    if (copyButtonTextRef.current) {
                        copyButtonTextRef.current.textContent = 'Copy';
                    }
                }, 3000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    const handleFormatChange = (optionName) => {
        setFormatOptions(prevState => ({
            ...prevState,
            [optionName]: !prevState[optionName]
        }));
    };

    const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); }
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) validateAndUpload(files[0]);
    };
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) validateAndUpload(e.target.files[0]);
    };
    const handleRemoveFile = () => {
        setUploadedFile(null);
        setExtractedText('');
        setExtractionError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateAndUpload = (file) => {
        const validType = ['application/pdf'];
        if (!validType.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload only PDF files!');
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            showAlert('File Too Large', 'File size exceeds the 500MB limit.');
            return;
        }
        setUploadedFile(file);
    };

    const handleGeneratePDF = async (e) => {
        e.preventDefault();
        if (!uploadedFile) {
            showAlert("File Required", "Please upload a file first.");
            return;
        }
        setLoadingMessage("Uploading your file...");
        setLoading(true);

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('formatOptions', JSON.stringify(formatOptions));
        formData.append('extractedText', extractedText);

        try {
            const response = await fetch(`/api/textbook/start-generation`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start the generation process.');
            }
            const result = await response.json();
            setPollingTextbookId(result.textbookId);
            setLoadingMessage("Processing your document...");
        } catch (error) {
            console.log(error);
            showAlert("Generation Error", error.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pollingTextbookId) return;
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/textbook/status?id=${pollingTextbookId}`, { credentials: 'include' });
                if (!response.ok) throw new Error('Could not get job status.');
                const data = await response.json();
                if (data.status === 'COMPLETED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    router.push(`/textbook-explainer/${pollingTextbookId}`);
                } else if (data.status === 'FAILED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    showAlert("Generation Failed", data.errorMessage || 'An unknown error occurred.');
                    setPollingTextbookId(null);
                }
            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                showAlert('Status Check Error', 'An error occurred while checking the textbook status.');
                setPollingTextbookId(null);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [pollingTextbookId, router]);

    return (
        <AnimatePresence mode="wait">
        <motion.div 
            className="flex w-full h-full bg-black text-slate-200" 
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
        >
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />

            <motion.div className="flex w-[32%] flex-col h-full border-r border-cyan-900/30" variants={itemVariants}>
                <div className="file-upload flex w-full h-[35%] items-center ">
                    <motion.div 
                        className={`flex w-[88%] h-[80%] border border-cyan-900/30 rounded-lg my-6 2xl:my-10 bg-[#0b101c]/80 backdrop-blur-sm mx-auto flex-col shadow-[0_0_20px_rgba(0,0,0,0.3)]`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        animate={{
                            borderColor: isDragging ? '#22d3ee' : 'rgba(22, 78, 99, 0.3)',
                            backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.1)' : 'rgba(11, 16, 28, 0.8)',
                            scale: isDragging ? 1.05 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
                        {!uploadedFile ? (
                            <div className="group flex flex-col w-full h-full mx-auto my-auto justify-center items-center bg-transparent">
                                <div className="flex flex-col justify-center items-center w-[85%] h-[85%] border-2 border-dashed border-slate-700 rounded-md ">
                                    <CloudArrowUpIcon className={`text-cyan-500 w-8 h-8 2xl:w-10 2xl:h-10 transition-all duration-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                                    <h1 className="text-sm text-center w-[80%] text-slate-300 mb-2 mt-2">Drag & drop PDF here</h1>
                                    <span className="text-sm text-center w-[90%] text-slate-500 mb-2 font-mono">or</span>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="bg-cyan-900/50 py-1.5 2xl:py-2 px-3 2xl:px-4 mb-3 rounded-lg transition-all duration-300 hover:bg-cyan-800 border border-cyan-500/50 active:scale-95 text-sm text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                                        Browse Files
                                    </motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full h-full p-4 justify-center">
                                <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 text-cyan-400 mb-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                <h2 className="text-lg 2xl:text-xl font-medium text-white mb-1 truncate w-full text-center">{uploadedFile.name}</h2>
                                <p className="text-sm text-slate-500 mb-4 font-mono">{uploadedFile.size < 1024 * 1024 ? Math.round(uploadedFile.size / 1024) + "KB" : Math.round(uploadedFile.size / (1024 * 1024)) + "MB"} • PDF</p>
                                <div className="flex space-x-4 2xl:space-x-6">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="text-sm bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(6,182,212,0.2)]">Replace</motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRemoveFile} className="text-sm bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 text-rose-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(225,29,72,0.2)]">Remove</motion.button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
                <div className="raw-text-to-output flex flex-col w-full h-[65%] bg-[#0b101c]/80 backdrop-blur-sm rounded-t-lg border-t border-cyan-900/30">
                    <div className="w-full h-full flex flex-col bg-transparent">
                        <div className="flex w-full h-max items-center pt-4 2xl:pt-6 border-b border-cyan-900/30 pb-2">
                            <h1 className="mx-4 2xl:mx-6 my-auto text-lg 2xl:text-xl font-semibold text-cyan-400 tracking-wide">Raw Text from PDF</h1>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyText} className={`${extractedText ? 'flex' : 'hidden'} cursor-pointer my-auto mr-6 2xl:mr-8 ml-auto items-center`}>
                                <DocumentDuplicateIcon className="w-5 h-5 my-auto text-cyan-400" />
                                <span ref={copyButtonTextRef} className="text-sm text-cyan-400 ml-1 font-mono">Copy</span>
                            </motion.div>
                        </div>
                        <div className="flex h-[83%] w-[90%] m-auto overflow-auto relative mt-2 rounded-lg border border-slate-700 bg-[#020617]/50">
                             {/* Decorative grid background */}
                             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            <PDFExtractor uploadedFile={uploadedFile} setIsProcessing={setIsProcessing} setExtractedText={setExtractedText} setExtractionError={setExtractionError} />
                            <div className="w-full h-full bg-transparent z-10 relative">
                                <p className={`flex w-full h-full rounded-lg whitespace-pre-line break-words text-slate-300 overflow-auto p-4 text-sm font-mono custom-scrollbar ${!extractedText || isProcessing || extractionError ? 'justify-center items-center text-slate-500 italic' : 'items-start'}`}>
                                    {isProcessing ? "⏳ Processing..." : extractionError ? `❌ Error: ${extractionError}` : extractedText ? extractedText : "Please upload PDF to extract text!"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            <motion.div className="flex flex-col w-[68%] h-full" variants={itemVariants}>
                <div className="flex w-full h-[10%] border-b border-cyan-900/30 text-xl 2xl:text-2xl font-bold text-cyan-400 items-center pl-6 2xl:pl-10 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                    Explained PDF
                </div>
                <div className="flex w-full h-[90%] flex-grow">
                    <div className="pdf-viewer flex w-[60%] h-full bg-[#020617]">
                        <div className="bg-[#0b101c]/50 w-full h-full rounded-t-lg border-r border-cyan-900/30 flex flex-col items-center justify-center space-y-4 text-slate-500 relative overflow-hidden">
                             {/* Ambient Glow */}
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>
                            <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 opacity-50" />
                            <h1 className="text-lg 2xl:text-xl font-medium">No PDF generated yet</h1>
                            <span className="text-sm font-mono opacity-70">Upload a PDF and click generate to begin processing...</span>
                        </div>
                    </div>
                    <div className="format-options flex flex-col w-[40%] h-full border-l border-cyan-900/30 pt-4 2xl:pt-5 bg-[#0b101c]/80 backdrop-blur-md">
                        <div className="flex flex-col px-5 2xl:px-7 mb-2">
                             <h1 className="h-min flex text-lg 2xl:text-2xl font-bold text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Output Format Settings</h1>
                             <span className="text-xs text-slate-500 mt-1 font-mono">Configure your study guide generation</span>
                        </div>
                        
                        

                        <motion.div variants={itemVariants} className="w-[88%] h-[30%] mx-auto flex justify-center border border-cyan-900/30 my-auto rounded-lg overflow-hidden bg-[#0f172a]/50 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                            <div className="w-full h-full bg-transparent px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-xl text-slate-200 border-b border-slate-700/50 pb-1">Content Analysis</h1>
                                {['simple_analogies', 'key_people', 'historical_timelines', 'flashcards'].map(option => (
                                    <div key={option} className="flex justify-between items-center hover:bg-slate-800/30 p-1 rounded transition-colors">
                                        <span className="text-sm 2xl:text-base text-slate-400">{formatLabel(option)}</span>
                                        <Switch onChange={() => handleFormatChange(option)} checked={formatOptions[option]} checkedIcon={false} uncheckedIcon={false} height={20} width={40} handleDiameter={16} onColor="#06b6d4" offColor="#334155" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="w-[88%] mx-auto h-[30%] flex border border-cyan-900/30 my-auto rounded-lg overflow-hidden bg-[#0f172a]/50 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                            <div className="w-full h-full bg-transparent px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-xl text-slate-200 border-b border-slate-700/50 pb-1">Study Tools</h1>
                                {['practice_questions', 'cross_references', 'references', 'instructions'].map(option => (
                                    <div key={option} className="flex justify-between items-center hover:bg-slate-800/30 p-1 rounded transition-colors">
                                        <span className="text-sm 2xl:text-base text-slate-400">{formatLabel(option)}</span>
                                        <Switch onChange={() => handleFormatChange(option)} checked={formatOptions[option]} checkedIcon={false} uncheckedIcon={false} height={20} width={40} handleDiameter={16} onColor="#06b6d4" offColor="#334155" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <div className="h-[25%] w-full border-t border-cyan-900/30 mt-auto flex flex-col justify-evenly bg-[#020617]/50">
                            <motion.button 
                                whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 0px 20px rgba(6, 182, 212, 0.6)" }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={handleGeneratePDF} 
                                className="flex bg-cyan-600 w-[88%] mx-auto py-2 2xl:py-3 rounded-lg items-center justify-center space-x-1 mt-auto mb-4 2xl:mb-7 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-500 border border-cyan-400/50"
                            >
                                <SparklesIcon className="w-5 h-5 mr-2" />
                                <span className="font-bold text-base 2xl:text-lg tracking-wide">Generate Explanation PDF</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    )
}