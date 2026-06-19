import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Hash, User, ArrowRight, Sparkles, Mail, Lock, Terminal, ShieldCheck, Zap } from 'lucide-react';
import apiClient from '../api.js';

const Home = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // --- 1. STATE MANAGEMENT ---
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [view, setView] = useState('guest'); // 'guest' or 'auth'
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // --- 2. URL AUTO-FILL LOGIC ---
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const roomIdFromUrl = searchParams.get('roomId');
        if (roomIdFromUrl) {
            setRoomId(roomIdFromUrl);
            setView('guest');
            toast.success("Room ID auto-filled!");
        }
    }, [location]);

    // --- 3. ACTION HANDLERS ---
    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Generated unique room ID');
    };

   const joinRoom = () => {
    if (!roomId || !username) {
        toast.error('Room ID & Username required');
        return;
    }

    // FIX: Clean the roomId in case the user pasted the full URL
    // This splits the string by '/' and grabs only the last part (the UUID)
    const cleanRoomId = roomId.split('/').pop();

    // Navigate using the cleaned ID
    navigate(`/editor/${cleanRoomId}`, { state: { username } });
};

    const handleAuth = async () => {
        if (!email || !password || (!isLoginMode && !username)) {
            toast.error('Please fill all fields');
            return;
        }

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const payload = isLoginMode ? { email, password } : { username, email, password };

        try {
            // ✅ PRODUCTION FIX: Using apiClient
            const res = await apiClient.post(endpoint, payload);
            const data = res.data;
            
            localStorage.setItem('userInfo', JSON.stringify(data.user)); 
            toast.success(isLoginMode ? 'Welcome back!' : 'Account created!');
            navigate('/dashboard', { state: { user: data.user } });
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Server connection failed');
        }
    };

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-sans overflow-hidden">
            
            {/* 🎨 LEFT SIDE: PRODUCT SHOWCASE (60%) */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-[#0a0a0a] items-center justify-center p-12 overflow-hidden border-r border-white/5">
                {/* Background Glows */}
                <div className="absolute top-[-10%] left-[-10%] w-full h-full bg-blue-600/10 blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-full h-full bg-purple-600/10 blur-[150px] rounded-full"></div>

                <div className="relative z-10 w-full max-w-2xl">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em]">
                            <Zap size={12} /> Real-time Sync Active
                        </div>
                        <h2 className="text-6xl font-black leading-tight tracking-tighter">
                            Build, Sync, and <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#a855f7]">
                                Ship Together.
                            </span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-md font-light leading-relaxed">
                            The professional workspace for real-time pair programming, 
                            collaborative debugging, and seamless code sharing.
                        </p>
                    </div>

                    {/* ✨ FLOATING CODE WINDOW */}
                    <div className="mt-12 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-2 shadow-2xl animate-float">
                        <div className="h-6 w-full flex items-center gap-1.5 px-3 border-b border-white/5 mb-2">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                        <div className="p-4 font-mono text-sm text-blue-300/80">
                            <p className="text-purple-400">const</p> CodeSync = () =&gt; {"{"} <br />
                            &nbsp;&nbsp;<p className="text-gray-500">// Real-time collaboration enabled</p> <br />
                            &nbsp;&nbsp;return <p className="text-green-400">"Professional Workspace"</p>; <br />
                            {"}"};
                        </div>
                    </div>
                </div>
            </div>

            {/* 🚀 RIGHT SIDE: ACTION HUB (40%) - VERTICALLY CENTERED */}
            <div className="w-full lg:w-[40%] flex flex-col items-center justify-center p-8 bg-[#0a0a0a] min-h-screen border-l border-white/5">
                
                <div className="w-full max-w-sm space-y-10 py-12 flex flex-col items-center">
                    
                    {/* BRANDING */}
                    <div className="flex items-center gap-3 self-start">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <span className="text-white text-xl font-black">C</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <h1 className="text-xl font-bold text-white tracking-tight">CodeSync</h1>
                            <span className="text-lg font-light text-gray-500 tracking-tight">Workspace</span>
                        </div>
                    </div>

                    {/* THE FORM CARD */}
                    <div className="w-full space-y-8 bg-[#111]/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-white/5 p-1 rounded-xl relative border border-white/5">
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#1a1a1a] border border-purple-500/30 rounded-lg transition-all duration-300 ${view === 'auth' ? 'translate-x-full' : 'translate-x-0'}`}
                            />
                            <button onClick={() => setView('guest')} className={`relative z-10 flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${view === 'guest' ? 'text-white' : 'text-gray-400'}`}>Guest</button>
                            <button onClick={() => setView('auth')} className={`relative z-10 flex-1 py-2 text-[10px] font-bold uppercase tracking-[0.2em] ${view === 'auth' ? 'text-white' : 'text-gray-400'}`}>Member</button>
                        </div>

                        {/* Guest Form */}
                        {view === 'guest' && (
                            <div className="space-y-5 animate-fadeIn">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                                        <input 
                                            type="text" placeholder="ROOM ID" value={roomId} 
                                            onChange={(e) => setRoomId(e.target.value)}
                                            onKeyUp={(e) => e.key === 'Enter' && joinRoom()}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm font-mono text-purple-400 outline-none focus:border-purple-500/40 transition-all shadow-inner" 
                                        />
                                    </div>
                                    <div className="relative group">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                                        <input 
                                            type="text" placeholder="USERNAME" value={username} 
                                            onChange={(e) => setUsername(e.target.value)}
                                            onKeyUp={(e) => e.key === 'Enter' && joinRoom()}
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-500/40 transition-all text-white shadow-inner" 
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={joinRoom}
                                    className="w-full bg-gradient-to-r from-[#a855f7] to-[#7c3aed] hover:from-[#b565ff] hover:to-[#8b5cf6] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 group active:scale-[0.98]"
                                >
                                    <span className="tracking-widest uppercase text-xs">Join Workspace</span> 
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <button onClick={createNewRoom} className="w-full text-[10px] font-bold text-gray-600 hover:text-purple-400 transition-colors uppercase tracking-[0.2em] pt-2">
                                    Create a new room
                                </button>
                            </div>
                        )}

                        {/* Member Form */}
                        {view === 'auth' && (
                            <div className="space-y-5 animate-fadeIn">
                                <div className="space-y-4">
                                    {!isLoginMode && (
                                        <div className="relative group">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                                            <input type="text" placeholder="USERNAME" className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-500/40 transition-all text-white shadow-inner" value={username} onChange={e => setUsername(e.target.value)} />
                                        </div>
                                    )}
                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                                        <input type="email" placeholder="EMAIL" className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-500/40 transition-all text-white shadow-inner" value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-purple-500 transition-colors" size={16} />
                                        <input type="password" placeholder="PASSWORD" className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-500/40 transition-all text-white shadow-inner" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                </div>
                                <button 
                                    onClick={handleAuth}
                                    className="w-full bg-gradient-to-r from-[#a855f7] to-[#7c3aed] hover:from-[#b565ff] hover:to-[#8b5cf6] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                                >
                                    <span className="tracking-widest uppercase text-xs">{isLoginMode ? 'Sign In' : 'Create Profile'}</span>
                                </button>
                                <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full text-[10px] font-bold text-gray-600 hover:text-purple-400 transition-colors uppercase tracking-[0.2em] pt-2">
                                    {isLoginMode ? "Need an account? Register" : "Already a member? Login"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* BOTTOM BADGES */}
                    <div className="flex gap-6 opacity-30 grayscale items-center justify-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-tighter"><ShieldCheck size={14}/> AES-256</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-tighter"><Terminal size={14}/> HUB-READY</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;