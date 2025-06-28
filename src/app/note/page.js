"use client"

import { useState, useEffect } from "react"
import Checkbox from "rc-checkbox"
import { ChevronDownIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon, DocumentArrowDownIcon, DocumentTextIcon, CloudArrowUpIcon } from "@heroicons/react/24/solid";
import MDEditor from "@uiw/react-md-editor";

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

    const [dummyText, setDummyText] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('academic');
    const [smartTagList, setSmartTagList] = useState({ detect_heading: false, highlight_key: false, identify_todo: false, detect_defintions: false, include_summary: false, extract_key_in_summary: false });

    const handleCheckbox = (setting) => {
        setSmartTagList(prev => ({ ...prev, [setting]: !prev[setting] }));

    };

    useEffect(() => {
        const loadMotherfuckingContent = async () => {
            try {
                const response = await fetch('/lecture.md');
                console.log(response);
                if (!response.ok) throw new Error(`Failed to load: ${response.status}`);
                const text = await response.text();
                setDummyText(text);
            } catch (err) {
                console.error('FUCKING ERROR:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadMotherfuckingContent();
    }, []);

    useEffect(() => {
        console.log(smartTagList)
    }, [smartTagList])

    return (
        <div className="flex w-full px-12 h-[93%]">
            <div className="w-[78%] h-full mr-4 flex flex-col pb-3 overflow-scroll">
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
                            <div className="flex w-full h-[40%] border-b-[1px] border-white/[20%] items-center">
                                <div className="flex w-[80%] h-[80%] border-[2px] border-dashed border-white/[20%] rounded-lg my-auto mx-auto justify-center items-center flex flex-col">
                                    <CloudArrowUpIcon className="text-[#00BFFF] w-15 h-15 "/>
                                    <h1 className="text-sm text-center align-center w-[80%] wrap-normal text-white/[80%] mb-3">
                                        Drag and drop your in-class recording file here
                                    </h1>
                                    <span className="text-xs text-center align-center w-[90%] wrap-normal text-white/[80%] mb-3">Supports PDF, MP3, MP4, WAV (max 500MB)</span>
                                    <button className="bg-[#00BFFF] py-2 px-4 mb-3 rounded-lg">Browse Files</button>
                                </div>
                            </div>
                            <div className="flex flex-grow px-6">
                                <div className="w-full h-max my-auto flex flex-col">
                                    <h1 className="flex text-xl font-semibold pb-6 w-full">
                                    Transcript Details
                                </h1>
                                <span className="text-white/[70%]">Course Details</span>
                                <input placeholder="e.g., Advanced Physics 101" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg my-4"/>

                                <span className="text-white/[70%]">Lecture Topic (Optional)</span>
                                <input placeholder="e.g., Quantum Mechanics Introduction" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg my-4"/>

                                <span className="text-white/[70%]">Instructor (Optional)</span>
                                <input placeholder="e.g., Dr. Smith" className="border-[1px] border-white/[20%] bg-[#000000]/[50%] py-2 px-4 rounded-lg my-4"/>

                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="raw-text-editor-box w-[62.5%] h-full  border-[1px] rounded-xl border-white/[10%] bg-[#1F2687]/[37%] shadow-[0_8px_32px_rgba(31,38,135,0.37)] overflow-hidden">
                        <div className="w-full h-full flex flex-col bg-[#141B3C]/[64%] overflow-hidden">
                            <h1 className="flex h-[7%] px-6 text-xl font-bold py-3 border-b-[1px] border-white/[25%] w-full text-[#00BFFF]">
                                Raw Output Text
                            </h1>
                            <div className="flex h-[93%] overflow-hidden">
                                {
                                    dummyText !== '' &&
                                    <MDEditor
                                        value={dummyText}
                                        onChange={setDummyText}
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
                                    dummyText === '' &&
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
                <div className="w-full h-full bg-[#000000]/[30%] py-4">
                    <h1 className="text-[#00BFFF] text-2xl font-semibold w-full border-b-[1px] border-white/[25%] px-5 pb-4">Formatting Options</h1>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Smart Tags</h2>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('detect_heading')} /> <span className="ml-3">Auto-detect headings</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('highlight_key')} /> <span className="ml-3">Highlight key points</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('identify_todo')} /> <span className="ml-3">Identify to-do items</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('detect_defintions')} /> <span className="ml-3">Detect definitions</span></div>
                    </div>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Auto-Summarization</h2>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('include_summary')} /> <span className="ml-3">Include summary in beginning</span></div>
                        <div className="flex items-center pb-2"><Checkbox onChange={() => handleCheckbox('extract_key_in_summary')} /> <span className="ml-3">Extract key terms</span></div>
                    </div>
                    <div className="py-4 w-full flex flex-col px-5 border-b-[1px] border-white/[25%]">
                        <h2 className="text-xl pb-4">Output Styling</h2>
                        <h3 className="pb-2">PDF Template</h3>
                        <div className="flex space-x-4 pb-2 ">
                            <StyleCard
                                id="academic"
                                title="Academic"
                                isSelected={selectedStyle === 'academic'}
                                onSelect={setSelectedStyle}
                            />
                            <StyleCard
                                id="Minimal"
                                title="Minimal"
                                isSelected={selectedStyle === 'Minimal'}
                                onSelect={setSelectedStyle}
                            />
                            <StyleCard
                                id="Creative"
                                title="Creative"
                                isSelected={selectedStyle === 'Creative'}
                                onSelect={setSelectedStyle}
                            />
                        </div>
                        <label htmlFor="selection_org" className="py-4">Selection Organization</label>
                        <div className="relative flex pb-2">
                            <select name="selection_org" id="selection_org" className="border-[1px] border-white/[30%] py-2 px-3 rounded-lg appearance-none w-full">
                                <option selected>Collapsible Section</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 bottom-2 flex items-center px-2 pointer-events-none">
                                <ChevronDownIcon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                    <div className="  flex flex-col my-5 mx-6 space-y-5">
                        <button className="flex rounded-lg w-full px-3 py-2 items-center justify-center bg-[#00BFFF]"> <SparklesIcon className="w-4 h-4" /><span className="ml-1">Generate Formatted Notes</span></button>
                        <div className="flex justify-center gap-x-3">
                            <button className="w-[30%] rounded-lg py-2 px-2 flex justify-center items-center bg-[#000000]/[40%] text-sm"><ArrowDownTrayIcon className="w-4 h-4 " /> <span className="ml-1">PDF</span></button>
                            <button className="w-[30%] rounded-lg py-2 px-2 flex justify-center items-center bg-[#000000]/[40%] text-sm"><DocumentArrowDownIcon className="w-4 h-4" /> <span className="ml-1">DOCX</span></button>
                            <button className="w-[30%] rounded-lg py-2 px-2 flex justify-center items-center bg-[#000000]/[40%] text-sm"><DocumentTextIcon className="w-4 h-4" /><span className="ml-1">Txt</span></button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
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
