import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ACTIONS } from '../Actions';
import ClientAvatar from '../components/ClientAvatar';
import Editor from '../components/Editor';
import FileSidebar from "../components/FileSidebar"; 
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
    Files, Users, MessageSquare, Bot, MessageCircle, Folder,Sparkles,
    Settings, Play, Loader2, Download, Share2, 
    ChevronLeft, Plus, Trash2, Hash, UserPlus, Check, Video, VideoOff, Monitor, PhoneOff, Save,QrCode, Copy, LogOut
} from 'lucide-react';

// ✅ IMPORT CUSTOM HOOKS
import useEditorLayout from '../hooks/useEditorLayout';
import useFileSystem from '../hooks/useFileSystem';
import { useCodeRunner } from '../hooks/useCodeRunner';
import { useVideoCall } from '../hooks/useVideoCall'; 

const EditorPage = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    
    const { layoutMode, setLayoutMode, consoleSize, setConsoleSize, isResizing, startResizing } = useEditorLayout();
    const { output, isCompiling, executeCode, clearOutput } = useCodeRunner();

    const initialFiles = location.state?.templateFiles || [
        { name: 'main.js', language: 'javascript', value: '// Write JS here\nconsole.log("Hello World");' },
        { name: 'index.html', language: 'html', value: '\n<div class="container">\n  <h1>Hello World 🌍</h1>\n  <p>Live Preview Active!</p>\n</div>' },
        { name: 'style.css', language: 'css', value: 'body { font-family: sans-serif; background: #222; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } \n.container { text-align: center; border: 2px solid tomato; padding: 20px; border-radius: 10px; } \nh1 { color: tomato; }' },
        { name: 'script.js', language: 'javascript', value: 'console.log("Loaded script.js");' }
    ];

    const [customInput, setCustomInput] = useState("");

    const { 
        files, setFiles, activeFileName, setActiveFileName, activeFileNameRef, 
        codeRef, fileHistoryRef, switchFile, createNewItem, deleteFile, 
        updateFileContent 
    } = useFileSystem(initialFiles, socketRef, roomId);

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
    // Add this near your other useState hooks
const [isOffline, setIsOffline] = useState(false);
    // 💬 RESTORED: Comments State
    const [comments, setComments] = useState([]);
    const [activeLine, setActiveLine] = useState(null);
    
    const [liveRepoUrl, setLiveRepoUrl] = useState(null);
    const [srcDoc, setSrcDoc] = useState('');
    const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const savedLiveCodeRef = useRef(null); 
    const isTimeTravelActiveRef = useRef(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const peersRef = useRef([]); 
    const [inviteCopied, setInviteCopied] = useState(false);
    const [jumpToLine, setJumpToLine] = useState(null);
    // ✅ INTEGRATE VIDEO HOOK
    const { 
        stream, isCallActive, isScreenSharing, isMuted, isVideoOff, 
        startCall, endCall, startScreenShare, endScreenShare,
        toggleMic, toggleVideo, isBlurred, isRecording,
        toggleBlur, startRecording, stopRecording, getNetworkStats
    } = useVideoCall(socketRef, roomId, peersRef,jumpToLine);

    const getSavedUser = () => { try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; } };
    const savedUser = getSavedUser();
    const user = location.state?.user || (location.state?.username ? location.state : savedUser);
    const userId = location.state?.userId || user?.user?._id || user?._id || user?.id;
    const isHost = location.state?.isHost || !!userId;
// 🚨 INSTANT OFFLINE DETECTOR
    useEffect(() => {
        const handleOffline = () => {
            setIsOffline(true);
            toast.error("WiFi dropped. Reconnecting...", { id: 'network-status', duration: Infinity, icon: '📡' });
        };
        const handleOnline = () => {
            setIsOffline(false);
            toast.success("Back online! Syncing...", { id: 'network-status', duration: 3000 });
        };

        // Listen to the computer's actual network adapter
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
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

    // ---------------------------------------------------------
    // 🛡️ ENHANCED SOCKET INITIALIZATION
    // ---------------------------------------------------------
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            setIsSocketConnected(true);

            socketRef.current.emit(ACTIONS.JOIN, { roomId, username: user?.username });

            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== user?.username) {
                    toast.success(`${username} joined.`);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, { files,comments, socketId });
                }
                setClients(clients);
            });

            // 1. Invitation Listener (Receiver Side)
            socketRef.current.on('server:invite-call', ({ from, callerId }) => {
                toast((t) => (
                    <div className="flex flex-col gap-2 p-1">
                        <span className="text-sm font-semibold">Incoming Call</span>
                        <span className="text-xs"><b>{from}</b> is inviting you...</span>
                        <div className="flex gap-2 mt-1">
                            <button 
                                className="bg-green-600 px-3 py-1 rounded text-xs font-bold hover:bg-green-500 transition-all"
                                onClick={async () => {
                                    toast.dismiss(t.id);
                                    await startCall(); 
                                    socketRef.current.emit('client:accept-call', { roomId, callerId });
                                }}
                            >Accept</button>
                            <button 
                                className="bg-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 transition-all" 
                                onClick={() => toast.dismiss(t.id)}
                            >Reject</button>
                        </div>
                    </div>
                ), { duration: 15000, position: 'top-center', style: { background: '#1e1e1e', color: '#fff', border: '1px solid #333'} });
            });

            // 2. Prepare Stream
            socketRef.current.on('server:prepare-local-stream', () => {
                startCall(); 
            });

            // 3. Call Accepted Handshake (Both Sides)
            socketRef.current.on('server:call-accepted', () => {
                console.log("✅ Call Accepted! Initiating simple-peer handshake...");
                // Both peers must emit this to scan the room and create peer connections
                socketRef.current.emit('request-call-join', { roomId });
            });

            // --- Standard Editor Listeners ---
            socketRef.current.on(ACTIONS.FILE_CREATED, ({ files: remoteFiles }) => {
                setFiles(curr => {
                    const next = [...curr];
                    remoteFiles.forEach(rf => {
                        if (!next.some(cf => cf.name === rf.name)) next.push(rf);
                    });
                    return next;
                });
            });

            socketRef.current.on(ACTIONS.FILE_DELETED, ({ files: updatedFiles }) => {
                setFiles(updatedFiles);
                const current = activeFileNameRef.current;
                if (!updatedFiles.some(f => f.name === current) && updatedFiles.length > 0) {
                    setActiveFileName(updatedFiles[0].name);
                    codeRef.current = updatedFiles[0].value;
                }
            });
// Listen for teammates navigating the file tree
socketRef.current.on('user:active_file', ({ username, fileName }) => {
    setClients(prevClients => 
        prevClients.map(c => 
            c.username === username ? { ...c, activeFile: fileName } : c
        )
    );
});
         socketRef.current.on(ACTIONS.SYNC_CODE, ({ files: syncedFiles, comments: syncedComments }) => {
    // 1. Update the files/code
    if (syncedFiles && syncedFiles.length > 0) {
        setFiles(syncedFiles);
    }
    
    // 2. Update the comments (Now syncedComments is defined!)
    if (syncedComments && Array.isArray(syncedComments)) {
        setComments(syncedComments); 
    }
});
            
            // 💬 Listen for incoming comments
           socketRef.current.on('comment:new', ({ comment }) => {
    // ✅ GOOD: Always appends to the latest version of the array
    setComments((prevComments) => [...prevComments, comment]);
                toast("New comment added");
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left.`);
                setClients(prev => prev.filter(c => c.socketId !== socketId));
                // Cleanup peer
                const peerObj = peersRef.current.find(p => p.peerID === socketId);
                if(peerObj) peerObj.peer.destroy();
                peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            });
            // 🛑 CATCH THE DISCONNECT (Paste here!)
            socketRef.current.on('disconnect', (reason) => {
                console.warn(`[NETWORK] Disconnected: ${reason}`);
                setIsOffline(true); // Triggers the red banner
                toast.error("WiFi dropped. Reconnecting...", { 
                    id: 'network-status', 
                    duration: Infinity,   
                    icon: '📡'
                });
            });

            // 🟢 CATCH THE RECONNECT
            socketRef.current.io.on('reconnect', (attempt) => {
                console.log(`[NETWORK] Reconnected after ${attempt} attempts`);
                setIsOffline(false); // Hides the red banner
                toast.success("Back online! Syncing files...", { 
                    id: 'network-status', 
                    duration: 3000 
                });

                // Re-sync the state
                socketRef.current.emit(ACTIONS.JOIN, { 
                    roomId, 
                    username: user?.username 
                });
            });
        };

        if(roomId) init();
        return () => {
            if(socketRef.current) socketRef.current.disconnect();
            if(stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [roomId]); 

    // --- 5. HANDLERS ---
    
    const handleInviteCall = () => {
        if (socketRef.current && !isCallActive) {
            socketRef.current.emit('client:invite-call', { 
                roomId, 
                username: user?.username || 'Someone' 
            });
            startCall(); 
            toast.success("Call invitation sent!");
        }
    };
const handleCommentClick = (line) => {
    setJumpToLine(line);
    // Reset after a short delay so the same line can be clicked again
    setTimeout(() => setJumpToLine(null), 100); 
};
    const handleCodeChange = (newCode) => {
        if (isTimeTravelActiveRef.current) return;
        updateFileContent(activeFileName, newCode);
    };

    const handleRunCode = () => {
        const currentFile = files.find(f => f.name === activeFileName);
        const codeString = currentFile?.value || '';
        executeCode(codeString, currentFile?.language || 'javascript'); 
    };

    const handleSwitchFile = (name) => {
        switchFile(name);
        setIsTimeTravelActive(false);
        if (name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.js')) setActiveBottomTab('preview');
        else setActiveBottomTab('console');

        if (socketRef.current) {
        socketRef.current.emit('user:active_file', { 
            roomId, 
            username: user?.username, 
            fileName: name 
        });
    }
    };

    // 💬 RESTORED: Comment Logic
    const handleAddComment = (text, line) => {
    // 1. Create a readable time string (e.g., "10:30 PM")
    const readableTime = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    const newComment = { 
        username: user?.username || 'Guest', 
        text, 
        // 2. Ensure line is always a number to avoid "12" vs 12 bugs
        line: parseInt(line), 
        // 3. Keep id as a timestamp for sorting, but add readableTime for the UI
        id: Date.now(), 
        timestamp: readableTime 
    };

    // Update local state using functional update to prevent race conditions
    setComments(prev => [...prev, newComment]);

    // Broadcast to the room
    if (socketRef.current) {
        socketRef.current.emit('comment:new', { roomId, comment: newComment });
    }
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
        try { await navigator.clipboard.writeText(roomId); toast.success('Room ID copied'); } catch (err) { toast.error('Failed'); }
    };
    
    const downloadZip = async () => {
        const zip = new JSZip();
        files.forEach(f => zip.file(f.name, f.value));
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `CodeSync-Project-${roomId}.zip`);
        toast.success("Downloaded Project!");
    };
    
    const handleInvite = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setInviteCopied(true);
            toast.success('Invite link copied!');
            setTimeout(() => setInviteCopied(false), 2000);
        } catch (err) { toast.error('Failed to copy link'); }
    };
    
    // 💾 RESTORED: Save Project Logic
    const saveProject = async () => {
        if (!userId) return toast.error("Guest Mode: Cannot Save.");
        try {
            toast.loading("Saving project...");
            const res = await fetch('http://127.0.0.1:5000/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, name: `Project ${roomId.slice(0, 4)}`, userId, files })
            });
            toast.dismiss();
            res.ok ? toast.success('Saved Successfully!') : toast.error('Save failed.');
        } catch (error) { 
            toast.dismiss();
            toast.error('Server error.'); 
        }
    };

    if (!location.state && !userId) return <Navigate to="/" state={{ roomId }} />;

    return (
        <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-80 bg-[#181818] border-r border-[#333] flex flex-col z-20 shrink-0 shadow-2xl">
              {/* 🌟 Premium Branding Header */}
<div className="flex items-center gap-3 px-4 py-6 mb-2 group transition-all duration-300 border-b border-[#333]/30">
    {/* The Sleek "C" Logo */}
    <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-300 shrink-0">
        <span className="text-white text-xl font-black">C</span>
    </div>

    <div className="flex items-baseline gap-1.5">
        <h1 className="text-white font-black text-xl tracking-tighter transition-colors">
            CodeSync
        </h1>
        {/* "Editor" in Light weight for that Senior Dev Tool look */}
        <span className="text-gray-400 font-extralight text-lg tracking-tight opacity-80">
            Editor
        </span>
    </div>
</div>
{/* 🚀 Professional Activity Bar - Logic preserved with activeSidebarTab */}
{/* 🚀 High-Visibility Pro Activity Bar */}
{/* 🚀 Refined Pro Activity Bar - Thin, Sharp, and Spaced */}
<div className="flex items-center justify-around bg-[#1e1e1e] border-b border-[#333] shrink-0 h-14 relative">
    {[
        { id: 'files', icon: Folder, label: 'Explorer' },
        { id: 'comments', icon: MessageCircle, label: 'Comments' },
        { id: 'users', icon: Users, label: 'People' },
        { id: 'chat', icon: MessageSquare, label: 'Chat' },
        { id: 'ai', icon: Sparkles, label: 'AI Doctor' },
    ].map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSidebarTab === tab.id;

        return (
            <button
                key={tab.id}
                onClick={() => setActiveSidebarTab(tab.id)}
                className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 transition-all duration-300
                    ${isActive ? 'bg-[#252526]' : 'hover:bg-[#2a2a2a]'}`}
            >
                {/* 🌈 Icon - Sized down to 18 for elegance */}
                <Icon 
                    size={18} 
                    className={`transition-all duration-300 
                        ${isActive 
                            ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' 
                            : 'text-gray-500 hover:text-gray-300'}`} 
                />

                {/* 🏷️ Label - Thinner, Spaced, and Smaller */}
                <span className={`text-[8px] font-medium uppercase tracking-[0.1em] transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {tab.label}
                </span>

                {/* ✨ Minimalist Bottom Indicator */}
                <div className={`absolute bottom-0 left-0 right-0 h-[1.5px] transition-all duration-500
                    ${isActive 
                        ? 'bg-indigo-500 scale-x-75 shadow-[0_0_10px_#6366f1]' 
                        : 'bg-transparent scale-x-0'}`} 
                />
            </button>
        );
    })}
</div>
                <div className="flex-1 overflow-y-auto p-2">
                  {activeSidebarTab === 'files' && (
    <FileSidebar 
        // 1. Safely map files so the new UI can read them
        items={files.map(f => ({ 
            ...f, 
            id: f.id || f.name, 
            type: f.type || 'file',
            parentId: f.parentId || null
        }))}
        clients={clients}                // 🚨 Pass the users down!
    currentUser={user?.username}
        // 2. Highlight the currently active file
        activeFileId={activeFileName} 
        
        // 3. Connect to your existing switch handler
 // 3. 🚨 THE FIX: Find the file's real name before switching!
    onFileClick={(id) => {
        const clickedFile = files.find(f => f.id === id || f.name === id);
        if (clickedFile) {
            handleSwitchFile(clickedFile.name); // Pass the NAME, not the ID!
        }
    }}
    
    onCreateItem={(type, parentId = null) => {
        const itemName = prompt(`Enter ${type} name:`);
        if (itemName) {
            createNewItem(itemName, type, parentId);
        }
    }}
    
    // 5. 🚨 THE FIX: Find the file's real name before deleting!
    onDeleteItem={(id) => {
        const fileToDelete = files.find(f => f.id === id || f.name === id);
        if (fileToDelete) {
            const dummyEvent = { stopPropagation: () => {} };
            deleteFileHandler(dummyEvent, fileToDelete.name); // Pass the NAME, not the ID!
        }
    }}
    />
)}
                    {/* 💬 RESTORED: Comments Panel Component */}
                 {/* 💬 RESTORED: Comments Panel Component */}
                  {/* ✅ NEW WAY (Passes all comments so the list works) */}
{activeSidebarTab === 'comments' && (
    <CommentsPanel 
        comments={comments} // Pass everything!
        activeLine={activeLine}
        onLineSelect={handleCommentClick}
        onAddComment={handleAddComment}
        onClose={() => setActiveSidebarTab('files')}
    />
)}
                    
                    {activeSidebarTab === 'users' && <div className="grid grid-cols-3 gap-3 p-2">{clients.map((client) => <ClientAvatar key={client.socketId} username={client.username} />)}</div>}
{/* 🚨 THE FIX: Use CSS to hide it instead of unmounting it! */}
   <div className={`h-full flex flex-col ${activeSidebarTab === 'chat' ? 'flex' : 'hidden'}`}>
        {/* 🚨 THE FIX: Wait for the socket to exist before rendering! */}
        {isSocketConnected && socketRef.current && (
            <Chat socketRef={socketRef} roomId={roomId} username={user?.username} />
        )}
    </div>       
                 {activeSidebarTab === 'ai' && <div className="h-full overflow-hidden"><AIAnalysisPanel currentCode={files.find(f => f.name === activeFileName)?.value} language={files.find(f => f.name === activeFileName)?.language || 'javascript'} onApplyCode={(newCode) => { handleCodeChange(newCode); toast.success("Code updated!"); }} /></div>}
                </div>

               {/* 🌟 PREMIUM COMPACT FOOTER (Paste this here instead!) */}
<div className="flex items-center justify-between p-3 border-t border-[#333] bg-[#1e1e1e] shrink-0 relative">
    
    {/* Floating QR Code Modal */}
    {showQR && (
        <div className="absolute bottom-14 left-4 p-3 bg-white rounded-xl shadow-2xl animate-fadeIn z-50 border border-gray-200">
            <QRCode value={roomId} size={120} />
            <div className="text-center text-xs text-gray-800 font-bold mt-2">Scan to Join</div>
        </div>
    )}

    <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded-lg transition-colors" title="Settings">
        <Settings size={18} />
    </button>
    
    <div className="flex items-center gap-1">
        <button onClick={() => setShowQR(!showQR)} className={`p-2 rounded-lg transition-colors ${showQR ? 'bg-[#2a2a2a] text-white' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'}`} title="Room QR Code">
            <QrCode size={18} />
        </button>
        <button onClick={copyRoomId} className="p-2 text-emerald-500 hover:text-emerald-400 hover:bg-[#2a2a2a] rounded-lg transition-colors" title="Copy Room ID">
            <Copy size={18} />
        </button>
        <button onClick={() => navigate('/')} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Leave Room">
            <LogOut size={18} />
        </button>
    </div>
</div>
            </aside>

            {/* MAIN AREA */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1e1e1e] min-w-0">
            {isOffline && (
                    <div className="bg-red-600 text-white text-xs font-bold py-1 px-4 flex justify-center items-center gap-2 animate-pulse z-50">
                        <span>⚠️</span>
                        Connection lost. Changes will not be saved or synced until you reconnect.
                    </div>
                )}
                <div className="h-12 bg-[#1e1e1e] flex items-center justify-between px-4 border-b border-[#333]">
                    <div className="flex gap-2 items-center">
                        <button onClick={() => navigate('/dashboard', { state: { user: user || getSavedUser() } })} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs transition-colors mr-4">⬅ Dashboard</button>
                        <div className="flex bg-[#252526] rounded-md p-1 border border-[#333]">
                            <button onClick={() => setActiveMainView('editor')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'editor' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Code</button>
                            <button onClick={() => setActiveMainView('board')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'board' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Whiteboard</button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setLayoutMode('bottom'); setConsoleSize(250); }} className={`p-1 rounded ${layoutMode === 'bottom' ? 'text-blue-400' : 'text-gray-500'}`} title="Bottom Console">⬇️</button>
                        <button onClick={() => { setLayoutMode('side'); setConsoleSize(400); }} className={`p-1 rounded ${layoutMode === 'side' ? 'text-blue-400' : 'text-gray-500'}`} title="Side Console">➡️</button>
                    </div>

                    <div className="flex gap-3">
                        {clients.length > 1 && !isCallActive && (
                             <button 
                                onClick={handleInviteCall} 
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-sm text-xs font-bold transition-all animate-pulse shadow-lg"
                            >
                                <Video size={14} /> Invite to Call
                             </button>
                        )}

                        {isCallActive && (
                            <div className="flex items-center gap-1 bg-[#252526] p-1 rounded-sm border border-indigo-500 animate-fadeIn">
                                <button onClick={isScreenSharing ? endScreenShare : startScreenShare} className={`p-1 rounded ${isScreenSharing ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} title="Screen Share">
                                    <Monitor size={14} />
                                </button>
                                <button onClick={endCall} className="p-1 text-red-500 hover:text-red-400" title="End Call">
                                    <PhoneOff size={14} />
                                </button>
                            </div>
                        )}

                        <button onClick={toggleTimeTravel} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${isTimeTravelActive ? 'bg-red-600 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-700'}`}>{isTimeTravelActive ? 'Exit Replay' : '🕒 History'}</button>
                        
                        {/* 💾 RESTORED: Save Button */}
                        <button onClick={saveProject} className="flex items-center gap-2 bg-[#333] hover:bg-[#444] text-white px-3 py-1 rounded-sm text-xs font-bold transition-all border border-gray-600">
                            <Save size={14} /> Save
                        </button>
                        
                        <button onClick={() => setIsDeployModalOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all active:scale-95">Deploy</button>
                        <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 rounded-full shadow-lg transition-all active:scale-95"><Share2 size={14} /> Share</button>
                        <button onClick={handleInvite} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shadow-lg ${inviteCopied ? 'bg-gray-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{inviteCopied ? <Check size={14} /> : <UserPlus size={14} />} {inviteCopied ? 'Copied' : 'Invite'}</button>
                        <button onClick={downloadZip} className="px-3 py-1 rounded-sm text-xs font-bold bg-[#333] hover:bg-[#444] text-white border border-gray-600">📥 Download</button>
                        <button className={`px-5 py-1 rounded-sm text-xs font-bold flex items-center gap-2 ${isCompiling ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`} onClick={handleRunCode} disabled={isCompiling}>{isCompiling ? 'Running...' : '▶ Run'}</button>
                    </div>
                </div>

                {/* WORKSPACE AREA */}
                <div className="flex-1 flex overflow-hidden relative" style={{ flexDirection: layoutMode === 'bottom' ? 'column' : 'row' }}>
                    <div className={`flex-1 flex flex-col relative ${activeMainView === 'editor' ? 'flex' : 'hidden'}`}>
                        <div className="flex-1 relative">
                            <Editor 
                                key={activeFileName} 
                                socketRef={socketRef} 
                                roomId={roomId} 
                                language={files.find(f => f.name === activeFileName)?.language || 'javascript'}
                                code={isTimeTravelActive ? (fileHistoryRef.current[activeFileName]?.[playbackIndex] || '') : (files.find(f => f.name === activeFileName)?.value || '')} 
                                onCodeChange={handleCodeChange}
                                jumpToLine={jumpToLine}
                                // 💬 RESTORED: Active Line for Comments
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

                    <div className="bg-[#1e1e1e] flex flex-col z-30 shrink-0 relative shadow-inner" style={{ height: layoutMode === 'bottom' ? `${consoleSize}px` : 'auto', width: layoutMode === 'side' ? `${consoleSize}px` : 'auto' }}>
                        <div className="flex justify-between items-center bg-[#252526] border-b border-[#333]">
                            <div className="flex">
                                <button onClick={() => setActiveBottomTab('console')} className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'console' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-400 hover:text-gray-200'}`}>Console</button>
                                <button onClick={() => setActiveBottomTab('preview')} className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'preview' ? 'text-white border-b-2 border-orange-500 bg-[#1e1e1e]' : 'text-gray-400 hover:text-gray-200'}`}>Preview</button>
                            </div>
                            <button onClick={() => setOutput("")} className="px-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">Clear</button>
                        </div>
                        <div className="flex-1 flex overflow-hidden relative bg-[#1e1e1e]">
                            <div className={`flex w-full h-full ${activeBottomTab === 'console' ? 'flex' : 'hidden'}`}>
                                <div className="w-1/2 border-r border-[#333] flex flex-col">
                                    <div className="bg-[#252526] px-2 py-0.5 text-[9px] text-gray-500 uppercase tracking-tighter">Stdin</div>
                                    <textarea className="flex-1 bg-[#1e1e1e] text-gray-300 p-2 text-sm font-mono outline-none resize-none" placeholder="Input here..." value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                                </div>
                                <div className="w-1/2 flex flex-col">
                                    <div className="bg-[#252526] px-2 py-0.5 text-[9px] text-gray-500 uppercase tracking-tighter">Stdout</div>
                                    <pre className={`flex-1 p-2 text-xs font-mono overflow-auto whitespace-pre-wrap ${output.includes("Error") ? "text-red-400" : "text-blue-300"}`}>{output || "..."}</pre>
                                </div>
                            </div>
                            <div className={`w-full h-full bg-white ${activeBottomTab === 'preview' ? 'block' : 'hidden'}`}>
                                <iframe srcDoc={srcDoc} title="output" sandbox="allow-scripts" className="w-full h-full border-none" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`absolute inset-0 z-40 bg-white h-full w-full overflow-hidden transition-all duration-500 ${activeMainView === 'board' ? 'visible opacity-100 pointer-events-auto scale-100' : 'invisible opacity-0 pointer-events-none scale-95'}`}>
                    <div className="absolute top-4 left-4 z-50">
                        <button onClick={() => setActiveMainView('editor')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow-xl flex items-center gap-2 transition-all">⬅ Back to Code</button>
                    </div>
                    {isSocketConnected && socketRef.current && <Whiteboard socket={socketRef.current} roomId={roomId} />}
                </div>
            </main>

            {isCallActive && stream && (
                <VideoChat 
                    key="persistent-video-chat" // 🚨 Key forces a fresh mount if things glitch
                    socketRef={socketRef} 
                    roomId={roomId} 
                    stream={stream}
                    isScreenSharing={isScreenSharing}
                    isMuted={isMuted}
                    isBlurred={isBlurred}
                    toggleBlur={toggleBlur}
                    isRecording={isRecording}
                    startRecording={startRecording}
                    stopRecording={stopRecording}
                    getNetworkStats={getNetworkStats}
                    peersRef={peersRef} // 🚨 CRITICAL: Passing the ref for screen share bridging
                    isVideoOff={isVideoOff}
                    clients={clients}
                    onEndCall={endCall}
                    onToggleMic={toggleMic}
                    onToggleCamera={toggleVideo} 
                    onToggleScreenShare={isScreenSharing ? endScreenShare : startScreenShare}
                />
            )}
            
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={{ username: user?.username }} onSaveSettings={(settings) => { setEditorTheme(settings.theme); setEditorFontSize(parseInt(settings.fontSize)); setEditorFontFamily(settings.fontFamily); setEditorWordWrap(settings.wrapText); toast.success("Settings Updated! 🎨"); }} />
       {isDeployModalOpen && (
                <DeployModal 
                    isOpen={isDeployModalOpen} 
                    onClose={() => setIsDeployModalOpen(false)} 
                    files={files} 
                />
            )}

            {isShareModalOpen && (
                <ShareSnippetModal 
                    isOpen={isShareModalOpen} 
                    onClose={() => setIsShareModalOpen(false)} 
                    files={files} 
                    activeFile={activeFileName} 
                />
            )}
        </div>
    );
};

export default EditorPage;