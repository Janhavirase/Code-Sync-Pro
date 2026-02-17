import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ACTIONS } from '../Actions';
import ClientAvatar from '../components/ClientAvatar';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import Peer from 'simple-peer';
import Chat from '../components/Chat';
import QRCode from 'react-qr-code';
import ShareSnippetModal from '../components/ShareSnippetModal';
import CommentsPanel from '../components/CommentsPanel';
import AIAnalysisPanel from '../components/AIAnalysisPanel';
import Whiteboard from '../components/Whiteboard';
import VideoChat from '../components/VideoChat';
import SettingsModal from '../components/SettingsModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import DeployModal from '../components/DeployModal';
import { 
    Files, Users, MessageSquare, Bot, MessageCircle, 
    Settings, Play, Loader2, Download, Share2, 
    ChevronLeft, Plus, Trash2, Hash,UserPlus
} from 'lucide-react';
// ✅ IMPORT CUSTOM HOOKS
import useEditorLayout from '../hooks/useEditorLayout';
import useFileSystem from '../hooks/useFileSystem';
import useCodeRunner from '../hooks/useCodeRunner';

const EditorPage = () => {
    // --- 1. SETUP & HOOKS ---
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    
    // --- 2. CUSTOM HOOKS (Logic Extraction) ---
    // Layout Logic
    const { layoutMode, setLayoutMode, consoleSize, setConsoleSize, isResizing, startResizing } = useEditorLayout();
    
    // File System Logic
    const initialFiles = location.state?.templateFiles || [
        { name: 'main.js', language: 'javascript', value: '// Write JS here\nconsole.log("Hello World");' },
        { name: 'index.html', language: 'html', value: '\n<div class="container">\n  <h1>Hello World 🌍</h1>\n  <p>Live Preview Active!</p>\n</div>' },
        { name: 'style.css', language: 'css', value: 'body { font-family: sans-serif; background: #222; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } \n.container { text-align: center; border: 2px solid tomato; padding: 20px; border-radius: 10px; } \nh1 { color: tomato; }' },
        { name: 'script.js', language: 'javascript', value: 'console.log("Loaded script.js");' }
    ];
    const { 
        files, setFiles, activeFileName, setActiveFileName, activeFileNameRef, 
        codeRef, fileHistoryRef, switchFile, createNewFile, deleteFile 
    } = useFileSystem(initialFiles, socketRef, roomId);

    // Runner Logic
    const { output, setOutput, isRunning, customInput, setCustomInput, runCode } = useCodeRunner();

    // --- 3. LOCAL STATE (UI Specific) ---
    const [clients, setClients] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editorTheme, setEditorTheme] = useState('dracula');
    const [editorFontSize, setEditorFontSize] = useState(16);
    const [editorFontFamily, setEditorFontFamily] = useState('monospace'); 
    const [editorWordWrap, setEditorWordWrap] = useState(false);
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [newFileName, setNewFileName] = useState("");
    const [showQR, setShowQR] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState('files');
    const [activeMainView, setActiveMainView] = useState('editor');
    const [activeBottomTab, setActiveBottomTab] = useState('console');
    const [comments, setComments] = useState([]);
    const [activeLine, setActiveLine] = useState(null);
    const [liveRepoUrl, setLiveRepoUrl] = useState(null);
    const [srcDoc, setSrcDoc] = useState('');
    
    // Time Travel State
    const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const savedLiveCodeRef = useRef(null); 
    const isTimeTravelActiveRef = useRef(false);

    // Media State
    const [stream, setStream] = useState(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const peersRef = useRef([]);
    const userVideo = useRef();
    const userStream = useRef();
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
// --- 3. LOCAL STATE (Add this line) ---
const [inviteCopied, setInviteCopied] = useState(false);
    // User Data
    const getSavedUser = () => { try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; } };
    const savedUser = getSavedUser();
    const user = location.state?.user || (location.state?.username ? location.state : savedUser);
    const userId = location.state?.userId || user?.user?._id || user?._id || user?.id;
    const isHost = location.state?.isHost || !!userId;

    // --- 4. EFFECTS & LOGIC ---

    // Media Init
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => { setStream(currentStream); })
            .catch(err => console.error("Media Error:", err));
    }, []);

    // Web Preview Logic
    useEffect(() => {
        const timeout = setTimeout(() => {
            const htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
            const cssFile = files.find(f => f.name === 'style.css');
            const jsFile = files.find(f => f.name === 'script.js');
            if (htmlFile) {
                setSrcDoc(`<!DOCTYPE html><html><head><style>${cssFile?.value || ''}</style></head><body>${htmlFile.value}<script>${jsFile?.value || ''}</script></body></html>`);
            }
        }, 500); 
        return () => clearTimeout(timeout);
    }, [files]);

    useEffect(() => { isTimeTravelActiveRef.current = isTimeTravelActive; }, [isTimeTravelActive]);

    // Socket Initialization
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            setIsSocketConnected(true);

            // WebRTC Helpers
            function createPeer(userToSignal, callerID, stream) {
                const peer = new Peer({ initiator: true, trickle: false, stream });
                peer.on('signal', signal => socketRef.current.emit('sending-signal', { userToSignal, callerID, signal }));
                return peer;
            }
            function addPeer(incomingSignal, callerID, stream) {
                const peer = new Peer({ initiator: false, trickle: false, stream });
                peer.on('signal', signal => socketRef.current.emit('returning-signal', { signal, callerID }));
                peer.signal(incomingSignal);
                return peer;
            }

            // WebRTC Logic
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                userStream.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                    userVideo.current.muted = true;
                }
                
                socketRef.current.emit(ACTIONS.JOIN, { roomId, username: location.state?.username || user?.username });

                socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                    if (username !== (location.state?.username || user?.username)) {
                        toast.success(`${username} joined.`);
                        socketRef.current.emit(ACTIONS.SYNC_CODE, { files, socketId });
                    }
                    setClients(clients);
                });

                socketRef.current.on('all-users', users => {
                    const peersList = [];
                    users.forEach(userID => {
                        const peer = createPeer(userID, socketRef.current.id, stream);
                        peersRef.current.push({ peerID: userID, peer });
                        peersList.push(peer);
                    });
                });

                socketRef.current.on('user-joined', payload => {
                    const peer = addPeer(payload.signal, payload.callerID, stream);
                    peersRef.current.push({ peerID: payload.callerID, peer });
                });

                socketRef.current.on('receiving-returned-signal', payload => {
                    const item = peersRef.current.find(p => p.peerID === payload.id);
                    if(item) item.peer.signal(payload.signal);
                });

            } catch (err) {
                toast.error("Joined without video/audio.");
            }

            // Code Sync Logic
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ fileName, code }) => {
                if (!fileHistoryRef.current[fileName]) fileHistoryRef.current[fileName] = [];
                fileHistoryRef.current[fileName].push(code);
                
                setFiles(prev => prev.map(f => f.name === fileName ? { ...f, value: code } : f));
                
                if (fileName === activeFileNameRef.current && !isTimeTravelActiveRef.current) {
                    codeRef.current = code;
                }
            });

            socketRef.current.on(ACTIONS.FILE_CREATED, ({ files: remoteFiles }) => {
                setFiles(curr => {
                    const next = [...curr];
                    remoteFiles.forEach(rf => {
                        if (!next.some(cf => cf.name === rf.name)) next.push(rf);
                    });
                    return next;
                });
                toast.success("New file created by peer");
            });

            socketRef.current.on(ACTIONS.FILE_DELETED, ({ files: updatedFiles }) => {
                setFiles(updatedFiles);
                const current = activeFileNameRef.current;
                if (!updatedFiles.some(f => f.name === current) && updatedFiles.length > 0) {
                    setActiveFileName(updatedFiles[0].name);
                    codeRef.current = updatedFiles[0].value;
                    toast("File deleted by peer");
                }
            });

            socketRef.current.on(ACTIONS.SYNC_CODE, ({ files: syncedFiles }) => {
                if (syncedFiles && syncedFiles.length > 0) {
                    setFiles(syncedFiles);
                    const current = activeFileNameRef.current;
                    if (!syncedFiles.find(f => f.name === current)) {
                        setActiveFileName(syncedFiles[0].name);
                        codeRef.current = syncedFiles[0].value;
                    }
                }
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left.`);
                setClients(prev => prev.filter(c => c.socketId !== socketId));
                const peerObj = peersRef.current.find(p => p.peerID === socketId);
                if(peerObj) peerObj.peer.destroy();
                peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            });

            socketRef.current.on('comment:new', (newComment) => {
                setComments(prev => [...prev, newComment]);
                toast("New comment added", { icon: '💬' });
            });
        };

        if(roomId) init();
        return () => {
            if(socketRef.current) socketRef.current.disconnect();
            if(userStream.current) userStream.current.getTracks().forEach(track => track.stop());
        };
    }, []);

    // --- 5. HANDLERS ---

    const handleCodeChange = (newCode) => {
        if (isTimeTravelActiveRef.current) return;
        
        if (!fileHistoryRef.current[activeFileName]) fileHistoryRef.current[activeFileName] = [];
        fileHistoryRef.current[activeFileName].push(newCode);
        
        codeRef.current = newCode;
        setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, value: newCode } : f));

        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, fileName: activeFileName, code: newCode });
        }
    };

    const handleRunCode = () => {
        const file = files.find(f => f.name === activeFileName);
        setActiveBottomTab('console');
        runCode(file, codeRef.current, customInput);
    };

    const handleSwitchFile = (name) => {
        switchFile(name);
        setIsTimeTravelActive(false);
        if (name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.js')) setActiveBottomTab('preview');
        else setActiveBottomTab('console');
    };

    const handleAddComment = (text, line) => {
        const newComment = { username: location.state?.username || user?.username || 'Guest', text, line, timestamp: Date.now() };
        setComments(prev => [...prev, newComment]);
        if(socketRef.current) socketRef.current.emit('comment:new', { roomId, comment: newComment });
    };

    const toggleTimeTravel = () => {
        if (!isTimeTravelActive) {
            savedLiveCodeRef.current = codeRef.current;
            const history = fileHistoryRef.current[activeFileName] || [];
            if(history.length === 0 || history[history.length - 1] !== codeRef.current) history.push(codeRef.current);
            
            if(history.length === 0) return toast.error("No history yet!");
            
            setPlaybackIndex(history.length - 1);
            setIsTimeTravelActive(true);
            toast("🔴 Time Travel Active");
        } else {
            setIsTimeTravelActive(false);
            toast("🟢 Back to Live Editing");
            if (savedLiveCodeRef.current !== null) {
                codeRef.current = savedLiveCodeRef.current;
                setFiles(prev => prev.map(f => f.name === activeFileName ? { ...f, value: savedLiveCodeRef.current } : f));
            }
        }
    };

    const handleTimeTravelChange = (e) => {
        setPlaybackIndex(parseInt(e.target.value));
    };

    const handleCreateFile = () => {
        if(createNewFile(newFileName)) {
            setNewFileName("");
            setIsCreatingFile(false);
        }
    };

    const deleteFileHandler = (e, name) => {
        e.stopPropagation();
        deleteFile(name);
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard');
        } catch (err) {
            toast.error('Could not copy Room ID');
            console.error(err);
        }
    };
    const downloadZip = async () => {
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f.value));
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `CodeSync-Project-${roomId}.zip`);
        toast.success("Downloaded! 📦");
    };
const handleInvite = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setInviteCopied(true);
            toast.success('Invite link copied!');
            setTimeout(() => setInviteCopied(false), 2000);
        } catch (err) { toast.error('Failed to copy link'); }
    };
    const saveProject = async () => {
        if (!userId) return toast.error("Guest Mode: Cannot Save.");
        try {
            const res = await fetch('http://127.0.0.1:5000/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, name: `Project ${roomId.slice(0, 4)}`, userId, files })
            });
            res.ok ? toast.success('Saved! 💾') : toast.error('Save failed.');
        } catch (error) { toast.error('Server error.'); }
    };

    if (!location.state && !userId) return <Navigate to="/" state={{ roomId }} />;

    // --- 6. RENDER ---
    return (
        <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
            {/* LEFT SIDEBAR */}
            <aside className="w-80 bg-[#181818] border-r border-[#333] flex flex-col z-20 shrink-0 shadow-2xl">
                <div className="p-4 border-b border-[#333] flex items-center gap-2">
                    <img className="w-8" src="/code-sync.png" alt="logo" />
                    <span className="font-bold text-lg">CodeSync</span>
                </div>
                <div className="flex border-b border-[#333] bg-[#252526]">
                    <button onClick={() => setActiveSidebarTab('files')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'files' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>📁</button>
                    <button onClick={() => setActiveSidebarTab('users')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'users' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>👥</button>
                    <button onClick={() => setActiveSidebarTab('chat')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'chat' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>💬</button>
                    <button onClick={() => setActiveSidebarTab('ai')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>⚡</button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {activeSidebarTab === 'files' && (
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center px-2 py-1 mb-1">
                                <div className="text-xs text-gray-500 uppercase font-bold">Explorer</div>
                                <button onClick={() => setIsCreatingFile(true)} className="text-gray-400 hover:text-white text-lg font-bold p-1">+</button>
                            </div>
                            {isCreatingFile && (
                                <div className="flex items-center px-2 mb-2 animate-fadeIn">
                                    <span className="text-gray-400 mr-1">📄</span>
                                    <input autoFocus className="bg-[#333] text-white text-xs p-1 rounded w-full border border-blue-500" value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') setIsCreatingFile(false); }} onBlur={() => setIsCreatingFile(false)} placeholder="index.html" />
                                </div>
                            )}
                            {files.map((file, index) => (
                                <div key={index} onClick={() => handleSwitchFile(file.name)} className={`group p-2 text-left rounded text-sm flex items-center justify-between cursor-pointer transition-colors ${activeFileName === file.name ? 'bg-[#37373d] text-white border-l-2 border-green-500' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}>
                                    <div className="flex items-center gap-2 overflow-hidden"><span className="opacity-50 font-mono text-xs">{file.language.toUpperCase().slice(0,2)}</span><span className="truncate">{file.name}</span></div>
                                    <button onClick={(e) => deleteFileHandler(e, file.name)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity p-1 rounded hover:bg-[#252526]">🗑</button>
                                </div>
                            ))}
                            <button onClick={() => setActiveSidebarTab('comments')} className="mt-4 p-2 text-left rounded text-sm text-gray-400 hover:bg-[#2a2d2e] border-t border-[#333] flex gap-2 w-full">📝 View Comments ({comments.length})</button>
                        </div>
                    )}
                    {activeSidebarTab === 'users' && <div className="grid grid-cols-3 gap-3 p-2">{clients.map((client) => <ClientAvatar key={client.socketId} username={client.username} />)}</div>}
                    {activeSidebarTab === 'chat' && <div className="h-full flex flex-col"><Chat socketRef={socketRef} roomId={roomId} username={location.state?.username || user?.username} /></div>}
                    {activeSidebarTab === 'ai' && <div className="h-full overflow-hidden"><AIAnalysisPanel currentCode={files.find(f => f.name === activeFileName)?.value} language={files.find(f => f.name === activeFileName)?.language || 'javascript'} onApplyCode={(newCode) => { handleCodeChange(newCode); toast.success("Code updated!"); }} /></div>}
                    {activeSidebarTab === 'comments' && <CommentsPanel comments={comments} activeLine={activeLine} onAddComment={handleAddComment} />}
                </div>

                <div className="p-4 border-t border-[#333] flex flex-col gap-2 bg-[#181818]">
                    <button className="btn bg-[#333] hover:bg-[#444] text-white py-2 rounded text-sm" onClick={() => setShowQR(!showQR)}>{showQR ? 'Hide QR' : 'Show QR'}</button>
                    {showQR && <div className="p-2 bg-white rounded flex justify-center"><QRCode value={roomId} size={100} /></div>}
                    <div className="flex gap-2">
                        <button className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-bold" onClick={copyRoomId}>Copy ID</button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded text-sm font-bold" onClick={() => navigate('/')}>Leave</button>
                    </div>
                </div>
                <div className="p-2 border-t border-[#333]"><button onClick={() => setIsSettingsOpen(true)} className="w-full p-3 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"><span className="text-xl">⚙️</span><span className="text-sm font-bold">Settings</span></button></div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1e1e1e] min-w-0">
                <div className="h-12 bg-[#1e1e1e] flex items-center justify-between px-4 border-b border-[#333]">
                    <div className="flex gap-2 items-center">
                        <button onClick={() => navigate('/dashboard', { state: { user: user || getSavedUser() } })} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs transition-colors mr-4">⬅ Dashboard</button>
                        <div className="flex bg-[#252526] rounded-md p-1 border border-[#333]">
                            <button onClick={() => setActiveMainView('editor')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'editor' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>&lt;/&gt; Code</button>
                            <button onClick={() => setActiveMainView('board')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'board' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>🎨 Whiteboard</button>
                        </div>
                    </div>
                    
                    {/* LAYOUT TOGGLE */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setLayoutMode('bottom'); setConsoleSize(250); }} className={`p-1 rounded ${layoutMode === 'bottom' ? 'text-blue-400' : 'text-gray-500'}`} title="Bottom Console">⬇️</button>
                        <button onClick={() => { setLayoutMode('side'); setConsoleSize(400); }} className={`p-1 rounded ${layoutMode === 'side' ? 'text-blue-400' : 'text-gray-500'}`} title="Side Console">➡️</button>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={toggleTimeTravel} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${isTimeTravelActive ? 'bg-red-600 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-700'}`}>{isTimeTravelActive ? 'Exit Replay' : '🕒 History'}</button>
                        <div className="flex items-center gap-3">
                            {liveRepoUrl && <a href={liveRepoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold animate-fadeIn hover:bg-green-500/20 transition-all"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span> LIVE ON GITHUB</a>}
                        </div>
                        <button onClick={() => setIsDeployModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all active:scale-95"><span>🚀</span> Deploy</button>
                      <button 
    onClick={() => setIsShareModalOpen(true)} 
    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-full shadow-lg transition-all active:scale-95"
    title="Share Code Snippet"
>
    <Share2 size={14} />
    <span className="hidden sm:inline">Share</span>
</button>
<button 
                            onClick={handleInvite} 
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg ${inviteCopied ? 'bg-gray-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {inviteCopied ? <Check size={14} /> : <UserPlus size={14} />}
                            <span className="hidden sm:inline">{inviteCopied ? 'Copied' : 'Invite'}</span>
                        </button>
                        <button onClick={downloadZip} className="px-3 py-1 rounded-sm text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-colors">📥 Download</button>
                        {isHost && <button className="px-3 py-1 rounded-sm text-xs font-bold bg-[#333] hover:bg-[#444] text-white border border-gray-600" onClick={saveProject}>💾 Save</button>}
                        <button className={`px-5 py-1 rounded-sm text-xs font-bold flex items-center gap-2 ${isRunning ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`} onClick={handleRunCode} disabled={isRunning}>{isRunning ? 'Running...' : '▶ Run'}</button>
                    </div>
                </div>

                {/* WORKSPACE AREA */}
                <div className="flex-1 flex overflow-hidden relative" style={{ flexDirection: layoutMode === 'bottom' ? 'column' : 'row' }}>
                    <div className={`flex-1 flex flex-col relative ${activeMainView === 'editor' ? 'flex' : 'hidden'}`}>
                        <div className="flex-1 relative">
                            <Editor 
                                key={`${activeFileName}-${editorTheme}-${editorFontSize}-${editorFontFamily}-${editorWordWrap}`} 
                                socketRef={socketRef} 
                                roomId={roomId} 
                                language={files.find(f => f.name === activeFileName)?.language || 'javascript'}
                                code={isTimeTravelActive ? (fileHistoryRef.current[activeFileName]?.[playbackIndex] || '') : (files.find(f => f.name === activeFileName)?.value || '')} 
                                onCodeChange={handleCodeChange}
                                onLineSelect={(line, forceOpen) => { setActiveLine(line); if (forceOpen) setActiveSidebarTab('comments'); }}
                                comments={comments} 
                                theme={editorTheme} fontSize={editorFontSize} fontFamily={editorFontFamily} wordWrap={editorWordWrap}
                            />
                        </div>
                        {isTimeTravelActive && (
                            <div className="h-12 bg-[#252526] border-t border-[#333] flex items-center px-4 gap-4 z-20 shadow-xl shrink-0">
                                <span className="text-xs font-bold text-red-400 whitespace-nowrap min-w-[100px]">REPLAY: {playbackIndex + 1} / {fileHistoryRef.current[activeFileName]?.length || 0}</span>
                                <input type="range" min="0" max={(fileHistoryRef.current[activeFileName]?.length || 1) - 1} value={playbackIndex} onChange={handleTimeTravelChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400" />
                            </div>
                        )}
                       
                    </div>

                    <div onMouseDown={startResizing} className={`bg-[#1e1e1e] hover:bg-[#007acc] border-[#333] transition-colors z-40 shrink-0 flex items-center justify-center ${layoutMode === 'bottom' ? 'h-2 w-full cursor-row-resize border-t' : 'w-2 h-full cursor-col-resize border-l'}`}>
                        <div className={`bg-gray-600 rounded-full ${layoutMode === 'bottom' ? 'w-10 h-1' : 'h-10 w-1'}`}></div>
                    </div>

                    <div className="bg-[#1e1e1e] flex flex-col z-30 shrink-0 relative" style={{ height: layoutMode === 'bottom' ? `${consoleSize}px` : 'auto', width: layoutMode === 'side' ? `${consoleSize}px` : 'auto' }}>
                        <div className="flex justify-between items-center bg-[#252526] border-b border-[#333]">
                            <div className="flex">
                                <button onClick={() => setActiveBottomTab('console')} className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'console' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-500 hover:text-gray-300'}`}>Console (Stdin/Stdout)</button>
                                <button onClick={() => setActiveBottomTab('preview')} className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'preview' ? 'text-white border-b-2 border-orange-500 bg-[#1e1e1e]' : 'text-gray-500 hover:text-gray-300'}`}>🌐 Web Preview</button>
                            </div>
                            <button onClick={() => setOutput("")} className="px-4 text-xs text-gray-500 hover:text-gray-300">Clear</button>
                        </div>
                        <div className="flex-1 flex overflow-hidden relative">
                            <div className={`flex w-full h-full ${activeBottomTab === 'console' ? 'flex' : 'hidden'}`}>
                                <div className="w-1/2 border-r border-[#333] flex flex-col">
                                    <div className="bg-[#1e1e1e] px-2 py-0.5 text-[10px] text-gray-500 uppercase">Input (stdin)</div>
                                    <textarea className="flex-1 bg-[#1e1e1e] text-gray-300 p-2 text-sm font-mono outline-none resize-none" placeholder="Input..." value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                                </div>
                                <div className="w-1/2 flex flex-col">
                                    <div className="bg-[#1e1e1e] px-2 py-0.5 text-[10px] text-gray-500 uppercase">Output</div>
                                    <pre className={`flex-1 p-2 text-sm font-mono overflow-auto whitespace-pre-wrap ${output.includes("Error") ? "text-red-400" : "text-gray-300"}`}>{output || <span className="text-gray-600 italic">Run code...</span>}</pre>
                                </div>
                            </div>
                            <div className={`w-full h-full bg-white ${activeBottomTab === 'preview' ? 'block' : 'hidden'}`}>
                                <iframe srcDoc={srcDoc} title="output" sandbox="allow-scripts" className="w-full h-full border-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`absolute inset-0 z-40 bg-white h-full w-full overflow-hidden ${activeMainView === 'board' ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'}`}>
                    <div className="absolute top-4 left-4 z-50">
                        <button onClick={() => setActiveMainView('editor')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow-xl flex items-center gap-2 transition-all">⬅ Back to Code</button>
                    </div>
                    {isSocketConnected && socketRef.current && <Whiteboard socket={socketRef.current} roomId={roomId} />}
                </div>
            </main>

            {isDeployModalOpen && <DeployModal project={{ title: `Project-${roomId.slice(0, 5)}`, code: files.find(f => f.name === activeFileName)?.value || '', language: files.find(f => f.name === activeFileName)?.language || 'javascript', roomId: roomId }} onSuccess={(url) => setLiveRepoUrl(url)} onClose={() => setIsDeployModalOpen(false)} />}
            {isShareModalOpen && <ShareSnippetModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} code={files.find(f => f.name === activeFileName)?.value} language={files.find(f => f.name === activeFileName)?.language} />}
            {stream && socketRef.current && <VideoChat socketRef={socketRef} roomId={roomId} stream={stream} />}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={{ username: location.state?.username }} onSaveSettings={(settings) => { setEditorTheme(settings.theme); setEditorFontSize(parseInt(settings.fontSize)); setEditorFontFamily(settings.fontFamily); setEditorWordWrap(settings.wrapText); toast.success("Settings Updated! 🎨"); }} />
      {isResizing && (
                <div 
                    className="fixed inset-0 z-[9999] bg-transparent"
                    style={{ 
                        cursor: layoutMode === 'bottom' ? 'row-resize' : 'col-resize',
                        userSelect: 'none'
                    }}
                />
            )}
        </div>
    );
};

export default EditorPage;