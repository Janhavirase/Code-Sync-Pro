import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';

const Chat = ({ socketRef, roomId, username }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to the newest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for incoming messages
  // Listen for incoming messages
    useEffect(() => {
        if (socketRef.current) {
            console.log("🟢 [DEBUG] Chat listener attached to socket:", socketRef.current.id);
            
            socketRef.current.on('receive-message', (newMessage) => {
                console.log("📥 [DEBUG] MESSAGE RECEIVED FROM SERVER:", newMessage);
                setMessages((prev) => [...prev, newMessage]);
            });
        }
        
        return () => {
            if (socketRef.current) {
                socketRef.current.off('receive-message');
            }
        };
    }, [socketRef]); // <-- Make sure this array has socketRef

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageData = { roomId, username, message: input, time };

        console.log("📤 [DEBUG] SENDING MESSAGE TO SERVER:", messageData);
        
        // Add to our own screen instantly
        setMessages((prev) => [...prev, messageData]);
        
        socketRef.current.emit('send-message', messageData);
        setInput('');
    };
    return (
        <div className="flex flex-col h-full bg-[#181818] w-full">
            
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#333] bg-[#1e1e1e] shrink-0">
                <MessageSquare size={16} className="text-green-400" />
                <span className="text-sm font-bold text-gray-200 tracking-wider uppercase">Room Chat</span>
            </div>

            {/* Messages Area */}
<div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth 
    [&::-webkit-scrollbar]:!w-1.5 
    [&::-webkit-scrollbar-track]:!bg-transparent 
    [&::-webkit-scrollbar-thumb]:!bg-[#333] 
    [&::-webkit-scrollbar-thumb]:rounded-full 
    hover:[&::-webkit-scrollbar-thumb]:!bg-[#444]">                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 opacity-60">
                        <MessageSquare size={32} />
                        <span className="text-xs">No messages yet. Say hi!</span>
                    </div>
                ) : (
              messages.map((msg, index) => {
                        const isMine = msg.username === username;

                        return (
                            <div key={index} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-500 mb-1 px-1">
                                    {/* 🚨 CHANGE 1: Use msg.time here */}
                                    {isMine ? 'You' : msg.username} • {msg.time}
                                </span>
                                <div 
                                    className={`px-3 py-2 text-sm shadow-sm max-w-[90%] break-words ${
                                        isMine 
                                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                        : 'bg-[#2a2d2e] text-gray-200 rounded-2xl rounded-tl-sm border border-[#37373d]'
                                    }`}
                                >
                                    {/* 🚨 CHANGE 2: Use msg.message here */}
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#1e1e1e] border-t border-[#333] shrink-0">
                <form 
                    onSubmit={sendMessage} 
                    className="flex items-center gap-2 bg-[#2a2d2e] p-1 pl-3 rounded-full border border-[#37373d] focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim()}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-full transition-colors flex items-center justify-center"
                    >
                        <Send size={14} className="ml-0.5" />
                    </button>
                </form>
            </div>
            
        </div>
    );
};

export default Chat;