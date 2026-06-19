import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User, ArrowRight, Github } from 'lucide-react';
import apiClient from '../api.js';
const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email || !password || (!isLogin && !username)) {
            toast.error('Please fill all fields');
            return;
        }

        try {
            // 1. Determine if we are logging in or signing up
            const endpoint = isLogin 
                ? '/api/auth/login'   // Adjust these URLs if your backend routes are named differently
                : '/api/auth/register';

            const bodyData = isLogin 
                ? { email, password } 
                : { username, email, password };

            // 2. Send the data to your Node.js backend
            // const response = await fetch(endpoint, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(bodyData)
            // });
            const response = await apiClient.post(endpoint, bodyData);

        const data = await response.data();
            
            if (!response.ok) {
                throw new Error(data.message || 'Auth failed');
            }

            // ✨ OPTION 1: THE PERSISTENT STORE
            // We save the token under a consistent key name 'token'
          // 4. THE MAGIC: SAVE EVERYTHING
            // We save the token separately AND inside userInfo to be double-safe
            localStorage.setItem('token', data.token); 
            
            const userWithToken = { ...data.user, token: data.token };
            localStorage.setItem('userInfo', JSON.stringify(userWithToken)); 

            console.log("✅ SESSION SAVED SUCCESSFULLY");
            toast.success('Welcome back!');
            
            // Use a small timeout to ensure storage is written before navigating
            setTimeout(() => {
                navigate('/');
            }, 100);
        } catch (error) {
            console.error("Auth Error:", error);
            toast.error(error.message);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
            
            {/* 🎨 AESTHETIC BACKGROUND ELEMENTS */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-900/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>

            <div className="z-10 w-full max-w-md px-6">
                {/* LOGO SECTION */}
                <div className="flex flex-col items-center mb-10 animate-fadeIn">
    <div className="flex items-center gap-3 group cursor-default">
        {/* The "C" Icon with Gradient */}
        <div className="w-12 h-12 bg-gradient-to-br from-[#3b82f6] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform group-hover:scale-110 transition-transform duration-300">
            <span className="text-white text-2xl font-black">C</span>
        </div>
        
        {/* Typography: Bold White + Thin Gray */}
        <div className="flex items-baseline gap-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">CodeSync</h1>
        </div>
    </div>
</div>
                {/* AUTH CARD */}
                <div className="bg-[#161616]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">
                            {isLogin ? 'Login' : 'Join the Club'}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {isLogin ? 'Enter your credentials to continue' : 'Start your collaborative journey with us'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {!isLogin && (
                            <div className="relative group">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all shadow-inner"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors" size={18} />
                            <input
                                type="email"
                                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all shadow-inner"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-green-500 transition-colors" size={18} />
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-600 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all shadow-inner"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button className="w-full group bg-green-500 hover:bg-green-400 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] shadow-lg shadow-green-500/20">
                            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>

                    {/* DIVIDER */}
                    <div className="flex items-center my-6 gap-4">
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                        <span className="text-gray-600 text-[10px] uppercase font-bold">Or continue with</span>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>

                    <button className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 py-3 rounded-xl transition-all mb-4 text-sm font-medium">
                        <Github size={18} />
                        GitHub
                    </button>

                    <p className="text-center text-sm text-gray-500">
                        {isLogin ? "New here? " : "Joined before? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-green-400 font-semibold hover:text-green-300 hover:underline transition-all"
                        >
                            {isLogin ? 'Create an account' : 'Login instead'}
                        </button>
                    </p>
                </div>
                
                {/* FOOTER */}
                <p className="mt-8 text-center text-gray-600 text-xs">
                    Built with ❤️ for Developers. © 2026 CodeSync Pro.
                </p>
            </div>
        </div>
    );
};

export default Auth;