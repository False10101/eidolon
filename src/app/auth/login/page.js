"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

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
    }, []);

    const handleLogin = async () => {
        setError(null);
        try {
            const res = await fetch(`/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',  
                body: JSON.stringify(form),
            });

            if (res.status === 200) {
                router.push('/home');
            } else if (res.status === 401) {
                const error_response = await res.json();
                setError(error_response.message || 'Invalid credentials');
            } else if (res.status === 404) {
                const error_response = await res.json();
                setError(error_response.message || 'User not found');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } catch (err) {
            console.error('Network error:', err);
        }
    };

    return (
        <div className="flex flex-col w-full h-full rounded-none" style={{ backgroundImage: "url('/authbg.png')", backgroundSize: "cover" }}>
           <div className="flex flex-col h-max my-auto mx-[15.5%] w-full space-y-6">
                <h1 className="text-5xl font-semibold text-shadow-[#4efcf7] text-shadow-[0_0px_31px_rgb(78_252_247_/_1)] mb-10">Sign In</h1>
                <input
                    placeholder="Username..."
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-[40%] p-3 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-lg text-[#959694] rounded-md hover:bg-[#243357]"
                />
                <input
                    type="password"
                    placeholder="Password..."
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-[40%] p-3 border-[1px] border-[#0E5E97] bg-[#333E57]/[22%] text-lg text-[#959694] rounded-md hover:bg-[#243357]"
                />
                {error && <div className="text-red-500 text-md -mt-4">{error}</div>}
                <div className="flex flex-row w-[40%] mb-12">
                    <button
                        onClick={handleLogin}
                        className="flex px-8 py-3 rounded-md bg-[#00BFFF] w-max text-lg hover:bg-[#A3E8FF] hover:text-[#0B1143]"
                    >
                        Log In
                    </button>
                    <button className="flex ml-auto my-auto text-[#959694] text-md w-max">
                        Don't have an account? <span className="underline ml-1 text-[#00BFFF]">Sign up</span>
                    </button>
                </div>
           </div>
        </div>
    )
}