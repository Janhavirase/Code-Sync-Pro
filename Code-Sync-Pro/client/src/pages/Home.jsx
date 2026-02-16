import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react'; // ✅ Add useEffect
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ Add useLocation

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const location = useLocation(); // ✅ Initialize hook
    // Auth State
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // ✨ SENIOR LOGIC: Auto-fill Room ID from URL
    useEffect(() => {
        // 1. Get the URL parameters (e.g., ?roomId=123)
        const searchParams = new URLSearchParams(location.search);
        const roomIdFromUrl = searchParams.get('roomId');
        
        // 2. If a room ID exists, pre-fill the input
        if (roomIdFromUrl) {
            setRoomId(roomIdFromUrl);
            toast.success("Room ID auto-filled! Enter your name to join.");
        }
    }, [location]);
    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
                // Guests don't have a userId, so they can't save. That's okay.
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    // --- AUTHENTICATION HANDLER ---
    const handleAuth = async () => {
        if (!email || !password || (!isLoginMode && !username)) {
            toast.error('Please fill all fields');
            return;
        }

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        const payload = isLoginMode ? { email, password } : { username, email, password };

        try {
            const res = await fetch(`http://127.0.0.1:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.msg || 'Auth failed');
                return;
            }

            // ✅ CRITICAL STEP: Save User to Browser Memory (Sticky Login)
            localStorage.setItem('userInfo', JSON.stringify(data.user)); 

            toast.success(isLoginMode ? 'Welcome back!' : 'Account created!');
            
            // Redirect to Dashboard instead of Editor
            navigate('/dashboard', { state: { user: data.user } });

        } catch (err) {
            console.error(err);
            toast.error('Server connection failed');
        }
    };

    return (
        <div className="homePageWrapper flex items-center justify-center text-white w-full min-h-screen bg-[#111]">
            <div className="formWrapper bg-[#282a36] p-5 rounded-lg w-[400px] max-w-[90%] border border-[#444]">
                <div className="flex items-center gap-2 mb-6 justify-center">
                    <img className="w-12 mb-2" src="/code-sync.png" alt="code-sync-logo" />
                    <h2 className="text-2xl font-bold">CodeSync Pro</h2>
                </div>
                
                {/* TABS: JOIN vs LOGIN */}
                <div className="flex mb-4 border-b border-[#444]">
                    <button 
                        className={`flex-1 pb-2 ${!email ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-400'}`}
                        onClick={() => { setEmail(''); setPassword(''); }} // Clear auth fields to switch mode
                    >
                        Guest Join
                    </button>
                    <button 
                        className={`flex-1 pb-2 ${email || isLoginMode ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-400'}`}
                        onClick={() => setEmail(' ')} // Activate auth mode
                    >
                        Login / Register
                    </button>
                </div>

                {/* --- GUEST JOIN FORM --- */}
                {!email && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-gray-400">Paste invitation ROOM ID</h4>
                        <div className="inputGroup flex flex-col gap-3">
                            <input
                                type="text"
                                className="inputBox p-2 rounded outline-none border border-[#444] bg-[#222] text-white font-bold"
                                placeholder="ROOM ID"
                                onChange={(e) => setRoomId(e.target.value)}
                                value={roomId}
                                onKeyUp={handleInputEnter}
                            />
                            <input
                                type="text"
                                className="inputBox p-2 rounded outline-none border border-[#444] bg-[#222] text-white font-bold"
                                placeholder="USERNAME"
                                onChange={(e) => setUsername(e.target.value)}
                                value={username}
                                onKeyUp={handleInputEnter}
                            />
                            <button className="btn joinBtn bg-green-500 hover:bg-green-600 transition-all w-full p-2 rounded font-bold text-black" onClick={joinRoom}>
                                Join
                            </button>
                            <span className="createInfo mx-auto text-sm text-gray-400">
                                If you don't have an invite then &nbsp;
                                <a onClick={createNewRoom} href="" className="createNewBtn text-green-500 font-bold hover:underline">
                                    new room
                                </a>
                            </span>
                        </div>
                    </div>
                )}

                {/* --- AUTH FORM --- */}
                {email && (
                    <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-gray-400">{isLoginMode ? 'Login' : 'Register'}</h4>
                        {!isLoginMode && (
                             <input type="text" placeholder="Username" className="inputBox p-2 rounded bg-[#222] border border-[#444]" value={username} onChange={e => setUsername(e.target.value)} />
                        )}
                        <input type="email" placeholder="Email" className="inputBox p-2 rounded bg-[#222] border border-[#444]" value={email === ' ' ? '' : email} onChange={e => setEmail(e.target.value)} />
                        <input type="password" placeholder="Password" className="inputBox p-2 rounded bg-[#222] border border-[#444]" value={password} onChange={e => setPassword(e.target.value)} />
                        
                        <button className="btn bg-blue-600 hover:bg-blue-700 w-full p-2 rounded font-bold" onClick={handleAuth}>
                            {isLoginMode ? 'Login' : 'Register'}
                        </button>
                        
                        <span className="text-xs text-center text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsLoginMode(!isLoginMode)}>
                            {isLoginMode ? "Don't have an account? Register" : "Already have an account? Login"}
                        </span>
                        <span className="text-xs text-center text-gray-500 cursor-pointer mt-2" onClick={() => { setEmail(''); setPassword(''); }}>
                            &larr; Back to Guest Join
                        </span>
                    </div>
                )}
            </div>
            
          
        </div>
    );
};

export default Home;