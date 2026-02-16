import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

const AIAnalysisPanel = ({ currentCode, language, onApplyCode }) => { // 👈 Added onApplyCode prop
    const [output, setOutput] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async (actionType) => {
        if (!currentCode?.trim()) return toast.error("Editor is empty!");
        setIsLoading(true);
        setOutput(null);

        let prompt = "";
        if (actionType === "complexity") prompt = `Analyze Time/Space Complexity of this ${language} code.`;
        else if (actionType === "debug") prompt = `Fix bugs in this ${language} code. Provide ONLY the corrected code in a code block first, then explain.`;
        else if (actionType === "optimize") prompt = `Optimize this ${language} code. Provide ONLY the optimized code in a code block first, then explain.`;
        else if (actionType === "explain") prompt = `Explain this ${language} code line-by-line.`;

        try {
            const res = await fetch('http://127.0.0.1:5000/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: currentCode, prompt })
            });
            const data = await res.json();
            setOutput(data.response);
        } catch (error) {
            toast.error("AI Brain Disconnected 🧠");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Helper to Copy Code ---
    const handleCopy = (code) => {
        navigator.clipboard.writeText(code);
        toast.success("Code copied to clipboard!");
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
            {/* Header */}
            <div className="p-4 border-b border-[#333] bg-[#252526]">
                <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                    ⚡ AI Code Doctor
                </h2>
                <p className="text-[10px] text-gray-500 mt-1">Powered by Qwen-Coder</p>
            </div>

            {/* Buttons Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
                <ActionButton icon="⏱️" label="Check Big-O" onClick={() => handleAction("complexity")} disabled={isLoading} />
                <ActionButton icon="🐛" label="Find Bugs" onClick={() => handleAction("debug")} disabled={isLoading} />
                <ActionButton icon="🚀" label="Optimize" onClick={() => handleAction("optimize")} disabled={isLoading} />
                <ActionButton icon="📖" label="Explain" onClick={() => handleAction("explain")} disabled={isLoading} />
            </div>

            {/* Markdown Output Area */}
            <div className="flex-1 overflow-y-auto p-4 border-t border-[#333] bg-[#1a1a1a]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs animate-pulse">Analyzing Code Logic...</span>
                    </div>
                ) : output ? (
                    <div className="markdown-result text-sm text-gray-300 font-sans leading-relaxed">
                        <ReactMarkdown
                            components={{
                                code({node, inline, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const codeContent = String(children).replace(/\n$/, '');
                                    
                                    return !inline && match ? (
                                        <div className="relative group my-4 border border-[#444] rounded-md overflow-hidden">
                                            {/* --- ACTION BAR --- */}
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10 bg-[#1e1e1e]/80">
                                                <button 
                                                    onClick={() => handleCopy(codeContent)}
                                                    className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white"
                                                    title="Copy"
                                                >
                                                    📋
                                                </button>
                                                <button 
                                                    onClick={() => onApplyCode(codeContent)}
                                                    className="p-1 bg-green-700 hover:bg-green-600 rounded text-xs text-white"
                                                    title="Apply to Editor"
                                                >
                                                    ✨ Apply
                                                </button>
                                            </div>
                                            
                                            <SyntaxHighlighter
                                                style={vscDarkPlus}
                                                language={match[1]}
                                                PreTag="div"
                                                {...props}
                                            >
                                                {codeContent}
                                            </SyntaxHighlighter>
                                        </div>
                                    ) : (
                                        <code className="bg-[#333] text-gray-200 px-1 rounded font-mono text-xs" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {output}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="text-center text-gray-600 text-xs mt-10">
                        Select a tool to start.
                    </div>
                )}
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, onClick, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#333] rounded-lg transition-all active:scale-95 disabled:opacity-50"
    >
        <span className="text-xl mb-1">{icon}</span>
        <span className="text-xs font-medium text-gray-300">{label}</span>
    </button>
);

export default AIAnalysisPanel;