
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, GitMerge, Code2, ArrowLeft, Calendar, Trophy, Zap, MapPin } from 'lucide-react';

const PublicProfile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Fetching from the public route we made earlier
                const res = await fetch(`http://127.0.0.1:5000/api/auth/profile/${username}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [username]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-bold tracking-widest text-sm uppercase">Locating Developer...</p>
            </div>
        );
    }

    if (!profileData || !profileData.profile) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-6xl font-black text-gray-800 mb-4">404</h1>
                <p className="text-gray-400 text-lg mb-8">This developer has vanished into the void.</p>
                <button onClick={() => navigate('/community')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                    Return to Community
                </button>
            </div>
        );
    }

    const { profile, contributions } = profileData;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-gray-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
            
            {/* Background Ambient Glows */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-600/20 to-purple-600/5 blur-[120px] pointer-events-none rounded-full"></div>

            {/* Navigation */}
            <nav className="h-16 border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-xl sticky top-0 z-50 flex items-center px-8 justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/community')}>
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">C</div>
                    <span className="font-bold tracking-widest text-white uppercase text-sm">CodeSync</span>
                </div>
                <button onClick={() => navigate('/community')} className="group flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/5 hover:border-white/10">
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Hub
                </button>
            </nav>

            <main className="max-w-5xl mx-auto px-4 py-12 relative z-10">
                
                {/* 🌟 THE HERO CARD */}
                <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                    {/* Hover Gradient Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                        
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#252526] shadow-[0_0_40px_rgba(99,102,241,0.2)] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-6xl font-black text-white relative z-10">
                                {profile.username?.charAt(0).toUpperCase()}
                            </div>
                            {/* Crown / Level Badge */}
                            {profile.reputation >= 100 && (
                                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-amber-600 w-10 h-10 rounded-full border-4 border-[#1a1a1a] flex items-center justify-center shadow-lg z-20" title="Elite Developer">
                                    <Trophy size={18} className="text-white" />
                                </div>
                            )}
                        </div>

                        {/* Bio & Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                                {profile.username}
                            </h1>
                            <p className="text-lg text-indigo-400 font-medium mb-6">Open Source Contributor</p>
                            
                            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-2xl">
                                {profile.bio || "This developer is busy writing code and hasn't set a bio yet."}
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm text-gray-500 font-medium">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-600" />
                                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-600" />
                                    Global Explorer
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 THE CLOUT STATS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Reputation Card */}
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1e1e1e] border border-white/5 rounded-3xl p-8 flex items-center gap-6 shadow-xl hover:-translate-y-1 transition-transform">
                        <div className="h-16 w-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                            <Star size={32} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-black tracking-[0.2em] mb-1">Reputation Score</p>
                            <p className="text-5xl font-black text-white">{profile.reputation || 0}</p>
                        </div>
                    </div>

                    {/* Merged PRs Card */}
                    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1e1e1e] border border-white/5 rounded-3xl p-8 flex items-center gap-6 shadow-xl hover:-translate-y-1 transition-transform">
                        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                            <GitMerge size={32} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-black tracking-[0.2em] mb-1">Fixes Merged</p>
                            <p className="text-5xl font-black text-white">{profile.totalMergedPRs || 0}</p>
                        </div>
                    </div>
                </div>

                {/* 🚀 OPEN SOURCE WALL OF FAME */}
                <div className="mt-16">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                <Code2 className="text-indigo-400" size={20} />
                            </div>
                            Open Source Contributions
                        </h2>
                    </div>

                    {contributions.length === 0 ? (
                        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Zap size={24} className="text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-300 mb-2">No merges yet</h3>
                            <p className="text-gray-500">When {profile.username} helps fix community projects, they will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {contributions.map((project) => (
                                <div 
                                    key={project._id} 
                                    onClick={() => navigate('/community')}
                                    className="group bg-[#1a1a1a] border border-white/5 hover:border-indigo-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] cursor-pointer relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                                    
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors truncate pr-4">
                                            {project.title}
                                        </h3>
                                        <div className="shrink-0 flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md uppercase tracking-wider">
                                            <GitMerge size={12} /> Merged
                                        </div>
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-6 relative z-10">
                                        {project.description}
                                    </p>
                                    
                                    <div className="flex items-center gap-3 mt-auto relative z-10 border-t border-white/5 pt-4">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[#1a1a1a]">
                                            {project.authorName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">
                                            Maintained by <span className="text-gray-300">{project.authorName}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default PublicProfile;