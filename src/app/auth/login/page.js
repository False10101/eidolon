'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Animation variants (kept same logic, tweaked timing to match Home feel)
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
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
            damping: 14,
        },
    },
};

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch(`/api/auth/login`, {
                    method: 'GET',
                    credentials: 'include'
                });
                if (res.ok) {
                    try {
                        const data = await res.json();
                        if (data.username && data.userId) {
                            router.push('/home');
                        }
                    } catch (err) {
                        console.error('Failed to parse JSON:', err);
                    }
                }
            } catch (err) {
                console.error('Auth check failed:', err);
            }
        };
        checkAuth();
    }, [router]);

    const handleLogin = async () => {
        setError(null);
        try {
            const res = await fetch(`/api/auth/login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                router.push('/home');
            } else {
                try {
                    const errorData = await res.json();
                    setError(errorData.message || 'An error occurred');
                } catch (err) {
                    setError('Invalid server response');
                }
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
            console.error('Network error:', err);
        }
    };

    return (
        // THEME UPDATE: Deep space radial gradient background
        <div 
            className="flex flex-col w-full h-full font-sans text-slate-200 overflow-hidden" 
            style={{ backgroundImage: 'radial-gradient(circle at top right, #1e293b 0%, #020617 40%, #000000 100%)' }}
        >
           {/* Decorative Glow (matches Home card aesthetics) */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

           <motion.div
                className="flex flex-col h-max my-auto mx-[15.5%] w-full space-y-6 relative z-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* THEME UPDATE: Neon Text with Gradient */}
                <motion.h1
                    variants={itemVariants}
                    className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-8 pb-2"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.4))' }}
                >
                    Sign In
                </motion.h1>

                {/* THEME UPDATE: Glassmorphic Inputs */}
                <motion.input
                    variants={itemVariants}
                    placeholder="Username..."
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-[40%] p-4 border border-slate-700/50 bg-[#0b101c]/80 backdrop-blur-md text-lg text-slate-200 rounded-xl 
                               placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 
                               transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                />

                <motion.input
                    variants={itemVariants}
                    type="password"
                    placeholder="Password..."
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-[40%] p-4 border border-slate-700/50 bg-[#0b101c]/80 backdrop-blur-md text-lg text-slate-200 rounded-xl 
                               placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 
                               transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
                />

                {error &&
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-rose-400 text-md -mt-4 font-mono flex items-center drop-shadow-[0_0_5px_rgba(251,113,133,0.5)]"
                    >
                        <span className="mr-2">⚠</span> {error}
                    </motion.div>
                }

                <motion.div variants={itemVariants} className="flex flex-row w-[40%] mb-12 pt-4">
                    {/* THEME UPDATE: Cyan Glow Button */}
                    <motion.button
                        onClick={handleLogin}
                        className="flex justify-center items-center py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 w-full text-lg font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/20"
                        whileHover={{ 
                            scale: 1.02, 
                            boxShadow: '0 0 25px rgba(6, 182, 212, 0.6)',
                            borderColor: 'rgba(6, 182, 212, 0.8)'
                        }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                        Log In
                    </motion.button>
                </motion.div>
           </motion.div>
        </div>
    )
}