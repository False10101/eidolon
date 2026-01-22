'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

import {
    UserCircleIcon,
    KeyIcon,
    ChartBarIcon,
    DocumentTextIcon,
    CpuChipIcon,
    ShieldExclamationIcon,
    TrashIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/solid';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

// --- Theme Constants (Matches Home Page) ---
const cardHoverEffect = {
    y: -5,
    boxShadow: '0 0px 25px rgba(6, 182, 212, 0.25), inset 0 0 10px rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    transition: { type: 'spring', stiffness: 300 }
};

const SuccessModal = ({ message, isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0b1221] border border-cyan-500/30 rounded-xl p-6 max-w-md mx-4 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-cyan-950/50 border border-cyan-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                                <CheckCircleIcon className="h-8 w-8 text-cyan-400" />
                            </div>
                            <h3 className="text-xl font-bold text-cyan-400 mb-2 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Success</h3>
                            <p className="text-slate-300 mb-6">{message}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/40 text-cyan-200 rounded-lg transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ErrorModal = ({ message, isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0b1221] border border-rose-500/30 rounded-xl p-6 max-w-md mx-4 shadow-[0_0_30px_rgba(244,63,94,0.15)]"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-rose-950/50 border border-rose-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                                <XCircleIcon className="h-8 w-8 text-rose-500" />
                            </div>
                            <h3 className="text-xl font-bold text-rose-400 mb-2 drop-shadow-[0_0_5px_rgba(251,113,133,0.5)]">Error</h3>
                            <p className="text-slate-300 mb-6">{message}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-rose-600/20 border border-rose-500/50 hover:bg-rose-600/40 text-rose-200 rounded-lg transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-[#0b1221] border border-rose-600/40 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.2)] w-full max-w-md m-4 p-8 text-slate-200"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="p-3 rounded-full bg-rose-950/50 border border-rose-500/20 mb-4 animate-pulse">
                                <ShieldExclamationIcon className="w-12 h-12 text-rose-500" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-rose-500 tracking-wider uppercase">System Alert</h2>
                            <p className="text-slate-400 mb-6 text-sm">
                                Deactivating account protocol initiated.
                                <strong className="block text-rose-400 mt-2 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]">THIS ACTION IS IRREVERSIBLE.</strong>
                            </p>
                            <div className="flex justify-center gap-4 w-full">
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    className="w-full py-2.5 px-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-500 transition-all font-mono text-sm"
                                >
                                    ABORT
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(220, 38, 38, 0.3)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onConfirm}
                                    className="w-full py-2.5 px-4 rounded-lg bg-rose-950/30 border border-rose-600/50 text-rose-500 hover:text-rose-400 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all font-mono font-bold text-sm"
                                >
                                    CONFIRM DELETION
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ApiKeyModal = ({ isOpen, onClose, apiKeys, onSave }) => {
    const [validationStates, setValidationStates] = useState({
        gemini: { loading: false, valid: null },
        dallE: { loading: false, valid: null },
        murf: { loading: false, valid: null }
    });
    const [overallStatus, setOverallStatus] = useState(null);

    const validateApiKey = async (service, key) => {
        try {
            setValidationStates(prev => ({
                ...prev,
                [service]: { loading: true, valid: null }
            }));

            let isValid = false;

            // Service-specific validation
            switch (service) {
                case 'gemini':
                    isValid = await validateGeminiKey(key);
                    break;
                case 'dallE':
                    isValid = await validateDallEKey(key);
                    break;
                case 'murf':
                    isValid = await validateMurfKey(key);
                    break;
            }

            setValidationStates(prev => ({
                ...prev,
                [service]: { loading: false, valid: isValid }
            }));

            return isValid;
        } catch (error) {
            setValidationStates(prev => ({
                ...prev,
                [service]: { loading: false, valid: false }
            }));
            return false;
        }
    };

    const validateAllKeys = async () => {
        setOverallStatus('validating');

        const results = await Promise.all([
            validateApiKey('gemini', apiKeys.gemini_api),
            validateApiKey('dallE', apiKeys.dall_e_api),
            validateApiKey('murf', apiKeys.murf_api)
        ]);

        const allValid = results.every(valid => valid);
        setOverallStatus(allValid ? 'success' : 'error');

        if (allValid) {
            onSave();
            setTimeout(onClose, 1500);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0b1221] border border-cyan-500/20 rounded-xl p-6 max-w-md w-full mx-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]"
                    >
                        <h3 className="text-xl font-bold text-cyan-400 mb-4 tracking-wide flex items-center">
                            <KeyIcon className="size-5 mr-2" />
                            VALIDATING CREDENTIALS
                        </h3>

                        <div className="space-y-4 mb-6 bg-[#020617]/50 p-4 rounded-lg border border-slate-800">
                            {/* Gemini API Validation */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-300 font-mono text-sm">Gemini API</span>
                                <div className="flex items-center">
                                    {validationStates.gemini.loading ? (
                                        <div className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.gemini.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                                    ) : validationStates.gemini.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                                    ) : <span className="text-slate-600 text-xs">PENDING</span>}
                                </div>
                            </div>

                            {/* DallE API Validation */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="text-slate-300 font-mono text-sm">DallE API</span>
                                <div className="flex items-center">
                                    {validationStates.dallE.loading ? (
                                        <div className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.dallE.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                                    ) : validationStates.dallE.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                                    ) : <span className="text-slate-600 text-xs">PENDING</span>}
                                </div>
                            </div>

                            {/* Murf API Validation */}
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300 font-mono text-sm">Murf API</span>
                                <div className="flex items-center">
                                    {validationStates.murf.loading ? (
                                        <div className="h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.murf.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                                    ) : validationStates.murf.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-rose-500 drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]" />
                                    ) : <span className="text-slate-600 text-xs">PENDING</span>}
                                </div>
                            </div>
                        </div>

                        {overallStatus === 'error' && (
                            <p className="text-rose-400 text-sm mb-4 font-mono text-center">
                                ERROR: Invalid credentials detected.
                            </p>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={validateAllKeys}
                                disabled={overallStatus === 'validating'}
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-colors shadow-[0_0_10px_rgba(8,145,178,0.4)] text-sm font-bold tracking-wide"
                            >
                                {overallStatus === 'validating' ? 'VALIDATING...' : 'VALIDATE ALL'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Example validation functions (implement according to each API's requirements)
async function validateGeminiKey(key) {
    try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function validateDallEKey(key) {
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${key}`
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

async function validateMurfKey(key) {
    try {
        const response = await fetch('https://api.murf.ai/v1/speech/voices', {
            headers: {
                'api-key': key
            }
        });
        return response.ok;
    } catch {
        return false;
    }
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 100,
        },
    },
};

export default function Setting() {
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);

    const [successModal, setSuccessModal] = useState({
        isOpen: false,
        message: ''
    });

    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        message: ''
    });

    const showSuccess = (message) => {
        setSuccessModal({ isOpen: true, message });
        setTimeout(() => setSuccessModal({ isOpen: false, message: '' }), 3000);
    };

    const showError = (message) => {
        setErrorModal({ isOpen: true, message });
    };

    // User data state
    const [profileData, setProfileData] = useState({
        name: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [apiKeys, setApiKeys] = useState({
        gemini_api: '',
        dall_e_api: '',
        murf_api: ''
    });

    // Usage data state
    const [usageStats, setUsageStats] = useState({
        'Document': { total_count: 0, total_token_received: 0, dailyData: [] },
        'Inclass Notes': { total_count: 0, total_token_received: 0, dailyData: [] },
        'Textbook Explainer': { total_count: 0, total_token_received: 0, dailyData: [] },
        'TTS with Subtitles': { total_count: 0, total_token_received: 0, dailyData: [] },
        'Image Generation': { total_count: 0, total_token_received: 0, dailyData: [] },
        'Chat with AI': { total_count: 0, total_token_received: 0, dailyData: [] }
    });

    // Map activity types to display names
    const typeToDisplayName = {
        'Document': 'Document Generator',
        'Inclass Notes': 'Inclass Note Taker',
        'Textbook Explainer': 'Textbook Explainer',
        'TTS with Subtitles': 'Text-to-speech',
        'Image Generation': 'Image Generator',
        'Chat with AI': 'Chatbot'
    };

    // Fetch user data and usage stats
    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/api/setting', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();

                setProfileData(prev => ({
                    ...prev,
                    name: data.user.username || ''
                }));

                setApiKeys({
                    gemini_api: data.user.gemini_api || '',
                    dall_e_api: data.user.dall_e_api || '',
                    murf_api: data.user.murf_api || ''
                });

                // Update usage stats with API data
                const updatedStats = { ...usageStats };
                for (const [type, typeData] of Object.entries(data.activityData)) {
                    if (updatedStats[type]) {
                        updatedStats[type] = {
                            total_count: typeData.totals?.total_count || 0,
                            total_token_received: typeData.totals?.total_token_received || 0,
                            dailyData: typeData.dailyData || []
                        };
                    }
                }
                setUsageStats(updatedStats);

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleApiKeyChange = (e) => {
        const { name, value } = e.target;
        setApiKeys(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();

        if (profileData.newPassword !== profileData.confirmPassword) {
            showError("New passwords don't match!");
            return;
        }

        try {
            const response = await fetch('/api/setting', {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: profileData.currentPassword,
                    newPassword: profileData.newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update password');
            }

            // Clear password fields on success
            setProfileData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

            showSuccess('Password updated successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleApiKeysUpdate = async (e) => {
        e.preventDefault();
        setIsApiModalOpen(true);
    };

    const handleApiSave = async () => {
        // This will be called only after all keys are validated
        try {
            const response = await fetch('/api/setting', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gemini_api: apiKeys.gemini_api,
                    dall_e_api: apiKeys.dall_e_api,
                    murf_api: apiKeys.murf_api
                })
            });

            if (!response.ok) throw new Error('Failed to save');
            showSuccess('API keys updated successfully!');
        } catch (err) {
            showError(err.message);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const response = await fetch('/api/setting', {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            await fetch(`/api/auth/logout`, { method: 'POST' });
            router.push('/auth/login');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    const generateChartData = (type) => {
        const stats = usageStats[type];
        if (!stats || stats.dailyData.length === 0) {
            return {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Tokens Used',
                    data: [0, 0, 0, 0, 0, 0, 0],
                    // UPDATED: Chart Colors to match Cyan Theme
                    borderColor: '#22d3ee', // Tailwind cyan-400
                    backgroundColor: 'rgba(34, 211, 238, 0.2)',
                    tension: 0.3,
                    fill: true
                }]
            };
        }

        // Create chart data
        const labels = stats.dailyData.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        });

        const dataPoints = stats.dailyData.map(day => day.token_received);

        return {
            labels,
            datasets: [{
                label: 'Tokens Used',
                data: dataPoints,
                // UPDATED: Chart Colors to match Cyan Theme
                borderColor: '#22d3ee', // Tailwind cyan-400
                backgroundColor: 'rgba(34, 211, 238, 0.2)',
                tension: 0.3,
                fill: true
            }]
        };
    };

    if (isLoading) {
        return (
            <main className="flex w-full min-h-screen justify-center items-center bg-black text-white" style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}>
                <div className="flex flex-col items-center">
                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                   <div className="text-cyan-400 font-mono tracking-widest animate-pulse">LOADING SYSTEM...</div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex w-full min-h-screen justify-center items-center bg-black text-white" style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}>
                <div className="w-full max-w-lg mx-auto bg-rose-950/20 border border-rose-500/30 p-8 rounded-xl backdrop-blur-md shadow-[0_0_30px_rgba(244,63,94,0.15)]">
                    <h2 className="text-xl font-bold text-rose-400 mb-2">System Error</h2>
                    <p className="text-rose-200/80 mb-6 font-mono text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all"
                    >
                        Reboot System
                    </button>
                </div>
            </main>
        );
    }

    return (
        <AnimatePresence>
            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex w-full min-h-screen justify-center bg-black text-slate-200 p-4 sm:p-6 lg:p-8 font-sans"
                // UPDATED: Theme Background
                style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
            >
                <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteAccount} />

                <motion.div
                    className="w-full max-w-7xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="flex items-center mb-8 pt-4">
                        <motion.button
                            onClick={() => router.back()}
                            aria-label="Go back to previous page"
                            className="p-2 mr-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-700/50 transition-colors duration-200 group"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ArrowLeftIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                        </motion.button>
                        {/* UPDATED: Neon Title */}
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }}>
                            Settings Protocol
                        </h1>
                    </motion.div>

                    <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-3 space-y-8 grid lg:grid-cols-2 gap-8 h-max">
                            
                            {/* Profile Section */}
                            <motion.section 
                                variants={itemVariants} 
                                // UPDATED: Glassmorphic Card Style
                                className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 relative overflow-hidden group"
                                whileHover={cardHoverEffect}
                            >
                                {/* Decorative Glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <h2 className="text-xl font-bold mb-6 flex items-center text-slate-100 relative z-10">
                                    <UserCircleIcon className="w-6 h-6 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> Profile Details
                                </h2>
                                <form onSubmit={handlePasswordUpdate} className="relative z-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={profileData.name}
                                                onChange={handleProfileChange}
                                                // UPDATED: Input Styles
                                                className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                                placeholder="Enter your full name"
                                            />
                                        </div>

                                        <h2 className="text-lg font-bold mb-6 flex items-center pt-4 text-slate-100">
                                            <KeyIcon className="w-6 h-6 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                            Security Clearance
                                        </h2>

                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="currentPassword" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                    Current Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="currentPassword"
                                                    name="currentPassword"
                                                    value={profileData.currentPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="newPassword" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                    New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="newPassword"
                                                    name="newPassword"
                                                    value={profileData.newPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="confirmPassword" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                    Confirm New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    value={profileData.confirmPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-colors text-white font-bold py-2.5 px-6 rounded-lg text-sm tracking-wide">
                                            Update Password
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.section>

                            {/* API Keys Section */}
                            <motion.section 
                                variants={itemVariants} 
                                className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 relative overflow-hidden group"
                                whileHover={cardHoverEffect}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <h2 className="text-xl font-bold mb-6 flex items-center text-slate-100 relative z-10">
                                    <KeyIcon className="w-6 h-6 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> API Integrations
                                </h2>
                                <form onSubmit={handleApiKeysUpdate} className="relative z-10">
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="gemini_api" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                GEMINI API KEY <span className="text-cyan-400 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="gemini_api"
                                                name="gemini_api"
                                                value={apiKeys.gemini_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none font-mono text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="dall_e_api" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                DallE API <span className="text-cyan-400 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="dall_e_api"
                                                name="dall_e_api"
                                                value={apiKeys.dall_e_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none font-mono text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="murf_api" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">
                                                MURF API <span className="text-cyan-400 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="murf_api"
                                                name="murf_api"
                                                value={apiKeys.murf_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none font-mono text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-colors text-white font-bold py-2.5 px-6 rounded-lg text-sm tracking-wide">
                                            Update API Keys
                                        </motion.button>
                                    </div>
                                    
                                    {/* Danger Zone */}
                                    <motion.section 
                                        initial={{ opacity: 0 }} 
                                        animate={{ opacity: 1, transition: { delay: 0.5 } }} 
                                        className="mt-8 pt-6 border-t border-slate-800"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-rose-950/10 border border-rose-900/30 hover:bg-rose-950/20 transition-colors">
                                            <div>
                                                <h3 className="font-bold text-rose-400 flex items-center"><ShieldExclamationIcon className="size-4 mr-2"/> Danger Zone</h3>
                                                <p className="text-xs text-rose-200/60 pt-1">Permanently delete your account and data.</p>
                                            </div>
                                            <motion.button type="button" onClick={() => setIsDeleteModalOpen(true)} whileHover={{ scale: 1.05, backgroundColor: '#dc2626' }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 bg-rose-900/50 border border-rose-700/50 text-rose-200 font-bold py-2 px-4 rounded-lg text-xs tracking-wider uppercase transition-all shadow-[0_0_10px_rgba(220,38,38,0.1)]">
                                                <TrashIcon className="w-3 h-3 mr-2" /> Delete Account
                                            </motion.button>
                                        </div>
                                    </motion.section>
                                </form>
                            </motion.section>
                        </div>

                        <motion.h1 variants={itemVariants} className="text-2xl font-bold text-slate-200 my-8 lg:col-span-3 border-l-4 border-cyan-500 pl-4 flex items-center">
                            Resource Usage Analysis
                        </motion.h1>

                        <aside className="lg:col-span-3 grid lg:grid-cols-3 gap-8">
                            {Object.entries(usageStats).map(([type, stats]) => (
                                <motion.section 
                                    key={type} 
                                    className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 shadow-xl h-full flex flex-col justify-between" 
                                    variants={itemVariants} 
                                    whileHover={cardHoverEffect}
                                >
                                    <h2 className="text-lg font-bold mb-6 flex items-center text-slate-200">
                                        <ChartBarIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> 
                                        {typeToDisplayName[type] || type}
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="bg-[#0f172a]/60 border border-slate-700/50 p-4 rounded-xl">
                                                <DocumentTextIcon className="w-6 h-6 mx-auto text-cyan-400/80 mb-2" />
                                                <p className="text-2xl font-bold text-white font-mono">{stats.total_count}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Requests</p>
                                            </div>
                                            <div className="bg-[#0f172a]/60 border border-slate-700/50 p-4 rounded-xl">
                                                <CpuChipIcon className="w-6 h-6 mx-auto text-cyan-400/80 mb-2" />
                                                <p className="text-2xl font-bold text-white font-mono">{stats.total_token_received.toLocaleString()}</p>
                                                <p className="text-[10px] uppercase tracking-widest text-slate-500">Tokens</p>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            {/* Chart options simplified and styled for the dark theme */}
                                            <Line 
                                                data={generateChartData(type)} 
                                                options={{ 
                                                    responsive: true, 
                                                    plugins: { 
                                                        legend: { display: false }, 
                                                        title: { display: false } 
                                                    }, 
                                                    scales: { 
                                                        y: { 
                                                            ticks: { color: 'rgba(148, 163, 184, 0.6)', font: { size: 10, family: 'monospace' } },
                                                            grid: { color: 'rgba(51, 65, 85, 0.3)' }
                                                        }, 
                                                        x: { 
                                                            ticks: { color: 'rgba(148, 163, 184, 0.6)', font: { size: 10, family: 'monospace' } },
                                                            grid: { display: false }
                                                        } 
                                                    } 
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </motion.section>
                            ))}
                        </aside>
                    </motion.div>
                </motion.div>

                <ApiKeyModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} apiKeys={apiKeys} onSave={handleApiSave} />
                <SuccessModal isOpen={successModal.isOpen} message={successModal.message} onClose={() => setSuccessModal({ isOpen: false, message: '' })} />
                <ErrorModal isOpen={errorModal.isOpen} message={errorModal.message} onClose={() => setErrorModal({ isOpen: false, message: '' })} />
            </motion.main>
        </AnimatePresence>
    );
}