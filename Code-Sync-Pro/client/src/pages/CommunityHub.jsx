import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users,GitFork, Star, Clock, Search, Code2, ArrowRight, X, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // ✨ 1. ADD THIS IMPOR
import apiClient from '../api.js';

const CommunityHub = ({ currentFiles, currentUser }) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [userLibrary, setUserLibrary] = useState([]);
const [selectedProjectId, setSelectedProjectId] = useState(null);
const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
    // Form State
    const [publishForm, setPublishForm] = useState({
        title: '',
        description: '',
        tags: ''
    });
// 1. Grab the user info from local storage so we know their name
        const rawUser = localStorage.getItem('userInfo');
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;
        const authorName = parsedUser?.username || parsedUser?.name || 'Anonymous';

    // 🚀 FETCH PROJECTS ON LOAD
useEffect(() => {
        const fetchCommunityProjects = async () => {
            try {
                // ✅ PRODUCTION FIX: Using apiClient
                const response = await apiClient.get('/api/community/feed');
                
                if (response.data && response.data.projects) {
                    setProjects(response.data.projects); 
                }
            } catch (error) {
                console.error("Error fetching community projects:", error);
            } finally {
                setIsLoading(false); // ✨ ADD THIS to hide the loading message
            }
        };
        fetchCommunityProjects();
    }, []);
    // 🚀 HANDLE PUBLISHING NEW PROJECT
// 🚀 HANDLE PUBLISHING FROM LIBRARY
   // 🚀 THE LOUD DEBUGGER: HANDLE PUBLISHING
   const handlePublish = async (e) => {
        e.preventDefault();
        console.log("🚀 1. Publish Button Clicked!");
        
        if (!selectedProjectId) {
            return toast.error("Please select a project from your library first!");
        }

        const selectedProject = userLibrary.find(p => p._id === selectedProjectId);

        if (!selectedProject || !selectedProject.files || selectedProject.files.length === 0) {
            return toast.error("This project has no files!");
        }

        // 1. Grab User Info carefully
        const rawUser = localStorage.getItem('userInfo');
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;
        
        // Ensure this is NOT undefined (Mongoose hates that)
        const authorName = parsedUser?.username || parsedUser?.name || "CodeSync Developer";

        // 2. Package the payload
      const newProjectData = {
            title: publishForm.title,
            description: publishForm.description,
            tags: publishForm.tags.split(',').map(tag => tag.trim()).filter(t => t !== ''),
            codeSnapshot: selectedProject.files,
            authorName: parsedUser?.username || "CodeSync User",
            userId: parsedUser?._id // 👈 Send this so the backend knows the owner
        };

        console.log("📦 5. Payload perfectly packaged:", newProjectData);

// 🚀 Smart Search for the Token
        const token = localStorage.getItem('token') || JSON.parse(localStorage.getItem('userInfo'))?.token;

        console.log("🔑 6. Token Check:", token ? "Token Found!" : "NULL/MISSING!");
        try {
            console.log("⏳ 8. Firing request to backend...");
            // ✅ PRODUCTION FIX: Using apiClient
            const response = await apiClient.post('/api/community/publish', newProjectData);
            
            const data = response.data;
            
            toast.success("Project published to the community! 🎉");
            setProjects([data.project, ...projects]);
            setIsPublishModalOpen(false);
            setPublishForm({ title: '', description: '', tags: '' }); 
            setSelectedProjectId(null); 
            
        } catch (error) {
            console.error("🔥 12. Publish Error Caught:", error);
            toast.error(error.message || "Failed to publish project.");
        }
    };
const openPublishModal = async () => {
        setIsPublishModalOpen(true);
        setIsLoadingLibrary(true);
        
        try {
            // 1. Grab the exact key you found from local storage!
            const storedUser = localStorage.getItem('userInfo'); 

            if (!storedUser) {
                toast.error("User data not found. Please log in again.");
                setIsLoadingLibrary(false);
                return;
            }

            // 2. Parse the JSON and grab that exact _id 
            const rawUser = JSON.parse(storedUser);
            const targetId = rawUser?._id; 

            if (!targetId) {
                console.error("🔴 STOPPING: Could not extract _id from userInfo.", rawUser);
                toast.error("Session invalid. Please log in again.");
                setIsLoadingLibrary(false);
                return;
            }

            // 3. Fetch your projects from the backend
            // ✅ PRODUCTION FIX: Using apiClient
            const res = await apiClient.get(`/api/projects?userId=${targetId}`);
            const data = res.data;

            // 4. Populate the modal!
            if (Array.isArray(data)) {
                setUserLibrary(data);
            } else {
                setUserLibrary([]); 
            }

        } catch (err) {
            console.error("Failed to fetch library", err);
            toast.error("Could not load your library projects.");
        } finally {
            setIsLoadingLibrary(false);
        }
    };
   // 🚀 HANDLE FORKING A PROJECT
    const handleFork = async (projectId) => {
        // 1. Check if user is logged in
        const rawUser = localStorage.getItem('userInfo');
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;

        if (!parsedUser || !parsedUser._id) {
            return toast.error("You must be logged in to fork a project!");
        }

        const toastId = toast.loading("Creating your private workspace...");

        try {
            // 2. Hit the backend Fork route
            // ✅ PRODUCTION FIX: Using apiClient
            const response = await apiClient.post(`/api/community/fork/${projectId}`, { userId: parsedUser._id });

            const data = response.data;

            toast.success("Project Forked! Teleporting to Editor...", { id: toastId });

            // 3. Redirect the user to their new Editor Room WITH the files!
            setTimeout(() => {
                navigate(`/editor/${data.project.roomId}`, {
                    state: { 
                        templateFiles: data.project.files, // 🎒 THIS IS THE MISSING SUITCASE!
                        user: parsedUser ,
                        projectMetadata: data.project
                    }
                }); 
            }, 1000);

        } catch (error) {
            console.error("🔥 Forking Error:", error);
            toast.error(error.message || "Failed to fork project", { id: toastId });
        }
    };

    // Filter projects based on search bar
    const filteredProjects = projects.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="h-full w-full bg-[#1e1e1e] flex flex-col font-sans text-white overflow-hidden animate-fadeIn relative">
            
            {/* ✨ HEADER SECTION */}
            <div className="shrink-0 px-10 py-8 border-b border-[#333] bg-gradient-to-b from-[#252526] to-[#1e1e1e]">
                <div className="max-w-5xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                                Community Hub
                            </h1>
                            <p className="text-gray-400 mt-2 text-sm font-medium">
                                Fork projects, submit fixes, and collaborate asynchronously.
                            </p>
                        </div>
                        
                        <button 
                            onClick={openPublishModal} 
                            className="group relative px-6 py-2.5 font-bold text-sm rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <UploadCloud size={18} />
                            <span>Publish Workspace</span>
                        </button>
                        {/* ✨ THE ESCAPE HATCH */}
<button 
    onClick={() => navigate('/dashboard')} 
    className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 hover:border-white/10 shadow-sm"
>
    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
    Back to Dashboard
</button>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search for tags, languages, or issues..." 
                            className="w-full bg-[#181818] border border-[#333] focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-gray-200 text-sm rounded-xl py-3 pl-12 pr-4 outline-none transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* ✨ FEED SECTION */}
            <div className="flex-1 overflow-y-auto px-10 py-8 scrollbar-hide">
                <div className="max-w-5xl mx-auto grid gap-4">
                    
                    {isLoading ? (
                        <div className="flex justify-center py-20 text-gray-500">
                            <span className="animate-pulse">Loading community projects...</span>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-[#333] rounded-2xl bg-[#252526]/50">
                            <Code2 size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-bold text-gray-300">No projects found</h3>
                            <p className="text-sm text-gray-500 mt-2 max-w-md">
                                {searchQuery ? "Try adjusting your search terms." : "Be the first to publish your workspace to the community!"}
                            </p>
                        </div>
                    ) : (
                        filteredProjects.map((project) => (
                            <div key={project._id || project.id} className="group bg-[#252526] border border-[#333] hover:border-[#444] rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 relative overflow-hidden">
                                {/* Hover Gradient Line */}
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-[10px] font-black shadow-md">
                                                {project.authorName?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400">{project.authorName}</span>
                                            <span className="text-xs text-gray-600 flex items-center gap-1">
                                                <Clock size={12} /> 
                                                {new Date(project.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors cursor-pointer">
                                            {project.title}
                                        </h3>
                                        
                                        <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-3xl">
                                            {project.description}
                                        </p>

                                        <div className="flex gap-2 mt-4">
                                            {project.tags && project.tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-1 rounded-md bg-[#1e1e1e] border border-[#333] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                      {project.contributors && project.contributors.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#333]/50 w-full">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Users size={12} /> Top Contributors
            </p>
          <div className="flex -space-x-2 overflow-hidden">
    {project.contributors.slice(0, 5).map((contributor, idx) => (
        <div 
            key={idx} 
            onClick={() => {
                // 🕵️‍♂️ DEBUGGING: This will tell us the exact string being sent
                const identifier = contributor.userId || contributor.username;
                console.log("🔍 DEBUG: Sending user to profile:", `"${contributor.username}"`);
                navigate(`/profile/${identifier}`); // 👈 THIS IS THE MAGIC
            }}
            className="inline-block h-7 w-7 rounded-full ring-2 ring-[#252526] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 transition-transform"
            title={contributor.username}
        >
            <span className="text-[9px] font-black text-white uppercase">
                {contributor.username?.charAt(0) || '?'}
            </span>
        </div>
    ))}

    {project.contributors.length > 5 && (
        <div className="inline-block h-7 w-7 rounded-full ring-2 ring-[#252526] bg-[#333] flex items-center justify-center">
            <span className="text-[9px] font-bold text-gray-300">
                +{project.contributors.length - 5}
            </span>
        </div>
    )}
</div>
        </div>
    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col items-end gap-3 shrink-0 ml-6">
                                        <div className="flex items-center gap-4 text-gray-500 text-sm">
                                            <div className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                                                <GitFork size={16} /> {project.forks || 0}
                                            </div>
                                            <div className="flex items-center gap-1 hover:text-yellow-400 transition-colors">
                                                <Star size={16} />
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleFork(project._id)}
                                            className="mt-2 flex items-center gap-2 px-5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold transition-all hover:border-white/20 group/btn"
                                        >
                                            <GitFork size={16} className="text-emerald-400" />
                                            Fork & Help
                                            <ArrowRight size={14} className="text-gray-500 group-hover/btn:translate-x-1 group-hover/btn:text-white transition-all" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ✨ PUBLISH MODAL OVERLAY ✨ */}
{isPublishModalOpen && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
        <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#333] bg-[#252526] shrink-0">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UploadCloud size={20} className="text-indigo-400" /> Publish from Library
                </h2>
                <button onClick={() => setIsPublishModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            {/* Modal Form (Added overflow-y-auto so the modal scrolls if it gets too tall) */}
            <form onSubmit={handlePublish} className="p-6 flex flex-col gap-5 overflow-y-auto">
                
                {/* 1. Project Selection Section (YOUR SNIPPET GOES HERE) */}
                <div className="bg-[#181818] border border-[#333] rounded-xl p-4">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        1. Select Project to Publish
                    </label>
                    
                    {isLoadingLibrary ? (
                        <div className="text-center text-sm text-gray-500 py-4 animate-pulse">Loading your library...</div>
                    ) : userLibrary.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-4">Your private library is empty.</div>
                    ) : (
                        // ✨ THIS IS WHERE YOUR EXACT SNIPPET LIVES ✨
                        <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {userLibrary.map((project) => (
                                <div 
                                    key={project._id}
                                    onClick={() => setSelectedProjectId(project._id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        selectedProjectId === project._id 
                                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                                        : "border-[#333] bg-[#181818] hover:border-[#444]"
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-200">{project.name || project.title}</span>
                                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                            {project.files?.length || 0} Files
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. Title Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">2. Public Title</label>
                    <input 
                        type="text" 
                        required
                        className="w-full bg-[#181818] border border-[#333] focus:border-indigo-500 text-white text-sm rounded-lg p-3 outline-none transition-colors"
                        placeholder="e.g., MERN WebRTC Bug Fix"
                        value={publishForm.title}
                        onChange={(e) => setPublishForm({...publishForm, title: e.target.value})}
                    />
                </div>
                
                {/* 3. Description Input */}
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                    <textarea 
                        required
                        className="w-full h-24 bg-[#181818] border border-[#333] focus:border-indigo-500 text-white text-sm rounded-lg p-3 outline-none transition-colors resize-none"
                        placeholder="Explain the issue or the goal of this code..."
                        value={publishForm.description}
                        onChange={(e) => setPublishForm({...publishForm, description: e.target.value})}
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-[#333]">
                    <button type="button" onClick={() => setIsPublishModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors">
                        Cancel
                    </button>
                    {/* Disable the button if no project is selected! */}
                    <button 
                        type="submit" 
                        disabled={!selectedProjectId}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all ${
                            selectedProjectId 
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95" 
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                        Publish to Community
                    </button>
                </div>
            </form>
        </div>
    </div>
)}
        </div>
    );
};

export default CommunityHub;