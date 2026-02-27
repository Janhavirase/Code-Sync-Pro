import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bug, Zap, BookOpen, Clock, Send, Bot, User, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

// 🚨 Paste your new Gemini API key here!
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const AIAnalysisPanel = ({ currentCode, language }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hi! I'm your AI Code Doctor. Select a quick action below or ask me anything about your currently active file." }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const messagesEndRef = useRef(null);

    const tools = [
        { id: 'bugs', title: 'Find Bugs', icon: Bug, color: 'text-red-400', bg: 'bg-red-400/10' },
        { id: 'optimize', title: 'Optimize', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 'explain', title: 'Explain', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 'complexity', title: 'Big-O', icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleAIRequest = async (actionType = 'custom', customText = "") => {
        if (!currentCode?.trim()) {
            return toast.error("Write some code in the editor first! 💻", { style: { background: '#333', color: '#fff' } });
        }

        let displayMessage = customText;
        let promptToSend = customText;

        // 🚨 STRICT PROMPT ENGINEERING: Forcing 1-2 line answers
        if (actionType !== 'custom') {
            const tool = tools.find(t => t.id === actionType);
            displayMessage = `Please ${tool.title.toLowerCase()} for this file.`;
            
            const systemPrompts = {
                bugs: "Analyze this code for bugs. Reply in EXACTLY 1 or 2 lines MAXIMUM. Be direct. Code:\n",
                optimize: "Provide an optimized version of this code. If explaining, use MAXIMUM 1 line. Code:\n",
                explain: "Explain what this code does in EXACTLY 1 or 2 short sentences. No fluff. Code:\n",
                complexity: "State ONLY the Time (Big-O) and Space complexity (e.g., 'Time: O(N), Space: O(1)'). DO NOT write anything else whatsoever. Code:\n"
            };
            promptToSend = systemPrompts[actionType] + currentCode;
        } else {
            // Force strict brevity on custom messages too
            promptToSend = `Respond in 1 or 2 lines MAXIMUM. Be extremely concise.\n\nUser Question: ${customText}\n\nContext Code:\n${currentCode}`;
        }

        setMessages(prev => [...prev, { role: 'user', text: displayMessage }]);
        setLoading(true);
        setInput(""); 

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptToSend }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            const aiText = data.candidates[0].content.parts[0].text;
            setMessages(prev => [...prev, { role: 'ai', text: aiText }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'ai', text: `❌ Error connecting to AI: ${error.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-full bg-[#181818] w-full text-white">
            
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#333] bg-[#1e1e1e] shrink-0 shadow-md z-10">
                <div className="bg-indigo-500/20 p-1 rounded-md border border-indigo-500/30">
                    <Sparkles size={16} className="text-indigo-400" />
                </div>
                <span className="text-sm font-bold tracking-wide">Copilot Chat</span>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth">
                {messages.map((msg, index) => {
                    const isAI = msg.role === 'ai';
                    
                    return (
                        <div key={index} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isAI ? 'bg-[#252526] border-indigo-500/30' : 'bg-blue-600 border-blue-500'}`}>
                                {isAI ? <Bot size={16} className="text-indigo-400" /> : <User size={16} className="text-white" />}
                            </div>

                            <div className={`group relative max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${isAI ? 'bg-[#222222] border border-[#333] text-gray-300 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                                {isAI && index !== 0 && (
                                    <button 
                                        onClick={() => copyToClipboard(msg.text, index)}
                                        className="absolute -top-3 -right-3 bg-[#333] hover:bg-[#444] p-1.5 rounded-md border border-[#444] opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy response"
                                    >
                                        {copiedIndex === index ? <Check size={12} className="text-green-400"/> : <Copy size={12} className="text-gray-300"/>}
                                    </button>
                                )}
                                <div className="whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* 🚨 THE NEW ANIMATED "TYPING" INDICATOR */}
                {loading && (
                    <div className="flex gap-3 animate-fadeIn">
                        <div className="w-8 h-8 rounded-full bg-[#252526] border border-[#333] flex items-center justify-center shrink-0">
                            <Bot size={16} className="text-indigo-400/50" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm py-4 px-5 bg-[#222222] border border-[#333] flex items-center gap-1.5 shadow-sm">
                            <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-indigo-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input & Quick Actions Area */}
            <div className="p-3 bg-[#1e1e1e] border-t border-[#333] shrink-0 flex flex-col gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                    {tools.map(tool => {
                        const Icon = tool.icon;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => handleAIRequest(tool.id)}
                                disabled={loading}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] hover:bg-[#2a2a2a] border border-[#333] hover:border-[#444] rounded-full text-xs font-semibold text-gray-300 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                            >
                                <Icon size={12} className={tool.color} />
                                {tool.title}
                            </button>
                        );
                    })}
                </div>

                <form 
                    onSubmit={(e) => { e.preventDefault(); if(input.trim()) handleAIRequest('custom', input); }}
                    className="flex items-center gap-2 bg-[#2a2d2e] p-1.5 pl-4 rounded-xl border border-[#37373d] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about your code..."
                        disabled={loading}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                    />
                    <button 
                        type="submit" 
                        disabled={!input.trim() || loading}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#333] disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-md"
                    >
                        <Send size={16} className="ml-0.5" />
                    </button>
                </form>
            </div>
            
        </div>
    );
};

export default AIAnalysisPanel;