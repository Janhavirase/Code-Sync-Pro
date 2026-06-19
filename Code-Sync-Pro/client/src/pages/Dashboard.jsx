import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { Globe, GitPullRequest, CheckCircle } from 'lucide-react';
import ReviewPRModal from '../components/ReviewPRModal';
import apiClient from '../api.js';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [projects, setProjects] = useState([]);
    
    // ✅ NEW: Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [inboxPRs, setInboxPRs] = useState([]);
    const [isInboxLoading, setIsInboxLoading] = useState(true);
    const [reviewingPR, setReviewingPR] = useState(null); // Holds the PR currently opened in the modal
    const [inboxTab, setInboxTab] = useState('pending');

    // --- LOGIC: USER MANAGEMENT ---
    const getSavedUser = () => {
        const saved = localStorage.getItem('userInfo');
        try { return JSON.parse(saved); } catch { return null; }
    };

    const getFinalUser = () => {
        if (location.state?.user) return location.state.user;
        if (location.state?.username) return location.state; 
        return getSavedUser() || { username: 'Guest', _id: 'guest' };
    };

    const user = getFinalUser();
    const userId = user?.user?._id || user?._id || user?.id;

    // --- EFFECTS ---
    useEffect(() => {
        if (userId && userId !== 'guest') {
            fetchProjects(userId);
        }
    }, [userId]);

    useEffect(() => {
        const fetchInbox = async () => {
            const targetId = user?._id || user?.id;
            if (!targetId) return;

            try {
                // ✅ PRODUCTION FIX: Using apiClient
                const response = await apiClient.get(`/api/community/pr/inbox/${targetId}`);
                setInboxPRs(response.data);
            } catch (error) {
                console.error("Failed to load inbox", error);
            } finally {
                setIsInboxLoading(false);
            }
        };

        fetchInbox();
    }, [user]);

    // --- API FUNCTIONS ---
    const fetchProjects = async (idToFetch) => {
        try {
            const targetId = idToFetch || userId;
            // ✅ PRODUCTION FIX: Using apiClient
            const res = await apiClient.get(`/api/projects?userId=${targetId}`);
            
            if (Array.isArray(res.data)) {
                setProjects(res.data);
            } else {
                console.log("Backend response:", res.data);
            }
        } catch (err) {
            console.error("Failed to load projects", err);
        }
    };

    const handleMergePR = async (prId) => {
        const toastId = toast.loading("Merging code into your project...");
        try {
            // ✅ PRODUCTION FIX: Using apiClient
            await apiClient.post(`/api/community/pr/${prId}/merge`);
            
            toast.success("Code Merged Successfully!", { id: toastId });
            
            // Update UI to show it as merged
            setInboxPRs(inboxPRs.map(pr => pr._id === prId ? { ...pr, status: 'merged' } : pr));
        } catch (error) {
            toast.error("Failed to merge.", { id: toastId });
        }
    };

    const createNewProject = async () => {
        if (!userId || userId === 'guest') {
            toast.error("Please login to create a saved room");
            return;
        }
        const id = uuidV4();
        navigate(`/editor/${id}`, {
            state: { 
                user: user, 
                username: user.username, 
                userId: userId, 
                isHost: true 
            }
        });
    };

    const openProject = (roomId) => {
        navigate(`/editor/${roomId}`, {
            state: { 
                user: user, 
                username: user.username, 
                userId: userId, 
                isHost: true 
            }
        });
    };

    const deleteProject = async (projectId) => {
        if (!window.confirm("Are you sure you want to delete this project?")) return;

        try {
            // ✅ PRODUCTION FIX: Using apiClient
            await apiClient.delete(`/api/projects/${projectId}`);
            setProjects(prev => prev.filter(proj => proj._id !== projectId));
            toast.success("Project deleted! 🗑️");
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete project");
        }
    };

    const goToProfile = () => {
        navigate('/profile', { state: { user } });
    };

    // ✅ NEW: Filter Logic
    const filteredProjects = projects.filter(project => 
        project.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isAdmin = user?.role === 'admin' || user?.user?.role === 'admin';

    // --- VISUALS ---
    return (
        <div className="min-h-screen bg-[#0d0d0d] text-gray-200 font-sans selection:bg-blue-500/30">
            {/* Animation Styles */}
            <style>{`
                @keyframes fadeInSlide {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-card {
                    animation: fadeInSlide 0.4s ease-out forwards;
                }
            `}</style>
            
            {/* 1. TOP NAVIGATION */}
            <nav className="h-20 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
                        C
                    </div>
                    <span className="font-bold tracking-wide text-white text-lg hidden sm:block">CodeSync <span className="font-light text-gray-500">Workspace</span></span>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <button 
                            onClick={() => navigate('/admin/dashboard')}
                            className="w-full flex items-center gap-3 px-4 py-3 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
                        >
                            <span className="text-xl">🛡️</span>
                            <span>Admin Panel</span>
                        </button>
                    )}
                    <button 
                        onClick={() => navigate('/library')}
                        className="group flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/10 hover:border-blue-500/30 hover:from-blue-500/20 hover:to-purple-500/20 transition-all active:scale-95"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                            <span className="text-lg">📚</span>
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider leading-none mb-0.5">Explore</p>
                            <p className="text-sm font-bold text-gray-200 leading-none group-hover:text-white">Library</p>
                        </div>
                    </button>
                    <button 
                        onClick={() => navigate('/community')}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-95"
                    >
                        <Globe size={18} />
                        Community Hub
                    </button>
                    <button 
                        onClick={goToProfile} 
                        className="flex items-center gap-3 hover:bg-white/5 pl-3 pr-1 py-1 rounded-full transition-all group border border-transparent hover:border-white/5"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 group-hover:text-gray-400">Signed in as</p>
                            <p className="text-sm font-semibold text-white leading-none">{user.username || "Guest"}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-white/10 shadow-inner flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                            {user.username ? user.username.charAt(0).toUpperCase() : "G"}
                        </div>
                    </button>

                    <button 
                        onClick={() => navigate('/')} 
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </nav>

            {/* 2. MAIN DASHBOARD CONTENT */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Dashboard</h1>
                        <p className="text-gray-400 text-sm">Manage your projects and collaborate in real-time.</p>
                    </div>
                    
                    <div className="relative group w-full md:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-600 group-focus-within:text-blue-500 transition-colors">🔍</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-72 bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-lg"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm("")}
                                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. PROJECT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div 
                        onClick={createNewProject}
                        className="group relative h-60 rounded-2xl border border-dashed border-white/20 hover:border-blue-500/50 bg-white/[0.02] hover:bg-white/[0.04] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 flex items-center justify-center mb-4 transition-colors ring-1 ring-white/5">
                            <span className="text-3xl text-blue-400 group-hover:text-blue-300 font-light">+</span>
                        </div>
                        <h3 className="font-semibold text-gray-300 group-hover:text-white">New Project</h3>
                        <p className="text-xs text-gray-500 mt-1">Start from scratch</p>
                    </div>

                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project, index) => (
                            <div 
                                key={project.roomId}
                                onClick={() => openProject(project.roomId)}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className="animate-card opacity-0 group relative h-60 bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 hover:border-white/10 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#252526] to-black border border-white/5 flex items-center justify-center text-xl shadow-inner">
                                        💻
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); 
                                            deleteProject(project._id);
                                        }}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete Project"
                                    >
                                        🗑️
                                    </button>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors truncate">
                                        {project.name || "Untitled Project"}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-mono truncate opacity-60">
                                        ID: <span className="text-gray-400">{project.roomId.slice(0, 8)}...</span>
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        <div className="w-7 h-7 rounded-full bg-gray-700 border-2 border-[#1a1a1a] flex items-center justify-center text-[10px] text-white">
                                            {user.username ? user.username.charAt(0).toUpperCase() : "G"}
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-blue-400 flex items-center gap-1 transition-colors">
                                        Open
                                        <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        searchTerm && (
                            <div className="col-span-full py-20 text-center animate-card">
                                <div className="text-4xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-white">No projects found</h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    No results for "<span className="text-blue-400">{searchTerm}</span>". Try a different name.
                                </p>
                            </div>
                        )
                    )}
                </div>

                <div className="mt-12 max-w-5xl mx-auto">
                    <div className="flex items-end justify-between mb-6">
                        <h2 className="text-xl font-black text-white flex items-center gap-2">
                            <GitPullRequest size={24} className="text-emerald-400" />
                            Contributor Inbox
                        </h2>

                        <div className="flex gap-2 bg-[#181818] p-1 rounded-xl border border-[#333]">
                            <button 
                                onClick={() => setInboxTab('pending')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                                    inboxTab === 'pending' ? 'bg-[#252526] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                Needs Review
                                {inboxPRs.filter(pr => pr.status === 'pending').length > 0 && (
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full">
                                        {inboxPRs.filter(pr => pr.status === 'pending').length}
                                    </span>
                                )}
                            </button>
                            <button 
                                onClick={() => setInboxTab('history')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    inboxTab === 'history' ? 'bg-[#252526] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                History
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#181818] border border-[#333] rounded-3xl p-2 shadow-2xl">
                        {isInboxLoading ? (
                            <div className="p-10 text-center text-gray-500 text-sm font-bold animate-pulse">Checking inbox...</div>
                        ) : (
                            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-4 flex flex-col gap-3">
                                {inboxTab === 'pending' && inboxPRs.filter(pr => pr.status === 'pending').length === 0 && (
                                    <div className="py-16 flex flex-col items-center justify-center text-center opacity-70">
                                        <CheckCircle size={48} className="text-emerald-500/50 mb-4" />
                                        <h3 className="text-lg font-bold text-gray-300">Inbox Zero</h3>
                                        <p className="text-gray-500 text-sm">You have no pending code fixes. Take a breath.</p>
                                    </div>
                                )}

                                {inboxTab === 'history' && inboxPRs.filter(pr => pr.status === 'merged').length === 0 && (
                                    <div className="py-16 text-center">
                                        <p className="text-gray-500 text-sm font-medium">No merged PRs yet.</p>
                                    </div>
                                )}

                                {inboxPRs
                                    .filter(pr => pr.status === (inboxTab === 'pending' ? 'pending' : 'merged'))
                                    .map((pr) => (
                                        <div key={pr._id} className="bg-[#252526] border border-[#444] rounded-xl p-5 flex justify-between items-center transition-all hover:border-emerald-500/50 group">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-gray-200">{pr.title}</h3>
                                                    {pr.status === 'pending' 
                                                        ? <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase px-2 py-1 rounded">Pending Review</span>
                                                        : <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={10}/> Merged</span>
                                                    }
                                                </div>
                                                <p className="text-sm text-gray-400 mb-2">{pr.description}</p>
                                                <p className="text-xs text-gray-500 font-medium">
                                                    Submitted by: <span className="text-emerald-400">@{pr.senderName}</span>
                                                </p>
                                            </div>

                                            <div className="shrink-0 ml-4">
                                                {pr.status === 'pending' ? (
                                                    <button 
                                                        onClick={() => setReviewingPR(pr)} 
                                                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-lg active:scale-95 transition-all"
                                                    >
                                                        Review Code
                                                    </button>
                                                ) : (
                                                    <div className="px-6 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-widest">Archived</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <ReviewPRModal 
                isOpen={!!reviewingPR} 
                onClose={() => setReviewingPR(null)} 
                pr={reviewingPR} 
                onMerge={handleMergePR}
            />
        </div>
    );
};

export default Dashboard;