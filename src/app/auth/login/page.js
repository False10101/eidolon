"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Animation variants for the container and its items
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
                if (res.status === 200) {
                    const data = await res.json();
                    if (data.username && data.userId) {
                        router.push('/home');
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
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            const data = await res.json();
            if (res.ok) {
                router.push('/home');
            } else {
                setError(data.message || 'An unexpected error occurred.');
            }
        } catch (err) {
            setError('A network error occurred. Please try again.');
            console.error('Network error:', err);
        }
    };

    return (
        <div className="flex flex-col w-full h-full rounded-none" style={{ backgroundImage: "url('/authbg.png')", backgroundSize: "cover" }}>
           <motion.div
                className="flex flex-col h-max my-auto mx-[15.5%] w-full space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl font-semibold text-shadow-[#4efcf7] text-shadow-[0_0px_31px_rgb(78_252_247_/_1)] mb-10"
                >
                    Sign In
                </motion.h1>
                <motion.input
                    variants={itemVariants}
                    placeholder="Username..."
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-[40%] p-3 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-lg text-[#959694] rounded-md hover:bg-[#243357] transition-colors"
                />
                <motion.input
                    variants={itemVariants}
                    type="password"
                    placeholder="Password..."
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-[40%] p-3 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-lg text-[#959694] rounded-md hover:bg-[#243357] transition-colors"
                />
                {error &&
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-md -mt-4"
                    >
                        {error}
                    </motion.div>
                }
                <motion.div variants={itemVariants} className="flex flex-row w-[40%] mb-12">
                    <motion.button
                        onClick={handleLogin}
                        className="flex px-8 py-3 rounded-md bg-[#00BFFF] w-max px-20 text-lg font-semibold text-white"
                        whileHover={{ scale: 1.05, backgroundColor: '#A3E8FF', color: '#0B1143' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        Log In
                    </motion.button>
                </motion.div>
           </motion.div>
        </div>
    )
}
