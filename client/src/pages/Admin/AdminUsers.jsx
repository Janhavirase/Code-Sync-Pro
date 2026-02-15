import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        // Fetch stats from your new backend route
        fetch('http://127.0.0.1:5000/api/admin/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err));
    }, []);

    if (!stats) return <div className="text-white">Loading Admin Matrix...</div>;

    return (
        <div className="animate-fadeIn">
            <h1 className="text-3xl font-bold mb-8">Overview</h1>
            
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
                <StatCard title="Active Projects" value={stats.totalProjects} icon="💻" color="purple" />
                <StatCard title="Library Items" value={stats.totalTemplates} icon="📚" color="green" />
            </div>

            {/* CHART SECTION */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    📈 <span className="text-gray-300">Growth Analytics</span>
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.graphData}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="users" stroke="#8884d8" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Simple reusable card component
const StatCard = ({ title, value, icon, color }) => (
    <div className={`bg-[#1a1a1a] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:bg-${color}-500/20 transition-all`}></div>
        <div className="flex justify-between items-start relative z-10">
            <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wider">{title}</p>
                <h3 className="text-4xl font-bold text-white mt-1">{value}</h3>
            </div>
            <div className={`text-3xl bg-${color}-500/20 p-3 rounded-xl`}>{icon}</div>
        </div>
    </div>
);

export default AdminDashboard;