import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // ✅ Added for template instantiation

const ProfilePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false); 

    // 1. User Retrieval
    const getSavedUser = () => {
        try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
    };
    const currentUser = location.state?.user || getSavedUser();
    const userId = currentUser?.user?._id || currentUser?._id; 

    // 2. State for Profile Data & Form
    const [profileData, setProfileData] = useState(null);
    const [formData, setFormData] = useState({ bio: '', username: '' });
    const [deployedProjects, setDeployedProjects] = useState([]); // ✅ Added state to prevent ReferenceError

    // ✅ 3. State for Library Contributions
    const [contributions, setContributions] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);

    // 4. Fetch Profile Data (Backend)
    console.log("1. Profile Page Loaded");
    console.log("2. Current User Object:", currentUser);
    console.log("3. User ID derived:", userId);

    const fetchProfile = async () => {
        if (!userId) {
            console.error("❌ FETCH ABORTED: No User ID available");
            return;
        }

        console.log(`🚀 STARTING FETCH: http://127.0.0.1:5000/api/users/profile/${userId}`);

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/users/profile/${userId}`);
            console.log("📡 RESPONSE STATUS:", res.status);
            
            const data = await res.json();
            console.log("📦 DATA RECEIVED:", data);

            if (res.ok) {
                setProfileData(data);
                setFormData({ bio: data.bio, username: data.name }); 
                // ✅ Update the deployed projects list from backend response
                setDeployedProjects(data.deployedProjects || []);
            } else {
                toast.error("Failed to load profile");
                console.error("❌ BACKEND ERROR:", data);
            }
        } catch (err) {
            console.error("❌ NETWORK ERROR:", err);
        } finally {
            setLoading(false);
        }
    };
// ✅ ADD THESE LINES to fix "user is not defined"
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const user = userInfo?.user || userInfo;
    // ✅ 5. Fetch Library Contributions (With Data Transformation)
    useEffect(() => {
        if (!userId) return;
        
        const fetchMyTemplates = async () => {
            try {
                console.log(`🔍 FETCHING TEMPLATES FOR: ${userId}`);
                const res = await fetch(`http://127.0.0.1:5000/api/templates?userId=${userId}`);
                const data = await res.json();
                
                console.log("📦 RAW DB DATA:", data);

                if (res.ok) {
                    const formattedData = data.map(t => ({
                        ...t,
                        id: t._id, 
                        files: t.files || [{ name: 'main', language: t.language, value: t.code }]
                    }));
                    
                    setContributions(formattedData);
                }
            } catch (err) {
                console.error("❌ Failed to load templates", err);
            }
        };

        fetchProfile(); 
        fetchMyTemplates(); 
        
    }, [userId]);

    // 6. Handle Profile Edit & Save (Backend)
    const handleSave = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/users/profile/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    bio: formData.bio, 
                    username: formData.username 
                })
            });
            
            if (res.ok) {
                toast.success("Profile Updated!");
                setIsEditing(false);
                fetchProfile(); 
            } else {
                toast.error("Update failed");
            }
        } catch (err) {
            toast.error("Server error");
        }
    };

    const handleUseTemplate = (template) => {
        const roomId = uuidv4();
        navigate(`/editor/${roomId}`, { state: { templateFiles: template.files } });
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Delete this template?")) return;
        try {
            await fetch(`http://127.0.0.1:5000/api/templates/${id}`, { method: 'DELETE' });
            setContributions(contributions.filter(t => t._id !== id));
            toast.success("Deleted from Database");
        } catch (err) {
            toast.error("Failed to delete");
        }
    };

    const handleEditTemplateClick = (template) => {
        setEditingTemplate({ ...template });
        setIsEditModalOpen(true);
    };

    const handleSaveTemplateChanges = () => {
        if (!editingTemplate.title.trim() || !editingTemplate.files[0].value.trim()) {
            return toast.error("Title and Code cannot be empty");
        }
        setIsEditModalOpen(false);
        setEditingTemplate(null);
        toast.success("Template updated successfully!");
    };

    if (loading) return <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center text-white">Loading...</div>;
    if (!profileData) return null;

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-gray-200 font-sans selection:bg-blue-500/30">
            
            {/* Nav */}
            <nav className="h-16 border-b border-white/5 bg-[#121212]/80 backdrop-blur-md sticky top-0 z-50 flex items-center px-6 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">C</div>
                    <span className="font-bold tracking-wide text-white">CodeSync Platform</span>
                </div>
                {/* Inside ProfilePage.jsx return statement */}

{user?.role === 'admin' && (
    <div className="mt-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-between">
        <div>
            <h3 className="text-white font-bold text-lg">Admin Access</h3>
            <p className="text-gray-400 text-sm">Manage users, content, and platform stats.</p>
        </div>
        <button 
            onClick={() => navigate('/admin/dashboard')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20"
        >
            Enter Dashboard 🚀
        </button>
    </div>
)}
                <button onClick={() => navigate('/dashboard', { state: { user: currentUser } })} className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                    ⬅ Back to Dashboard
                </button>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-8">
                {/* Hero */}
                <div className="h-48 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-16 relative z-10">
                    {/* LEFT COLUMN */}
                    <div className="col-span-1 flex flex-col gap-6">
                        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center">
                            <div className="w-32 h-32 rounded-full border-4 border-[#1a1a1a] shadow-2xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-5xl font-bold text-white mb-4">
                                {profileData.name.charAt(0).toUpperCase()}
                            </div>
                            
                            {isEditing ? (
                                <div className="w-full flex flex-col gap-3 mb-4">
                                    <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-center focus:border-blue-500 outline-none" placeholder="Username" />
                                    <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-blue-500 outline-none resize-none" rows="3" placeholder="Bio" />
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">{profileData.name}</h1>
                                    <p className="text-blue-400 font-medium text-sm mb-4">{profileData.username}</p>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6">{profileData.bio}</p>
                                </>
                            )}
                            
                            <div className="w-full h-px bg-white/5 mb-6"></div>
                            <div className="w-full flex justify-between text-sm text-gray-500 mb-6">
                                <span>Joined</span>
                                <span className="text-gray-300 font-medium">{profileData.joinDate}</span>
                            </div>

                            {isEditing ? (
                                <div className="flex gap-2 w-full">
                                    <button onClick={handleSave} className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold text-white transition-all">Save</button>
                                    <button onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-bold text-white transition-all">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-all hover:shadow-lg">Edit Profile</button>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="col-span-1 lg:col-span-2 flex flex-col gap-8 mt-16 lg:mt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Projects" value={profileData.stats.projects} icon="📁" color="text-blue-400" />
                            <StatCard title="Est. Hours" value={profileData.stats.hoursCoded} icon="⏱️" color="text-emerald-400" />
                            <StatCard title="Day Streak" value={profileData.stats.streak} icon="🔥" color="text-orange-400" />
                            <StatCard title="Collaborators" value={profileData.stats.collaborators} icon="👥" color="text-purple-400" />
                        </div>

                        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-6">Tech Stack Focus</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center py-4">
                                {profileData.languages.length > 0 ? (
                                    profileData.languages.map((lang, index) => (
                                        <CircularProgress key={index} percentage={lang.percentage} color={lang.color} label={lang.name} size={90} />
                                    ))
                                ) : (
                                    <p className="col-span-full text-gray-500 text-sm italic">Write some code to generate stats!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Library Contributions Section */}
<div className="mt-12 pt-8 border-t border-white/10">
    <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">📚</span>
            My Library Contributions
        </h2>
    </div>

    {contributions.length === 0 ? (
        <div className="bg-[#1a1a1a]/50 border border-white/5 rounded-2xl p-12 text-center">
            <h3 className="text-xl font-bold text-white mb-2">No contributions yet</h3>
        </div>
    ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contributions.map((template) => (
                <div key={template._id || template.id} className="group relative bg-[#1a1a1a] border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all hover:-translate-y-1">
                    <h3 className="text-lg font-bold text-white mb-2 truncate">{template.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-6">{template.desc}</p>
                    
                    <div className="flex gap-2 pt-4 border-t border-white/5">
                        {/* OPEN BUTTON */}
                        <button 
                            onClick={() => handleUseTemplate(template)} 
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                            Open
                        </button>

                        {/* ✅ RESTORED EDIT BUTTON */}
                        <button 
                            onClick={() => navigate(`/library/edit/${template._id}`)}
                            className="px-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all"
                            title="Edit Contribution"
                        >
                            ✏️
                        </button>

                        {/* DELETE BUTTON */}
                        <button 
                            onClick={() => handleDeleteTemplate(template._id)} 
                            className="px-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                        >
                            🗑
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )}
</div>
                {/* ✅ SHIPPED PROJECTS LIST AT BOTTOM */}
                <div className="mt-12 p-6 bg-[#1a1a1a] rounded-3xl border border-white/5 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span>🚀</span> Shipped Projects
                    </h3>

                    {deployedProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {deployedProjects.map((proj) => (
                                <div key={proj._id} className="p-4 bg-black/40 border border-white/10 rounded-2xl hover:border-green-500/50 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-200">{proj.name}</h4>
                                        <span className="text-[10px] text-green-500 font-mono bg-green-500/10 px-2 py-0.5 rounded-full">LIVE</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">Last updated: {new Date(proj.updatedAt).toLocaleDateString()}</p>
                                    <a href={proj.githubUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium">
                                        View Repository ↗
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                            <p className="text-gray-500 text-sm">No projects shipped to GitHub yet.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Modal Logic (Keep existing) */}
            {isEditModalOpen && editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                   <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-2xl border border-[#333] shadow-2xl p-6 flex flex-col max-h-[90vh]">
                        <h2 className="text-2xl font-bold mb-1 text-white">Edit Template</h2>
                        <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 mt-4">
                            <input 
                                className="w-full bg-[#121212] border border-[#333] p-3 rounded-lg text-white"
                                value={editingTemplate.title}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                            />
                            <textarea 
                                className="w-full bg-[#121212] border border-[#333] p-3 rounded-lg text-white h-20"
                                value={editingTemplate.desc}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, desc: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#333]">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-gray-400">Cancel</button>
                            <button onClick={handleSaveTemplateChanges} className="px-6 py-2 bg-green-600 rounded-lg text-white font-bold">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// HELPER COMPONENTS
const CircularProgress = ({ percentage, color, size = 80, strokeWidth = 8, label }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const textColor = color ? color.replace('bg-', 'text-') : 'text-gray-500';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90 w-full h-full">
                    <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" className="text-gray-800" />
                    <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${textColor} transition-all duration-1000 ease-out`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{percentage}%</span>
                </div>
            </div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col justify-between h-32 hover:-translate-y-1 transition-transform">
        <div className="flex justify-between items-start">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
            <span className="text-lg grayscale">{icon}</span>
        </div>
        <div className={`text-4xl font-black ${color} tracking-tighter`}>{value}</div>
    </div>
);

export default ProfilePage;