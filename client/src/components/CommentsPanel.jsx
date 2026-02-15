import React, { useState } from 'react';

const CommentsPanel = ({ comments, onAddComment, activeLine }) => {
    const [text, setText] = useState("");

    // Filter comments for the current file (or show all)
    // For this demo, we assume comments are simple objects
    
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e]">
            {/* Header */}
            <div className="p-3 border-b border-[#333] bg-[#252526]">
                <h3 className="text-sm font-bold text-gray-300">
                    📝 Annotations
                </h3>
                {activeLine && (
                    <span className="text-xs text-green-400">
                        Targeting Line: {activeLine}
                    </span>
                )}
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {comments.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 text-sm">
                        No comments yet.<br/>
                        Right-click in editor to add one.
                    </div>
                ) : (
                    comments.map((c, i) => (
                        <div key={i} className="bg-[#2d2d2d] p-3 rounded border-l-2 border-green-500">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-xs font-bold text-green-400">{c.username}</span>
                                <span className="text-[10px] text-gray-500">Line {c.line}</span>
                            </div>
                            <p className="text-sm text-gray-300">{c.text}</p>
                        </div>
                    ))
                )}
            </div>
            
            {/* Input Area (Only shows if a line is selected) */}
            {activeLine ? (
                <div className="p-3 border-t border-[#333] bg-[#1e1e1e]">
                    <textarea 
                        className="w-full bg-[#111] text-white text-sm p-2 rounded border border-[#333] focus:border-green-500 outline-none resize-none"
                        rows="3"
                        placeholder={`Comment on line ${activeLine}...`}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if(text.trim()) {
                                    onAddComment(text, activeLine);
                                    setText("");
                                }
                            }
                        }}
                    />
                    <button 
                        onClick={() => {
                            if(text.trim()) {
                                onAddComment(text, activeLine);
                                setText("");
                            }
                        }}
                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-xs py-1 rounded font-bold"
                    >
                        Post Comment
                    </button>
                </div>
            ) : (
                <div className="p-3 text-xs text-gray-500 text-center border-t border-[#333]">
                    Click a line in editor to comment
                </div>
            )}
        </div>
    );
};

export default CommentsPanel;