import React, { useState } from 'react';
import { X, Send, GitPullRequest } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../api.js';

const SubmitFixModal = ({ isOpen, onClose, files, projectMetadata, currentUser }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const toastId = toast.loading("Packaging your fix...");

        try {
            const payload = {
                targetProjectId: projectMetadata.parentCommunityProjectId,
                targetOwnerId: projectMetadata.parentOwnerId,
                senderId: currentUser._id || currentUser.id,
                senderName: currentUser.username,
                title,
                description,
                files
            };

            // ✅ PRODUCTION FIX: Using apiClient instead of raw fetch
            // apiClient will automatically use your Render URL in production
            await apiClient.post('/api/community/pr', payload);

            toast.success("Fix submitted to the author! 🎉", { id: toastId });
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Error submitting fix.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-[#333] bg-[#252526]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <GitPullRequest size={20} className="text-emerald-400" /> Submit a Fix
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fix Title</label>
                        <input 
                            type="text" required
                            className="w-full bg-[#181818] border border-[#333] focus:border-emerald-500 text-white text-sm rounded-lg p-3 outline-none transition-colors"
                            placeholder="e.g., Fixed the navbar layout bug"
                            value={title} onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                        <textarea 
                            required
                            className="w-full h-24 bg-[#181818] border border-[#333] focus:border-emerald-500 text-white text-sm rounded-lg p-3 outline-none transition-colors resize-none"
                            placeholder="Briefly explain what you changed so the author can review it..."
                            value={description} onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#333]">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all">
                            <Send size={16} /> Send to Author
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitFixModal;