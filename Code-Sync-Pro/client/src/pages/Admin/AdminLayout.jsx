import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../api.js';
const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { icon: "📊", label: "Overview", path: "/admin/dashboard" },
        { icon: "👥", label: "Users Manager", path: "/admin/users" },
        { icon: "📚", label: "Library Control", path: "/admin/library" },
    ];

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex font-sans selection:bg-purple-500/30">
            {/* --- SIDEBAR --- */}
            <aside className="w-64 bg-[#121212]/50 backdrop-blur-xl border-r border-white/5 flex flex-col fixed h-full z-50">
                <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">
                        A
                    </div>
                    <span className="font-bold tracking-wide text-lg">Admin<span className="text-purple-400">Panel</span></span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                location.pathname === item.path 
                                ? "bg-purple-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/10" 
                                : "text-gray-500 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                            <span className="font-medium text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        🚪 <span className="text-sm font-bold">Exit Admin</span>
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 ml-64 p-8">
                <Outlet /> {/* This is where the different pages will render */}
            </main>
        </div>
    );
};

export default AdminLayout;