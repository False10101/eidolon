'use client'

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { DocumentDuplicateIcon, SparklesIcon, DocumentTextIcon, CloudArrowDownIcon, TrashIcon } from "@heroicons/react/24/solid";
import dynamic from "next/dynamic";
import Switch from "react-switch";
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimeAgo } from "@/app/timeHelper";

const PdfViewer = dynamic(() => import('../PdfViewer'), {
    ssr: false,
    loading: () => <p className="text-white">Loading PDF Viewer...</p>
});

const PDFExtractor = dynamic(() => import('../UploadedPdfComponent'), {
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

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
    <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex justify-center items-center z-50">
                <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="bg-[#141B3C] rounded-2xl shadow-xl w-full max-w-md m-4 p-8 text-white">
                    <div className="flex flex-col items-center text-center">
                        <div className="p-3 rounded-full bg-red-500/10 mb-4"><TrashIcon className="w-12 h-12 text-red-500" /></div>
                        <h2 className="text-xl font-bold mb-2">Delete Textbook</h2>
                        <p className="text-white/70 mb-6 text-sm">Are you sure you want to permanently delete this textbook explanation? <strong className="block text-red-400 mt-2">This action is irreversible.</strong></p>
                        <div className="flex justify-center gap-4 w-full">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full py-2.5 px-4 rounded-md bg-white/10 hover:bg-white/20 transition-colors font-semibold">Cancel</motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="w-full py-2.5 px-4 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-bold">Delete</motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>
);


export default function TextbookExplainer() {
    const router = useRouter();
    const params = useParams();

    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedText, setExtractedText] = useState(null);
    const [extractionError, setExtractionError] = useState('');
    const [formatOptions, setFormatOptions] = useState({
        simple_analogies: false, key_people: false, historical_timelines: false, flashcards: false,
        practice_questions: false, cross_references: false, references: false, instructions: false,
    });

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingTextbookId, setPollingTextbookId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
    const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

    const [rawPdf, setRawPdf] = useState({ content: null, name: 'Untitled.pdf' });
    const [fileForExtraction, setFileForExtraction] = useState(null);
    const copyButtonTextRef = useRef(null);

    const showAlert = (title, message) => setAlertModal({ isOpen: true, title, message });
    const closeAlert = () => setAlertModal({ isOpen: false, title: '', message: '' });
    const showSuccess = (title, message) => setSuccessModal({ isOpen: true, title, message });
    const closeSuccess = () => setSuccessModal({ isOpen: false, title: '', message: '' });

    const handleFormatChange = (optionName) => setFormatOptions(prevState => ({ ...prevState, [optionName]: !prevState[optionName] }));
    const getMimeType = (filename = '') => {
        const extension = filename.split('.').pop().toLowerCase();
        if (extension === 'pdf') return 'application/pdf';
        return 'application/octet-stream';
    };
    const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    useEffect(() => {
        const base64ToBlob = (base64, contentType = 'application/octet-stream') => {
            const byteCharacters = atob(base64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            return new Blob(byteArrays, { type: contentType });
        };
        const fetchContent = async () => {
            setLoading(true);
            setLoadingMessage("Loading textbook details...");
            try {
                if (!params.textbookId || params.textbookId === 'undefined') return;
                const response = await fetch(`/api/textbook/getTextbookDetails?textbook_id=${params.textbookId}`, { method: 'GET', credentials: 'include' });
                if (response.status != 200) {
                    console.error("Textbook not found or error occurred, redirecting.");
                    router.push('/textbook-explainer/');
                    return;
                }
                const data = await response.json();
                const textbook = data.textbook;
                setExtractedText(textbook.textbookTXTFile.content);
                const newFormatOptions = Object.keys(formatOptions).reduce((acc, key) => {
                    acc[key] = Boolean(textbook[key]);
                    return acc;
                }, {});
                setFormatOptions(newFormatOptions);
                const originalFileBlob = base64ToBlob(textbook.originalFile.content, getMimeType(textbook.name));
                const originalFileObject = new File([originalFileBlob], textbook.name, { type: getMimeType(textbook.name) });
                setUploadedFile(originalFileObject);
                const explanationFileName = `${textbook.name.replace(/\.[^/.]+$/, "")}_explained.pdf`;
                setRawPdf({ content: textbook.explanationFile.content, name: explanationFileName });
                setIsDataLoaded(true);
            } catch (error) {
                console.error("Failed to fetch content:", error);
                showAlert("Loading Error", "Could not load textbook data.");
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, [params.textbookId]);

    const explanationPdf = useMemo(() => {
        if (!rawPdf.content) return null;
        const base64ToBlob = (base64, contentType = 'application/octet-stream') => {
            const byteCharacters = atob(base64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            return new Blob(byteArrays, { type: contentType });
        };
        const blob = base64ToBlob(rawPdf.content, 'application/pdf');
        return new File([blob], rawPdf.name, { type: 'application/pdf' });
    }, [rawPdf.content, rawPdf.name]);

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) validateAndUpload(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e) => { if (e.target.files.length > 0) validateAndUpload(e.target.files[0]); };
    const handleRemoveFile = () => {
        setUploadedFile(null);
        setExtractionError('');
        setFileForExtraction(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateAndUpload = (file) => {
        if (file.type !== 'application/pdf') {
            showAlert('Invalid File Type', 'Please upload only PDF files!');
            return;
        }
        if (file.size > 500 * 1024 * 1024) {
            showAlert('File Too Large', 'File size exceeds the 500MB limit.');
            return;
        }
        setUploadedFile(file);
        setFileForExtraction(file);
    };

    const handleRegeneratePDF = async (e) => {
        e.preventDefault();
        if (!uploadedFile) {
            showAlert("File Required", "Please upload a file first.");
            return;
        }
        setLoadingMessage("Re-uploading your file...");
        setLoading(true);
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('formatOptions', JSON.stringify(formatOptions));
        formData.append('extractedText', extractedText);
        formData.append('id', params.textbookId);
        try {
            const response = await fetch(`/api/textbook/re-generate`, { method: 'POST', credentials: 'include', body: formData });
            if (response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start the generation process.');
            }
            const result = await response.json();
            setPollingTextbookId(result.textbookId);
            setLoadingMessage("Processing your document...");
        } catch (error) {
            console.log(error);
            showAlert("Regeneration Error", error.message);
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
                    window.location.reload();
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
    }, [pollingTextbookId]);

    const handleDownloadTextbook = () => {
        if (!explanationPdf) {
            showAlert("Not Ready", "No explanation PDF is available to download.");
            return;
        }
        const fileUrl = URL.createObjectURL(explanationPdf);
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = explanationPdf.name || 'explanation.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);
    };

    const handleCopyText = async () => {
        if (!extractedText) {
            showAlert("No Content", "There is no text to copy.");
            return;
        }
        if (copyButtonTextRef.current && copyButtonTextRef.current.textContent !== 'Copied!') {
            try {
                await navigator.clipboard.writeText(extractedText);
                copyButtonTextRef.current.textContent = 'Copied!';
                setTimeout(() => {
                    if (copyButtonTextRef.current) copyButtonTextRef.current.textContent = 'Copy';
                }, 3000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showAlert("Copy Error", "Failed to copy text to clipboard.");
            }
        }
    };

    const handleDeleteTextbook = async () => {
        setIsDeleteModalOpen(false);
        setLoading(true);
        setLoadingMessage("Deleting textbook...");
        try {
            const response = await fetch(`/api/textbook/delete?id=${params.textbookId}`, { method: 'DELETE', credentials: 'include' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete textbook.');
            }
            router.push('/textbook-explainer');
        } catch (error) {
            console.error("Failed to delete textbook:", error);
            showAlert("Deletion Failed", error.message);
            setLoading(false);
        }
    };

    return (
        <motion.div className="flex w-full h-full bg-gradient-to-r from-[#000000] to-[#1A2145]" variants={containerVariants} initial="hidden" animate="visible">
            <LoadingModal isOpen={loading} message={loadingMessage} />
            <AlertModal isOpen={alertModal.isOpen} title={alertModal.title} message={alertModal.message} onClose={closeAlert} />
            <SuccessModal isOpen={successModal.isOpen} title={successModal.title} message={successModal.message} onClose={closeSuccess} />
            <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteTextbook} />

            <motion.div className="flex w-[32%] flex-col h-full border-r-[1px] border-white/[25%]" variants={itemVariants}>
                {/* File Upload Section */}
                <div className="file-upload flex w-full h-[35%] items-center ">
                    <motion.div 
                        className={`flex w-[88%] h-[80%] border-[1px] rounded-lg my-6 2xl:my-10 bg-[#1F2687]/[37%] mx-auto flex-col`}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        animate={{
                            borderColor: isDragging ? '#00BFFF' : 'rgba(255, 255, 255, 0.2)',
                            backgroundColor: isDragging ? 'rgba(0, 191, 255, 0.1)' : 'transparent',
                            scale: isDragging ? 1.05 : 1,
                        }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />
                        {!uploadedFile ? (
                            <div className="group flex flex-col w-full h-full mx-auto my-auto justify-center items-center  bg-[#141B3C]/[64%] shadow-[0_0px_45px_rgba(31,38,135,0.64)]">
                                <div className="flex flex-col justify-center items-center w-[85%] h-[85%] border-[2px] border-dashed border-white/[20%] rounded-md ">
                                    <CloudArrowUpIcon className={`text-[#00BFFF] w-8 h-8 2xl:w-10 2xl:h-10 transition-all duration-300 ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                                    <h1 className="text-sm text-center w-[80%] text-white/[80%] my-2">Drag & drop PDF here</h1>
                                    <span className="text-sm text-center w-[90%] text-white/[80%] mb-2">or</span>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="bg-[#00BFFF] py-1.5 2xl:py-2 px-3 2xl:px-4 mb-3 rounded-lg transition-all duration-300 hover:bg-[#00a5d9] active:scale-95 text-sm text-black font-bold">Browse Files</motion.button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full h-full p-4 justify-center">
                                <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 text-[#00BFFF] mb-3" />
                                <h2 className="text-lg 2xl:text-xl font-medium text-white mb-1 truncate w-full text-center">{uploadedFile.name}</h2>
                                <p className="text-sm text-gray-400 mb-4">{uploadedFile.size < 1024 * 1024 ? Math.round(uploadedFile.size / 1024) + "KB" : Math.round(uploadedFile.size / (1024 * 1024)) + "MB"} • PDF</p>
                                <div className="flex space-x-4 2xl:space-x-6">
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => fileInputRef.current.click()} className="text-sm bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded transition-colors">Replace</motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleRemoveFile} className="text-sm bg-red-600 hover:bg-red-700 py-1 px-3 rounded transition-colors">Remove</motion.button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
                {/* Raw Text Section */}
                <div className="raw-text-to-output flex flex-col w-full h-[65%] bg-[#1F2687]/[37%] rounded-t-lg border-[1px] border-white/[10%] ">
                    <div className="w-full h-full flex flex-col bg-[#141B3C]/[64%] inset-shadow-[0_0px_32px_rgba(0,0,0,0.64)] ">
                        <div className="flex w-full h-max items-center pt-4 2xl:pt-6">
                            <h1 className="mx-4 2xl:mx-6 my-auto text-lg 2xl:text-xl font-semibold">Raw Text from PDF</h1>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyText} className="flex cursor-pointer my-auto mr-6 2xl:mr-8 ml-auto items-center">
                                <DocumentDuplicateIcon className="w-5 h-5 my-auto text-[#00CED1]" />
                                <span ref={copyButtonTextRef} className="text-sm text-[#00CED1] ml-1">Copy</span>
                            </motion.div>
                        </div>
                        <div className="flex h-[83%] w-[90%] m-auto overflow-auto">
                            {isDataLoaded && (<PDFExtractor uploadedFile={fileForExtraction} setIsProcessing={setIsProcessing} setExtractedText={setExtractedText} setExtractionError={setExtractionError} />)}
                            <div className="w-full h-full bg-[#000000]/[30%] ">
                                <p className={`flex w-full h-full rounded-lg whitespace-pre-line break-words text-white overflow-auto p-2 text-sm ${!extractedText || isProcessing || extractionError ? 'justify-center items-center text-white/[50%] italic' : 'items-start bg-[#000000]/[30%]'}`}>
                                    {isProcessing ? "⏳ Processing..." : extractionError ? `❌ Error: ${extractionError}` : extractedText ? extractedText : "Please upload PDF to extract text!"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            
            <motion.div className="flex flex-col w-[68%] h-full" variants={itemVariants}>
                <div className="flex w-full h-[10%] border-b-[1px] border-white/[25%] text-xl 2xl:text-2xl font-bold text-[#00BFFF] items-center pl-6 2xl:pl-10">Explained PDF</div>
                <div className="flex w-full h-[90%] flex-grow">
                    {/* PDF Viewer Section */}
                    <div className="pdf-viewer flex w-[60%] h-full bg-[#1F2687]/[37%]">
                        <div className="bg-[#1A1D2C]/[30%] w-full h-full rounded-t-lg border-[1px] border-b-0 border-white/[25%] flex">
                            {isDataLoaded && explanationPdf != null ? <PdfViewer file={explanationPdf} /> :
                                <div className="w-full h-full justify-center items-center flex flex-col space-y-4 text-white/[50%]">
                                    <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12" />
                                    <h1 className="text-lg 2xl:text-xl">No PDF generated yet</h1>
                                    <span className="text-sm">Upload a PDF and click generate to begin processing...</span>
                                </div>
                            }
                        </div>
                    </div>
                    {/* Format Options Section */}
                    <div className="format-options flex flex-col w-[40%] h-full border-[1px] border-white/[25%] pt-4 2xl:pt-5">
                        <h1 className="h-min flex text-lg 2xl:text-xl font-bold text-[#00BFFF] px-5 2xl:px-7">Output Format Settings</h1>
                        <motion.div variants={itemVariants} className="w-[88%] h-[30%] mx-auto flex justify-center border-[1px] border-white/[5%] my-auto rounded-lg overflow-hidden bg-[#1F2687]/[37%] inset-shadow-[0_0px_24px_rgba(0,0,0,0.37)] shadow-[0_0px_45px_rgba(31,38,135,0.37)]">
                            <div className="w-full h-full bg-black/[30%] px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-base">Content Analysis</h1>
                                {['simple_analogies', 'key_people', 'historical_timelines', 'flashcards'].map(option => (
                                    <div key={option} className="flex justify-between items-center">
                                        <span className="text-sm text-white/[80%]">{formatLabel(option)}</span>
                                        <Switch onChange={() => handleFormatChange(option)} checked={!!formatOptions[option]} height={20} width={40} handleDiameter={16} onColor="#00BFFF" offColor="#334155" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="w-[88%] mx-auto h-[30%] flex border-[1px] border-white/[5%] my-auto rounded-lg overflow-hidden bg-[#1F2687]/[37%] inset-shadow-[0_0px_24px_rgba(0,0,0,0.37)] shadow-[0_0px_45px_rgba(31,38,135,0.37)]">
                            <div className="w-full h-full bg-black/[30%] px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-base">Study Tools</h1>
                                {['practice_questions', 'cross_references', 'references', 'instructions'].map(option => (
                                    <div key={option} className="flex justify-between items-center">
                                        <span className="text-sm text-white/[80%]">{formatLabel(option)}</span>
                                        <Switch onChange={() => handleFormatChange(option)} checked={!!formatOptions[option]} height={20} width={40} handleDiameter={16} onColor="#00BFFF" offColor="#334155" />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                        <div className="h-[25%] w-full border-t-[1px] border-white/[25%] my-auto flex flex-col justify-evenly">
                            <motion.button whileHover={{ scale: 1.05, y: -2, boxShadow: "0px 5px 15px rgba(0, 191, 255, 0.4)" }} whileTap={{ scale: 0.95 }} onClick={handleRegeneratePDF} className="flex cursor-pointer bg-[#00BFFF] w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base text-black font-bold">
                                <SparklesIcon className="w-5 h-5" />
                                <span>Regenerate Explanation</span>
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadTextbook} className="flex cursor-pointer bg-gray-800 text-[#00BFFF] w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base hover:bg-gray-700">
                                <CloudArrowDownIcon className="w-5 h-5 2xl:w-6 2xl:h-6" />
                                <span className="ml-1">Download PDF</span>
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDeleteModalOpen(true)} className="flex cursor-pointer bg-red-600 w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base hover:bg-red-700">
                                <TrashIcon className="w-5 h-5 2xl:w-6 2xl:h-6" />
                                <span className="ml-1">Delete Textbook</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
