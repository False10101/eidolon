'use client'

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { DocumentDuplicateIcon, PencilIcon } from "@heroicons/react/24/solid";
import dynamic from "next/dynamic";

// Dynamically import the PdfViewer with SSR turned off
const PdfViewer = dynamic(() => import('./PdfViewer'), { 
    ssr: false,
    loading: () => <p className="text-white">Loading PDF Viewer...</p> 
});


export default function TextbookExplainer() {



    const router = useRouter();

    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);


    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);

        function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages);
    }

    // useEffect(() => {
    //     const loadPDF = async () => {
    //         try {
    //             const response = await fetch('/TestPDF.pdf');

    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }
    //             const blob = await response.blob();

    //             setPdfBlob(blob);

    //         } catch (error) {
    //             console.log(error);
    //         }
    //     }

    //     loadPDF();
    // }, []);

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
            validateAndUpload(e.target.files[0]);
        }
    }

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            validateAndUpload(e.target.files[0]);
        }
    }

    const handleRemoveFile = () => {
        setUploadedFile(null);

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
    }

    return (
        <div className="flex w-full h-full bg-gradient-to-r from-[#000000] to-[#1A2145]">
            <div className="flex w-[32%] flex-col h-full border-r-[1px] border-white/[25%]">
                <div className="flex w-full h-[35%] items-center ">
                    <div className={`flex w-[65%] h-[80%] border-[1px] border-white/[20%] rounded-lg my-10 bg-[#1F2687]/[37%] mx-auto flex flex-col
                                        ${isDragging
                            ? 'border-solid border-[#00BFFF] bg-[#00bfff20] scale-105'
                            : ''
                        }
                                `}
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
                                    <CloudArrowUpIcon
                                        className={`text-[#00BFFF] w-10 h-10 transition-all duration-300 ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'
                                            }`}
                                    />
                                    <h1 className="text-sm text-center w-[80%] text-white/[80%] mb-2">
                                        Drag & drop PDF here
                                    </h1>
                                    <span className="text-sm text-center w-[90%] text-white/[80%] mb-2">
                                        or
                                    </span>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="bg-[#00BFFF] py-2 px-4 mb-3 rounded-lg transition-all duration-300 hover:scale-105 hover:bg-[#00a5d9] active:scale-95"
                                    >
                                        Browse Files
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center w-full p-4">
                                <DocumentTextIcon className="w-12 h-12 text-[#00BFFF] mb-3" />
                                <h2 className="text-sm font-medium text-white mb-1 truncate w-full text-center">
                                    {uploadedFile.name}
                                </h2>
                                <p className="text-xs text-gray-400 mb-4">
                                    {uploadedFile.size < 1024 ? Math.round(uploadedFile.size / 1024) + "KB" : Math.round(uploadedFile.size / 1024 / 1024) + "MB"} • {
                                        uploadedFile.type === 'application/pdf' ? 'PDF' :
                                            uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'DOCX' :
                                                'TXT'
                                    }
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        className="text-xs bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded transition-colors"
                                    >
                                        Replace
                                    </button>
                                    <button
                                        onClick={handleRemoveFile}
                                        className="text-xs bg-red-600 hover:bg-red-700 py-1 px-3 rounded transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col w-full h-[65%] bg-[#1F2687]/[37%] rounded-t-xl border-[2px] border-white/[10%] ">
                    <div className="w-full h-full flex flex-col bg-[#141B3C]/[64%] inset-shadow-[0_0px_32px_rgba(31,38,135,0.64)] ">
                        <div className="flex w-full h-max items-center pt-6">
                            <h1 className="mx-6 my-auto text-xl font-semibold">Raw Text from PDF</h1>
                            <div className="flex my-auto mr-4 ml-auto"><DocumentDuplicateIcon className=" w-5 h-5 my-auto text-[#00CED1]" /><span className=" text-[#00CED1] ml-1">Copy</span></div>
                            <div className="flex my-auto mr-6"><PencilIcon className=" w-5 h-5 my-auto text-[#00CED1]" /><span className=" text-[#00CED1] ml-1">Edit</span></div>
                        </div>
                        <div className="flex h-[83%] w-[90%] m-auto overflow-scroll">
                            <div className="bg-[#000000]/[30%] w-full h-full rounded-lg"> s</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col flex-grow h-full">
                <div className="flex w-full h-[10%] border-b-[1px] border-white/[20%] text-2xl font-bold text-[#00BFFF] items-center ml-10">Explained Text</div>
                <div className="flex w-full h-[90%] flex-grow">
                    <div className="flex flex-grow h-full  bg-[#1F2687]/[37%]">
                        <div className="bg-[#1A1D2C]/[30%] w-full h-full rounded-t-xl border-2 border-white/[10%] flex">
                            <PdfViewer file={uploadedFile || '/TestPDF.pdf'} />
                        </div>

                    </div>
                    <div className="flex w-[40%] h-full border-b-2 ">

                    </div>
                </div>
            </div>
        </div>
    )
}