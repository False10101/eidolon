import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

export default function tts(){
    return (
        <div className="flex h-full w-full justify-center items-center">
            <ExclamationTriangleIcon className="w-10 h-10 mr-1 text-white/[50%]"/>
            <h1 className="text-4xl italic text-white/[50%]">Work in Progress...</h1>
        </div>
    )
}