'use client';
import React, { useState, useEffect, useRef } from "react";
import { InformationCircleIcon, BoltIcon, DocumentDuplicateIcon, TrashIcon, DocumentTextIcon, DocumentArrowDownIcon } from "@heroicons/react/24/solid";
import { useParams, useRouter } from "next/navigation";
import { formatTimeAgo } from "@/app/timeHelper";
import LoadingPopup from "@/app/LoadingPopup";
import DeleteConfirmationPopup from "@/app/DeleteModalConfirmation";
import dynamic from 'next/dynamic';

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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


    const handleCopyInputText = async () => {
        if (!inputText) {
            alert("Nothing to copy!");
            return;
        }

        try {
            await navigator.clipboard.writeText(inputText);
            alert("Input prompt copied to clipboard!"); // Or use a more subtle notification
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert("Failed to copy text.");
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
            alert("There is no content to save.");
            return;
        }   

        setSaveStatus('saving');
        try {   
            const response = await fetch('/api/document/edit/textMd', {
                method: 'POST',
                body: JSON.stringify({
                    textMd : documentText,
                    documentId: params.documentId,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                alert(`Error saving document: ${errorData.error || 'Unknown error'}`);
                return;
            }
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 1500);
        } catch (error) {   
            console.error("Error saving document:", error);
            alert("Failed to save document. Please try again later.");
            setSaveStatus('idle');

        }
    };

    const handleDeleteDocument = async (e) => {
        e.preventDefault();

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
                alert(`Error deleting document: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Failed to delete document. Please try again later.");
            
        }
    }

    const handleRegenerateDocument = async (e) => {
        e.preventDefault();

        if (!name || !inputText) {
            alert("Please enter a document title and input text.");
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
                alert(`Error generating document: ${errorData.error || 'Unknown error'}`);
                return;
            }
            const data = await response.json();
            setPollingDocumentId(data.documentId);
            setLoadingMessage("Generating document...");
        } catch (error) {
            console.log("Error starting document generation:", error);
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
    if (!documentText) {
        alert("No document generated yet to download.");
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
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;
        
        // Sanitize the filename
        const sanitizedFileName = (name || 'document')
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
        alert(`Failed to download PDF: ${error.message || 'Unknown error'}`);
    } finally {
        setLoading(false);
    }
};

    useEffect(() => {
        // Initialize the document with default values or fetch from API if needed
        const fetchDocument = async () => {
            try {
                setLoading(true);
                setLoadingMessage("Loading document settings...");

                if (params.documentId === 'undefined' || params.documentId === 'null') {
                    router.push('/document/');
                    return;
                }

                const response = await fetch(`/api/document/getDocumentDetails?document_id=${params.documentId}`,
                    {
                        method: 'GET',
                        credentials: 'include'
                    }
                );

                if (response.status != 200) {
                    router.push('/document/');
                    return;
                }

                const data = await response.json();

                setInputText(data.user_prompt || "");
                setDocumentText(data.files.documentFile.content || "");
                setName(data.name || "");
                setPromptTemplate(data.format_type === 'research_paper' ? 0 :
                    data.format_type === 'business_proposal' ? 1 :
                        data.format_type === 'cover_letter' ? 2 :
                            data.format_type === 'formal_report' ? 3 :
                                data.format_type === 'general_essay' ? 4 : 0);

                setWordCount(wordCounter(data.user_prompt || 0));
                setCharCount(charCounter(data.user_prompt || 0));

                setCreationTimestamp(data.created_at || "");

                console.log("Document details fetched successfully:", data);

            } catch (error) {
                console.error("Error fetching document details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDocument();
    }, [params.documentId, router]);

    useEffect(() => {
        if (!pollingDocumentId) {
            return;
        }

        const intervalId = setInterval(async () => {
            try {
                const response = await fetch(`/api/document/status?id=${pollingDocumentId}`, {
                    credentials: 'include',
                });

                if (!response.ok) {
                    throw new Error('Could not get job status.');
                }

                const data = await response.json();

                if (data.status === 'COMPLETED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    window.location.reload(); // Reload the page to fetch the updated document
                } else if (data.status === 'FAILED') {
                    clearInterval(intervalId);
                    setLoading(false);
                    alert(`Document generation failed: ${data.errorMessage || 'An unknown error occurred.'}`);
                    setPollingDocumentId(null);
                }

            } catch (error) {
                console.error(error);
                clearInterval(intervalId);
                setLoading(false);
                alert('An error occurred while checking the Document status.');
                setPollingDocumentId(null);
            }
        }, 5000);

        return () => clearInterval(intervalId);
    }, [pollingDocumentId, router]);


    useEffect(() => {
        if (!creationTimestamp) {
            return;
        }

        setTimeCreated(formatTimeAgo(creationTimestamp));

        const intervalId = setInterval(() => {
            setTimeCreated(formatTimeAgo(creationTimestamp));
        }, 1000);

        return () => clearInterval(intervalId);

    }, [creationTimestamp]);

       const SaveStatusPopup = ({ status }) => {
        if (status === 'idle') {
            return null;
        }
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-[#141B3C]/[80%] p-8 rounded-2xl shadow-xl flex flex-col items-center border border-white/[15%] min-w-[250px]">
                    {status === 'saving' && (
                        <>
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00BFFF]"></div>
                            <p className="text-white text-xl mt-5 font-semibold">Saving Note...</p>
                            <p className="text-white/[60%] text-sm mt-1">Please wait a moment.</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <svg className="w-20 h-20 text-[#00BFFF]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 24, strokeDashoffset: 'var(--offset, 24)', animation: 'draw 0.5s ease-out forwards' }} />
                            </svg>
                            <p className="text-white text-xl mt-5 font-semibold">Saved Successfully!</p>
                        </>
                    )}
                </div>
                <style jsx global>{`
                @keyframes draw {
                    to {
                        --offset: 0;
                    }
                }
            `}</style>
            </div>
        );
    };

    return (
        <div className="flex h-full w-full justify-center items-center bg-gradient-to-r from-[#000120] to-[#18214E]">

            <SaveStatusPopup status={saveStatus} />

            {loading && <LoadingPopup loadingMessage={loadingMessage} />}
            <DeleteConfirmationPopup
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            onConfirm={handleDeleteDocument}
                            type='document'
                        />

            <div className="flex flex-col w-[21.5%] h-full border-r-[1px] border-white/[25%] p-4 bg-[#141B3C]/[64%]">
                <h1 className="text-xl text-[#00BFFF] font-bold w-max pb-7">Document Settings</h1>
                <h2 className="w-max text-sm">Document Title</h2>
                <input onChange={(e) => { setName(e.target.value) }} type="text" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] mt-3 mb-7 py-2 px-3 text-sm" placeholder="Enter document title" defaultValue={name} />
                <h2 className="w-max text-sm">Prompt Template</h2>
                <button onClick={() => { setPromptTemplate(0) }} className={`w-full ${promptTemplate === 0 ? 'bg-[#3366FF]/30' : 'bg-black/[30%]'} cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm`}>
                    <h3 className={`text-sm font-bold ${promptTemplate === 0 ? 'text-[#00BFFF]' : ''} `}>Research Paper  </h3>
                    <span className=" text-xs text-white/50">Academic format with citations</span>
                </button>
                <button onClick={() => { setPromptTemplate(1) }} className={`w-full ${promptTemplate === 1 ? 'bg-[#3366FF]/30' : 'bg-black/[30%]'} cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm`}>
                    <h3 className={`text-sm font-bold ${promptTemplate === 1 ? 'text-[#00BFFF]' : ''} `}>Business Proposal  </h3>
                    <span className=" text-xs text-white/50">Professional format with executive summary</span>
                </button>
                <button onClick={() => { setPromptTemplate(2) }} className={`w-full ${promptTemplate === 2 ? 'bg-[#3366FF]/30' : 'bg-black/[30%]'} cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm`}>
                    <h3 className={`text-sm font-bold ${promptTemplate === 2 ? 'text-[#00BFFF]' : ''} `}>Cover Letter</h3>
                    <span className=" text-xs text-white/50">Professional job application</span>
                </button>
                <button onClick={() => { setPromptTemplate(3) }} className={`w-full ${promptTemplate === 3 ? 'bg-[#3366FF]/30' : 'bg-black/[30%]'} cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm`}>
                    <h3 className={`text-sm font-bold ${promptTemplate === 3 ? 'text-[#00BFFF]' : ''} `}>Formal Report</h3>
                    <span className=" text-xs text-white/50">Structured findings with clear sections</span>
                </button>
                <button onClick={() => { setPromptTemplate(4) }} className={`w-full ${promptTemplate === 4 ? 'bg-[#3366FF]/30' : 'bg-black/[30%]'} cursor-pointer border border-white/[25%] text-start rounded-lg text-white mt-3 mb-1 py-4 px-3 text-sm`}>
                    <h3 className={`text-sm font-bold ${promptTemplate === 4 ? 'text-[#00BFFF]' : ''} `}>General Essay</h3>
                    <span className=" text-xs text-white/50">Informative or opinionated writing</span>
                </button>

            </div>
            <div className="flex flex-col w-[37.5%] h-full border-r-[1px] border-white/[25%] bg-black/10 pb-3">
                <div className="flex w-full h-[8%] border-b border-white/[25%] items-center px-3">
                    <h1 className="font-semibold font-stretch-normal">Input Prompt</h1>
                    <span className="bg-[#3366FF]/[20%] text-[#00BFFF] text-xs rounded-full py-0.5 px-2 ml-2">Gemini 2.5 pro</span>
                </div>
                <div className="flex flex-col w-full h-[82%] py-3">
                    <div className="alert-box cursor-none mx-3 flex h-[6%] border-[1px] border-white/[25%] bg-black/20 rounded-md mb-3 justify-start items-center p-3">
                        <InformationCircleIcon className="w-5 h-5 text-white/[70%] inline-block mr-2" />
                        <span className="text-white/[50%] text-sm">
                            Be specific with your prompts for better results!
                        </span>
                    </div>
                    <textarea className=" mx-3 h-max min-h-[40%] max-h-[70%] bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] px-4 py-3 text-sm" placeholder="Enter your prompt here..." onChange={handleInputChange} defaultValue={inputText} />
                    <div className="flex mx-3 flex-col justify-between items-end mt-3">
                        <span className="text-white/[70%] text-xs">Word Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{wordCount}</span></span>
                        <span className="text-white/[70%] text-xs">Character Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{charCount}</span></span>
                    </div>
                </div>
                <div className="flex mt-auto border-t border-white/[25%] justify-evenly pt-3 px-3 space-x-2 h-[7%]">
                    <button onClick={handleCopyInputText} className=" cursor-pointer text-sm w-[30%] flex items-center justify-center border-r border-white/[25%] bg-[#00CED1]/[80%] hover:bg-[#00CED1]/[60%] transition-colors rounded-md px-2 py-2">
                        <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold text-white/[70%]">Copy Text</span>
                    </button>
                    <button onClick={() => { setInputText("") }} className=" cursor-pointer text-sm w-[30%] flex items-center justify-center bg-red-500/[70%] hover:bg-red-500/[60%] transition-colors rounded-md px-2 py-2">
                        <TrashIcon className="w-4 h-4 mr-1" />
                        <span className="text-xs font-semibold text-white/[70%]">Clear Text</span>
                    </button>
                    <button onClick={handleRegenerateDocument} className=" cursor-pointer bg-[#00BFFF] w-[60%] text-white rounded-md px-4 py-2 hover:bg-[#0099CC] transition-colors items-center justify-center flex">
                        <BoltIcon className="w-4 h-4 inline-block mr-2" />
                        <span className="text-sm font-semibold">Regenerate Document</span>
                    </button>

                </div>
            </div>
            <div className="flex flex-col w-[42.5%] h-full bg-[#1F2687]/[37%] ">
                <div className="w-full h-full bg-[#000831] flex flex-col pb-3">
                    <div className="h-[8%] border-b w-full border-white/[25%] bg-black/20 flex items-center">
                        <h1 className="text-xl text-[#00BFFF] font-semibold w-max p-3">Generated Document</h1>
                        <button onClick={handleSaveText} className="text-xs bg-gray-800 py-1.5 2xl:py-2 px-3 rounded-md ml-auto text-[#00BFFF] mr-3">Save Text</button>
                    </div>
                    <div className="flex flex-col flex-grow justify-center items-center text-center h-[84%]">
                        {
                            documentText !== '' &&
                            <MDEditor
                                value={documentText}
                                onChange={setDocumentText}
                                height="100%"
                                className="w-full bg-transparent fixed-height-editor"
                                style={{
                                    height: '100%',
                                    overflow: 'hidden',
                                    '--md-editor-font-family': 'inherit',
                                }}
                                previewOptions={{
                                    wrapperElement: {
                                        "data-color-mode": "dark",
                                        style: {
                                            height: '100%',
                                            overflow: 'auto',
                                            backgroundColor: 'transparent'
                                        }
                                    }
                                }}
                            />
                        }
                        {
                            documentText === '' &&
                            <div className="flex flex-col flex-grow justify-center items-center text-center">
                                <DocumentTextIcon className="w-12 h-12 text-white/[50%] mb-3 bg-black/20" />
                                <h1 className="mb-3 text-white/[50%]">No document generated yet!</h1>
                                <span className="text-white/[50%] text-xs">Once you generate a document, it will appear here...</span>
                            </div>
                        }
                    </div>
                    <div className="h-[7%] items-center border-t border-white/[25%] flex pt-3 space-x-2 px-3 ">
                        <button onClick={ () => setIsDeleteModalOpen(true) } className="flex w-[25%] bg-red-500/70 py-2 text-white rounded-md hover:bg-red-500/60 transition-colors items-center justify-center">
                            <TrashIcon className="w-4 h-4 mr-2 flex" />
                            <span className="text-sm flex mr-1">Delete</span>
                        </button>
                        <button onClick={ handleDownloadPdf } className="flex w-[35%] bg-[#00CED1] px-2 py-2 text-white rounded-md hover:bg-[#0099CC] transition-colors flex items-center justify-center">
                            <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                            <span className="text-sm">Export (PDF)</span>
                        </button>
                        <span className="flex items-center justify-start text-white/[70%] w-[70%] mr-3">
                            <span className="mx-2 text-white/[70%] text-sm">Created: </span>
                            <span className=" text-[#00BFFF] text-sm font-semibold">{timeCreated}</span>
                        </span>
                    </div>
                </div>

            </div>
        </div>
    )
}