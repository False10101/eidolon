'use client';

import { useState, useEffect, useRef } from "react";
import Checkbox from "rc-checkbox";
import { SparklesIcon, CloudArrowUpIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// --- SVG ICONS ---
const AcademicIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="20" height="3" rx="1.5" className="fill-current opacity-80" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current opacity-60" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current opacity-40" />
    </svg>
);
const MinimalIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="40" height="3" rx="1.5" className="fill-current opacity-80" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current opacity-60" />
        <rect x="0" y="12" width="20" height="3" rx="1.5" className="fill-current opacity-40" />
    </svg>
);
const CreativeIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="30" height="3" rx="1.5" className="fill-current opacity-80" />
        <rect x="0" y="6" width="20" height="3" rx="1.5" className="fill-current opacity-60" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current opacity-40" />
    </svg>
);

// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
};

// --- MODAL COMPONENTS ---
const LoadingModal = ({ message, isOpen }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0b101c] border border-cyan-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] text-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-16 h-16 mx-auto mb-6 border-4 border-t-4 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        />
                        <h3 className="text-xl font-bold text-slate-200 mb-2">Analyzing Data</h3>
                        <p className="text-cyan-400/80 font-mono text-sm">{message}</p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const AlertModal = ({ isOpen, onClose, title, message }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="bg-[#0b101c] border border-rose-500/30 rounded-xl p-8 max-w-sm mx-4 shadow-[0_0_30px_rgba(225,29,72,0.15)] text-center"
                    >
                        <div className="w-16 h-16 mx-auto mb-4 bg-rose-950/30 border border-rose-500/30 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(225,29,72,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-rose-400 mb-2">{title}</h3>
                        <p className="text-slate-400 mb-6">{message}</p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="px-6 py-2 bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 rounded-lg text-rose-200 font-medium transition-colors shadow-[0_0_10px_rgba(225,29,72,0.2)]"
                        >
                            Close
                        </motion.button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


export default function Note() {
    const router = useRouter();

    const [selectedStyle, setSelectedStyle] = useState('academic');
    const [smartTagList, setSmartTagList] = useState({ detect_heading: false, highlight_key: false, identify_todo: false, detect_definitions: false, include_summary: false, extract_key_in_summary: false });
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [lectureTopic, setLectureTopic] = useState('');
    const [fileName, setFileName] = useState('');
    const [Instructor, setInstructor] = useState('');
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingNoteId, setPollingNoteId] = useState(null);

    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });
    const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });

    const handleCheckbox = (setting) => setSmartTagList(prev => ({ ...prev, [setting]: !prev[setting] }));
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) validateAndUpload(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e) => {
        if (e.target.files.length > 0) validateAndUpload(e.target.files[0]);
    };
    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateAndUpload = (file) => {
        const validTypes = ['text/plain'];
        if (!validTypes.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload only TXT files.');
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            showAlert('File Too Large', 'The file size exceeds the 500MB limit.');
            return;
        }
        setUploadedFile(file);
    };

    const handleGenerateNotes = async (e) => {
        e.preventDefault();
        if (!uploadedFile) {
            showAlert('File Required', 'Please upload a transcript file before generating notes.');
            return;
        }
        setLoadingMessage("Uploading your file...");
        setLoading(true);

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('config', JSON.stringify(smartTagList));
        formData.append('style', selectedStyle);
        formData.append('topic', lectureTopic);
        formData.append('instructor', Instructor);
        formData.append('fileName', fileName || uploadedFile.name.replace('.txt', ''));

        try {
            const response = await fetch(`/api/note/start-generation`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (response.status !== 200) throw new Error((await response.json()).error || 'Failed to start generation.');
            const result = await response.json();
            setPollingNoteId(result.noteId);
            setLoadingMessage("Processing your document...");
        } catch (error) {
            console.error(error);
            showAlert('Generation Failed', error.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!pollingNoteId) return;
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/note/status?id=${pollingNoteId}`, { credentials: 'include' });
                if (!response.ok) throw new Error('Could not get job status.');
                const data = await response.json();
                if (data.status === 'COMPLETED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    router.push(`/note/${pollingNoteId}`);
                } else if (data.status === 'FAILED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    showAlert('Generation Failed', data.errorMessage || 'An unknown error occurred.');
                    setPollingNoteId(null);
                }
            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                showAlert('Status Check Error', 'An error occurred while checking the note status.');
                setPollingNoteId(null);
            }
        }, 5000);
        return () => clearInterval(intervalId);
    }, [pollingNoteId, router]);

    return (
        <AnimatePresence mode="wait">
        <motion.div
            className="flex w-full px-8 2xl:px-12 h-full bg-black text-slate-200"
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />

            <motion.div className="w-[78%] h-full 2xl:mr-2 flex flex-col pb-3" variants={containerVariants}>
                <motion.div className="w-full h-[12.5%]" variants={itemVariants}>
                    <div className="w-full h-full flex flex-col justify-center">
                        <h1 className="text-2xl 2xl:text-3xl text-cyan-400 font-extrabold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Inclass Note Taker</h1>
                        <span className="text-slate-400 my-1 2xl:my-2 ">Upload your in-class recording's transcript and let <span className="text-cyan-400 font-bold">Gemini</span> format your notes</span>
                    </div>
                </motion.div>
                <div className="w-full flex space-x-6 2xl:space-x-10 mb-3 h-[87.5%]">
                    <motion.div variants={itemVariants} className="w-[32.5%] h-full border border-cyan-900/30 rounded-xl bg-[#0b101c]/80 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                        <div className="w-full h-full bg-transparent flex flex-col">
                            <h1 className="flex h-[7%] px-4 2xl:px-6 text-lg 2xl:text-xl font-bold py-2 2xl:py-3 border-b border-cyan-900/30 w-full text-cyan-400 tracking-wide">Raw Transcript Text</h1>
                            <div className="flex w-full h-[40%] border-b border-cyan-900/30 items-center justify-center">
                                <motion.div
                                    className="flex w-[80%] h-[80%] border-dashed items-center rounded-lg my-6 2xl:my-10 py-1 2xl:py-2 mx-auto flex-col"
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    animate={{
                                        borderWidth: '2px',
                                        borderStyle: isDragging ? 'solid' : 'dashed',
                                        borderColor: isDragging ? '#22d3ee' : 'rgba(51, 65, 85, 0.5)',
                                        backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                                        scale: isDragging ? 1.05 : 1,
                                    }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileChange} />
                                    {!uploadedFile ? (
                                        <div className="group flex flex-col w-full h-full mx-auto justify-center items-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                                            <CloudArrowUpIcon className={`text-cyan-500 w-12 h-12 2xl:w-15 2xl:h-15 transition-transform duration-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                                            <h1 className="text-sm text-center w-[80%] text-slate-300 mb-2 group-hover:text-cyan-200">Drag and drop or click to upload</h1>
                                            <span className="text-xs text-center text-slate-500 font-mono">TXT files only (max 500MB)</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full p-4">
                                            <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 text-cyan-400 mb-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                            <h2 className="text-sm font-medium text-white mb-1 truncate w-full text-center">{uploadedFile.name}</h2>
                                            <p className="text-xs text-slate-500 mb-4 font-mono">{uploadedFile.size < 1024 * 1024 ? Math.round(uploadedFile.size / 1024) + "KB" : Math.round(uploadedFile.size / (1024 * 1024)) + "MB"} • TXT</p>
                                            <div className="flex space-x-3">
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="text-xs bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(6,182,212,0.2)]">Replace</motion.button>
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRemoveFile} className="text-xs bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 text-rose-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(225,29,72,0.2)]">Remove</motion.button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div className="flex flex-grow px-4 2xl:px-6">
                                <motion.div className="w-full h-max my-auto flex flex-col" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                    <h1 className="flex text-lg 2xl:text-xl font-semibold pb-4 2xl:pb-6 w-full text-slate-200">Transcript Details</h1>
                                    <span className="text-slate-400 text-sm 2xl:text-base uppercase tracking-wide font-mono mb-1">Course Details</span>
                                    <input onChange={(e) => setFileName(e.target.value)} placeholder="e.g, Advanced Physics 101" key={uploadedFile ? uploadedFile.name : 'default-key'} defaultValue={uploadedFile ? uploadedFile.name.replace('.txt', '') : ''} className="border focus:outline-none focus:border-cyan-500 border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 2xl:px-4 rounded-lg mb-3 2xl:mb-4 text-sm 2xl:text-base transition-colors" />
                                    
                                    <span className="text-slate-400 text-sm 2xl:text-base uppercase tracking-wide font-mono mb-1">Lecture Topic (Optional)</span>
                                    <input onChange={(e) => setLectureTopic(e.target.value)} placeholder="e.g., Quantum Mechanics Introduction" className="border focus:outline-none focus:border-cyan-500 border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 2xl:px-4 rounded-lg mb-3 2xl:mb-4 text-sm 2xl:text-base transition-colors" />
                                    
                                    <span className="text-slate-400 text-sm 2xl:text-base uppercase tracking-wide font-mono mb-1">Instructor (Optional)</span>
                                    <input onChange={(e) => setInstructor(e.target.value)} placeholder="e.g., Dr. Smith" className="border border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 focus:outline-none focus:border-cyan-500 2xl:px-4 rounded-lg mb-3 2xl:mb-4 text-sm 2xl:text-base transition-colors" />
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="raw-text-editor-box w-[62.5%] h-full border border-cyan-900/30 rounded-xl bg-[#0b101c]/80 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)] overflow-hidden">
                        <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
                            <h1 className="flex h-[7%] px-4 2xl:px-6 text-lg 2xl:text-xl font-bold py-2 2xl:py-3 border-b border-cyan-900/30 w-full text-cyan-400 tracking-wide">Raw Output Text</h1>
                            <div className="flex h-[93%] overflow-hidden relative">
                                {/* Decorative grid background */}
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                <div className="w-max h-max flex flex-col justify-center m-auto space-y-2 text-slate-500 z-10">
                                    <DocumentTextIcon className="w-8 h-8 2xl:w-10 2xl:h-10 mx-auto opacity-50" />
                                    <h1 className="text-center text-lg 2xl:text-xl font-medium">No text extracted yet</h1>
                                    <span className="text-sm font-mono opacity-70">Upload a recording to begin processing</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
            <motion.div variants={itemVariants} className="formtting-options w-[25%] border border-cyan-900/30 h-[95%] my-auto rounded-lg bg-[#0b101c]/80 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] ml-2 2xl:ml-4 flex flex-col">
                <div className="flex flex-col w-full h-full bg-transparent py-3 2xl:py-4">
                    <h1 className="text-cyan-400 text-xl 2xl:text-2xl font-semibold w-full border-b border-cyan-900/30 px-4 2xl:px-5 pb-3 2xl:pb-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Formatting Options</h1>
                    <div className="py-3 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-lg 2xl:text-xl pb-3 2xl:pb-4 text-slate-200">Smart Tags</h2>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('detect_heading')} /> <span className="ml-3 text-sm 2xl:text-base">Auto-detect headings</span></motion.div>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('highlight_key')} /> <span className="ml-3 text-sm 2xl:text-base">Highlight key points</span></motion.div>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('identify_todo')} /> <span className="ml-3 text-sm 2xl:text-base">Identify to-do items</span></motion.div>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('detect_definitions')} /> <span className="ml-3 text-sm 2xl:text-base">Detect definitions</span></motion.div>
                    </div>
                    <div className="py-3 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-lg 2xl:text-xl pb-3 2xl:pb-4 text-slate-200">Auto-Summarization</h2>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('include_summary')} /> <span className="ml-3 text-sm 2xl:text-base">Include summary in beginning</span></motion.div>
                        <motion.div whileHover={{x:2}} className="flex items-center pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('extract_key_in_summary')} /> <span className="ml-3 text-sm 2xl:text-base">Extract key terms</span></motion.div>
                    </div>
                    <div className="py-3 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-lg 2xl:text-xl pb-3 2xl:pb-4 text-slate-200">Output Styling</h2>
                        
                        <h3 className="pb-2 text-sm 2xl:text-base text-slate-400 font-mono mt-1">PDF Template</h3>
                        <div className="flex space-x-2 2xl:space-x-4 pb-2">
                            <StyleCard id="academic" title="Academic" isSelected={selectedStyle === 'academic'} onSelect={setSelectedStyle} />
                            <StyleCard id="minimal" title="Minimal" isSelected={selectedStyle === 'minimal'} onSelect={setSelectedStyle} />
                            <StyleCard id="Creative" title="Creative" isSelected={selectedStyle === 'Creative'} onSelect={setSelectedStyle} />
                        </div>
                    </div>
                    <div className="flex flex-col mt-auto py-4 2xl:py-5 mx-4 2xl:mx-6 space-y-4 2xl:space-y-5 mb-0 flex-grow justify-end">
                        <motion.button
                            onClick={handleGenerateNotes}
                            className="flex rounded-lg w-full px-3 py-1.5 2xl:py-2 items-center justify-center bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-400"
                            whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(6, 182, 212, 0.6)" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" /><span className="text-sm 2xl:text-lg">Generate Formatted Notes</span>
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    );
}

const StyleCard = ({ id, title, isSelected, onSelect }) => {
    return (
        <motion.div
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            className={`flex flex-col w-[33%] items-center justify-center px-2 py-3 2xl:py-4 rounded-lg border-2 cursor-pointer relative transition-all duration-300 ${isSelected ? 'shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'hover:bg-slate-800/50'}`}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
            animate={{
                borderColor: isSelected ? '#22d3ee' : 'rgba(51, 65, 85, 0.5)',
                color: isSelected ? '#22d3ee' : '#94a3b8'
            }}
            whileHover={{ scale: 1.05, borderColor: '#22d3ee', color: '#cbd5e1' }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            {isSelected && (
                <motion.div
                    layoutId="selectedStyleHighlight"
                    className="absolute inset-0 bg-cyan-900/20 rounded-md -z-10"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                />
            )}
            {title.toLowerCase() === "academic" && <AcademicIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            {title.toLowerCase() === "minimal" && <MinimalIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            {title.toLowerCase() === "creative" && <CreativeIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            <span className="text-xs 2xl:text-base font-medium mt-2">
                {title}
            </span>
        </motion.div>
    );
};