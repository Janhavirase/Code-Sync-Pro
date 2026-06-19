import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { initSocket } from '../socket';
import apiClient from '../api.js';

const SystemControlPanel = () => {
    const [config, setConfig] = useState({
        allowSignups: true,
        maintenanceMode: false,
        enableCompiler: true
    });
    const [loading, setLoading] = useState(false);

    // Fetch initial state
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // ✅ PRODUCTION FIX: Using apiClient (x-user-id handled by interceptor)
                const res = await apiClient.get('/api/admin/config');
                setConfig(res.data);
            } catch (err) {
                console.error("Failed to fetch config:", err);
            }
        };
        fetchConfig();
    }, []);

    const toggleSetting = async (key) => {
        const newValue = !config[key];
        const newConfig = { ...config, [key]: newValue };
        
        // Optimistic UI Update
        setConfig(newConfig);
        setLoading(true);

        try {
            // ✅ PRODUCTION FIX: Using apiClient
            const res = await apiClient.put('/api/admin/config', newConfig);

            if (res.status === 200) {
                toast.success(`${key} updated to ${newValue ? 'ON' : 'OFF'}`);
                
                // 📡 NOTIFY EVERYONE VIA SOCKET
                const socket = await initSocket();
                socket.emit('admin:configUpdate', newConfig);
            } else {
                throw new Error("Failed to save");
            }
        } catch (err) {
            toast.error("Update failed, reverting...");
            setConfig(config); // Revert
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                🎛️ System Controls <span className="text-xs font-normal text-gray-500">(Real-time Flags)</span>
            </h3>

            <div className="space-y-6">
                
                {/* TOGGLE 1: SIGNUPS */}
                <ToggleRow 
                    label="Allow New Signups" 
                    desc="If disabled, new users cannot register."
                    isOn={config.allowSignups}
                    onToggle={() => toggleSetting('allowSignups')}
                    color="blue"
                />

                {/* TOGGLE 2: COMPILER */}
                <ToggleRow 
                    label="Code Execution Engine" 
                    desc="Enable/Disable the 'Run Code' button globally."
                    isOn={config.enableCompiler}
                    onToggle={() => toggleSetting('enableCompiler')}
                    color="green"
                />

                {/* TOGGLE 3: MAINTENANCE */}
                <ToggleRow 
                    label="Maintenance Mode" 
                    desc="Lock the DB. Only Admins can make changes."
                    isOn={config.maintenanceMode}
                    onToggle={() => toggleSetting('maintenanceMode')}
                    color="red"
                    danger
                />

            </div>
        </div>
    );
};

// Reusable Toggle Component
const ToggleRow = ({ label, desc, isOn, onToggle, color, danger }) => (
    <div className="flex justify-between items-center">
        <div>
            <h4 className={`font-bold ${danger ? 'text-red-400' : 'text-gray-200'}`}>{label}</h4>
            <p className="text-xs text-gray-500">{desc}</p>
        </div>
        <button 
            onClick={onToggle}
            className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${
                isOn 
                ? (color === 'red' ? 'bg-red-500' : color === 'green' ? 'bg-green-500' : 'bg-blue-600') 
                : 'bg-gray-700'
            }`}
        >
            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform duration-300 ${isOn ? 'translate-x-6' : ''}`}></div>
        </button>
    </div>
);

export default SystemControlPanel;