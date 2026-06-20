import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api.js';
// ✅ IMPORTS
import BroadcastPanel from '../../components/BroadcastPanel';
import AuditLogViewer from '../../components/AuditLogViewer';
import SystemControlPanel from '../../components/SystemControlPanel'; // 👈 NEW COMPONENT

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // ✅ PRODUCTION FIX: Using apiClient
                // The interceptor in api.js will automatically attach the 'x-user-id'
                const res = await apiClient.get('/api/admin/stats');
                
                if (res.data.graphData) {
                    setStats(res.data);
                } else {
                    console.error("Invalid Data:", res.data);
                }
            } catch (err) {
                console.error("Failed to fetch admin stats:", err);
                // Handle 401/403 errors if needed
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [navigate]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center text-white bg-[#0d0d0d]">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-gray-400 font-mono">Loading Command Center...</span>
            </div>
        </div>
    );

    return (
        <div className="animate-fadeIn p-6 space-y-8">
            
            {/* 1. HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2 text-white">Dashboard Overview</h1>
                    <p className="text-gray-400">Welcome back, Admin. Systems are nominal.</p>
                </div>
                
                {/* 🟢 SYSTEM HEALTH BUTTON */}
                <button 
                    onClick={() => navigate('/admin/health')}
                    className="group flex items-center gap-3 bg-[#1a1a1a] border border-green-500/30 text-green-400 px-5 py-3 rounded-xl hover:bg-green-500/10 transition-all hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <div className="text-left leading-tight">
                        <span className="block text-xs font-bold tracking-widest uppercase opacity-70">Server Status</span>
                        <span className="block font-bold text-sm text-white group-hover:text-green-300">View System Health →</span>
                    </div>
                </button>
            </div>
            
            {/* 2. STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
                <StatCard title="Active Projects" value={stats.totalProjects} icon="💻" color="purple" />
                <StatCard title="Library Items" value={stats.totalTemplates} icon="📚" color="green" />
            </div>

            {/* 3. OPERATIONS CENTER (Broadcast + Controls) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">📢 Communication</h3>
                    <BroadcastPanel />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-4">🎛️ Feature Flags</h3>
                    <SystemControlPanel />
                </div>
            </div>

            {/* 4. GROWTH CHART */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="bg-white/5 p-2 rounded-lg">📈</span> 
                        <span className="text-gray-100">Platform Growth</span>
                    </h3>
                    <select className="bg-black/40 border border-white/10 text-xs text-gray-400 rounded-lg px-3 py-1 outline-none">
                        <option>Last 6 Months</option>
                    </select>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.graphData}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#666" 
                                tick={{fill: '#888', fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis 
                                stroke="#666" 
                                tick={{fill: '#888', fontSize: 12}} 
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ stroke: '#8b5cf6', strokeWidth: 1 }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="users" 
                                stroke="#8b5cf6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorUsers)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 5. AUDIT LOGS */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4">🛡️ Security Audit Logs</h3>
                <AuditLogViewer />
            </div>
        </div>
    );
};

// Reusable Card with Fixed Colors to avoid Tailwind purging issues
const StatCard = ({ title, value, icon, color }) => {
    const colorMap = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/50",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/50",
        green: "text-green-400 bg-green-500/10 border-green-500/20 group-hover:border-green-500/50"
    };

    const activeColor = colorMap[color] || colorMap.blue;

    return (
        <div className={`bg-[#1a1a1a] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
            {/* Glow Blob */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 blur-xl transition-all opacity-20 group-hover:opacity-40 ${color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{value}</h3>
                </div>
                <div className={`text-2xl p-3 rounded-xl border ${activeColor} backdrop-blur-sm`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;