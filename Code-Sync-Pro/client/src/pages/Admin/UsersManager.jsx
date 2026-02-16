import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// --- ICONS (Micro-Components for cleaner JSX) ---
const IconSearch = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconTrash = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const IconCopy = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const IconShield = () => <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;

const UsersManager = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Auth Info
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const currentUserId = userInfo?.user?._id || userInfo?._id;

    // --- 1. FETCH USERS ---
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:5000/api/admin/users', {
                headers: { 'x-user-id': currentUserId } // Auth Check
            });
            const data = await res.json();
            
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                toast.error("Failed to load users");
            }
        } catch (err) {
            console.error(err);
            toast.error("Server connection failed");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    // --- 2. ACTIONS ---
    const handleDelete = async (userId, username) => {
        if (!window.confirm(`⚠️ DANGER ZONE:\n\nAre you sure you want to delete user "${username}"?\nThis will erase their account and ALL their projects.\n\nThis cannot be undone.`)) return;

        try {
            const res = await fetch(`http://127.0.0.1:5000/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': currentUserId }
            });

            if (res.ok) {
                toast.success(`User ${username} terminated.`);
                setUsers(prev => prev.filter(u => u._id !== userId));
            } else {
                const data = await res.json();
                toast.error(data.message || "Delete failed");
            }
        } catch (err) {
            toast.error("Error executing delete");
        }
    };

    const copyEmail = (email) => {
        navigator.clipboard.writeText(email);
        toast.success("Email copied! 📋");
    };

    // --- 3. FILTER LOGIC ---
    const filteredUsers = users.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats for the Header
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'admin').length;
    const newToday = users.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString()).length;

    return (
        <div className="animate-fadeIn min-h-screen p-2">
            
            {/* --- HEADER SECTION --- */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-2 drop-shadow-sm">
                        User Directory
                    </h1>
                    <div className="flex gap-4 text-sm font-medium">
                        <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Total: <span className="text-white ml-1">{totalUsers}</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Admins: <span className="text-white ml-1">{adminCount}</span>
                        </span>
                        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            New Today: <span className="text-white ml-1">{newToday}</span>
                        </span>
                    </div>
                </div>

                {/* SEARCH BAR */}
                <div className="relative group w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-purple-400 transition-colors">
                        <IconSearch />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#0a0a0a]/50 backdrop-blur-md border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white shadow-xl focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                    />
                </div>
            </div>

            {/* --- TABLE SECTION --- */}
            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/5">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gradient-to-r from-white/5 to-transparent text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                            <th className="p-6 font-semibold">User Identity</th>
                            <th className="p-6 font-semibold">Role & Access</th>
                            <th className="p-6 font-semibold">Joined Date</th>
                            <th className="p-6 font-semibold text-right">Management</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                            // SKELETON LOADING STATE
                            [...Array(3)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="p-6"><div className="h-10 w-48 bg-white/5 rounded-lg"></div></td>
                                    <td className="p-6"><div className="h-6 w-24 bg-white/5 rounded-full"></div></td>
                                    <td className="p-6"><div className="h-4 w-32 bg-white/5 rounded"></div></td>
                                    <td className="p-6"></td>
                                </tr>
                            ))
                        ) : filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <tr key={user._id} className="hover:bg-white/[0.03] transition-all duration-200 group">
                                    
                                    {/* 1. IDENTITY COLUMN */}
                                    <td className="p-6">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar Generator */}
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-inner bg-gradient-to-br ${
                                                user.role === 'admin' ? 'from-purple-600 to-indigo-600' : 'from-gray-700 to-gray-600'
                                            }`}>
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-100 text-base">{user.username}</h3>
                                                <button 
                                                    onClick={() => copyEmail(user.email)}
                                                    className="flex items-center gap-1.5 text-gray-500 text-sm hover:text-blue-400 transition-colors group/email"
                                                >
                                                    {user.email}
                                                    <span className="opacity-0 group-hover/email:opacity-100 transition-opacity"><IconCopy /></span>
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 2. ROLE COLUMN */}
                                    <td className="p-6">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${
                                            user.role === 'admin' 
                                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        }`}>
                                            {user.role === 'admin' && <IconShield />}
                                            {user.role}
                                        </div>
                                    </td>

                                    {/* 3. DATE COLUMN */}
                                    <td className="p-6">
                                        <div className="text-gray-400 text-sm font-mono">
                                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                                                month: 'short', day: 'numeric', year: 'numeric'
                                            })}
                                        </div>
                                        <div className="text-gray-600 text-xs mt-0.5">
                                            {new Date(user.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </td>

                                    {/* 4. ACTIONS COLUMN */}
                                    <td className="p-6 text-right">
                                        {user.role === 'admin' ? (
                                            <span className="text-gray-600 text-xs italic pr-4">Protected</span>
                                        ) : (
                                            <button 
                                                onClick={() => handleDelete(user._id, user.username)}
                                                className="group/btn relative px-4 py-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-400 transition-all overflow-hidden border border-transparent hover:border-red-500/30"
                                            >
                                                <div className="flex items-center gap-2 relative z-10 font-bold text-xs">
                                                    <IconTrash /> Ban User
                                                </div>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            // EMPTY STATE
                            <tr>
                                <td colSpan="4" className="p-20 text-center text-gray-600">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">👻</div>
                                    <p className="text-lg font-medium text-gray-400">No users found.</p>
                                    <p className="text-sm">Try adjusting your search.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersManager;