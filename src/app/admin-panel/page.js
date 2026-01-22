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

// --- THEME CONSTANTS ---
const avatarColors = [
    '#2563EB', // Blue
    '#0891B2', // Cyan
    '#7C3AED', // Violet
    '#0284C7', // Sky
    '#4F46E5', // Indigo
    '#0D9488', // Teal
];

const colorMap = {
    'Document': '#60A5FA', // Blue-400
    'Inclass Notes': '#22D3EE', // Cyan-400
    'Textbook Explainer': '#A78BFA', // Violet-400
    'TTS with Subtitles': '#818CF8', // Indigo-400
    'Image Generation': '#2DD4BF', // Teal-400
    'Chat with AI': '#38BDF8', // Sky-400
};

const cardHoverEffect = {
    y: -5,
    boxShadow: '0 0px 25px rgba(6, 182, 212, 0.25), inset 0 0 10px rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    transition: { type: 'spring', stiffness: 300 }
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
        setError('');

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
                    type: newUser.type.toLowerCase(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create account.');
            }

            if (onCreateUser) {
                onCreateUser(data.newUser);
            }

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
                    className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#0b1221] border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.2)] w-full max-w-md"
                    >
                        <div className="flex justify-between items-center mb-6 border-b border-slate-800/60 pb-4">
                            <h3 className="text-xl font-bold text-cyan-400 flex items-center drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                                <UserPlusIcon className="w-6 h-6 mr-3" />
                                New Protocol User
                            </h3>
                            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition-colors">
                                <XMarkIcon className="w-6 h-6 text-slate-400 hover:text-white" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="username" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={newUser.username}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                    placeholder="e.g., jdoe"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={newUser.password}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={newUser.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder-slate-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label htmlFor="type" className="block text-xs font-mono text-cyan-200/60 mb-2 uppercase tracking-widest">Clearance Level</label>
                                <div className="relative">
                                    <select
                                        id="type"
                                        name="type"
                                        value={newUser.type}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-[#0f172a]/60 border border-slate-700/50 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all outline-none appearance-none"
                                    >
                                        <option>User</option>
                                        <option>Admin</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {error && <p className="text-rose-400 text-sm text-center font-mono">{error}</p>}

                            <div className="flex justify-end pt-4">
                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-colors text-white font-bold py-2.5 px-6 rounded-lg text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Initializing...' : 'Create Account'}
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
                borderColor: '#22d3ee', // Cyan-400
                backgroundColor: 'rgba(34, 211, 238, 0.2)',
                pointBackgroundColor: '#22d3ee',
                pointBorderColor: '#000',
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
                ticks: { color: 'rgba(148, 163, 184, 0.6)', font: { size: 10, family: 'monospace' } },
                grid: { color: 'rgba(51, 65, 85, 0.3)' },
            },
            x: {
                ticks: { color: 'rgba(148, 163, 184, 0.6)', font: { size: 10, family: 'monospace' } },
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
            className="absolute top-0 left-0 w-full h-full bg-black text-slate-200 p-4 sm:p-6 lg:p-8 flex flex-col font-sans"
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
        >
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full w-full max-w-7xl mx-auto">
                {/* --- HEADER --- */}
                <motion.div variants={itemVariants} className="flex items-center mb-8 flex-shrink-0 pt-2">
                    <motion.button
                        onClick={onBack}
                        aria-label="Go back to user list"
                        className="p-2 mr-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-700/50 transition-colors duration-200 group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <ArrowLeftIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    </motion.button>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }}>
                        User Diagnostics
                    </h1>
                </motion.div>

                {/* --- CONTENT AREA --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-grow min-h-0">
                    {/* Left Column */}
                    <div className="xl:col-span-2 flex flex-col gap-8 min-h-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-shrink-0">
                            <motion.section 
                                variants={itemVariants} 
                                className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 shadow-xl flex items-center space-x-6 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                <div
                                    className="w-18 h-18 rounded-lg border border-slate-600/50 flex items-center justify-center shadow-lg"
                                    style={{
                                        backgroundColor: avatarColors[userData.id % avatarColors.length] + '40', // Add transparency
                                        borderColor: avatarColors[userData.id % avatarColors.length]
                                    }}
                                >
                                    <span className="text-3xl font-bold" style={{ color: avatarColors[userData.id % avatarColors.length] }}>
                                        {userData.username?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className='z-10'>
                                    <h2 className="text-2xl font-bold text-white tracking-wide">{userData.username}</h2>
                                    <p className="text-slate-400 font-mono text-xs mt-1">ID: <span className="text-cyan-400">#{userData.id}</span></p>
                                    <span className="inline-block mt-3 px-3 py-1 text-[10px] font-bold tracking-widest text-cyan-300 border border-cyan-500/30 bg-cyan-950/30 rounded uppercase shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                        Joined: {new Date(userData.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </motion.section>

                            <motion.section variants={itemVariants}>
                                <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 shadow-xl h-full flex flex-col justify-center relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                    <h3 className="text-lg font-bold mb-4 flex items-center text-slate-200">
                                        <ServerIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                        Storage Allocation
                                    </h3>
                                    <div className="flex justify-between items-baseline mb-2 font-mono">
                                        <span className="text-slate-400 text-xs uppercase tracking-widest">Used Space</span>
                                        <span className="text-xl font-bold text-cyan-400">{userData.storage_usage} GB</span>
                                    </div>
                                    <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                                        <motion.div
                                            className="bg-cyan-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `100%` }} // Logic would go here for %
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        ></motion.div>
                                    </div>
                                    <p className="text-right text-xs font-mono text-slate-500 mt-2">{user.storageTotal || 10} GB Total Capacity</p>
                                </div>
                            </motion.section>
                        </div>

                        <motion.div variants={itemVariants} className="flex flex-col flex-grow min-h-0">
                            <section className='flex flex-col h-full'>
                                <h3 className="text-lg font-bold mb-4 flex items-center flex-shrink-0 text-slate-200">
                                    <ClockIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                    Personal Activity Log
                                </h3>
                                <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-1 shadow-xl space-y-1 flex-grow overflow-y-auto custom-scrollbar">
                                    {activityList.length > 0 ? activityList.map((log, index) => (
                                        <motion.div 
                                            key={index} 
                                            variants={itemVariants} 
                                            className="hover:bg-cyan-900/10 p-3 rounded-lg flex justify-between items-center border-b border-slate-800/30 last:border-0 transition-colors"
                                        >
                                            <div className='flex items-center'>
                                                <div className="w-2 h-2 rounded-full mr-3 shadow-[0_0_5px_currentColor]" style={{ color: colorMap[log.type] || '#CCCCCC', backgroundColor: colorMap[log.type] || '#CCCCCC' }}></div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-wide" style={{ color: colorMap[log.type] || '#CCCCCC' }}>{log.type}</p>
                                                    <p className="text-xs text-slate-400">{log.title}</p>
                                                </div>
                                            </div>
                                            <p className="text-xs font-mono text-slate-500 flex-shrink-0 ml-4">{new Date(log.date).toLocaleString()}</p>
                                        </motion.div>
                                    )) : <p className="text-center text-slate-500 py-10 font-mono text-sm">No activity data found in archives.</p>}
                                </div>
                            </section>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <motion.div variants={itemVariants} className="flex flex-col min-h-0">
                        <section className="flex flex-col h-full">
                            <h3 className="text-lg font-bold mb-4 flex items-center flex-shrink-0 text-slate-200">
                                <ChartBarIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                Usage Statistics
                            </h3>
                            <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-6 shadow-xl flex flex-col flex-grow min-h-0 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="space-y-8 flex-grow z-10">
                                    <div className="bg-[#0f172a]/60 border border-slate-700/50 p-6 rounded-xl text-center">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono mb-2">Total API Calls</p>
                                        <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"> {totalCalls.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="space-y-3">
                                        {
                                            usageData.map((type, index) => (
                                                <div key={index} className="text-sm border-b border-slate-800/50 pb-2 last:border-0">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-300 font-medium">{type.type}</span>
                                                        <span className="font-mono text-xs text-cyan-200/70">{type.callCount || 0} calls / {type.tokenCount || 0} tok</span>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <div className="h-48 pt-4 border-t border-slate-800/50">
                                        {dailyData.length > 0 ? <UsageChart data={dailyData} /> : <p className="text-center text-slate-500 pt-16 font-mono text-xs">Awaiting Usage Data...</p>}
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

                setActivityList(activityListResponse.activityList);
                setUserList(userListResponse.userList);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchContent();
    }, []);

    return (
        <div 
            className="relative w-full h-screen bg-black text-slate-200 flex flex-col overflow-hidden font-sans"
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
        >
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
                        className="p-4 sm:p-6 lg:p-8 flex flex-col flex-grow h-full max-w-7xl mx-auto w-full"
                    >
                        <motion.div variants={containerVariants} initial="hidden" animate="visible" className='flex flex-col h-full'>
                            <motion.div variants={itemVariants} className="flex items-center mb-8 flex-shrink-0 pt-2">
                                <motion.button
                                    onClick={() => window.history.back()}
                                    aria-label="Go back to previous page"
                                    className="p-2 mr-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-700/50 transition-colors duration-200 group"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <ArrowLeftIcon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                                </motion.button>
                                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600" style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.4))' }}>
                                    System Administration
                                </h1>
                            </motion.div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-grow overflow-hidden">
                                {/* Left Column: Users List */}
                                <motion.div variants={itemVariants} className="xl:col-span-1 flex flex-col min-h-0">
                                    <div className="flex justify-between items-center mb-4 flex-shrink-0">
                                        <h2 className="text-xl font-bold flex items-center text-slate-200">
                                            <UsersIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> 
                                            Registered Users
                                        </h2>
                                        <motion.button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            whileHover={{ scale: 1.05, boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)' }} 
                                            whileTap={{ scale: 0.95 }}
                                            className="flex items-center bg-cyan-600 hover:bg-cyan-500 transition-all text-white font-bold py-2 px-4 rounded-lg text-xs tracking-wide shadow-lg border border-cyan-400/20"
                                        >
                                            <UserPlusIcon className="w-4 h-4 mr-2" />
                                            ADD USER
                                        </motion.button>
                                    </div>
                                    <div className="space-y-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                        {userList.map(user => (
                                            <motion.div
                                                key={user.id}
                                                variants={itemVariants}
                                                whileHover={cardHoverEffect}
                                                onClick={() => handleSelectUser(user.id)}
                                                className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-xl p-4 shadow-lg flex items-center justify-between cursor-pointer group"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="w-10 h-10 rounded-lg flex items-center justify-center border border-white/10 shadow-inner"
                                                        style={{
                                                            backgroundColor: avatarColors[user.id % avatarColors.length] + '30', // Transparent bg
                                                        }}
                                                    >
                                                        <span className="text-lg font-bold" style={{ color: avatarColors[user.id % avatarColors.length] }}>
                                                            {user.username?.charAt(0).toUpperCase() || 'U'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{user.username}</p>
                                                        <p className="text-xs text-slate-500 font-mono">UID: #{user.id}</p>
                                                    </div>
                                                </div>
                                                <ChevronRightIcon className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Right Column: Global Activity */}
                                <motion.div variants={itemVariants} className="xl:col-span-2 flex flex-col min-h-0">
                                    <h2 className="text-xl font-bold mb-4 flex items-center flex-shrink-0 text-slate-200">
                                        <ClockIcon className="w-5 h-5 mr-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" /> 
                                        Global System Feed
                                    </h2>
                                    <div className="bg-[#0b1221]/80 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-2 shadow-xl space-y-2 flex-grow overflow-y-auto custom-scrollbar">
                                        <AnimatePresence>
                                            {activityList.map((log, index) => (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="bg-[#0f172a]/40 hover:bg-[#0f172a]/80 border border-slate-800/50 p-4 rounded-xl transition-all"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center">
                                                            <div className="h-2 w-2 rounded-full mr-3 animate-pulse" style={{ backgroundColor: colorMap[log.type] || '#CCCCCC', boxShadow: `0 0 8px ${colorMap[log.type] || '#CCCCCC'}` }}></div>
                                                            <div>
                                                                <p className="font-medium text-slate-300 text-sm">
                                                                    <span className="text-cyan-400 font-bold mr-1">{log.username}</span> 
                                                                    initiated protocol:
                                                                    <span className='ml-1 font-bold' style={{ color: colorMap[log.type] || '#CCCCCC' }}>
                                                                        {log.type}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-0.5">{log.title}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-mono text-slate-600 flex-shrink-0 ml-4">{new Date(log.date).toLocaleString()}</p>
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