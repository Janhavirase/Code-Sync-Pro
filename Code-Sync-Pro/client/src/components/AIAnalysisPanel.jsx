import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bug, Zap, BookOpen, Clock, Send, Bot, User, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import VoiceRecorder from '../components/VoiceRecorder';
// 🚨 REMOVED: GEMINI_API_KEY. The frontend should never hold AI API keys!
// We now securely route everything through your custom RAG backend.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const AIAnalysisPanel = ({ projectId, activeFile, currentCode, language,insertCodeAtCursor,socket, currentUser }) => {
    const [messages, setMessages] = useState([
        { role: 'ai', text: "Hi! I'm your RAG-powered Code Copilot. Ask me anything about this codebase, or click a quick action below!", sources: [] }
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
// Ensure you add `insertCodeAtCursor` to your component props!
// const AIAnalysisPanel = ({ projectId, activeFile, currentCode, language, insertCodeAtCursor }) => {

const handleVoiceCommand = (transcript) => {
    console.log("🗣️ Voice Transcribed:", transcript);
    
    // 1. Append the new transcript to whatever is already in the input box
    setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    
    // 2. Notify the user that it's ready to send
    toast('Dictation complete. Press Send when ready!', { 
        icon: '⌨️', 
        style: { background: '#333', color: '#fff' } 
    });
    
    // 🚨 Notice we removed the entire fetch() block! 
    // We no longer automatically send to the broken backend route.
};
const handleAIRequest = async (actionType = 'custom', customText = "") => {
    if (!currentCode?.trim() && !customText.trim()) {
        return toast.error("Write some code in the editor or type a question first! 💻", { style: { background: '#333', color: '#fff' } });
    }

    let displayMessage = customText;
    let promptToSend = customText;

    if (actionType !== 'custom') {
        const tool = tools.find(t => t.id === actionType);
        displayMessage = `Please ${tool.title.toLowerCase()} for ${activeFile || 'this file'}.`;
        promptToSend = `Please execute the ${tool.title} action on the currently active file. Keep the response extremely concise.`;
    } else {
        // 🚨 SENIOR ENGINEER MAGIC: The "Hidden Prompt" injection
        // We attach this invisibly so the backend RAG knows EXACTLY how to format code injections.
        promptToSend = customText + `\n\n[CRITICAL SYSTEM INSTRUCTION: If the user is asking you to write, add, or generate code, you MUST write the code wrapped exactly inside <INSERT> and </INSERT> tags. Example: <INSERT>console.log("hello");</INSERT>. Do not use markdown code blocks inside the tags. Output the code even if variables seem missing from context.]`;
    }

    // Display only the user's natural text in the chat UI
    setMessages(prev => [...prev, { role: 'user', text: displayMessage }]);
    setLoading(true);
    setInput(""); 
if (socket) {
            socket.emit('ai-generating', { 
                roomId: projectId, 
                username: currentUser || 'A teammate' 
            });
        }
    try {
        const response = await fetch(`${BACKEND_URL}/api/ai/copilot/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: promptToSend,
                projectId: projectId, 
                activeFile: activeFile, 
                currentCode: currentCode 
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        let finalReply = data.reply;

        // 🚨 SENIOR ENGINEER MAGIC: The Payload Interceptor
        // We catch the AI's response and extract the code before the user even sees it.
        const insertMatch = finalReply.match(/<INSERT>([\s\S]*?)<\/INSERT>/);
        
        if (insertMatch && insertCodeAtCursor) {
            // Extract the pure code
            const codePayload = insertMatch[1].trim();
            
            // 1. Inject the code into the Monaco Editor at the cursor!
            insertCodeAtCursor(codePayload);
            toast.success("Code auto-inserted at cursor! 🚀", { style: { background: '#333', color: '#fff' }});

            // 2. Clean the <INSERT> tags out of the chat message so it looks professional
            finalReply = finalReply.replace(/<INSERT>[\s\S]*?<\/INSERT>/, '').trim();
            
            // If the AI ONLY sent the code, give it a friendly fallback message
            if (!finalReply) {
                finalReply = "✅ I have generated and inserted the requested code at your cursor.";
            }
        }

        // Push the cleaned AI response AND the RAG citations to the UI
        setMessages(prev => [...prev, { 
            role: 'ai', 
            text: finalReply, 
            sources: data.sources || [] 
        }]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'ai', text: `❌ Error connecting to Code-Sync-Pro engine: ${error.message}` }]);
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
                <span className="text-sm font-bold tracking-wide">Code-Sync Copilot</span>
            </div>

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#333] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#444]">                
                {messages.map((msg, index) => {
                    const isAI = msg.role === 'ai';
                    
                    return (
                        <div key={index} className={`flex gap-3 ${isAI ? '' : 'flex-row-reverse'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${isAI ? 'bg-[#252526] border-indigo-500/30' : 'bg-blue-600 border-blue-500'}`}>
                                {isAI ? <Bot size={16} className="text-indigo-400" /> : <User size={16} className="text-white" />}
                            </div>

                            <div className={`group relative max-w-[85%] rounded-2xl p-3 text-sm shadow-sm flex flex-col gap-2 ${isAI ? 'bg-[#222222] border border-[#333] text-gray-300 rounded-tl-sm' : 'bg-blue-600 text-white rounded-tr-sm'}`}>
                                {isAI && index !== 0 && (
                                    <button 
                                        onClick={() => copyToClipboard(msg.text, index)}
                                        className="absolute -top-3 -right-3 bg-[#333] hover:bg-[#444] p-1.5 rounded-md border border-[#444] opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copy response"
                                    >
                                        {copiedIndex === index ? <Check size={12} className="text-green-400"/> : <Copy size={12} className="text-gray-300"/>}
                                    </button>
                                )}
                                
                                <div className="whitespace-pre-wrap leading-relaxed overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">                                    
                                    {msg.text}
                                </div>

                                {/* 🚨 NEW: RAG Citations (Source Tags) */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#333]">
                                        <span className="text-[10px] text-gray-500 mr-1 flex items-center">Context:</span>
                                        {Array.from(new Set(msg.sources)).map((src, i) => (
                                            <span key={i} className="text-[10px] bg-[#1e1e1e] border border-[#333] text-gray-400 px-1.5 py-0.5 rounded">
                                                {src}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Animated "Typing" Indicator */}
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
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    <VoiceRecorder onTranscriptionComplete={handleVoiceCommand} />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything about your codebase..."
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