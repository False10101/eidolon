"use client"

import { useState, useEffect, useRef } from "react"
import Checkbox from "rc-checkbox"
import { SparklesIcon, CloudArrowDownIcon } from "@heroicons/react/24/outline";
import { DocumentTextIcon, CloudArrowUpIcon } from "@heroicons/react/24/solid";
import MDEditor from "@uiw/react-md-editor";
import { useParams, useRouter } from 'next/navigation';



const AcademicIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="20" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current" />
    </svg>
);
const MinimalIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="40" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="6" width="40" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="12" width="20" height="3" rx="1.5" className="fill-current" />
    </svg>
);

const CreativeIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="30" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="6" width="20" height="3" rx="1.5" className="fill-current" />
        <rect x="0" y="12" width="40" height="3" rx="1.5" className="fill-current" />
    </svg>
);





export default function note() {

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

                if (params.noteId === 'undefined' || params.noteId === '') {
                    router.push('/note/');
                }

                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/note/getNoteDetails?note_id=${params.noteId}`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (!response.ok) throw new Error(`Failed to load: ${response.status}`);

                const data = await response.json();

                console.log(data.note);

                setMdText(data.note.files.noteFile.content);
                setSelectedStyle(data.note.template_type);
                setLectureTopic(data.note.lecture_topic);
                setFileName(data.note.name);
                setInstructor(data.note.instructor);

                setSmartTagList({
                    detect_heading: Boolean(data.note.detect_heading),
                    highlight_key: Boolean(data.note.highlight_key),
                    identify_todo: Boolean(data.note.identify_todo),
                    detect_definitions: Boolean(data.note.detect_definitions), // Fixed typo from 'definitions'
                    include_summary: Boolean(data.note.include_summary),
                    extract_key_in_summary: Boolean(data.note.extract_key_in_summary)
                });

                const syntheticFile = textToFile(
                    data.note.files.noteFile.content,
                    data.note.name.endsWith('.txt') ? data.note.name : `${data.note.name}.txt`
                );

                setUploadedFile(syntheticFile);


            } catch (err) {
                console.error('FUCKING ERROR:', err);
            } finally {
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
            fileInputRef.current.value = ''; // Reset file input
        }
    };


    const validateAndUpload = (file) => {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];

        if (!validTypes.includes(file.type)) {
            alert('Please upload only PDF, DOCX, or TXT files');
            return;
        }

        if (file.size > 500 * 1024 * 1024) {
            alert('File size exceeds 500MB limit');
            return;
        }

        // Handle valid file upload
        console.log('Uploading file:', file.name);

        setUploadedFile(file)
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        // Use toFixed(1) for one decimal place on KB, MB, etc.
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1)); 
        return `${size} ${sizes[i]}`;
    };

    const handleDownloadPdf = async () => {
        if (!mdText) {
            alert("There is no content to download.");
            return;
        }

        try {
            const response = await fetch('/api/note/downloadNote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    mdText,
                    fileName
                }),
            });

            if (!response.ok) {
                throw new Error(`PDF generation failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Failed to download PDF:", error);
            alert("Could not download the PDF. Please try again.");
        }
    };

    const handleSaveText = async () => {
        if (!mdText) {
            alert("There is no content to save.");
            return;
        }

        setSaveStatus('saving'); // Show popup with spinner

        try {
            const response = await fetch('/api/note/edit/textMd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mdText, noteId: params.noteId }),
            });

            if (!response.ok) {
                throw new Error(`Text saving failed: ${response.statusText}`);
            }

            setSaveStatus('success'); // Change popup to show checkmark
            setTimeout(() => setSaveStatus('idle'), 1500); // Hide popup after 1.5 seconds

        } catch (error) {
            console.log(error);
            alert("Could not save the text. Please try again.");
            setSaveStatus('idle'); // Hide popup on error
        }
    }

    const handleSaveDetail = async()=>{
        if(!fileName && !lectureTopic && !Instructor){
            alert("There is no content to save.");
            return;
        }

        setSaveStatus('saving');

        try {
            const response = await fetch('/api/note/edit/detail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileName : !fileName || fileName === '' ? undefined : fileName, lectureTopic: !lectureTopic || lectureTopic === '' ? undefined : lectureTopic, Instructor : !Instructor || Instructor === '' ? undefined : Instructor ,noteId : params.noteId }),
            });

            if (!response.ok) {
                throw new Error(`Text saving failed: ${response.statusText}`);
            }

            setSaveStatus('success'); // Change popup to show checkmark
            setTimeout(() => setSaveStatus('idle'), 1500); // Hide popup after 1.5 seconds

        } catch (error) {
            console.log(error);
            alert("Could not save the lecture details. Please try again.");
            setSaveStatus('idle'); // Hide popup on error
        }
    }

    // handleGenerateNotes = async() =>{
    //     e.preventDefault();

    //     const formData = new FormData();
    //     formData.append('file', uploadedFile);
    //     formData.append('config', JSON.stringify(smartTagList));
    //     formData.append('style', selectedStyle);
    // formData.append('topic', lectureTopic);
    // formData.append('instructor', Instructor);
    // formData.append('filename', fileName);

    //     const response = fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
    //         method : 'POST',
    //         credentials : true,
    //         body : formData
    //     })

    //     const {noteId} = await response.json();
    // }

    // --- NEW COMPONENT: Save Status Popup ---
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
        <>
        <SaveStatusPopup status={saveStatus} /> 

        <div className="flex w-full px-12 h-full">
            <div className="w-[78%] h-full mr-4 flex flex-col pb-3 items-center">
                <div className="w-full h-[12.5%] ">
                    <div className="w-full h-full flex flex-col my-auto">
                        <h1 className="text-3xl text-[#00BFFF] font-extrabold mt-auto">Inclass Note Taker</h1>
                        <span className="text-white/[70%] my-2 mb-auto">Upload your in-class recording's transcipt and let <span className="text-[#00BFFF]">Gemini 2.5 Pro</span> extract and format your notes</span>
                    </div>
                </div>
                <div className=" w-full flex space-x-10 mb-3 h-[87.5%]">
                    <div className="w-[32.5%] h-full border-[1px] rounded-xl border-white/[10%] bg-[#1F2687]/[37%] shadow-[0_8px_32px_rgba(31,38,135,0.37)] ">
                        <div className="w-full h-full bg-[#141B3C]/[64%] flex flex-col">
                            <h1 className="flex h-[7%] px-6 text-xl font-bold py-3 border-b-[1px] border-white/[25%] w-full text-[#00BFFF]">
                                Raw Output Text
                            </h1>
                            <div className="flex w-full h-max border-b-[1px] border-white/[20%] items-center ">
                                <div className={`flex w-[80%] h-max border-[2px] border-dashed border-white/[20%] rounded-lg my-10 py-2 mx-auto flex flex-col
                                        ${isDragging
                                        ? 'border-solid border-[#00BFFF] bg-[#00bfff20] scale-105'
                                        : 'border-dashed border-white/[20%]'
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
                                        accept=".pdf,.docx,.txt"
                                        onChange={handleFileChange}
                                    />
                                    {!uploadedFile ? (
                                        <div className="group flex flex-col w-full h-max mx-auto justify-center items-center">
                                            <CloudArrowUpIcon
                                                className={`text-[#00BFFF] w-15 h-15 transition-all duration-300 ${isDragging ? 'animate-bounce' : 'group-hover:scale-110'
                                                    }`}
                                            />
                                            <h1 className="text-sm text-center w-[80%] text-white/[80%] mb-3">
                                                Drag and drop your in-class recording file here
                                            </h1>
                                            <span className="text-xs text-center w-[90%] text-white/[80%] mb-3">
                                                Supports PDF, DOCX, TXT (max 500MB)
                                            </span>
                                            <button
                                                onClick={() => fileInputRef.current.click()}
                                                className="bg-[#00BFFF] py-2 px-4 mb-3 rounded-lg transition-all duration-300 hover:scale-105 hover:bg-[#00a5d9] active:scale-95"
                                            >
                                                Browse Files
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center w-full p-4">
                                            <DocumentTextIcon className="w-12 h-12 text-[#00BFFF] mb-3" />
                                            <h2 className="text-sm font-medium text-white mb-1 truncate w-full text-center">
                                                {uploadedFile.name}
                                            </h2>
                                            <p className="text-xs text-gray-400 mb-4">
                                                {formatFileSize(uploadedFile.size)} • {
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
                            <div className="flex flex-grow px-6 py-3">
                                <div className="w-full h-full flex flex-col justify-evenly">
                                    <h1 className="flex text-xl font-semibold w-full">
                                        Transcript Details
                                    </h1>
                                    <span className="text-white/[70%]">Course Details</span>
                                    <input onChange={(e) => setFileName(e.target.value)} defaultValue={fileName} placeholder="e.g, Advanced Physics 101" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg" />

                                    <span className="text-white/[70%]">Lecture Topic (Optional)</span>
                                    <input onChange={(e) => setLectureTopic(e.target.value)} defaultValue={lectureTopic} placeholder="e.g., Quantum Mechanics Introduction" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg" />

                                    <span className="text-white/[70%]">Instructor (Optional)</span>
                                    <input onChange={(e) => setInstructor(e.target.value)} defaultValue={Instructor} placeholder="e.g., Dr. Smith" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg" />
                                    <button onClick={handleSaveDetail} className="px-4 py-2 bg-[#00BFFF] rounded-lg mt-3">Save Details</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="raw-text-editor-box w-[62.5%] h-full  border-[1px] rounded-xl border-white/[10%] bg-[#1F2687]/[37%] shadow-[0_8px_32px_rgba(31,38,135,0.37)] overflow-hidden">
                        <div className="w-full h-full flex flex-col bg-[#141B3C]/[64%] overflow-hidden">
                            <div className="flex h-[7%] px-6 text-xl font-bold py-3 border-b-[1px] border-white/[25%] w-full text-[#00BFFF] items-center">
                                <span>Raw Output Text</span>
                                <button onClick={handleSaveText} className="text-xs bg-gray-800 py-2 px-3 rounded-md ml-auto">Save Text</button>
                            </div>
                            <div className="flex h-[93%] overflow-hidden">
                                {
                                    mdText !== '' &&
                                    <MDEditor
                                        value={mdText}
                                        onChange={setMdText}
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
                                    mdText === '' &&
                                    <div className="w-max h-max flex flex-col justify-center m-auto space-y-2 text-white/[50%]">
                                        <DocumentTextIcon className="w-10 h-10 mx-auto" />
                                        <h1 className="text-center text-xl">No text extracted yet</h1>
                                        <span className="text-sm">Upload a recording to begin processing</span>
                                    </div>
                                }

                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="formtting-options w-[25%] border-[1px] border-white/[10%] h-[95%] my-auto rounded-lg  bg-[#1F2687]/[37%] shadow-[0_8px_32px_rgba(31,38,135,0.37)] ml-4 flex flex-col">
                <div className="flex flex-col w-full h-full bg-[#000000]/[30%] py-4">
                    <h1 className="text-[#00BFFF] text-2xl font-semibold w-full border-b-[1px] border-white/[25%] px-5 pb-4">Formatting Options</h1>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Smart Tags</h2>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('detect_heading')} checked={smartTagList.detect_heading} /> <span className="ml-3">Auto-detect headings</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('highlight_key')} checked={smartTagList.highlight_key} /> <span className="ml-3">Highlight key points</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('identify_todo')} checked={smartTagList.identify_todo} /> <span className="ml-3">Identify to-do items</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('detect_definitions')} checked={smartTagList.detect_definitions} /> <span className="ml-3">Detect definitions</span></div>
                    </div>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Auto-Summarization</h2>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('include_summary')} checked={smartTagList.include_summary} /> <span className="ml-3">Include summary in beginning</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('extract_key_in_summary')} checked={smartTagList.extract_key_in_summary} /> <span className="ml-3">Extract key terms</span></div>
                    </div>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Output Styling</h2>
                        <h3 className="pb-4">PDF Template</h3>
                        <div className="flex space-x-4 pb-4 ">
                            <StyleCard
                                id="academic"
                                title="Academic"
                                isSelected={selectedStyle === "academic"}
                                onSelect={setSelectedStyle}
                            />
                            <StyleCard
                                id="minimal"
                                title="Minimal"
                                isSelected={selectedStyle === 'minimal'}
                                onSelect={setSelectedStyle}
                            />
                            <StyleCard
                                id="Creative"
                                title="Creative"
                                isSelected={selectedStyle === 'Creative'}
                                onSelect={setSelectedStyle}
                            />
                        </div>
                    </div>
                    <div className="  flex flex-col mt-auto py-5 mx-6 space-y-5 mb-0 flex-grow justify-end">
                        <button onClick={() => { }} className="flex cursor-pointer rounded-lg w-full px-3 py-2 items-center justify-center bg-[#00BFFF]"> <SparklesIcon className="w-4 h-4" /><span className="ml-1">Regenerate Formatted Notes</span></button>
                        <button onClick={ handleDownloadPdf } className="flex cursor-pointer justify-center bg-gray-800/[80%] px-3 py-2 rounded-lg text-[#00BFFF] items-center justify-center">
                            <CloudArrowDownIcon className="w-4 h-4" />
                            <span className="ml-1">Download ( File Type : PDF )</span>
                        </button>

                    </div>

                </div>

            </div>
        </div>
    </>
    )
}

const StyleCard = ({ id, title, isSelected, onSelect }) => {
    const baseClasses = "flex flex-col w-[33%] items-center justify-center px-2 py-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105";
    const selectedClasses = "border-[#00BFFF] text-[#00BFFF] bg-gray-700/50 shadow-lg";
    const unselectedClasses = "border-gray-600 bg-gray-800 hover:border-gray-500";

    const cardClasses = `${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`;

    return (
        <div
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            className={cardClasses}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(id)}
        >
            {
                title.toLowerCase() === "academic" &&
                <AcademicIcon className={` ${isSelected ? 'text-gray-400' : 'text-gray-500'} bg-gray-700 p-2 rounded-lg h-max my-auto`} />
            }
            {
                title.toLowerCase() === "minimal" &&
                <MinimalIcon className={` ${isSelected ? 'text-gray-400' : 'text-gray-500'} bg-gray-700 p-2 rounded-lg h-max my-auto`} />
            }
            {
                title.toLowerCase() === "creative" &&
                <CreativeIcon className={` ${isSelected ? 'text-gray-400' : 'text-gray-500'} bg-gray-700 p-2 rounded-lg h-max my-auto`} />
            }
            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'} mt-2`}>
                {title}
            </span>
        </div>
    );
};