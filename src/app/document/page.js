'use client';
import React, { useState, useEffect } from "react";
import { InformationCircleIcon, BoltIcon, DocumentDuplicateIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/solid";
import LoadingPopup from "../LoadingPopup";
import { useRouter } from "next/navigation";

export default function document() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [inputText, setInputText] = useState("");
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [promptTemplate, setPromptTemplate] = useState(0);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Initializing...");
    const [pollingDocumentId, setPollingDocumentId] = useState(null);

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

    const handleGenerateDocument = async (e) => {
        e.preventDefault();

        if (!name || !inputText) {
            alert("Please enter a document title and input text.");
            return;
        }
        setLoadingMessage("Starting document generation...");
        setLoading(true);

        try {
            const response = await fetch('/api/document/start-generation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    user_prompt: inputText,
                    format_type : promptTemplate === 0 ? 'research_paper' :
                                promptTemplate === 1 ? 'business_proposal' :
                                promptTemplate === 2 ? 'cover_letter' :
                                promptTemplate === 3 ? 'formal_report' :
                                promptTemplate === 4 ? 'general_essay' : 'research_paper',
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
                        router.push(`/document/${pollingDocumentId}`);
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
    

    return (
        <div className="flex h-full w-full justify-center items-center bg-gradient-to-r from-[#000120] to-[#18214E]">

            {loading && <LoadingPopup loadingMessage={loadingMessage} />}

            <div className="flex flex-col w-[21.5%] h-full border-r-[1px] border-white/[25%] p-4 bg-[#141B3C]/[64%]">
                <h1 className="text-xl text-[#00BFFF] font-bold w-max pb-7">Document Settings</h1>
                <h2 className="w-max text-sm">Document Title</h2>
                <input onChange={(e) => { setName(e.target.value) }} type="text" className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] mt-3 mb-7 py-2 px-3 text-sm" placeholder="Enter document title" />
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
            <div className="flex flex-col w-[39.5%] h-full border-r-[1px] border-white/[25%] bg-black/10">
                <div className="flex w-full h-[8%] border-b border-white/[25%] items-center px-3">
                    <h1 className="font-semibold font-stretch-normal">Input Prompt</h1>
                    <span className="bg-[#3366FF]/[20%] text-[#00BFFF] text-xs rounded-full py-0.5 px-2 ml-2">Gemini 2.5 pro</span>
                </div>
                <div className="flex flex-col w-full h-[92%] py-3">
                    <div className="alert-box cursor-none mx-3 flex h-[6%] border-[1px] border-white/[25%] bg-black/20 rounded-md mb-3 justify-start items-center p-3">
                        <InformationCircleIcon className="w-5 h-5 text-white/[70%] inline-block mr-2" />
                        <span className="text-white/[50%] text-sm">
                            Be specific with your prompts for better results!
                        </span>
                    </div>
                    <textarea className=" mx-3 h-max min-h-[40%] max-h-[70%] bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] px-4 py-3 text-sm" placeholder="Enter your prompt here..." onChange={handleInputChange} />
                    <div className="flex mx-3 flex-col justify-between items-end mt-3">
                        <span className="text-white/[70%] text-xs">Word Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{wordCount}</span></span>
                        <span className="text-white/[70%] text-xs">Character Count: <span className={`${wordCount > 0 ? 'text-[#00BFFF]' : ''}`}>{charCount}</span></span>
                    </div>
                    <div onClick={handleCopyInputText} className="flex mt-auto border-t border-white/[25%] justify-evenly pt-3 px-3 space-x-2">
                        <button className=" cursor-pointer text-sm w-[23%] flex items-center justify-center border-r border-white/[25%] bg-[#00CED1]/[80%] hover:bg-[#00CED1]/[60%] transition-colors rounded-md px-2 py-2">
                            <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold text-white/[70%]">Copy Text</span>
                        </button>
                        <button onClick={ ()=>{setInputText("")} }  className=" cursor-pointer text-sm w-[23%] flex items-center justify-center bg-red-500/[70%] hover:bg-red-500/[60%] transition-colors rounded-md px-2 py-2">
                            <TrashIcon className="w-4 h-4 mr-1" />
                            <span className="text-xs font-semibold text-white/[70%]">Clear Text</span>
                        </button>
                        <button onClick={ handleGenerateDocument } className=" cursor-pointer bg-[#00BFFF] w-[60%] text-white rounded-md px-4 py-2 hover:bg-[#0099CC] transition-colors">
                            <BoltIcon className="w-4 h-4 inline-block mr-2" />
                            <span className="text-sm font-semibold">Generate Document</span>
                        </button>

                    </div>
                </div>
            </div>
            <div className="flex flex-col w-[39.5%] h-full bg-[#1F2687]/[37%]">
                <div className="w-full h-full bg-[#000831] flex flex-col">
                    <div className="h-[8%] border-b w-full border-white/[25%] bg-black/20">
                        <h1 className="text-xl text-[#00BFFF] font-semibold w-max p-3">Generated Document</h1>
                    </div>
                    <div className="flex flex-col flex-grow justify-center items-center text-center">
                        <DocumentTextIcon className="w-12 h-12 text-white/[50%] mb-3 bg-black/20" />
                        <h1 className="mb-3 text-white/[50%]">No document generated yet!</h1>
                        <span className="text-white/[50%] text-xs">Once you generate a document, it will appear here...</span>
                    </div>
                </div>

            </div>
        </div>
    )
}