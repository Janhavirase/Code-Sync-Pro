import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Clock, Hash } from 'lucide-react';

const CommentsPanel = ({ comments, onAddComment, activeLine, onLineSelect }) => {
    const [text, setText] = useState("");
    const scrollRef = useRef(null);

    // ✅ Auto-scroll to the bottom when a new comment arrives
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments.length]);

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
            {/* Header */}
            <div className="p-4 border-b border-[#333] bg-[#252526] flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-green-400" />
                    <h3 className="text-sm font-bold text-gray-200">Annotations</h3>
                </div>
                {activeLine ? (
                    <span className="text-[10px] text-green-400 flex items-center gap-1 font-mono">
                        <Hash size={10} /> TARGETING LINE {activeLine}
                    </span>
                ) : (
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Select a line to comment</span>
                )}
            </div>

            {/* Comments List */}
            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar"
            >
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 text-xs">
                        No comments yet.<br/>
                        Right-click a line in the editor to start.
                    </div>
                ) : (

    comments.map((c) => (
        <div 
            key={c.id} 
            onClick={() => onLineSelect(c.line)} 
            className={`group p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                parseInt(c.line) === parseInt(activeLine) 
                ? 'bg-green-500/10 border-green-500/40 shadow-lg scale-[1.02]' 
                : 'bg-white/5 border-transparent hover:bg-white/10'
            }`}
        >
          
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-black text-green-400">{c.username}</span>
                                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                    <Clock size={10} />
                                    <span>{c.timestamp}</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed break-words">{c.text}</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-gray-500">
                                    Line {c.line}
                                </span>
                                <span className="text-[9px] opacity-0 group-hover:opacity-100 text-gray-600 transition-opacity">
                                    Click to view line
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Input Area */}
            <div className="p-4 border-t border-[#333] bg-[#1e1e1e]">
                <textarea 
                    className={`w-full bg-[#111] text-white text-sm p-3 rounded-xl border transition-all outline-none resize-none ${
                        activeLine ? 'border-[#444] focus:border-green-500' : 'border-[#222] opacity-50 cursor-not-allowed'
                    }`}
                    rows="3"
                    disabled={!activeLine}
                    placeholder={activeLine ? `Add your note to line ${activeLine}...` : "Click a line to enable..."}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && activeLine && text.trim()) {
                            e.preventDefault();
                            onAddComment(text, activeLine);
                            setText("");
                        }
                    }}
                />
                <button 
                    disabled={!activeLine || !text.trim()}
                    onClick={() => {
                        onAddComment(text, activeLine);
                        setText("");
                    }}
                    className="w-full mt-3 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:hover:bg-green-600 text-white text-xs py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
                >
                    Post Annotation
                </button>
            </div>
        </div>
    );
};

export default CommentsPanel;