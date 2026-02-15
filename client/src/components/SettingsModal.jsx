import React, { useState } from 'react';

const SettingsModal = ({ isOpen, onClose, user, onSaveSettings }) => {
    // Initialize State
    const [activeTab, setActiveTab] = useState('editor');
    const [theme, setTheme] = useState(localStorage.getItem('editor-theme') || 'dracula');
    const [fontSize, setFontSize] = useState(localStorage.getItem('editor-font-size') || 16);
    const [fontFamily, setFontFamily] = useState(localStorage.getItem('editor-font-family') || 'monospace');
    const [wrapText, setWrapText] = useState(localStorage.getItem('editor-wrap') === 'true');

    // Account State
    const [username, setUsername] = useState(user?.username || '');

    if (!isOpen) return null;

    const handleSave = () => {
        console.log("💾 SAVE BUTTON CLICKED! Sending data:", { theme, fontSize, fontFamily, wrapText });
        
        // Save to LocalStorage
        localStorage.setItem('editor-theme', theme);
        localStorage.setItem('editor-font-size', fontSize);
        localStorage.setItem('editor-font-family', fontFamily);
        localStorage.setItem('editor-wrap', wrapText);

        // ✅ CRITICAL: This function must exist!
        if (onSaveSettings) {
            onSaveSettings({ theme, fontSize, fontFamily, wrapText, username });
            onClose(); // Close only if save was successful
        } else {
            console.error("❌ ERROR: onSaveSettings function is missing!");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-[#1e1e1e] w-[600px] h-[500px] rounded-xl border border-gray-700 shadow-2xl flex overflow-hidden">
                
                {/* --- SIDEBAR --- */}
                <div className="w-1/3 bg-[#252526] border-r border-gray-700 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        ⚙️ Settings
                    </h2>
                    <button 
                        onClick={() => setActiveTab('editor')}
                        className={`text-left px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                    >
                        🎨 Editor
                    </button>
                    <button 
                        onClick={() => setActiveTab('account')}
                        className={`text-left px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'account' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
                    >
                        👤 Account
                    </button>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="flex-1 p-6 flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                        
                        {/* EDITOR SETTINGS */}
                        {activeTab === 'editor' && (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Color Theme</label>
                                    <select 
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        className="w-full bg-[#333] text-white p-2 rounded border border-gray-600 outline-none focus:border-blue-500"
                                    >
                                        <option value="dracula">🧛 Dracula (Dark)</option>
                                        <option value="vs-dark">🌑 VS Code Dark</option>
                                        <option value="light">☀️ Light Mode</option>
                                        <option value="monokai">🎨 Monokai</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Font Size ({fontSize}px)</label>
                                    <input 
                                        type="range" 
                                        min="12" 
                                        max="32" 
                                        value={fontSize} 
                                        onChange={(e) => setFontSize(e.target.value)}
                                        className="w-full accent-blue-500 cursor-pointer" 
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Font Family</label>
                                    <select 
                                        value={fontFamily}
                                        onChange={(e) => setFontFamily(e.target.value)}
                                        className="w-full bg-[#333] text-white p-2 rounded border border-gray-600 outline-none focus:border-blue-500 font-mono"
                                    >
                                        <option value="monospace">Default Monospace</option>
                                        <option value="'Fira Code', monospace">Fira Code (Ligatures)</option>
                                        <option value="'Courier New', monospace">Courier New</option>
                                        <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="text-gray-400 text-sm font-bold">Word Wrap</label>
                                    <input 
                                        type="checkbox" 
                                        checked={wrapText} 
                                        onChange={(e) => setWrapText(e.target.checked)}
                                        className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ACCOUNT SETTINGS */}
                        {activeTab === 'account' && (
                            <div className="flex flex-col gap-6">
                                <div className="bg-yellow-500/10 border border-yellow-500/50 p-3 rounded text-yellow-200 text-xs">
                                    Note: Changing email/password requires backend integration.
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-xs uppercase font-bold mb-2">Display Name</label>
                                    <input 
                                        type="text" 
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-[#333] text-white p-2 rounded border border-gray-600 outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER BUTTONS */}
                    <div className="pt-4 border-t border-gray-700 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold shadow-lg">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;