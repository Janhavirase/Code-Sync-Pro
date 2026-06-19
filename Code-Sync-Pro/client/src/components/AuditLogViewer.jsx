import React, { useEffect, useState } from 'react';
import apiClient from '../api.js';
const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            // ✅ FIX: Safe Access to User ID
            const userInfoStr = localStorage.getItem('userInfo');
            
            if (!userInfoStr) {
                console.warn("AuditLogs: No user info found.");
                return;
            }

            const userInfo = JSON.parse(userInfoStr);
            // Handle both structure types: { user: { _id: ... } } OR { _id: ... }
            const userId = userInfo?.user?._id || userInfo?._id;

            if (!userId) {
                console.error("AuditLogs: User ID missing.");
                return;
            }

        try {
                // apiClient handles the base URL automatically
                // We assume you have a request interceptor in api.js that adds auth tokens
                const response = await apiClient.get('/api/admin/audit-logs');
                
                if (Array.isArray(response.data)) {
                    setLogs(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch logs:", err);
                toast.error("Failed to load audit logs");
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    // Color code actions
    const getActionColor = (action) => {
        if (!action) return 'text-gray-400';
        if (action.includes('DELETE')) return 'text-red-400';
        if (action.includes('APPROVE')) return 'text-green-400';
        if (action.includes('BROADCAST')) return 'text-yellow-400';
        return 'text-blue-400';
    };

    return (
        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl overflow-hidden font-mono text-xs md:text-sm shadow-2xl h-full min-h-[300px]">
            {/* Fake Terminal Header */}
            <div className="bg-[#1a1a1a] px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <span className="text-gray-500 ml-2 text-xs">secure_audit_logs.log</span>
            </div>

            {/* Logs List */}
            <div className="p-4 h-64 overflow-y-auto space-y-2 scrollbar-hide">
                {logs.length === 0 ? (
                    <div className="text-gray-600 italic p-4">Waiting for system activity...</div>
                ) : (
                    logs.map((log) => (
                        <div key={log._id} className="flex flex-col md:flex-row gap-1 md:gap-3 border-l-2 border-gray-800 pl-3 hover:border-blue-500 transition-colors">
                            <span className="text-gray-500 shrink-0 opacity-50 text-[10px] md:text-xs">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-purple-400 font-bold shrink-0">
                                {log.adminName}@root:~$
                            </span>
                            <span className={`${getActionColor(log.action)} font-bold shrink-0`}>
                                {log.action}
                            </span>
                            <span className="text-gray-300 break-all">
                                {log.target} {log.details && <span className="text-gray-500">// {log.details}</span>}
                            </span>
                        </div>
                    ))
                )}
                {/* Blinking Cursor */}
                <div className="animate-pulse text-green-500 mt-2">_</div>
            </div>
        </div>
    );
};

export default AuditLogViewer;