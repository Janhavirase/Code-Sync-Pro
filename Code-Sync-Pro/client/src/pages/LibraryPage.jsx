import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import apiClient from '../api.js';

// ✅ OFFICIAL TEMPLATES
const OFFICIAL_TEMPLATES = [
    {
        id: 1,
        title: 'React + Vite Starter',
        desc: 'Production-ready React setup with Tailwind CSS configured.',
        language: 'javascript',
        type: 'official',
        files: [
            { name: 'App.jsx', language: 'javascript', value: 'import React from "react";\n\nexport default function App() {\n  return (\n    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">\n      <div className="text-center">\n        <h1 className="text-4xl font-bold mb-4">🚀 Hello React</h1>\n        <p className="text-gray-400">Edit App.jsx to get started.</p>\n      </div>\n    </div>\n  );\n}' },
            { name: 'index.css', language: 'css', value: '@tailwind base;\n@tailwind components;\n@tailwind utilities;' }
        ]
    },
    {
        id: 2,
        title: 'Node.js Express API',
        desc: 'Scalable REST API boilerplate with error handling and route structure.',
        language: 'javascript',
        type: 'official',
        files: [
            { name: 'server.js', language: 'javascript', value: 'const express = require("express");\nconst app = express();\nconst PORT = process.env.PORT || 5000;\n\n// Middleware\napp.use(express.json());\n\n// Routes\napp.get("/", (req, res) => {\n    res.json({ status: "success", message: "API is running 🚀" });\n});\n\napp.listen(PORT, () => console.log(`Server running on port ${PORT}`));' }
        ]
    },
    {
        id: 3,
        title: 'Python Data Science',
        desc: 'Setup for data analysis with CSV parsing and basic statistics.',
        language: 'python',
        type: 'official',
        files: [
            { name: 'analysis.py', language: 'python', value: 'import csv\n\ndef analyze_data(file_path):\n    print("Analyzing data...")' }
        ]
    },
     {
        id: 4,
        title: 'C++ Competitive Prog',
        desc: 'Optimized boilerplate for CP with fast I/O and common macros.',
        language: 'cpp',
        type: 'official',
        files: [
            { name: 'main.cpp', language: 'cpp', value: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    cout << "Ready" << endl;\n    return 0;\n}' }
        ]
    },
    {
        id: 5,
        title: 'HTML5 Modern Grid',
        desc: 'Responsive landing page layout using CSS Grid and Flexbox.',
        language: 'html',
        type: 'official',
        files: [
            { name: 'index.html', language: 'html', value: '<!DOCTYPE html>\n<html>\n<body>\n  <div class="grid"></div>\n</body>\n</html>' },
            { name: 'style.css', language: 'css', value: '.grid { display: grid; gap: 1rem; }' }
        ]
    }
];

const LibraryPage = () => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [templates, setTemplates] = useState(() => {
        const saved = localStorage.getItem('codeSync_userTemplates');
        return saved ? [...OFFICIAL_TEMPLATES, ...JSON.parse(saved)] : OFFICIAL_TEMPLATES;
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); 
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [activeFileIndex, setActiveFileIndex] = useState(0);

    // --- WIZARD STATE ---
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [contributionStep, setContributionStep] = useState(1); // 1 or 2
    
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');
    const [newTemplateCode, setNewTemplateCode] = useState('');
    const [newTemplateLang, setNewTemplateLang] = useState('javascript');

    // ✅ NEW FUNCTIONALITY: Fetch Live Approved Data from Backend
    useEffect(() => {
        const fetchCommunityLibrary = async () => {
            try {
                // ✅ PRODUCTION FIX: Using apiClient
                const res = await apiClient.get('/api/library');
                
                // Map MongoDB _id to frontend id
                const dbTemplates = res.data.map(item => ({
                    ...item,
                    id: item._id, // React needs 'id', MongoDB gives '_id'
                    type: 'community'
                }));

                // Update state: Official + Database items
                setTemplates([...OFFICIAL_TEMPLATES, ...dbTemplates]);
            } catch (err) {
                console.error("Failed to load community templates:", err);
                toast.error("Could not connect to library server");
            }
        };

        fetchCommunityLibrary();
    }, []);

    // ✅ HELPER: Get correct filename based on language
    const getFileName = (lang) => {
        switch(lang) {
            case 'html': return 'index.html';
            case 'java': return 'Main.java';
            case 'python': return 'main.py';
            case 'cpp': return 'main.cpp';
            case 'javascript': default: return 'main.js';
        }
    };

    // --- ACTIONS ---
    const handleUseTemplate = (template) => {
        const roomId = uuidv4();
        navigate(`/editor/${roomId}`, { state: { templateFiles: template.files } });
        toast.success(`🚀 Started project: ${template.title}`);
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success("Copied to clipboard! 📋");
    };

    const handleNextStep = () => {
        if (!newTemplateName.trim()) return toast.error("Please enter a template name");
        setContributionStep(2); // Slide to Editor
    };

   const handleSaveTemplate = async () => {
        // 1. Get User ID
        const savedUser = JSON.parse(localStorage.getItem('userInfo'));
        const userId = savedUser?.user?._id || savedUser?._id;

        // 2. Validation
        if (!newTemplateName || !newTemplateCode) {
            return toast.error("Please fill in the Name and Code");
        }

        if (!userId) {
            return toast.error("User not found. Please log in again.");
        }

        try {
            // ✅ FIX 1: Format Data to match 'Library' Schema
            const templateData = {
                title: newTemplateName,
                desc: newTemplateDesc || "No description",
                roomId: uuidv4(), // Generate a unique ID for the project
                files: [
                    { 
                        name: getFileName(newTemplateLang), 
                        language: newTemplateLang, 
                        value: newTemplateCode 
                    }
                ],
                userId: userId
            };

            console.log("🚀 Sending to MongoDB:", templateData);

            // ✅ FIX 2: Point to the Correct Route (/api/library) using apiClient
            await apiClient.post('/api/library', templateData);

            toast.success("Contribution Sent for Approval! 🕒");
            
            // Reset form
            setIsCreateModalOpen(false);
            setNewTemplateName('');
            setNewTemplateDesc('');
            setNewTemplateCode('');
            setContributionStep(1);
        } catch (err) {
            console.error("Save Error:", err);
            toast.error("Server connection failed");
        }
    };
    const filteredTemplates = templates.filter(t => 
        (activeTab === 'all' || t.type === activeTab) &&
        (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.language.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#121212] text-white font-sans selection:bg-blue-500/30">
            
            {/* NAVBAR */}
            <nav className="h-16 border-b border-[#333] bg-[#1e1e1e]/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg">C</div>
                    <span className="font-bold text-lg tracking-tight">CodeSync <span className="text-gray-500 font-normal">Library</span></span>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm font-medium">Dashboard</button>
                    <div className="w-px h-5 bg-[#333] my-auto"></div>
                    <button onClick={() => { setIsCreateModalOpen(true); setContributionStep(1); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all hover:scale-105">
                        <span>+</span> Contribute
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-8">
                {/* HERO */}
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text drop-shadow-sm">Code Library</h1>
                    <p className="text-gray-400 text-lg">Browse, copy, or start projects from community templates.</p>
                </div>

                {/* SEARCH & TABS */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                    <input type="text" placeholder="Search templates..." className="w-full md:w-96 bg-[#1e1e1e] border border-[#333] px-4 py-3 rounded-xl text-sm text-white focus:border-blue-500 outline-none transition-all shadow-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <div className="flex bg-[#1e1e1e] p-1 rounded-xl border border-[#333]">
                        {['all', 'official', 'community'].map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-[#333] text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>{tab}</button>
                        ))}
                    </div>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                        <div key={template.id} className="group bg-[#1e1e1e] border border-[#333] rounded-2xl p-6 hover:border-blue-500/30 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`text-[10px] font-black tracking-wider px-2 py-1 rounded uppercase border ${template.type === 'official' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{template.type}</div>
                                <div className="w-8 h-8 rounded-full bg-[#252526] flex items-center justify-center border border-[#333]"><span className="text-lg">{template.language === 'javascript' ? '⚡' : template.language === 'python' ? '🐍' : '📄'}</span></div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-100 mb-2 group-hover:text-blue-400 transition-colors">{template.title}</h3>
                            <p className="text-gray-500 text-sm leading-relaxed mb-6 line-clamp-2 flex-1">{template.desc}</p>
                            <div className="flex gap-3 pt-4 border-t border-[#2a2a2a]">
                                <button onClick={() => { setSelectedTemplate(template); setActiveFileIndex(0); }} className="flex-1 bg-[#252526] hover:bg-[#333] text-gray-300 py-2.5 rounded-lg text-xs font-bold border border-[#333]">View Code</button>
                                <button onClick={() => handleUseTemplate(template)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-bold shadow-lg">Use Template</button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* --- PREVIEW MODAL --- */}
            {selectedTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e1e1e] w-full max-w-4xl h-[85vh] rounded-2xl border border-[#333] shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-[#333] bg-[#252526]">
                            <h2 className="text-xl font-bold text-white">{selectedTemplate.title}</h2>
                            <button onClick={() => setSelectedTemplate(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-64 border-r border-[#333] bg-[#181818] flex flex-col p-2">
                                {selectedTemplate.files.map((file, index) => (
                                    <button key={index} onClick={() => setActiveFileIndex(index)} className={`w-full text-left px-4 py-3 text-sm rounded ${activeFileIndex === index ? 'bg-[#2a2a2a] text-blue-400' : 'text-gray-400 hover:text-white'}`}>{file.name}</button>
                                ))}
                            </div>
                            <div className="flex-1 bg-[#1e1e1e] p-6 overflow-auto">
                                <div className="flex justify-end mb-2"><button onClick={() => copyCode(selectedTemplate.files[activeFileIndex].value)} className="text-xs bg-[#333] px-2 py-1 rounded text-white hover:bg-[#444]">Copy</button></div>
                                <pre className="text-sm font-mono text-gray-300"><code>{selectedTemplate.files[activeFileIndex].value}</code></pre>
                            </div>
                        </div>
                        <div className="p-4 border-t border-[#333] bg-[#252526] flex justify-end">
                            <button onClick={() => handleUseTemplate(selectedTemplate)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-lg">Open in Editor 🚀</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ✅ CONTRIBUTION WIZARD MODAL --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1e1e1e] w-full max-w-2xl rounded-2xl border border-[#333] shadow-2xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
                        
                        {/* Header */}
                        <div className="p-6 border-b border-[#333] flex justify-between items-center bg-[#252526]">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Contribute Template</h2>
                                <p className="text-xs text-gray-400 mt-1">Step {contributionStep} of 2</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        {/* Content Area (Slides) */}
                        <div className="flex-1 relative overflow-hidden">
                            {/* STEP 1: DETAILS */}
                            <div className={`absolute inset-0 p-8 transition-transform duration-500 ease-in-out ${contributionStep === 1 ? 'translate-x-0' : '-translate-x-full'}`}>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Template Name</label>
                                        <input 
                                            className="w-full bg-[#121212] border border-[#333] p-4 rounded-xl text-white focus:border-blue-500 outline-none transition-colors text-lg"
                                            placeholder="e.g. Dijkstra Algorithm"
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                            autoFocus={contributionStep === 1}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Language</label>
                                        <select 
                                            value={newTemplateLang} 
                                            onChange={(e) => setNewTemplateLang(e.target.value)}
                                            className="w-full bg-[#121212] border border-[#333] p-4 rounded-xl text-white focus:border-blue-500 outline-none"
                                        >
                                            <option value="javascript">JavaScript</option>
                                            <option value="python">Python</option>
                                            <option value="cpp">C++</option>
                                            <option value="java">Java</option>
                                            <option value="html">HTML</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description</label>
                                        <textarea 
                                            className="w-full bg-[#121212] border border-[#333] p-4 rounded-xl text-white focus:border-blue-500 outline-none resize-none h-32"
                                            placeholder="What does this code do?"
                                            value={newTemplateDesc}
                                            onChange={(e) => setNewTemplateDesc(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2: CODE EDITOR */}
                            <div className={`absolute inset-0 flex flex-col transition-transform duration-500 ease-in-out ${contributionStep === 2 ? 'translate-x-0' : 'translate-x-full'}`}>
                                <div className="bg-[#181818] px-6 py-2 border-b border-[#333] flex justify-between items-center">
                                    <span className="text-xs text-blue-400 font-mono">{getFileName(newTemplateLang)}</span>
                                    <span className="text-xs text-gray-500">Editor Mode</span>
                                </div>
                                <textarea 
                                    className="flex-1 w-full bg-[#121212] p-6 text-gray-300 font-mono text-sm outline-none resize-none leading-relaxed"
                                    placeholder={`// Paste your ${newTemplateLang} code here...`}
                                    value={newTemplateCode}
                                    onChange={(e) => setNewTemplateCode(e.target.value)}
                                    autoFocus={contributionStep === 2}
                                    spellCheck="false"
                                />
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-6 border-t border-[#333] bg-[#252526] flex justify-between items-center">
                            {contributionStep === 1 ? (
                                <>
                                    <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white text-sm font-medium">Cancel</button>
                                    <button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                                        Next Step ➡️
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setContributionStep(1)} className="text-gray-400 hover:text-white text-sm font-medium">⬅ Back</button>
                                    <button onClick={handleSaveTemplate} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                                        💾 Save to Library
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LibraryPage;