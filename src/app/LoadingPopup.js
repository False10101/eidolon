export default function LoadingPopup ({loadingMessage}){
        return(
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#141B3C]/[80%] p-8 rounded-2xl shadow-xl flex flex-col items-center border border-white/[15%]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#00BFFF]"></div>
                <p className="text-white text-xl mt-5 font-semibold">{loadingMessage}...</p>
                <p className="text-white/[60%] text-sm mt-1">Please wait a moment.</p>
            </div>
        </div>
        )
}