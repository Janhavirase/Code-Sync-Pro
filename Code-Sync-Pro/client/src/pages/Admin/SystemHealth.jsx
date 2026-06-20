import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import apiClient from '../../api.js';
const SystemHealth = () => {
    const [health, setHealth] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // --- FETCH HEALTH DATA ---
    const fetchHealth = async () => {
        try {
            // ✅ PRODUCTION FIX: Using apiClient
            // The interceptor automatically attaches the necessary auth headers
            const res = await apiClient.get('/api/admin/health');
            setHealth(res.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Health Check Failed:", err);
            // Optionally suppress errors here since this runs every 3 seconds
        }
    };

    // Auto-Refresh every 3 seconds (Live Monitoring)
    useEffect(() => {
        fetchHealth(); // Initial fetch
        const interval = setInterval(fetchHealth, 3000); 
        return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    // Helper: Format Seconds into HH:MM:SS
    const formatUptime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    if (!health) return (
        <div className="flex items-center justify-center h-screen text-blue-400 animate-pulse">
            INITIALIZING SYSTEM DIAGNOSTICS...
        </div>
    );

    // Chart Data
    const memoryData = [
        { name: 'Used RAM (Node)', value: parseFloat(health.memory.used), color: '#F87171' }, // Red
        { name: 'Free/System', value: (parseFloat(health.memory.total) * 1024) - parseFloat(health.memory.used), color: '#34D399' } // Green
    ];

    return (
        <div className="animate-fadeIn min-h-screen p-2 text-white">
            
            {/* HEADER */}
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                        System Health Matrix
                    </h1>
                    <p className="text-gray-400 text-sm font-mono">
                        LIVE MONITORING • NODE.JS RUNTIME • OS KERNEL
                    </p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                        <span className="text-emerald-400 font-bold text-sm">SYSTEM ONLINE</span>
                    </div>
                    <p className="text-gray-600 text-xs font-mono mt-1">Last Sync: {lastUpdated.toLocaleTimeString()}</p>
                </div>
            </div>

            {/* GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. UPTIME CARD (The Heartbeat) */}
                <div className="bg-[#121212]/80 border border-emerald-500/30 p-8 rounded-3xl shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    </div>
                    <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Server Uptime</h3>
                    <div className="text-4xl font-mono font-bold text-white tracking-tighter">
                        {formatUptime(health.uptime)}
                    </div>
                    <p className="text-gray-500 text-xs mt-4">Continuous operation without restart.</p>
                </div>

                {/* 2. MEMORY PIE CHART */}
                <div className="bg-[#121212]/80 border border-blue-500/30 p-6 rounded-3xl shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col items-center justify-center relative">
                     <h3 className="absolute top-6 left-6 text-blue-400 font-bold text-sm uppercase tracking-widest">Memory Allocation</h3>
                     <div className="w-full h-40 mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={memoryData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} 
                                    outerRadius={60} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {memoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#111', borderColor: '#333', borderRadius: '8px'}} itemStyle={{color: '#fff'}} />
                            </PieChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="text-center mt-[-10px]">
                        <p className="text-2xl font-bold text-white">{health.memory.used}</p>
                        <p className="text-xs text-gray-500">Used of {health.memory.total}</p>
                     </div>
                </div>

                {/* 3. OS SPECIFICATIONS (The "Metal") */}
                <div className="bg-[#121212]/80 border border-purple-500/30 p-8 rounded-3xl shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden">
                    <h3 className="text-purple-400 font-bold text-sm uppercase tracking-widest mb-6">Host Environment</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-500 text-xs">OS Platform</span>
                            <span className="text-white font-mono text-sm">{health.os.platform} ({health.os.type})</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-500 text-xs">CPU Cores</span>
                            <span className="text-white font-mono text-sm">{health.os.cores} Cores</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-500 text-xs">Process ID</span>
                            <span className="text-white font-mono text-sm">{health.os.pid}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs">Node Version</span>
                            <span className="text-white font-mono text-sm">{health.os.version}</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SystemHealth;