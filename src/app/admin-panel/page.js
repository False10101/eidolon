'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    UsersIcon,
    ChartBarIcon,
    ClockIcon,
    UserCircleIcon,
    ChevronRightIcon,
    ServerIcon,
    CpuChipIcon,
    DocumentTextIcon,
    ArrowLeftIcon,
    HomeIcon,
    UserPlusIcon,
    XMarkIcon
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
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const avatarColors = [
    '#2563EB', // A strong blue
    '#4338CA', // Indigo
    '#6D28D9', // A vibrant violet
    '#1E3A8A', // A deep, dark blue
    '#5B21B6', // A rich purple
    '#3B82F6', // A brighter, sky-like blue
];

const colorMap = {
    'Document': '#3366FF',
    'Inclass Notes': '#5A83B8',
    'Textbook Explainer': '#6A5ACD',
    'TTS with Subtitles': '#4A60DE',
    'Image Generation': '#8AD3CC',
    'Chat with AI': '#7796C7',
};




// --- ANIMATION VARIANTS ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
    },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 100 },
    },
};

// --- NEW COMPONENT: CreateUserModal ---
const CreateUserModal = ({ isOpen, onClose, onCreateUser }) => {
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        type: 'User', // Default to 'User'
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors

        // --- Validation ---
        if (!newUser.username || !newUser.password || !newUser.confirmPassword) {
            setError('Please fill out all fields.');
            return;
        }
        if (newUser.password !== newUser.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/admin/createAccount', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: newUser.username,
                    password: newUser.password,
                    type: newUser.type.toLowerCase(), // Send 'user' or 'admin'
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle errors from the API (e.g., username taken)
                throw new Error(data.message || 'Failed to create account.');
            }

            // Call parent's handler to update the UI, if provided
            if (onCreateUser) {
                onCreateUser(data.newUser); // Assuming API returns the created user
            }

            // Reset form and close modal on success
            setNewUser({ username: '', password: '', confirmPassword: '', type: 'User' });
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#141B3C] border border-white/[15%] rounded-2xl p-6 shadow-xl w-full max-w-md"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-[#00BFFF] flex items-center">
                                <UserPlusIcon className="w-6 h-6 mr-3" />
                                Create New User
                            </h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
                                <XMarkIcon className="w-6 h-6 text-white/70" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-white/80 mb-2">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={newUser.username}
                                    onChange={handleChange}
                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                    placeholder="e.g., jdoe"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={newUser.password}
                                    onChange={handleChange}
                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={newUser.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 px-3 text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-white/80 mb-2">Type</label>
                                <div className="relative">
                                    <select
                                        id="type"
                                        name="type"
                                        value={newUser.type}
                                        onChange={handleChange}
                                        className="w-full bg-black/[30%] border border-white/[25%] rounded-md text-white focus:outline-none focus:border-[#00BFFF] py-2 pl-3 pr-8 text-sm appearance-none"
                                    >
                                        <option>User</option>
                                        <option>Admin</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/70">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                            <div className="flex justify-end pt-4">
                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-[#00BFFF] hover:bg-[#0099CC] transition-colors text-white font-bold py-2 px-6 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Account'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};



// --- COMPONENTS ---

const UsageChart = ({ data }) => {
    const chartData = {
        labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [
            {
                label: 'Tokens Used',
                data: data.map(d => d.token_received),
                borderColor: '#00BFFF',
                backgroundColor: 'rgba(0, 191, 255, 0.2)',
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
        },
        scales: {
            y: {
                ticks: { color: 'rgba(255,255,255,0.5)' },
                grid: { color: 'rgba(255,255,255,0.1)' },
            },
            x: {
                ticks: { color: 'rgba(255,255,255,0.5)' },
                grid: { display: false },
            },
        },
    };

    return <Line data={chartData} options={chartOptions} />;
};


const UserDetailView = ({ user, onBack }) => {

    const [userData, setUserData] = useState({});
    const [activityList, setActivityList] = useState([]);
    const [usageData, setUsageData] = useState([]);
    var [totalCalls, setTotalCalls] = useState(0);
    const [dailyData, setDailyData] = useState([]);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch(`/api/admin/getUserDetail?id=${user}`, {
                    method: 'GET',
                    credentials: 'include',
                });

                const data = await response.json();

                setUserData(data.userData[0]);
                setActivityList(data.activityList);
                setUsageData(data.usageData);
                setDailyData(data.dailyData);

                setTotalCalls(data.usageData.reduce((total, item) => total + item.callCount, 0))

            } catch (error) {
                console.error('Error fetching data:', error);
            }

        }

        fetchContent();
    }, [])

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-[#000120] to-[#18214E] p-4 sm:p-6 lg:p-8 flex flex-col"
        >
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full">
                {/* --- HEADER --- */}
                <motion.div variants={itemVariants} className="flex items-center mb-8 flex-shrink-0">
                    <motion.button
                        onClick={onBack}
                        aria-label="Go back to user list"
                        className="p-2 mr-4 rounded-full bg-white/[8%] hover:bg-white/[15%] transition-colors duration-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-[#00BFFF]" />
                    </motion.button>
                    <h1 className="text-3xl font-bold text-[#00BFFF]">User Details</h1>
                </motion.div>

                {/* --- CONTENT AREA --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-grow min-h-0">
                    {/* Left Column */}
                    <div className="xl:col-span-2 flex flex-col gap-8 min-h-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-shrink-0">
                            <motion.section variants={itemVariants} className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl flex items-center space-x-6">
                                <div
                                    className="w-18 h-18 rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor: avatarColors[userData.id % avatarColors.length],
                                    }}
                                >
                                    <span className="text-white text-3xl font-bold">
                                        {userData.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>                                <div>
                                    <h2 className="text-2xl font-bold text-white">{userData.username}</h2>
                                    <p className="text-white/70">ID : #{userData.id}</p>
                                    <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-[#00BFFF] bg-[#00BFFF]/10 rounded-full">{new Date(userData.created_at).toLocaleString()}</span>
                                </div>
                            </motion.section>
                            <motion.section variants={itemVariants}>
                                <div className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl h-full flex flex-col justify-center">
                                    <h3 className="text-xl font-semibold mb-4 flex items-center"><ServerIcon className="w-6 h-6 mr-3 text-[#00BFFF]" />Storage Space</h3>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-white/80">Used Space</span>
                                        <span className="text-2xl font-bold text-[#00BFFF]">{userData.storage_usage} GB</span>
                                    </div>
                                    <div className="w-full bg-black/30 rounded-full h-2.5">
                                        <motion.div
                                            className="bg-[#00BFFF] h-2.5 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `100%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        ></motion.div>
                                    </div>
                                    <p className="text-right text-sm text-white/60 mt-2">{user.storageTotal} GB Total</p>
                                </div>
                            </motion.section>
                        </div>

                        <motion.div variants={itemVariants} className="flex flex-col flex-grow min-h-0">
                            <section className='flex flex-col h-full'>
                                <h3 className="text-xl font-semibold mb-4 flex items-center flex-shrink-0"><ClockIcon className="w-6 h-6 mr-3 text-[#00BFFF]" />Personal Activity Log</h3>
                                <div className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-4 shadow-xl space-y-4 flex-grow overflow-y-auto">
                                    {activityList.length > 0 ? activityList.map((log, index) => (
                                        <motion.div key={index} variants={itemVariants} className="bg-black/20 p-4 rounded-lg flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold" style={{ color: colorMap[log.type] || '#CCCCCC' }}>{log.type}</p>
                                                <p className="text-sm text-white/60">{log.title}</p>
                                            </div>
                                            <p className="text-xs text-white/50 flex-shrink-0 ml-4">{new Date(log.date).toLocaleString()}</p>
                                        </motion.div>
                                    )) : <p className="text-center text-white/50 py-4">No activity recorded for this user.</p>}
                                </div>
                            </section>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <motion.div variants={itemVariants} className="flex flex-col min-h-0">
                        <section className="flex flex-col h-full">
                            <h3 className="text-xl font-semibold mb-4 flex items-center flex-shrink-0"><ChartBarIcon className="w-6 h-6 mr-3 text-[#00BFFF]" />Usage Statistics</h3>
                            <div className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-6 shadow-xl flex flex-col flex-grow min-h-0">
                                <div className="space-y-10 flex-grow">
                                    <div className="bg-black/20 p-4 rounded-lg text-center">
                                        <p className="text-xs text-white/60">Total API Calls</p>
                                        <p className="text-3xl font-bold text-white"> {totalCalls.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="space-y-4">
                                        {
                                            usageData.map((type, index) => (
                                                <div key={index} className="text-sm">
                                                    <div className="flex justify-between text-white/80">
                                                        <span>{type.type}</span>
                                                        <span>{type.callCount || 0} calls / {type.tokenCount || 0} tokens</span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <div className="h-48">
                                        {dailyData.length > 0 ? <UsageChart data={dailyData} /> : <p className="text-center text-white/50 pt-16">No usage data available.</p>}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
};


const AdminDashboard = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const [userList, setUserList] = useState([]);
    const [activityList, setActivityList] = useState([]);

    const handleSelectUser = (user) => {
        setSelectedUser(user);
    };

    const handleBack = () => {
        setSelectedUser(null);
    };


    const handleCreateUser = (newlyCreatedUser) => {

        setUserList(prevUserList => [...prevUserList, newlyCreatedUser]);
    };

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const [activityListResponse, userListResponse] = await Promise.all([
                    fetch('/api/admin/getActivity').then(res => res.json()),

                    fetch('/api/admin/getUserList').then(res => res.json())
                ]);

                console.log('Activity data:', activityListResponse);
                console.log('User data:', userListResponse);

                setActivityList(activityListResponse.activityList);
                setUserList(userListResponse.userList);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchContent();
    }, []);

    return (
        <div className="relative w-full h-screen bg-gradient-to-r from-[#000120] to-[#18214E] text-white flex flex-col overflow-hidden">
            <CreateUserModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreateUser={handleCreateUser} />
            <AnimatePresence>
                {selectedUser ? (
                    <UserDetailView key={selectedUser.id} user={selectedUser} onBack={handleBack} />
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-4 sm:p-6 lg:p-8 flex flex-col flex-grow h-full"
                    >
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className='flex flex-col h-full'>
                            <motion.div variants={itemVariants} className="flex items-center mb-8 flex-shrink-0">
                                <motion.button
                                    onClick={() => window.history.back()}
                                    aria-label="Go back to previous page"
                                    className="p-2 mr-4 rounded-full bg-white/[8%] hover:bg-white/[15%] transition-colors duration-200"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <ArrowLeftIcon className="w-6 h-6 text-[#00BFFF]" />
                                </motion.button>
                                <h1 className="text-3xl font-bold text-[#00BFFF]">Admin Panel</h1>
                            </motion.div>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-grow overflow-hidden">
                                {/* Left Column: Users List */}
                                <motion.div variants={itemVariants} className="xl:col-span-1 flex flex-col min-h-0">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                        <h2 className="text-xl font-semibold flex items-center"><UsersIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> All Users</h2>
                                        <motion.button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                            className="flex items-center bg-[#00BFFF]/80 hover:bg-[#00BFFF] transition-colors text-white font-bold py-2 px-4 rounded-md text-sm"
                                        >
                                            <UserPlusIcon className="w-4 h-4 mr-2" />
                                            Create User
                                        </motion.button>
                                    </div>
                                    <div className="space-y-4 flex-grow overflow-y-auto pr-2">
                                        {userList.map(user => (
                                            <motion.div
                                                key={user.id}
                                                variants={itemVariants}
                                                whileHover={{ y: -5, boxShadow: '0 8px 30px rgba(0, 191, 255, 0.1)' }}
                                                onClick={() => handleSelectUser(user.id)}
                                                className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-4 shadow-xl flex items-center justify-between cursor-pointer transition-all duration-300"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                                        style={{
                                                            backgroundColor: avatarColors[user.id % avatarColors.length],
                                                        }}
                                                    >
                                                        <span className="text-white text-xl font-bold">
                                                            {user.username?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{user.username}</p>
                                                        <p className="text-sm text-white/60">User ID: #{user.id}</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className="w-6 h-6 text-white/30" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Right Column: Global Activity */}
                                <motion.div variants={itemVariants} className="xl:col-span-2 flex flex-col min-h-0">
                                    <h2 className="text-xl font-semibold mb-4 flex items-center flex-shrink-0"><ClockIcon className="w-6 h-6 mr-3 text-[#00BFFF]" /> Global Activity Feed</h2>
                                    <div className="bg-[#141B3C]/[64%] border border-white/[15%] rounded-2xl p-4 shadow-xl space-y-4 flex-grow overflow-y-auto">
                                        <AnimatePresence>
                                            {activityList.map((log, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="bg-black/20 p-4 rounded-lg"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-semibold text-white">
                                                                <span className="text-[#00BFFF] mr-1">{log.username}</span> performed
                                                                <span className='ml-2' style={{ color: colorMap[log.type] || '#CCCCCC' }}>
                                                                    {log.type}
                                                                </span>
                                                            </p>
                                                            <p className="text-sm text-white/60 mt-1">{log.title}</p>
                                                        </div>
                                                        <p className="text-sm text-white/50 flex-shrink-0 ml-4">{new Date(log.date).toLocaleString()}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function AdminPage() {
    return <AdminDashboard />;
}
