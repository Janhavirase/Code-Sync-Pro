import React, { useState } from 'react';
import toast from 'react-hot-toast';

const DeployModal = ({ project, onClose ,files,onSuccess}) => {
    // 1. New States for Form
    const [status, setStatus] = useState('idle'); 
    const [repoUrl, setRepoUrl] = useState('');
    const [deployName, setDeployName] = useState(project.title || "");
    const [deployDesc, setDeployDesc] = useState("Shipped via CodeSync 🚀");
// 1. Add this state at the top of DeployModal
const [isPrivate, setIsPrivate] = useState(false);
   const handleDeploy = async () => {
    if (!deployName.trim()) return toast.error("Please name your repository");
     // ✨ 1. Grab the token from local storage!
        const token = localStorage.getItem('github_token');
    setStatus('deploying');
    try {
        console.log("🚀 Data being sent:", { 
    title: deployName, 
    token: token ? "Exists" : "MISSING", 
    filesCount: files?.length 
});
        const res = await fetch('http://127.0.0.1:5000/api/deploy/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                title: deployName,
                desc: deployDesc,
                isPrivate: isPrivate,
                code: project.code,
                language: project.language,
                roomId: project.roomId, // ✅ Added: This is crucial for the MongoDB update
                files: files
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            setRepoUrl(data.repoUrl);
            setStatus('success');
            if (onSuccess) onSuccess(data.repoUrl); // Passes URL to EditorPage
            toast.success("Shipped to GitHub! 🚀");
        } else {
            // ✅ Fixed: The 'else' now correctly belongs to the 'if (res.ok...)'
            
            throw new Error(data.error || "Deployment failed");
        }
    } catch (err) {
        console.error("Deployment Error:", err);
        toast.error(err.message);
        setStatus('idle');
    }
};

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-3xl p-8 shadow-2xl">
                
                {status === 'idle' && (
                    <div className="flex flex-col gap-4">
                        <div className="text-3xl text-center">🚢</div>
                        <h2 className="text-xl font-bold text-white text-center">Configure Deployment</h2>
                        
                        <div className="space-y-4 text-left">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Repo Name</label>
                                <input 
                                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500"
                                    value={deployName}
                                    onChange={(e) => setDeployName(e.target.value)}
                                    placeholder="my-cool-project"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold">Description (Optional)</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-blue-500 h-20 resize-none"
                                    value={deployDesc}
                                    onChange={(e) => setDeployDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-xl">
    <div className="flex flex-col">
        <span className="text-xs font-bold text-white">Private Repository</span>
        <span className="text-[10px] text-gray-500">Only you can see this repo</span>
    </div>
    <button 
        type="button"
        onClick={() => setIsPrivate(!isPrivate)}
        className={`w-12 h-6 rounded-full transition-colors relative ${isPrivate ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isPrivate ? 'left-7' : 'left-1'}`} />
    </button>
</div>
                        </div>

                        <button onClick={handleDeploy} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20">🚀 Push to GitHub</button>
                        <button onClick={onClose} className="text-gray-500 text-sm hover:text-white">Cancel</button>
                    </div>
                )}

                {status === 'deploying' && (
                    <div className="py-10 flex flex-col items-center gap-6">
                        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="text-center">
                            <p className="text-white font-bold animate-pulse">Creating {deployName}...</p>
                            <p className="text-xs text-gray-500 mt-2">Communicating with GitHub REST API</p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6 text-center">
                        <div className="text-4xl">🎉</div>
                        <h2 className="text-xl font-bold text-white">Live on GitHub!</h2>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 truncate">
                            <a href={repoUrl} target="_blank" rel="noreferrer" className="text-blue-400 text-sm font-mono underline">{repoUrl}</a>
                        </div>
                        <button onClick={onClose} className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-xl transition-colors">Finish</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeployModal;