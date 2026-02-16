import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { initSocket } from '../socket'; // Adjust path to your socket.js

const BroadcastPanel = () => {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleBroadcast = async () => {
        if (!message.trim()) return toast.error("Enter a message first!");
        if (!window.confirm("⚠️ BROADCAST TO ALL USERS?\n\nThis will appear on every active screen immediately.")) return;

        setIsSending(true);
        const socket = await initSocket(); // Ensure we have a connection

        socket.emit('admin:notify', { message });
        
        toast.success("📢 Broadcast Sent Successfully!");
        setMessage('');
        setIsSending(false);
    };

    return (
        <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(239,68,68,0.1)] relative overflow-hidden">
            {/* Danger Stripes Background */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <svg className="w-32 h-32 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22M12 6l6 10h-6l-6-10h6m0 2v6h2V8h-2m0 8v2h2v-2h-2z"/></svg>
            </div>

            <div className="relative z-10">
                <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    Emergency Broadcast System
                </h3>

                <div className="flex gap-4">
                    <input 
                        type="text" 
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="e.g. Server restarting in 5 mins! Save your code."
                        className="flex-1 bg-black/40 border border-red-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-red-500 focus:outline-none transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                    />
                    <button 
                        onClick={handleBroadcast}
                        disabled={isSending}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-red-600/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSending ? 'Sending...' : '📢 SEND'}
                    </button>
                </div>
                <p className="text-gray-500 text-xs mt-3">
                    * This message will appear as a high-priority toast notification on all connected clients.
                </p>
            </div>
        </div>
    );
};

export default BroadcastPanel;