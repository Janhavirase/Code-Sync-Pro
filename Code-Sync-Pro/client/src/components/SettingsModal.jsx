import React, { useState } from 'react';
import { Lock, Mail, User, ShieldAlert, LogOut, Key } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose, user, onSaveSettings, onUpdatePassword, onLogout }) => {
    // --- General State ---
    const [activeTab, setActiveTab] = useState('editor');
    
    // --- Editor State ---
    const [theme, setTheme] = useState(localStorage.getItem('editor-theme') || 'dracula');
    const [fontSize, setFontSize] = useState(localStorage.getItem('editor-font-size') || 16);
    const [fontFamily, setFontFamily] = useState(localStorage.getItem('editor-font-family') || 'monospace');
    const [wrapText, setWrapText] = useState(localStorage.getItem('editor-wrap') === 'true');

    // --- Account State ---
    const [username, setUsername] = useState(user?.username || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    if (!isOpen) return null;

    const handleSaveGeneral = () => {
        // Save Editor Settings to LocalStorage
        localStorage.setItem('editor-theme', theme);
        localStorage.setItem('editor-font-size', fontSize);
        localStorage.setItem('editor-font-family', fontFamily);
        localStorage.setItem('editor-wrap', wrapText);

        if (onSaveSettings) {
            onSaveSettings({ theme, fontSize, fontFamily, wrapText, username });
            onClose(); 
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            return setPasswordError('All password fields are required.');
        }
        if (newPassword !== confirmPassword) {
            return setPasswordError('New passwords do not match.');
        }
        if (newPassword.length < 6) {
            return setPasswordError('New password must be at least 6 characters.');
        }

        if (onUpdatePassword) {
            // Trigger the backend call passed via props
            await onUpdatePassword(currentPassword, newPassword);
            // Clear fields on success
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[#1e1e1e] w-[650px] h-[550px] rounded-xl border border-gray-700 shadow-2xl flex overflow-hidden">
                
                {/* --- SIDEBAR --- */}
                <div className="w-1/3 bg-[#252526] border-r border-gray-700 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 tracking-tight">
                        <span className="text-indigo-500">⚙️</span> Settings
                    </h2>
                    
                    <button 
                        onClick={() => setActiveTab('editor')}
                        className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'editor' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                    >
                        🎨 Editor
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('account')}
                        className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${activeTab === 'account' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                    >
                        <ShieldAlert size={16} /> Account
                    </button>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
                    
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        
                        {/* 🎨 EDITOR SETTINGS */}
                        {activeTab === 'editor' && (
                            <div className="flex flex-col gap-6 animate-fadeIn">
                                <h3 className="text-white text-lg font-bold mb-2">Editor Preferences</h3>
                                
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Color Theme</label>
                                    <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full bg-[#2a2a2a] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 transition-colors">
                                        <option value="dracula">🧛 Dracula (Dark)</option>
                                        <option value="vs-dark">🌑 VS Code Dark</option>
                                        <option value="light">☀️ Light Mode</option>
                                        <option value="monokai">🎨 Monokai</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Font Size ({fontSize}px)</label>
                                    <input type="range" min="12" max="32" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-indigo-500 cursor-pointer" />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider">Font Family</label>
                                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full bg-[#2a2a2a] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 transition-colors font-mono">
                                        <option value="monospace">Default Monospace</option>
                                        <option value="'Fira Code', monospace">Fira Code (Ligatures)</option>
                                        <option value="'Courier New', monospace">Courier New</option>
                                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-[#2a2a2a] rounded-lg border border-[#444]">
                                    <span className="text-gray-300 text-sm font-bold">Enable Word Wrap</span>
                                    <input type="checkbox" checked={wrapText} onChange={(e) => setWrapText(e.target.checked)} className="w-5 h-5 accent-indigo-500 rounded cursor-pointer" />
                                </div>
                            </div>
                        )}

                        {/* 🔒 ACCOUNT SETTINGS */}
                        {activeTab === 'account' && (
                            <div className="flex flex-col gap-8 animate-fadeIn">
                                
                                {/* Profile Info */}
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-4 border-b border-[#333] pb-2">Profile Information</h3>
                                    
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider flex items-center gap-2"><Mail size={14}/> Email Address (Read Only)</label>
                                            <input disabled type="email" value={user?.email || 'user@example.com'} className="w-full bg-[#181818] text-gray-500 p-2.5 rounded-lg border border-[#333] cursor-not-allowed opacity-70" />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-xs uppercase font-bold mb-2 tracking-wider flex items-center gap-2"><User size={14}/> Display Name</label>
                                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-[#2a2a2a] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {/* Secure Password Update */}
                                <div>
                                    <h3 className="text-white text-lg font-bold mb-4 border-b border-[#333] pb-2 flex items-center gap-2">
                                        <Key size={18} className="text-yellow-500" /> Security
                                    </h3>
                                    
                                    <form onSubmit={handlePasswordSubmit} className="bg-[#252526] p-4 rounded-xl border border-[#444] flex flex-col gap-4">
                                        {passwordError && (
                                            <div className="p-2 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-xs font-medium">
                                                {passwordError}
                                            </div>
                                        )}
                                        
                                        <div>
                                            <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 text-sm" />
                                        </div>
                                        <div className="flex gap-3">
                                            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 text-sm" />
                                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-[#1e1e1e] text-white p-2.5 rounded-lg border border-[#444] outline-none focus:border-indigo-500 text-sm" />
                                        </div>
                                        <button type="submit" className="self-start px-4 py-2 bg-[#333] hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors border border-[#555] hover:border-indigo-500">
                                            Update Password
                                        </button>
                                    </form>
                                </div>

                                {/* Danger Zone */}
                                <div>
                                    <h3 className="text-red-400 text-lg font-bold mb-4 border-b border-red-900/50 pb-2">Danger Zone</h3>
                                    <div className="bg-red-950/20 p-4 rounded-xl border border-red-900/50 flex items-center justify-between">
                                        <div>
                                            <div className="text-white text-sm font-bold">Log Out of Session</div>
                                            <div className="text-gray-500 text-xs mt-1">Clear local data and return to login screen.</div>
                                        </div>
                                        <button onClick={onLogout} className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-500/30 flex items-center gap-2">
                                            <LogOut size={14} /> Log Out
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* FOOTER BUTTONS (Only applies to general settings) */}
                    <div className="p-4 border-t border-[#333] bg-[#1e1e1e] shrink-0 flex justify-end gap-3 z-10">
                        <button onClick={onClose} className="px-5 py-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg text-sm font-bold transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSaveGeneral} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-lg transition-colors">
                            Save Preferences
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;