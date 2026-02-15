import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// --- MICRO COMPONENTS FOR CLEANER CODE ---
const IconCheck = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>;
const IconX = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const IconEdit = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

const AdminLibrary = () => {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingItem, setEditingItem] = useState(null);

    // Secure User ID Access
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const userId = userInfo?.user?._id || userInfo?._id;

    // --- DATA FETCHING ---
    const fetchLibrary = () => {
        fetch('http://127.0.0.1:5000/api/admin/library', {
            headers: { 
                'Content-Type': 'application/json',
                'x-user-id': userId 
            }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setItems(data);
            } else {
                console.error("Backend Error:", data);
                setItems([]);
                toast.error("Failed to load library items");
            }
        })
        .catch(err => console.error(err));
    }; 
    
    useEffect(() => { fetchLibrary(); }, []);

    // --- ACTIONS ---
    const handleDelete = async (id) => {
        if(!window.confirm("⚠️ Irreversible Action: Delete this item?")) return;
        const res = await fetch(`http://127.0.0.1:5000/api/admin/library/${id}`, {
            method: 'DELETE',
            headers: { 'x-user-id': userId }
        });
        if(res.ok) {
            toast.success("Item erased from existence");
            setItems(prev => prev.filter(i => i._id !== id));
        }
    };

    const toggleApproval = async (item) => {
        const res = await fetch(`http://127.0.0.1:5000/api/admin/library/${item._id}/approve`, {
            method: 'PATCH',
            headers: { 'x-user-id': userId }
        });
        if(res.ok) {
            const isNowApproved = !item.isApproved;
            toast.success(isNowApproved ? "🚀 Item is now LIVE" : "👻 Item hidden from public");
            fetchLibrary(); 
        }
    };

    const saveEdit = async () => {
        const res = await fetch(`http://127.0.0.1:5000/api/admin/library/${editingItem._id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'x-user-id': userId 
            },
            body: JSON.stringify({ title: editingItem.title, desc: editingItem.desc })
        });
        if(res.ok) {
            toast.success("Metadata Updated");
            setEditingItem(null); 
            fetchLibrary();
        }
    };

    // --- FILTER ---
    const filteredItems = items.filter(item => 
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.owner?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fadeIn min-h-screen relative p-2">
            
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 mb-2 drop-shadow-sm">
                        Library Governance
                    </h1>
                    <p className="text-gray-400 text-sm font-medium tracking-wide">
                        MODERATION • CURATION • ANALYTICS
                    </p>
                </div>
                
                {/* Search Bar */}
                <div className="relative group w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-400 text-gray-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by Title, ID, or Creator..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white shadow-xl focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-600"
                    />
                </div>
            </div>

            {/* 2. GLASS DATA TABLE */}
            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-white/5 to-transparent text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                            <th className="p-6 font-semibold">Project Meta</th>
                            <th className="p-6 font-semibold">Contributor</th>
                            <th className="p-6 font-semibold text-center">Lifecycle</th>
                            <th className="p-6 font-semibold text-right">Admin Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredItems.map(item => (
                            <tr key={item._id} className="hover:bg-white/[0.03] transition-all duration-200 group">
                                
                                {/* Meta Info */}
                                <td className="p-6">
                                    <h3 className="font-bold text-gray-100 text-lg group-hover:text-blue-400 transition-colors">{item.title}</h3>
                                    <p className="text-gray-500 text-xs font-mono mt-1 opacity-70">ID: {item._id.slice(-6).toUpperCase()}</p>
                                    <p className="text-gray-400 text-sm mt-2 line-clamp-1 max-w-md">{item.desc || "No description provided."}</p>
                                </td>

                                {/* Contributor */}
                                <td className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-sm font-bold text-blue-400 shadow-inner">
                                            {item.owner?.username?.[0]?.toUpperCase() || "?"}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-gray-200 font-medium text-sm">{item.owner?.username || "Unknown"}</span>
                                            <span className="text-gray-600 text-xs">{item.owner?.email}</span>
                                        </div>
                                    </div>
                                </td>

                                {/* Status Badge */}
                                <td className="p-6 text-center">
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border shadow-[0_0_15px_rgba(0,0,0,0.3)] transition-all ${
                                        item.isApproved 
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10" 
                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10"
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${item.isApproved ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                                        {item.isApproved ? "Live" : "Pending"}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="p-6">
                                    <div className="flex justify-end items-center gap-3">
                                        {/* Dynamic Approve/Hide Button */}
                                        <button 
                                            onClick={() => toggleApproval(item)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all transform hover:scale-105 active:scale-95 ${
                                                item.isApproved
                                                ? "bg-white/5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 border border-white/5 hover:border-amber-500/30"
                                                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                                            }`}
                                        >
                                            {item.isApproved ? <><IconX /> Unpublish</> : <><IconCheck /> Approve</>}
                                        </button>

                                        {/* Edit Button */}
                                        <button 
                                            onClick={() => setEditingItem(item)}
                                            className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
                                            title="Edit Metadata"
                                        >
                                            <IconEdit />
                                        </button>

                                        {/* Delete Button */}
                                        <button 
                                            onClick={() => handleDelete(item._id)}
                                            className="p-2 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
                                            title="Delete Permanently"
                                        >
                                            <IconTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {filteredItems.length === 0 && (
                    <div className="p-16 flex flex-col items-center justify-center text-gray-600">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">🔍</div>
                        <p className="text-lg font-medium">No projects found.</p>
                        <p className="text-sm">Try adjusting your search criteria.</p>
                    </div>
                )}
            </div>

            {/* 3. EDIT MODAL (Cyberpunk Style) */}
            {editingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative ring-1 ring-white/10">
                        <button 
                            onClick={() => setEditingItem(null)}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                        >✕</button>
                        
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white">Edit Metadata</h2>
                            <p className="text-gray-500 text-sm mt-1">Modifying project ID: <span className="font-mono text-blue-400">{editingItem._id}</span></p>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 group-focus-within:text-blue-300">Project Title</label>
                                <input 
                                    value={editingItem.title}
                                    onChange={(e) => setEditingItem({...editingItem, title: e.target.value})}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 group-focus-within:text-blue-300">Description</label>
                                <textarea 
                                    rows="4"
                                    value={editingItem.desc}
                                    onChange={(e) => setEditingItem({...editingItem, desc: e.target.value})}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none leading-relaxed"
                                />
                            </div>
                            
                            <button 
                                onClick={saveEdit}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4 rounded-xl font-bold text-white tracking-wide shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 transition-all"
                            >
                                SAVE CHANGES
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLibrary;