import { TrashIcon } from "@heroicons/react/24/solid";

export default function DeleteConfirmationPopup({ isOpen, onClose, onConfirm, type }) {
    if (!isOpen) return null;

    // Capitalize the first letter of the type for a clean display (e.g., "note" -> "Note")
    const capitalizedType = type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Item';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#141B3C]/[90%] p-8 rounded-2xl shadow-xl flex flex-col items-center border border-white/[15%] max-w-md text-center">
                <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-500/10 rounded-full">
                    <TrashIcon className="w-8 h-8 text-red-500" />
                </div>
                
                {/* --- DYNAMIC TITLE --- */}
                <h2 className="text-white text-2xl font-bold mb-2">
                    Delete {capitalizedType}
                </h2>

                {/* --- DYNAMIC MESSAGE --- */}
                <p className="text-white/[70%] mb-6">
                    Are you sure you want to permanently delete this {type}? This action cannot be undone.
                </p>

                <div className="flex space-x-4 w-full">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors font-semibold"
                    >
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    );
};