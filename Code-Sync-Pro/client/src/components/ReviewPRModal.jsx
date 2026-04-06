import React, { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReviewPRModal = ({ isOpen, onClose, pr, onMerge }) => {
    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [isMerging, setIsMerging] = useState(false);

    if (!isOpen || !pr) return null;

    // 1. Grab the old files (from the original project) and new files (from the PR)
    const oldFiles = pr.targetProjectId?.codeSnapshot || [];
    const newFiles = pr.files || [];

    // 2. Find the exact file to compare based on what the user clicked
    const currentNewFile = newFiles[selectedFileIndex];
    const currentOldFile = oldFiles.find(f => f.name === currentNewFile?.name) || { value: '' };

    const handleApprove = async () => {
        setIsMerging(true);
        await onMerge(pr._id);
        setIsMerging(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">
                
                {/* HEADER */}
                <div className="flex justify-between items-center p-6 border-b border-[#333] bg-[#252526] shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            Reviewing: {pr.title}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Submitted by <span className="text-emerald-400">@{pr.senderName}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-[#333] rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* BODY (Split View) */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* LEFT SIDEBAR: File List */}
                    <div className="w-64 border-r border-[#333] bg-[#181818] flex flex-col shrink-0 overflow-y-auto p-4 gap-2">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Changed Files</span>
                        {newFiles.map((file, index) => (
                            <button 
                                key={index}
                                onClick={() => setSelectedFileIndex(index)}
                                className={`text-left text-sm px-4 py-3 rounded-lg font-mono transition-all ${
                                    selectedFileIndex === index 
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' 
                                    : 'text-gray-400 hover:bg-[#252526] border border-transparent'
                                }`}
                            >
                                {file.name}
                            </button>
                        ))}
                    </div>

                    {/* RIGHT AREA: The Diff Viewer */}
                 <div className="flex-1 bg-white overflow-y-auto">
                        <ReactDiffViewer 
                            // ✨ THE FIX: Force it to be a string, or fallback to ""
                            oldValue={currentOldFile?.value ? String(currentOldFile.value) : ""} 
                            newValue={currentNewFile?.value ? String(currentNewFile.value) : ""} 
                            
                            splitView={true} 
                            compareMethod={DiffMethod.WORDS}
                            leftTitle={`Original: ${currentOldFile?.name || 'New File'}`}
                            rightTitle={`Fix: ${currentNewFile?.name || 'File'}`}
                            styles={{
                                variables: { dark: { 
                                    addedBackground: '#044B53', addedColor: 'white',
                                    removedBackground: '#632F34', removedColor: 'white',
                                    wordAddedBackground: '#055d67', wordRemovedBackground: '#7d383f'
                                }},
                            }}
                            useDarkTheme={true}
                        />
                    </div>
                </div>

                {/* FOOTER: Action Buttons */}
                <div className="p-6 border-t border-[#333] bg-[#252526] flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2 text-yellow-500 text-sm font-medium">
                        <AlertTriangle size={16} /> Look closely! You cannot undo a merge.
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleApprove} 
                            disabled={isMerging}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-2.5 rounded-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                            <CheckCircle size={18} /> {isMerging ? 'Merging...' : 'Approve & Merge'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewPRModal;