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

const SuccessModal = ({ message, isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#141B3C] border border-[#00BFFF]/30 rounded-xl p-6 max-w-md mx-4 shadow-xl"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#00BFFF]/10 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-8 w-8 text-[#00BFFF]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-[#00BFFF] mb-2">Success</h3>
                            <p className="text-white/80 mb-6">{message}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-[#00BFFF] hover:bg-[#0099CC] rounded-lg text-white font-medium transition-colors"
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
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#141B3C] border border-red-500/30 rounded-xl p-6 max-w-md mx-4 shadow-xl"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-8 w-8 text-red-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-red-400 mb-2">Error</h3>
                            <p className="text-white/80 mb-6">{message}</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
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
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-[#141B3C] rounded-2xl shadow-xl w-full max-w-md m-4 p-8 text-white"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="p-3 rounded-full bg-red-500/10 mb-4">
                                <ShieldExclamationIcon className="w-12 h-12 text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Delete Account Confirmation</h2>
                            <p className="text-white/70 mb-6 text-sm">
                                Are you absolutely sure? Your account will be deactivated.
                                <strong className="block text-red-400 mt-2">This action is irreversible.</strong>
                            </p>
                            <div className="flex justify-center gap-4 w-full">
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    className="w-full py-2.5 px-4 rounded-md bg-white/10 transition-colors font-semibold"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: '#B91C1C' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onConfirm}
                                    className="w-full py-2.5 px-4 rounded-md bg-red-600 transition-colors font-bold"
                                >
                                    Delete Account
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
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#141B3C] border border-white/[15%] rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                    >
                        <h3 className="text-xl font-semibold text-[#00BFFF] mb-4">Validating API Keys</h3>

                        <div className="space-y-4 mb-6">
                            {/* Gemini API Validation */}
                            <div className="flex items-center justify-between">
                                <span className="text-white/80">Gemini API</span>
                                <div className="flex items-center">
                                    {validationStates.gemini.loading ? (
                                        <div className="h-5 w-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.gemini.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-[#00BFFF]" />
                                    ) : validationStates.gemini.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-red-500" />
                                    ) : null}
                                </div>
                            </div>

                            {/* DallE API Validation */}
                            <div className="flex items-center justify-between">
                                <span className="text-white/80">DallE API</span>
                                <div className="flex items-center">
                                    {validationStates.dallE.loading ? (
                                        <div className="h-5 w-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.dallE.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-[#00BFFF]" />
                                    ) : validationStates.dallE.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-red-500" />
                                    ) : null}
                                </div>
                            </div>

                            {/* Murf API Validation */}
                            <div className="flex items-center justify-between">
                                <span className="text-white/80">Murf API</span>
                                <div className="flex items-center">
                                    {validationStates.murf.loading ? (
                                        <div className="h-5 w-5 border-2 border-[#00BFFF] border-t-transparent rounded-full animate-spin" />
                                    ) : validationStates.murf.valid ? (
                                        <CheckCircleIcon className="h-5 w-5 text-[#00BFFF]" />
                                    ) : validationStates.murf.valid === false ? (
                                        <XCircleIcon className="h-5 w-5 text-red-500" />
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {overallStatus === 'error' && (
                            <p className="text-red-400 text-sm mb-4">
                                One or more API keys are invalid. Please check and try again.
                            </p>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={validateAllKeys}
                                disabled={overallStatus === 'validating'}
                                className="px-4 py-2 rounded-lg bg-[#00BFFF] hover:bg-[#0099CC] text-white disabled:opacity-50 transition-colors"
                            >
                                {overallStatus === 'validating' ? 'Validating...' : 'Validate All'}
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
                    borderColor: '#00BFFF',
                    backgroundColor: 'rgba(0, 191, 255, 0.2)',
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
                borderColor: '#00BFFF',
                backgroundColor: 'rgba(0, 191, 255, 0.2)',
                tension: 0.3,
                fill: true
            }]
        };
    };

    if (isLoading) {
        return (
            <main className="flex w-full min-h-screen justify-center bg-gradient-to-r from-[#000120] to-[#18214E] text-white p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00BFFF]"></div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex w-full min-h-screen justify-center bg-gradient-to-r from-[#000120] to-[#18214E] text-white p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto bg-red-900/30 p-6 rounded-lg">
                    <p className="text-red-400">Error: {error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-[#00BFFF] hover:bg-[#0099CC] text-white font-bold py-2 px-4 rounded"
                    >
                        Try Again
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
                className="flex w-full min-h-screen justify-center bg-gradient-to-r from-[#000120] to-[#18214E] text-white p-4 sm:p-6 lg:p-8"
            >
                <DeleteConfirmationModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteAccount} />

                <motion.div
                    className="w-full max-w-7xl mx-auto"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants} className="flex items-center mb-8">
                        <motion.button
                            onClick={() => router.back()}
                            aria-label="Go back to previous page"
                            className="p-2 mr-4 rounded-full bg-white/[8%] hover:bg-white/[15%] transition-colors duration-200"
                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <ArrowLeftIcon className="w-6 h-6 text-[#00BFFF]" />
                        </motion.button>
                        <h1 className="text-3xl font-bold text-[#00BFFF]">Settings</h1>
                    </motion.div>

                    <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-3 space-y-8 grid lg:grid-cols-2 gap-8 h-max">
                            {/* Profile Section */}
                            <motion.section variants={itemVariants} whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 191, 255, 0.1)' }} className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full">
                                <h2 className="text-xl font-semibold mb-6 flex items-center">
                                    <UserCircleIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> Profile Details
                                </h2>
                                <form onSubmit={handlePasswordUpdate}>
                                    <div className="space-y-6">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={profileData.name}
                                                onChange={handleProfileChange}
                                                className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                placeholder="Enter your full name"
                                            />
                                        </div>

                                        <h2 className="text-lg font-semibold mb-6 flex items-center pt-4">
                                            <KeyIcon className="w-6 h-6 mr-3 text-[#00BFFF]" />
                                            Change Password
                                        </h2>

                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="currentPassword" className="block text-sm font-medium text-white/80 mb-2">
                                                    Current Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="currentPassword"
                                                    name="currentPassword"
                                                    value={profileData.currentPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="newPassword" className="block text-sm font-medium text-white/80 mb-2">
                                                    New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="newPassword"
                                                    name="newPassword"
                                                    value={profileData.newPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                                                    Confirm New Password
                                                </label>
                                                <input
                                                    type="password"
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    value={profileData.confirmPassword}
                                                    onChange={handleProfileChange}
                                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#00BFFF] hover:bg-[#0099CC] transition-colors text-white font-bold py-2 px-6 rounded-md text-sm">
                                            Update Password
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.section>

                            {/* API Keys Section */}
                            <motion.section variants={itemVariants} whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 191, 255, 0.1)' }} className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full">
                                <h2 className="text-lg font-semibold mb-6 flex items-center">
                                    <KeyIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> API Keys
                                </h2>
                                <form onSubmit={handleApiKeysUpdate}>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="gemini_api" className="block text-sm font-medium text-white/80 mb-2">
                                                GEMINI API KEY <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="gemini_api"
                                                name="gemini_api"
                                                value={apiKeys.gemini_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="dall_e_api" className="block text-sm font-medium text-white/80 mb-2">
                                                DallE API <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="dall_e_api"
                                                name="dall_e_api"
                                                value={apiKeys.dall_e_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="murf_api" className="block text-sm font-medium text-white/80 mb-2">
                                                MURF API <span className="text-red-500 font-bold">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                id="murf_api"
                                                name="murf_api"
                                                value={apiKeys.murf_api}
                                                onChange={handleApiKeyChange}
                                                className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-[#00BFFF] hover:bg-[#0099CC] transition-colors text-white font-bold py-2 px-6 rounded-md text-sm">
                                            Update API Keys
                                        </motion.button>
                                    </div>
                                    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.5 } }} className="bg-[#4C132A]/[40%] border border-red-500/50 rounded-2xl p-6 shadow-xl lg:col-span-2 mt-6">
                                        <h2 className="text-xl font-semibold mb-4 flex items-center text-red-400">
                                            <ShieldExclamationIcon className="w-6 h-6 mr-3" /> Danger Zone
                                        </h2>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h3 className="font-bold">Delete Account</h3>
                                                <p className="text-sm text-white/60 max-w-lg">This will deactivate your account. Your data will be preserved but you won't be able to log in.</p>
                                            </div>
                                            <motion.button type="button" onClick={() => setIsDeleteModalOpen(true)} whileHover={{ scale: 1.05, backgroundColor: '#B91C1C' }} whileTap={{ scale: 0.95 }} className="flex items-center justify-center mt-4 sm:mt-0 sm:ml-4 flex-shrink-0 bg-red-600/80 transition-colors text-white font-bold py-2 px-4 rounded-md text-sm">
                                                <TrashIcon className="w-4 h-4 mr-2" /> Delete My Account
                                            </motion.button>
                                        </div>
                                    </motion.section>
                                </form>
                            </motion.section>
                        </div>

                        <motion.h1 variants={itemVariants} className="text-3xl font-bold text-[#00BFFF] my-8 lg:col-span-3">Usage</motion.h1>

                        <aside className="lg:col-span-3 grid lg:grid-cols-3 gap-8">
                            {Object.entries(usageStats).map(([type, stats]) => (
                                <motion.section key={type} className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full" variants={itemVariants} whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 191, 255, 0.1)' }}>
                                    <h2 className="text-xl font-semibold mb-6 flex items-center">
                                        <ChartBarIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> {typeToDisplayName[type] || type} Usage
                                    </h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <DocumentTextIcon className="w-8 h-8 mx-auto text-[#00BFFF]/80 mb-2" />
                                                <p className="text-2xl font-bold">{stats.total_count}</p>
                                                <p className="text-xs text-white/60">Jobs Created</p>
                                            </div>
                                            <div className="bg-black/20 p-4 rounded-lg">
                                                <CpuChipIcon className="w-8 h-8 mx-auto text-[#00BFFF]/80 mb-2" />
                                                <p className="text-2xl font-bold">{stats.total_token_received.toLocaleString()}</p>
                                                <p className="text-xs text-white/60">Tokens Generated</p>
                                            </div>
                                        </div>
                                        <div>
                                            <Line data={generateChartData(type)} options={{ responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Usage This Week', color: '#FFFFFF', position: 'bottom' } }, scales: { y: { ticks: { color: 'rgba(255,255,255,0.7)' } }, x: { ticks: { color: 'rgba(255,255,255,0.7)' } } } }} />
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






