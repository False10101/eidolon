"use client"

import { useState, useEffect, useRef } from "react"
import Checkbox from "rc-checkbox"
import { SparklesIcon, CloudArrowDownIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon, CloudArrowUpIcon, TrashIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';


import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const AcademicIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="20" height="3" rx="1.5" className="fill-current opacity-90" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current opacity-70" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current opacity-50" />
    </svg>
);
const MinimalIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="40" height="3" rx="1.5" className="fill-current opacity-90" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current opacity-70" />
        <rect x="0" y="12" width="20" height="3" rx="1.5" className="fill-current opacity-50" />
    </svg>
);

const CreativeIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="30" height="3" rx="1.5" className="fill-current opacity-90" />
        <rect x="0" y="6" width="20" height="3" rx="1.5" className="fill-current opacity-70" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current opacity-50" />
    </svg>
);


// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
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

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-[#0b101c] border border-rose-500/30 rounded-2xl shadow-[0_0_30px_rgba(225,29,72,0.15)] w-full max-w-md m-4 p-8 text-slate-200">
                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 rounded-full bg-rose-950/30 border border-rose-500/30 mb-4 shadow-[0_0_10px_rgba(225,29,72,0.2)]"><TrashIcon className="w-12 h-12 text-rose-500" /></div>
                        <h2 className="text-xl font-bold mb-2 text-rose-400">Delete Note Confirmation</h2>
                        <p className="text-slate-400 mb-6 text-sm">Are you sure you want to delete this note? <strong className="block text-rose-500 mt-2 font-mono tracking-wide">This action is irreversible.</strong></p>
                        <div className="flex justify-center gap-4 w-full">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full py-2.5 px-4 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors font-semibold text-slate-300">Cancel</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="w-full py-2.5 px-4 rounded-md bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 transition-colors font-bold text-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.2)]">Delete Note</motion.button>
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


export default function Note() {

    const [mdText, setMdText] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [smartTagList, setSmartTagList] = useState({ detect_heading: false, highlight_key: false, identify_todo: false, detect_definitions: false, include_summary: false, extract_key_in_summary: false });
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [lectureTopic, setLectureTopic] = useState('');
    const [fileName, setFileName] = useState('')
    const [Instructor, setInstructor] = useState('');
    const fileInputRef = useRef(null);
    const params = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingNoteId, setPollingNoteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

    const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });
    const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });

    const handleCheckbox = (setting, settingValue) => {
        setSmartTagList(prev => ({ ...prev, [setting]: !prev[setting] }));

        if (settingValue) {
            setSmartTagList(prev => ({ ...prev, [setting]: settingValue }));
        }
    };

    const textToFile = (content, filename, type = 'text/plain') => {
        return new File([content], filename, { type });
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                setLoadingMessage("Loading note content...");
                setLoading(true);

                if (params.noteId === 'undefined' || params.noteId === '') {
                    router.push('/note/');
                    return;
                }

                const response = await fetch(`/api/note/getNoteDetails?note_id=${params.noteId}`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.status != 200) {
                    router.push('/note/');
                    return;
                }

                const data = await response.json();

                setMdText(data.note.files.noteFile.content);
                setSelectedStyle(data.note.template_type);
                setLectureTopic(data.note.lecture_topic || null);
                setFileName(data.note.name);
                setInstructor(data.note.instructor || null);

                setSmartTagList({
                    detect_heading: Boolean(data.note.detect_heading),
                    highlight_key: Boolean(data.note.highlight_key),
                    identify_todo: Boolean(data.note.identify_todo),
                    detect_definitions: Boolean(data.note.detect_definitions),
                    include_summary: Boolean(data.note.include_summary),
                    extract_key_in_summary: Boolean(data.note.extract_key_in_summary)
                });

                const syntheticFile = textToFile(
                    data.note.files.transcriptFile.content,
                    data.note.files.transcriptFile.name ? `${data.note.files.transcriptFile.name}.txt` : `${data.note.name}.txt`
                );

                setUploadedFile(syntheticFile);

            } catch (err) {
                console.error('Error fetching note:', err);
                showAlert('Loading Error', 'Failed to load note details.');
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [params.noteId]);


    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            validateAndUpload(files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            validateAndUpload(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const validateAndUpload = (file) => {
        const validTypes = [
            'text/plain'
        ];

        if (!validTypes.includes(file.type)) {
            showAlert('Invalid File Type', 'Please upload only TXT files.')
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            showAlert('File Too Large', 'File size exceeds 500MB limit.');
            return;
        }

        setUploadedFile(file);
        setFileName(file.name);
        setLectureTopic('');
        setInstructor('');
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
        return `${size} ${sizes[i]}`;
    };

    const handleDownloadPdf = async () => {
        if (!mdText) {
            showAlert("No Content", "There is no content to download.");
            return;
        }

        setLoading(true);
        setLoadingMessage("Preparing PDF download...");

        try {
            const response = await fetch('/api/note/downloadNote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    mdText: mdText,
                    fileName: fileName || 'note',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to download PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // Create a temporary anchor element
            const a = document.createElement('a');
            a.href = url;

            // Sanitize the filename
            const sanitizedFileName = (fileName || 'note')
                .replace(/[^a-z0-9]/gi, '_')
                .substring(0, 50); // Limit length

            a.download = `${sanitizedFileName}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
        } catch (error) {
            console.error("Error downloading PDF:", error);
            showAlert('Download Failed', error.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const saveData = async (url, body, type) => {
        if (type === 'text' && !mdText) { showAlert("No Content", "There is no content to save."); return; }
        if (type === 'detail' && !fileName && !lectureTopic && !Instructor) { showAlert("No Content", "There is no content to save."); return; }
        setSaveStatus('saving');
        try {
            const formData = new FormData();
            for (const key in body) {
                if (body[key] !== undefined) {
                    formData.append(key, body[key]);
                }
            }
            const response = await fetch(url, { method: 'POST', credentials: 'include', body: formData });
            if (!response.ok) throw new Error(`Saving failed: ${response.statusText}`);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (error) {
            console.log(error);
            showAlert("Save Failed", `Could not save the ${type}. Please try again.`);
            setSaveStatus('idle');
        }
    };

    const handleSaveText = () => saveData('/api/note/edit/textMd', { mdText: mdText, noteId: params.noteId }, 'text');
    const handleSaveDetail = () => saveData('/api/note/edit/detail', { fileName: fileName || undefined, lectureTopic: lectureTopic || undefined, Instructor: Instructor || undefined, noteId: params.noteId }, 'detail');

    const handleRegenerateNotes = async (e) => {
        e.preventDefault();
        if (!uploadedFile) {
            showAlert("File Required", "Please upload a file first.");
            return;
        }
        setLoadingMessage("Uploading your file...");
        setLoading(true);

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('config', JSON.stringify(smartTagList));
        formData.append('style', selectedStyle);
        formData.append('topic', lectureTopic || null);
        formData.append('instructor', Instructor || null);
        formData.append('fileName', fileName);
        formData.append('id', params.noteId);

        try {
            const response = await fetch(`/api/note/edit/re-generate`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start the regeneration process.');
            }
            const result = await response.json();
            setPollingNoteId(result.noteId);
            setLoadingMessage("Processing your document...");
        } catch (error) {
            console.log(error);
            showAlert('Regeneration Failed', error.message);
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!pollingNoteId) {
            return;
        }
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/note/status?id=${pollingNoteId}`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Could not get job status.');
                }
                const data = await response.json();

                if (data.status === 'COMPLETED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    window.location.reload();
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

    const handleDeleteNote = async () => {
        setIsDeleteModalOpen(false);
        try {
            const response = await fetch(`/api/note/delete?id=${params.noteId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete note.');
            }
            router.push('/note');
        } catch (error) {
            console.error("Failed to delete note:", error);
            showAlert('Deletion Failed', error.message);
        }
    };

    return (
        <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible" 
            className="flex w-full px-8 2xl:px-12 h-full bg-black text-slate-200"
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
        >
            <SaveStatusModal status={saveStatus} />
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteNote} />

            <motion.div variants={containerVariants} className="w-[78%] h-full 2xl:mr-4 flex flex-col pb-3 items-center">
                <motion.div variants={itemVariants} className="w-full h-[12.5%]">
                    <div className="w-full h-full flex flex-col my-auto">
                        <h1 className="text-2xl 2xl:text-3xl text-cyan-400 font-extrabold mt-auto drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Inclass Note Taker</h1>
                        <span className="text-slate-400 my-1 2xl:my-2 mb-auto text-sm 2xl:text-base">Edit your transcript, regenerate, and download your notes.</span>
                    </div>
                </motion.div>
                <div className="w-full flex space-x-6 2xl:space-x-10 mb-3 h-[87.5%]">
                    <motion.div variants={itemVariants} className="w-[32.5%] h-full border border-cyan-900/30 rounded-xl bg-[#0b101c]/80 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)] overflow-hidden">
                        <div className="w-full h-full bg-transparent flex flex-col">
                            <h1 className="flex h-[7%] px-4 2xl:px-6 text-lg 2xl:text-xl font-bold py-2 2xl:py-3 border-b border-cyan-900/30 w-full text-cyan-400 tracking-wide">Raw Transcript Text</h1>
                            <div className="flex w-full h-max border-b border-cyan-900/30 items-center">
                                <motion.div 
                                    className="flex w-[80%] h-max border-2 border-dashed border-slate-700 rounded-lg my-6 2xl:my-10 py-1 2xl:py-2 mx-auto flex-col" 
                                    animate={{ 
                                        borderWidth: '2px', 
                                        borderStyle: isDragging ? 'solid' : 'dashed', 
                                        borderColor: isDragging ? '#22d3ee' : 'rgba(51, 65, 85, 0.5)', 
                                        backgroundColor: isDragging ? 'rgba(6, 182, 212, 0.1)' : 'transparent', 
                                        scale: isDragging ? 1.05 : 1, 
                                    }} 
                                    transition={{ type: 'spring', stiffness: 300 }} 
                                    onDragOver={handleDragOver} 
                                    onDragLeave={handleDragLeave} 
                                    onDrop={handleDrop}
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".txt" onChange={handleFileChange} />
                                    {!uploadedFile ? (
                                        <div className="group flex flex-col w-full h-max mx-auto justify-center items-center cursor-pointer">
                                            <CloudArrowUpIcon className={`text-cyan-500 w-12 h-12 2xl:w-15 2xl:h-15 transition-all duration-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                                            <h1 className="text-sm text-center w-[80%] text-slate-300 mb-2 group-hover:text-cyan-200">Drag and drop your file here</h1>
                                            <span className="text-xs text-center w-[90%] text-slate-500 mb-2 font-mono">TXT file only! (max 500MB)</span>
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="bg-cyan-900/50 py-1.5 2xl:py-2 px-3 2xl:px-4 mb-3 rounded-lg transition-all duration-300 hover:bg-cyan-800 active:scale-95 text-sm text-cyan-200 font-bold border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]">Browse Files</motion.button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center w-full p-4">
                                            <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 text-cyan-400 mb-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                            <h2 className="text-sm font-medium text-white mb-1 truncate w-full text-center">{uploadedFile.name}</h2>
                                            <p className="text-xs text-slate-500 mb-4 font-mono">{formatFileSize(uploadedFile.size)} • TXT</p>
                                            <div className="flex space-x-3">
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="text-xs bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/50 text-cyan-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(6,182,212,0.2)]">Replace</motion.button>
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRemoveFile} className="text-xs bg-rose-900/50 hover:bg-rose-800 border border-rose-500/50 text-rose-200 py-1 px-3 rounded transition-colors shadow-[0_0_10px_rgba(225,29,72,0.2)]">Remove</motion.button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div className="flex flex-grow px-4 2xl:px-6 py-2 2xl:py-3">
                                <div className="w-full h-full flex flex-col justify-evenly">
                                    <h1 className="flex text-lg 2xl:text-xl font-semibold w-full text-slate-200">Transcript Details</h1>
                                    <span className="text-sm text-slate-400 uppercase tracking-wide font-mono">Course Details</span>
                                    <input onChange={(e) => setFileName(e.target.value)} defaultValue={fileName} placeholder="e.g, Advanced Physics 101" className="text-sm border focus:outline-none focus:border-cyan-500 border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 2xl:px-4 rounded-lg transition-colors" />
                                    <span className="text-sm text-slate-400 uppercase tracking-wide font-mono">Lecture Topic (Optional)</span>
                                    <input onChange={(e) => setLectureTopic(e.target.value)} defaultValue={lectureTopic} placeholder="e.g., Quantum Mechanics Introduction" className="text-sm border focus:outline-none focus:border-cyan-500 border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 2xl:px-4 rounded-lg transition-colors" />
                                    <span className="text-sm text-slate-400 uppercase tracking-wide font-mono">Instructor (Optional)</span>
                                    <input onChange={(e) => setInstructor(e.target.value)} defaultValue={Instructor} placeholder="e.g., Dr. Smith" className="text-sm border focus:outline-none focus:border-cyan-500 border-slate-700 bg-[#020617]/50 text-slate-200 placeholder-slate-600 py-2 2xl:py-2 px-3 2xl:px-4 rounded-lg transition-colors" />
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveDetail} className="text-sm px-4 py-1.5 2xl:py-2 bg-cyan-600 rounded-lg mt-3 text-white font-bold hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] border border-cyan-400/50">Save Details</motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants} className="raw-text-editor-box w-[62.5%] h-full border border-cyan-900/30 rounded-xl bg-[#0b101c]/80 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)] overflow-hidden">
                        <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
                            <div className="flex h-[7%] px-4 2xl:px-6 text-lg 2xl:text-xl font-bold py-2 2xl:py-3 border-b border-cyan-900/30 w-full text-cyan-400 tracking-wide items-center">
                                <span>Formatted Note</span>
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveText} className="text-xs bg-slate-800 border border-slate-700 py-1.5 2xl:py-2 px-3 rounded-md ml-auto text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-all">Save Text</motion.button>
                            </div>
                            <div className="flex h-[93%] overflow-hidden bg-[#0d1117]" data-color-mode="dark">
                                <MDEditor value={mdText} onChange={setMdText} height="100%" className="w-full bg-[#0d1117]" preview="live" style={{ background: '#0d1117' }} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
            <motion.div variants={itemVariants} className="formatting-options w-[25%] border border-cyan-900/30 h-[95%] my-auto rounded-lg bg-[#0b101c]/80 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] ml-2 2xl:ml-4 flex flex-col overflow-hidden">
                <div className="flex flex-col w-full h-full bg-transparent py-3 2xl:py-4">
                    <h1 className="text-cyan-400 text-xl 2xl:text-2xl font-semibold w-full border-b border-cyan-900/30 px-4 2xl:px-5 pb-3 2xl:pb-4 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Formatting Options</h1>
                    <div className="py-2 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-base 2xl:text-xl pb-2 2xl:pb-4 text-slate-200">Smart Tags</h2>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('detect_heading')} checked={smartTagList.detect_heading} /> <span className="ml-3 text-sm 2xl:text-base">Auto-detect headings</span></motion.div>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('highlight_key')} checked={smartTagList.highlight_key} /> <span className="ml-3 text-sm 2xl:text-base">Highlight key points</span></motion.div>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('identify_todo')} checked={smartTagList.identify_todo} /> <span className="ml-3 text-sm 2xl:text-base">Identify to-do items</span></motion.div>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('detect_definitions')} checked={smartTagList.detect_definitions} /> <span className="ml-3 text-sm 2xl:text-base">Detect definitions</span></motion.div>
                    </div>
                    <div className="py-2 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-base 2xl:text-xl pb-2 2xl:pb-4 text-slate-200">Auto-Summarization</h2>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('include_summary')} checked={smartTagList.include_summary} /> <span className="ml-3 text-sm 2xl:text-base">Include summary</span></motion.div>
                        <motion.div whileHover={{ x: 2 }} className="flex items-center pb-1 2xl:pb-2 text-slate-400 hover:text-cyan-200 transition-colors cursor-pointer"><Checkbox className="accent-cyan-500" onChange={() => handleCheckbox('extract_key_in_summary')} checked={smartTagList.extract_key_in_summary} /> <span className="ml-3 text-sm 2xl:text-base">Extract key terms</span></motion.div>
                    </div>
                    <div className="py-2 2xl:py-4 w-full flex flex-col px-4 2xl:px-5 border-b border-cyan-900/30">
                        <h2 className="text-base 2xl:text-xl pb-2 2xl:pb-4 text-slate-200">Output Styling</h2>
                        
                        <h3 className="pb-3 2xl:pb-4 text-sm text-slate-400 font-mono mt-2">PDF Template</h3>
                        <div className="flex space-x-3 2xl:space-x-4 pb-3 2xl:pb-4">
                            <StyleCard id="academic" title="Academic" isSelected={selectedStyle === "academic"} onSelect={setSelectedStyle} />
                            <StyleCard id="minimal" title="Minimal" isSelected={selectedStyle === 'minimal'} onSelect={setSelectedStyle} />
                            <StyleCard id="Creative" title="Creative" isSelected={selectedStyle === 'creative'} onSelect={setSelectedStyle} />
                        </div>
                    </div>
                    <div className="flex flex-col mt-auto py-4 2xl:py-5 mx-4 2xl:mx-6 space-y-4 2xl:space-y-5 mb-0 flex-grow justify-end">
                        <motion.button whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px rgba(6, 182, 212, 0.6)" }} whileTap={{ scale: 0.95 }} onClick={handleRegenerateNotes} className="flex text-sm cursor-pointer rounded-lg w-full px-3 py-1.5 2xl:py-2 items-center justify-center bg-cyan-600 text-white font-bold border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-500"> <SparklesIcon className="w-4 h-4" /><span className="ml-1">Regenerate Notes</span></motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadPdf} className="flex text-sm cursor-pointer justify-center bg-slate-800 px-3 py-1.5 2xl:py-2 rounded-lg text-cyan-400 items-center hover:bg-slate-700 border border-slate-600"><CloudArrowDownIcon className="w-4 h-4" /><span className="ml-1">Download PDF</span></motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDeleteModalOpen(true)} className="flex text-sm cursor-pointer justify-center bg-rose-900/50 px-3 py-1.5 2xl:py-2 rounded-lg items-center hover:bg-rose-800 border border-rose-500/50 text-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.2)]"><TrashIcon className="w-4 h-4" /><span className="ml-1">Delete Note</span></motion.button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
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
            animate={{ borderColor: isSelected ? '#22d3ee' : 'rgba(51, 65, 85, 0.5)', color: isSelected ? '#22d3ee' : '#94a3b8' }} 
            whileHover={{ scale: 1.05, borderColor: '#22d3ee', color: '#cbd5e1' }} 
            transition={{ type: 'spring', stiffness: 300 }}
        >
            {isSelected && (<motion.div layoutId="selectedStyleHighlight" className="absolute inset-0 bg-cyan-900/20 rounded-md -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />)}
            {title.toLowerCase() === "academic" && <AcademicIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            {title.toLowerCase() === "minimal" && <MinimalIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            {title.toLowerCase() === "creative" && <CreativeIcon className={`p-2 rounded-lg h-max my-auto w-12 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />}
            <span className="text-xs 2xl:text-base font-medium mt-2">{title}</span>
        </motion.div>
    );
};