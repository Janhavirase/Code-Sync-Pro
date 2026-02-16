import React, { useState, useEffect, useRef } from 'react';
import {ACTIONS} from '../Actions';

const Chat = ({ socketRef, roomId, username }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => {
        if(socketRef.current) {
            // Listen for incoming messages
            socketRef.current.on('receive-message', (data) => {
                setMessages((prev) => [...prev, data]);
                // Scroll to bottom
                scrollToBottom();
            });
        }
        return () => {
            if(socketRef.current) socketRef.current.off('receive-message');
        };
    }, [socketRef.current]);

    const sendMessage = () => {
        if(!input.trim()) return;
        
        const msgData = {
            roomId,
            username,
            message: input,
            time: new Date().toLocaleTimeString(),
        };

        // Emit to server (Server needs to broadcast this)
        socketRef.current.emit('send-message', msgData);
        
        // Add to my own UI immediately
        setMessages((prev) => [...prev, msgData]);
        setInput('');
        scrollToBottom();
    };

    const scrollToBottom = () => {
        setTimeout(() => {
             chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return (
        <div className="chatContainer flex flex-col h-full bg-gray-800 border-l border-gray-700 w-64 absolute right-0 top-0 z-10 shadow-xl">
             <div className="chatHeader p-3 bg-gray-900 font-bold border-b border-gray-700">Room Chat</div>
             
             {/* Messages Area */}
             <div className="messages flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                 {messages.map((msg, idx) => (
                     <div key={idx} className={`msg p-2 rounded-md max-w-[90%] ${msg.username === username ? 'bg-green-600 self-end' : 'bg-gray-700 self-start'}`}>
                         <div className="text-xs font-bold text-gray-300 mb-1">{msg.username} <span className="opacity-50 font-normal">{msg.time}</span></div>
                         <div className="text-sm">{msg.message}</div>
                     </div>
                 ))}
                 <div ref={chatEndRef}></div>
             </div>

             {/* Input Area */}
             <div className="inputArea p-3 bg-gray-900 border-t border-gray-700 flex gap-2">
                 <input 
                    className="flex-1 bg-gray-700 text-white rounded px-2 py-1 outline-none text-sm"
                    placeholder="Type a message..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyUp={(e) => e.code === 'Enter' && sendMessage()}
                 />
                 <button onClick={sendMessage} className="bg-green-500 text-black p-1 rounded font-bold text-xs px-3">➤</button>
             </div>
        </div>
    );
};

export default Chat;