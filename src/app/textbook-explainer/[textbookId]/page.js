'use client'

import { useState, useEffect, useRef, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { DocumentDuplicateIcon, SparklesIcon, DocumentTextIcon, CloudArrowDownIcon, TrashIcon } from "@heroicons/react/24/solid";
import dynamic from "next/dynamic";
import Switch from "react-switch";
import DeleteConfirmationPopup from "@/app/DeleteModalConfirmation";
import LoadingPopup from "@/app/LoadingPopup";

const PdfViewer = dynamic(() => import('../PdfViewer'), {
    ssr: false,
    loading: () => <p className="text-white">Loading PDF Viewer...</p>
});

const PDFExtractor = dynamic(() => import('../UploadedPdfComponent'), {
    ssr: false,
    loading: () => <p className="text-white">Loading PDF Viewer...</p>
});



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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [rawPdf, setRawPdf] = useState({ content: null, name: 'Untitled.pdf' });

    const [fileForExtraction, setFileForExtraction] = useState(null);

    const copyButtonTextRef = useRef(null);

    // Single handler to update any of the format options
    const handleFormatChange = (optionName) => {
        setFormatOptions(prevState => ({
            ...prevState,
            [optionName]: !prevState[optionName]
        }));
    };

    const getMimeType = (filename = '') => {
        const extension = filename.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf': return 'application/pdf';
            case 'txt': return 'text/plain';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'png': return 'image/png';
            default: return 'application/octet-stream';
        }
    };

    const formatLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    useEffect(() => {

        const base64ToBlob = (base64, contentType = 'application/octet-stream') => {
            const byteCharacters = atob(base64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, { type: contentType });
        };

        const fetchContent = async () => {
            setLoading(true);
            setLoadingMessage("Loading textbook details...");

            try {

                if (params.textbookId === 'undefined' || params.textbookId === '') {
                    return;
                }

                const response = await fetch(`/api/textbook/getTextbookDetails?textbook_id=${params.textbookId}`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if(response.status != 200){
                    console.error("Textbook not found or error occurred, redirecting.");
                    router.push('/textbook-explainer/');
                    return; 
                }

                const data = await response.json();
                const textbook = data.textbook;

                console.log(data.textbook);

                setExtractedText(textbook.textbookTXTFile.content);


                // 1. Set all text and option states
                setExtractedText(textbook.textbookTXTFile.content);

                const newFormatOptions = Object.keys(formatOptions).reduce((acc, key) => {
                    acc[key] = Boolean(textbook[key]);
                    return acc;
                }, {});
                setFormatOptions(newFormatOptions);

                // 2. Create the File object for the ORIGINAL uploaded file
                const originalFileBlob = base64ToBlob(textbook.originalFile.content, getMimeType(textbook.name));
                const originalFileObject = new File([originalFileBlob], textbook.name, { type: getMimeType(textbook.name) });
                setUploadedFile(originalFileObject);

                const explanationFileName = `${textbook.name.replace(/\.[^/.]+$/, "")}_explained.pdf`;
                setRawPdf({
                    content: textbook.explanationFile.content, // The raw Base64 string
                    name: explanationFileName
                });


                setIsDataLoaded(true);

            } catch (error) {
                console.error("Failed to fetch content:", error);
                setExtractionError("Could not load textbook data.");
            } finally {
                // Stop loading regardless of success or failure
                setLoading(false);
            }
        }

        fetchContent();
    }, [params.textbookId, router])

    const explanationPdf = useMemo(() => {
        // If there's no raw content, we have no PDF to show.
        if (!rawPdf.content) {
            return null;
        }

        // This conversion logic is now protected and only runs when needed.
        const base64ToBlob = (base64, contentType = 'application/octet-stream') => {
            const byteCharacters = atob(base64);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                byteArrays.push(byteArray);
            }
            return new Blob(byteArrays, { type: contentType });
        };

        const blob = base64ToBlob(rawPdf.content, 'application/pdf');
        return new File([blob], rawPdf.name, { type: 'application/pdf' });

    }, [rawPdf.content, rawPdf.name]);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    }

    const handleDragLeave = () => {
        setIsDragging(false);
    }

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
    }

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setExtractionError(''); // And any errors
        setFileForExtraction(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    const validateAndUpload = (file) => {
        const validType = [
            'application/pdf'
        ];

        if (!validType.includes(file.type)) {
            alert('Please upload only PDF files!');
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            alert('File size exceeds 500MB limit');
            return;
        }

        console.log('Uploading file:', file.name);

        setUploadedFile(file);
        setFileForExtraction(file);
    }

    const handleRegeneratePDF = async (e) => {
        e.preventDefault();

        if (!uploadedFile) {
            alert("Please upload a file first.");
            return;
        }

        setLoadingMessage("Uploading your file...");
        setLoading(true);

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('formatOptions', JSON.stringify(formatOptions));
        formData.append('extractedText', extractedText);
        formData.append('id', params.textbookId);

        try {
            const response = await fetch(`/api/textbook/re-generate`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.status !== 200) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to start the generation process.');
            }

            const result = await response.json();

            // Set the Textbook ID to start the polling effect
            setPollingTextbookId(result.textbookId);
            setLoadingMessage("Processing your document...");
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    }

    // --- NEW: This useEffect handles the polling logic ---
    useEffect(() => {
        // Don't do anything if we don't have a textbook ID to poll
        if (!pollingTextbookId) {
            return;
        }

        // Set up an interval to check the status every 5 seconds
        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/textbook/status?id=${pollingTextbookId}`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Could not get job status.');
                }

                const data = await response.json();

                console.log(data);

                if (data.status === 'COMPLETED') {
                    // Job is done! Stop polling and redirect.
                    clearInterval(intervalId);
                    setLoading(false);
                    window.location.reload();
                } else if (data.status === 'FAILED') {
                    // Job failed. Stop polling and show an error.
                    clearInterval(intervalId);
                    setLoading(false);
                    alert(`Textbook generation failed: ${data.errorMessage || 'An unknown error occurred.'}`);
                    setPollingTextbookId(null);
                }
                // If status is 'PENDING' or 'PROCESSING', do nothing and let the interval run again.

            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                alert('An error occurred while checking the textbook status.');
                setPollingTextbookId(null);
            }
        }, 5000);

        // Cleanup function: This is crucial to stop the interval 
        // if the component unmounts for any reason.
        return () => clearInterval(intervalId);

    }, [pollingTextbookId, router]);

    const handleDownloadTextbook = () => {
        if (!explanationPdf) {
            alert("No explanation PDF is available to download.");
            return;
        }

        const fileUrl = URL.createObjectURL(explanationPdf);

        const link = document.createElement('a');
        link.href = fileUrl;

        link.download = explanationPdf.name || 'explanation.pdf'; // Fallback filename

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(fileUrl);
    };

    const handleCopyText = async () => {
        // 1. Only check if text is empty, as requested
        if (!extractedText) {
            return;
        }

        // 2. Make sure the element exists and is not already showing "Copied!"
        if (copyButtonTextRef.current && copyButtonTextRef.current.textContent !== 'Copied!') {
            try {
                await navigator.clipboard.writeText(extractedText);

                // 3. Directly change the text
                copyButtonTextRef.current.textContent = 'Copied!';

                // 4. Set a timer to change it back after 3 seconds
                setTimeout(() => {
                    // Check if the element still exists before changing it back
                    if (copyButtonTextRef.current) {
                        copyButtonTextRef.current.textContent = 'Copy';
                    }
                }, 3000);

            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    const handleDeleteTextbook = async () => {
        setIsDeleteModalOpen(false); 

        try {
            const response = await fetch(`/api/textbook/delete?id=${params.textbookId}`, {
                method: 'DELETE',
                credentials: 'include', // Sends cookies with the request
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete textbook.');
            }

            // On successful deletion, redirect the user away from the now-deleted textbook
            router.push('/textbook-explainer'); // Redirect to your main textbooks list page

        } catch (error) {
            console.error("Failed to delete textbook:", error);
            alert(error.message);
        }
    };

    return (
        <div className="flex w-full h-full bg-gradient-to-r from-[#000000] to-[#1A2145]">

            {loading && <LoadingPopup loadingMessage={loadingMessage} />}
            <DeleteConfirmationPopup
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTextbook}
                type='textbook'
            />

            <div className="flex w-[32%] flex-col h-full border-r-[1px] border-white/[25%]">
                <div className="file-upload flex w-full h-[35%] items-center ">
                    <div className={`flex w-[88%] h-[80%] border-[1px] border-white/[20%] rounded-lg my-6 2xl:my-10 bg-[#1F2687]/[37%] mx-auto flex-col ${isDragging ? 'border-solid border-[#00BFFF] bg-[#00bfff20] scale-105' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".pdf"
                            onChange={handleFileChange}
                        />
                        {!uploadedFile ? (
                            <div className="group flex flex-col w-full h-full mx-auto my-auto justify-center items-center  bg-[#141B3C]/[64%] shadow-[0_0px_45px_rgba(31,38,135,0.64)]">
                                <div className="flex flex-col justify-center items-center w-[85%] h-[85%] border-[2px] border-dashed border-white/[20%] rounded-md ">
                                    <CloudArrowUpIcon className={`text-[#00BFFF] w-8 h-8 2xl:w-10 2xl:h-10 transition-all duration-300 ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'}`} />
                                    <h1 className="text-sm text-center w-[80%] text-white/[80%] my-2">
                                        Drag & drop PDF here
                                    </h1>
                                    <span className="text-sm text-center w-[90%] text-white/[80%] mb-2">
                                        or
                                    </span>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="bg-[#00BFFF] py-1.5 2xl:py-2 px-3 2xl:px-4 mb-3 rounded-lg transition-all duration-300 hover:scale-105 hover:bg-[#00a5d9] active:scale-95 text-sm"
                                    >
                                        Browse Files
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full h-full p-4 justify-center">
                                <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12 text-[#00BFFF] mb-3" />
                                <h2 className="text-lg 2xl:text-xl font-medium text-white mb-1 truncate w-full text-center">
                                    {uploadedFile.name}
                                </h2>
                                <p className="text-sm text-gray-400 mb-4">
                                    {uploadedFile.size < 1024 * 1024 ? Math.round(uploadedFile.size / 1024) + "KB" : Math.round(uploadedFile.size / (1024 * 1024)) + "MB"} • PDF
                                </p>
                                <div className="flex space-x-4 2xl:space-x-6">
                                    <button onClick={() => fileInputRef.current.click()} className="text-sm bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded transition-colors">
                                        Replace
                                    </button>
                                    <button onClick={handleRemoveFile} className="text-sm bg-red-600 hover:bg-red-700 py-1 px-3 rounded transition-colors">
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="raw-text-to-output flex flex-col w-full h-[65%] bg-[#1F2687]/[37%] rounded-t-lg border-[1px] border-white/[10%] ">
                    <div className="w-full h-full flex flex-col bg-[#141B3C]/[64%] inset-shadow-[0_0px_32px_rgba(0,0,0,0.64)] ">
                        <div className="flex w-full h-max items-center pt-4 2xl:pt-6">
                            <h1 className="mx-4 2xl:mx-6 my-auto text-lg 2xl:text-xl font-semibold">Raw Text from PDF</h1>
                            <div onClick={handleCopyText} className="flex cursor-pointer my-auto mr-6 2xl:mr-8 ml-auto">
                                <DocumentDuplicateIcon className="w-5 h-5 my-auto text-[#00CED1]" />
                                <span ref={copyButtonTextRef} className="text-sm text-[#00CED1] ml-1">Copy</span>
                            </div>
                        </div>
                        <div className="flex h-[83%] w-[90%] m-auto overflow-auto">
                            {isDataLoaded && (
                                <PDFExtractor
                                    uploadedFile={fileForExtraction}
                                    setIsProcessing={setIsProcessing}
                                    setExtractedText={setExtractedText}
                                    setExtractionError={setExtractionError}
                                />
                            )}
                            <div className="w-full h-full bg-[#000000]/[30%] ">
                                <p className={`flex w-full h-full rounded-lg whitespace-pre-line break-words text-white overflow-auto p-2 text-sm ${!extractedText || isProcessing || extractionError ? 'justify-center items-center text-white/[50%] italic' : 'items-start bg-[#000000]/[30%]'}`}>
                                    {isProcessing ? "⏳ Processing..." :
                                        extractionError ? `❌ Error: ${extractionError}` :
                                            extractedText ? extractedText : "Please upload PDF to extract text!"
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col w-[68%] h-full">
                <div className="flex w-full h-[10%] border-b-[1px] border-white/[25%] text-xl 2xl:text-2xl font-bold text-[#00BFFF] items-center pl-6 2xl:pl-10">Explained PDF</div>
                <div className="flex w-full h-[90%] flex-grow">
                    <div className="pdf-viewer flex w-[60%] h-full bg-[#1F2687]/[37%]">
                        <div className="bg-[#1A1D2C]/[30%] w-full h-full rounded-t-lg border-[1px] border-b-0 border-white/[25%] flex">
                            {isDataLoaded && explanationPdf != null ?
                                <PdfViewer file={explanationPdf} />
                                :
                                <div className="w-full h-full justify-center items-center flex flex-col space-y-4 text-white/[50%]">
                                    <DocumentTextIcon className="w-10 h-10 2xl:w-12 2xl:h-12" />
                                    <h1 className="text-lg 2xl:text-xl">No PDF generated yet</h1>
                                    <span className="text-sm">Upload a PDF and click generate to begin processing...</span>
                                </div>
                            }
                        </div>
                    </div>
                    <div className="format-options flex flex-col w-[40%] h-full border-[1px] border-white/[25%] pt-4 2xl:pt-5">
                        <h1 className="h-min flex text-lg 2xl:text-xl font-bold text-[#00BFFF] px-5 2xl:px-7">Output Format Settings</h1>
                        <div className="w-[88%] h-[30%] mx-auto flex justify-center border-[1px] border-white/[5%] my-auto rounded-lg overflow-hidden bg-[#1F2687]/[37%] inset-shadow-[0_0px_24px_rgba(0,0,0,0.37)] shadow-[0_0px_45px_rgba(31,38,135,0.37)]">
                            <div className="w-full h-full bg-black/[30%] px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-base">Content Analysis</h1>
                                {['simple_analogies', 'key_people', 'historical_timelines', 'flashcards'].map(option => (
                                    <div key={option} className="flex justify-between items-center">
                                        <span className="text-sm text-white/[80%]">{formatLabel(option)}</span>
                                        <Switch
                                            onChange={() => handleFormatChange(option)}
                                            checked={!!formatOptions[option]}
                                            height={20} width={40} handleDiameter={16}
                                            onColor="#00BFFF" offColor="#334155"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-[88%] mx-auto h-[30%] flex border-[1px] border-white/[5%] my-auto rounded-lg overflow-hidden bg-[#1F2687]/[37%] inset-shadow-[0_0px_24px_rgba(0,0,0,0.37)] shadow-[0_0px_45px_rgba(31,38,135,0.37)]">
                            <div className="w-full h-full bg-black/[30%] px-3 2xl:px-4 pb-1 2xl:pb-2 flex flex-col justify-evenly">
                                <h1 className="font-bold text-sm 2xl:text-base">Study Tools</h1>
                                {['practice_questions', 'cross_references', 'references', 'instructions'].map(option => (
                                    <div key={option} className="flex justify-between items-center">
                                        <span className="text-sm text-white/[80%]">{formatLabel(option)}</span>
                                        <Switch
                                            onChange={() => handleFormatChange(option)}
                                            checked={!!formatOptions[option]}
                                            height={20} width={40} handleDiameter={16}
                                            onColor="#00BFFF" offColor="#334155"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="h-[25%] w-full border-t-[1px] border-white/[25%] my-auto flex flex-col justify-evenly">
                            <button onClick={handleRegeneratePDF} className="flex cursor-pointer bg-[#00BFFF] w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base">
                                <SparklesIcon className="w-5 h-5" />
                                <span>Regenerate Explanation PDF</span>
                            </button>
                            <button onClick={handleDownloadTextbook} className="flex cursor-pointer bg-gray-800 text-[#00BFFF] w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base">
                                <CloudArrowDownIcon className="w-5 h-5 2xl:w-6 2xl:h-6" />
                                <span className="ml-1"> Download Explanation PDF</span>
                            </button>
                            <button onClick={() => setIsDeleteModalOpen(true)} className="flex cursor-pointer bg-red-500 w-[88%] mx-auto py-2 2xl:py-2.5 rounded-lg items-center justify-center space-x-1 text-sm 2xl:text-base">
                                <TrashIcon className="w-5 h-5 2xl:w-6 2xl:h-6" />
                                <span className="ml-1"> Delete Textbook</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}