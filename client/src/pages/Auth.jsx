import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true); // Toggle state
    const navigate = useNavigate();

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // TODO: Connect to Backend API later
        // For now, let's simulate success to test the UI
        if (!email || !password) {
            toast.error('Please fill all fields');
            return;
        }

        toast.success(isLogin ? 'Logged in successfully!' : 'Account created!');
        
        // Redirect to Home page after login
        navigate('/'); 
    };

    return (
        <div className="homePageWrapper flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="formWrapper bg-gray-800 p-8 rounded-xl shadow-2xl w-96 border border-gray-700">
                <div className="logo mb-6 text-center">
                    <img className="w-20 mx-auto mb-2" src="/code-sync.png" alt="code-sync-logo" />
                    <h4 className="text-2xl font-bold text-green-400">CodeSync Pro</h4>
                </div>

                <h4 className="mainLabel mb-4 text-gray-300 font-semibold text-center">
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h4>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <input
                            type="text"
                            className="inputBox p-3 rounded-lg bg-gray-700 text-white outline-none border border-gray-600 focus:border-green-500 transition-all"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    )}
                    <input
                        type="email"
                        className="inputBox p-3 rounded-lg bg-gray-700 text-white outline-none border border-gray-600 focus:border-green-500 transition-all"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        className="inputBox p-3 rounded-lg bg-gray-700 text-white outline-none border border-gray-600 focus:border-green-500 transition-all"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    
                    <button className="btn joinBtn bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition-all mt-2">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-400">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-green-400 cursor-pointer hover:underline"
                    >
                        {isLogin ? 'Create one' : 'Login'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Auth;