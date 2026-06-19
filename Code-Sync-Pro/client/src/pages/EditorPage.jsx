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
    Files, Users, MessageSquare, Bot, MessageCircle, Folder,Sparkles,ArrowLeft,
    Settings, Play, Loader2, Download, Share2, PanelLeftOpen, PanelLeftClose,
    ChevronLeft, Plus, Trash2, Hash, UserPlus, Check, Video, VideoOff, Monitor, PhoneOff, Save,QrCode, Copy, LogOut,GitPullRequest
} from 'lucide-react';
import SubmitFixModal from '../components/SubmitFixModal';
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
    
    // 🚨 NEW: Reference to hold the Monaco Editor instance
    const editorRef = useRef(null);
    
    const { layoutMode, setLayoutMode, consoleSize, setConsoleSize, isResizing, startResizing } = useEditorLayout();
    const { output, isCompiling, executeCode, clearOutput } = useCodeRunner();

    const initialFiles = location.state?.templateFiles || [
        { name: 'main.js', language: 'javascript', value: '// Write JS here\nconsole.log("Hello World");' },
        { name: 'index.html', language: 'html', value: '\n<div class="container">\n  <h1>Hello World 🌍</h1>\n  <p>Live Preview Active!</p>\n</div>' },
        { name: 'style.css', language: 'css', value: 'body { font-family: sans-serif; background: #222; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } \n.container { text-align: center; border: 2px solid tomato; padding: 20px; border-radius: 10px; } \nh1 { color: tomato; }' },
        { name: 'script.js', language: 'javascript', value: 'console.log("Loaded script.js");' }
    ];

    const [customInput, setCustomInput] = useState("");
  const [isSubmitFixModalOpen, setIsSubmitFixModalOpen] = useState(false);

// We need to know if this current room is a fork! 
// (Assume we fetch project details into a variable called 'currentProjectMetadata')
// Catch the project metadata sent from the Community Hub!
const [currentProjectMetadata, setCurrentProjectMetadata] = useState(location.state?.projectMetadata || null);
    const { 
        files, setFiles, activeFileName, setActiveFileName, activeFileNameRef, 
        codeRef, fileHistoryRef, switchFile, createNewItem, deleteFile, handleBulkImport,
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
// 🚨 1. SENIOR FIX: The Database Loader State
    const [isDbLoaded, setIsDbLoaded] = useState(false);

    // 🚨 2. SENIOR FIX: Fetch the actual saved files from MongoDB on mount!
    useEffect(() => {
        const fetchSavedProject = async () => {
            try {
                // If we came from the dashboard with files already in memory, skip the fetch!
                if (location.state?.templateFiles || location.state?.projectFiles) {
                    setIsDbLoaded(true);
                    return;
                }

                const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
                
                // Fetch the project data using the room ID
                const res = await fetch(`${backendUrl}/api/projects/${roomId}`);

                if (res.ok) {
                    const project = await res.json();
                    
                    // If the project has saved files, overwrite the "Hello World" defaults!
                    if (project.files && project.files.length > 0) {
                        setFiles(project.files);
                        setActiveFileName(project.files[0].name);
                        codeRef.current = project.files[0].value;
                    }
                }
            } catch (error) {
                console.error("Error loading project from DB:", error);
            } finally {
                // Always tell the UI it's safe to render the Editor now
                setIsDbLoaded(true);
            }
        };

        fetchSavedProject();
    }, [roomId, location.state]);
    // 💬 RESTORED: Comments State
    const [comments, setComments] = useState([]);
    const [activeLine, setActiveLine] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    const getSavedUser = () => { try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; } };
    const savedUser = getSavedUser();
    const user = location.state?.user || (location.state?.username ? location.state : savedUser);
    const userId = location.state?.userId || user?.user?._id || user?._id || user?.id;
    const isHost = location.state?.isHost || !!userId;
    const { 
        stream, isCallActive, isScreenSharing, isMuted, isVideoOff, 
        startCall, endCall, startScreenShare, endScreenShare,
        toggleMic, toggleVideo, isBlurred, isRecording,activeScreenSharer,
        toggleBlur, startRecording, stopRecording, getNetworkStats,setActiveScreenSharer
    } = useVideoCall(socketRef, roomId, peersRef,user?.username);

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

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
    
    // 🖥️ LIVE PREVIEW GENERATOR
    // 🖥️ SMART BROWSER-ENGINE PREVIEW
    useEffect(() => {
        const timeout = setTimeout(() => {
            // 1. Find the active HTML file, or default to index.html
            let htmlFile = null;
            if (activeFileName && activeFileName.endsWith('.html')) {
                htmlFile = files.find(f => f.name === activeFileName);
            }
            if (!htmlFile) {
                htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
            }

            if (htmlFile) {
                let parsedHtml = htmlFile.value;

                // 2. 🎨 DYNAMIC CSS INJECTION
                // Scans for: <link rel="stylesheet" href="filename.css">
                parsedHtml = parsedHtml.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, cssFilename) => {
                    // Find the exact CSS file the user asked for
                    const linkedCssFile = files.find(f => f.name === cssFilename);
                    if (linkedCssFile) {
                        return `<style>${linkedCssFile.value}</style>`;
                    }
                    return match; // Leave alone if file doesn't exist yet
                });

                // 3. ⚙️ DYNAMIC JS INJECTION
                // Scans for: <script src="filename.js"></script>
                parsedHtml = parsedHtml.replace(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, jsFilename) => {
                    // Find the exact JS file the user asked for
                    const linkedJsFile = files.find(f => f.name === jsFilename);
                    if (linkedJsFile) {
                        return `<script>${linkedJsFile.value}</script>`;
                    }
                    return match; // Leave alone if file doesn't exist yet
                });

                // Render the fully stitched-together page
                setSrcDoc(parsedHtml);
            } else {
                setSrcDoc(`
                    <div style="color: #888; font-family: sans-serif; text-align: center; margin-top: 50px;">
                        <p>No HTML file found to preview.</p>
                    </div>
                `);
            }
        }, 500); 

        return () => clearTimeout(timeout);
    }, [files, activeFileName]);

    useEffect(() => { isTimeTravelActiveRef.current = isTimeTravelActive; }, [isTimeTravelActive]);

    // ==========================================
    // ✨ THE HYBRID SYNC SYSTEM (PEERS + SUITCASE)
    // ==========================================
    const filesRef = useRef(files);
    
    // 🚨 NEW: Safe Code Injection without needing raw monaco API imports
    const insertCodeAtCursor = (codeSnippet) => {
        if (!editorRef.current) {
            toast.error("Editor not initialized yet.");
            return;
        }

        const editor = editorRef.current;
        const position = editor.getPosition();

        // Preserves undo history instead of breaking the editor state
        editor.executeEdits("ai-voice-command", [{
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            },
            text: codeSnippet,
            forceMoveMarkers: true
        }]);

        // Auto-format after insertion
        editor.getAction('editor.action.formatDocument').run();
        editor.focus();
    };

    const commentsRef = useRef(comments);
    useEffect(() => { filesRef.current = files; }, [files]);
    useEffect(() => { commentsRef.current = comments; }, [comments]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !isSocketConnected) return; 

        // SCENARIO A: Server asks me to send my code to a late joiner
        const handleRequestSync = ({ targetSocketId }) => {
            console.log("📤 [SYNC] Sending my live files & comments to new user!");
            socket.emit(ACTIONS.SYNC_CODE, { 
                socketId: targetSocketId, 
                files: filesRef.current,
                comments: commentsRef.current
            });
        };

        // SCENARIO B: I am the late joiner / GitHub returnee
        const handleReceiveSync = ({ files: peerFiles, comments: peerComments }) => {
            console.log("📥 [SYNC] Received live files from a peer!");
            if (peerFiles && peerFiles.length > 0) setFiles(peerFiles);
            if (peerComments && Array.isArray(peerComments)) setComments(peerComments);
            localStorage.removeItem('editor_backup'); // Trash the suitcase, we have live code
        };

        // SCENARIO C: I returned from GitHub, but I am totally alone.
        const handleNoPeers = () => {
            const backup = localStorage.getItem('editor_backup');
            if (backup) {
                console.log("🎒 [SYNC] No peers found. Unpacking local backup suitcase!");
                try {
                    setFiles(JSON.parse(backup));
                } catch (err) {
                    console.error("Failed to parse backup:", err);
                }
                localStorage.removeItem('editor_backup'); 
            }
        };

        socket.on('request-sync', handleRequestSync);
        socket.on(ACTIONS.SYNC_CODE, handleReceiveSync);
        socket.on('no-peers-found', handleNoPeers);

        return () => {
            socket.off('request-sync', handleRequestSync);
            socket.off(ACTIONS.SYNC_CODE, handleReceiveSync);
            socket.off('no-peers-found', handleNoPeers);
        };
    }, [isSocketConnected]); 

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
                    // ❌ DELETED the automatic SYNC_CODE emit from here.
                }
                setClients(clients);
            });

    // --- Video Call Listeners ---
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
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    // ✨ Tell the server to notify the person who called!
                                    socketRef.current.emit('client:reject-call', { callerId });
                                }}
                            >Reject</button>
                        </div>
                    </div>
                ), { duration: 15000, position: 'top-center', style: { background: '#1e1e1e', color: '#fff', border: '1px solid #333'} });
            });

            socketRef.current.on('server:prepare-local-stream', () => startCall());
// ✨ TO THIS NEW BLOCK:
socketRef.current.on('server:call-accepted', async () => {
    toast.success("Call accepted! Connecting...");
    
    // 1. NOW we finally turn on User A's camera
    await startCall(); 
    
    // 2. Then we tell WebRTC to connect the video feeds
    socketRef.current.emit('request-call-join', { roomId });
});
            // ✨ PASTE THE NEW LISTENER RIGHT HERE! ✨
            socketRef.current.on('server:call-rejected', () => {
                console.log("🚨 [FRONTEND] I heard the rejection! Shutting down camera..."); // ✨ Add this!
                toast.error("Call was declined", { icon: '❌' });
                endCall(); // This shuts off User A's camera!
            });
// // 📺 RESTORE THE SCREEN SHARE LOCKS
// socketRef.current.on('screen-share-started', (sharerName) => {
//     console.log("🚨 [FRONTEND] Lock received from server! Sharer is:", sharerName); 
//     setActiveScreenSharer(sharerName);
// });

// socketRef.current.on('screen-share-stopped', () => {
//     console.log("🔓 [FRONTEND] Unlock received from server!"); 
//     setActiveScreenSharer(null);
// });
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

            socketRef.current.on('user:active_file', ({ username, fileName }) => {
                setClients(prevClients => 
                    prevClients.map(c => c.username === username ? { ...c, activeFile: fileName } : c)
                );
            });
// Inside EditorPage.jsx socket listeners
socketRef.current.on('peer-ai-generating', ({ username }) => {
    toast(`🤖 ${username}'s Copilot is writing code...`, {
        icon: '✨',
        position: 'top-right',
        style: {
            background: '#2d2d2d',
            color: '#a855f7', // Cool purple color
            border: '1px solid #a855f7'
        }
    });
});
            // ❌ DELETED the duplicate SYNC_CODE listener that was sitting here

            // 💬 Listen for incoming comments
            socketRef.current.on('comment:new', ({ comment }) => {
                setComments((prevComments) => [...prevComments, comment]);
                toast("New comment added");
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left.`);
                setClients(prev => prev.filter(c => c.socketId !== socketId));
                const peerObj = peersRef.current.find(p => p.peerID === socketId);
                if(peerObj) peerObj.peer.destroy();
                peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            });

            // 🛑 CATCH THE DISCONNECT
            socketRef.current.on('disconnect', (reason) => {
                console.warn(`[NETWORK] Disconnected: ${reason}`);
                setIsOffline(true);
                toast.error("WiFi dropped. Reconnecting...", { id: 'network-status', duration: Infinity, icon: '📡' });
            });

            // 🟢 CATCH THE RECONNECT
            socketRef.current.io.on('reconnect', (attempt) => {
                console.log(`[NETWORK] Reconnected after ${attempt} attempts`);
                setIsOffline(false);
                toast.success("Back online! Syncing files...", { id: 'network-status', duration: 3000 });
                socketRef.current.emit(ACTIONS.JOIN, { roomId, username: user?.username });
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
        
        // ✨ REMOVED startCall() FROM HERE!
        // We just tell them to wait instead:
        toast.success("Ringing... waiting for answer"); 
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
        executeCode(codeString, currentFile?.language || 'javascript', customInput);    };

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
// 1. Add this function inside your component, before the return statement
const handleLogout = () => {
    // Step 1: Disconnect the WebSocket so their avatar/cursor leaves the room immediately
    if (socketRef && socketRef.current) {
        socketRef.current.disconnect();
    }

    // Step 2: Clear the JWT Token and User Data from the browser
    localStorage.removeItem('token');
    localStorage.removeItem('user'); // Or whatever key you used to save the user object

    // Step 3: Show a clean exit message
    toast.success("Logged out successfully. See you next time!");

    // Step 4: Redirect them to the Auth/Login page (Adjust the route if your login is at '/login' instead)
    navigate('/auth'); 
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

const handleUpdatePassword = async (currentPassword, newPassword) => {
    try {
        const response = await fetch('http://localhost:5000/api/auth/update-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user._id, // Pass the logged-in user's ID
                currentPassword,
                newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            toast.success("Password updated securely!");
        } else {
            toast.error(data.msg); // Shows "Incorrect current password", etc.
        }
    } catch (error) {
        toast.error("Failed to update password.");
    }
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
    // Add this new Bouncer function
const handleDeployClick = () => {
    const token = localStorage.getItem('github_token');
    
    if (!token) {
        // ✨ 1. THE MAGIC BREADCRUMB: Saves exactly what room you are in
        localStorage.setItem('returnPath', window.location.pathname);
        
        // 🧳 2. THE SUITCASE: Backup the files for solo-developers!
        // (Make sure your 'files' state variable is accessible in this scope)
        localStorage.setItem('editor_backup', JSON.stringify(files)); 
        
        // 3. Redirect to GitHub login!
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
        const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
        window.location.href = githubUrl;
    } else {
        // 4. If they DO have a token, open your beautiful modal!
        setIsDeployModalOpen(true);
    }
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
  // 💾 RESTORED: Safe Project Save Logic
   // 💾 RESTORED: Safe Project Save Logic
    const saveProject = async () => {
        if (!userId) return toast.error("Guest Mode: Cannot Save.");
        try {
            toast.loading("Saving project...", { id: 'save-toast' });
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

            // 🚨 SENIOR FIX: Point to your existing POST route which already handles Create & Update!
            const res = await fetch(`${backendUrl}/api/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    roomId, 
                    name: `Project ${roomId.slice(0, 4)}`, // Keep a generic name
                    userId, 
                    files 
                })
            });

            if (res.ok) {
                toast.success('Saved Successfully! 💾', { id: 'save-toast' });
            } else {
                const errorData = await res.json();
                throw new Error(errorData.message || "Save failed on server");
            }
        } catch (error) { 
            console.error(error);
            toast.error('Server error while saving.', { id: 'save-toast' }); 
        }
    };
    // Add this inside your EditorPage component
// Ensure this is inside your EditorPage component
const triggerAutoIndex = (fileName, fileContent, roomId) => {
    // 🚨 Access your socket via the ref, not a global variable
    const socket = socketRef.current; 
    
    if (!socket || !roomId) return;

    socket.emit("code-change", {
        projectId: roomId,
        fileName: fileName,
        fileContent: fileContent,
        language: 'javascript'
    });
};
// Inside your Editor.jsx
useEffect(() => {
    // Derive the value safely
    const activeFile = files.find(f => f.name === activeFileName);
    const content = activeFile?.value;

    if (content && roomId) {
        const handler = setTimeout(() => {
            triggerAutoIndex(activeFileName, content, roomId);
        }, 3000); // Debounce: Wait 3 seconds after typing stops

        return () => clearTimeout(handler);
    }
}, [files, activeFileName, roomId]);
    if (!location.state && !userId) return <Navigate to="/" state={{ roomId }} />;

    return (
        <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
            {/* SIDEBAR */}
{/* 🚀 THE SPLIT SIDEBAR ARCHITECTURE */}
<div className="flex h-full shrink-0 z-20 shadow-2xl">
    
    {/* 1️⃣ FIXED ACTIVITY BAR (Always Visible) */}
    <div className="w-16 bg-[#1e1e1e] border-r border-[#333] flex flex-col items-center py-4 gap-2 z-30 justify-between">
        
        {/* Top Section: Logo & Tabs */}
        <div className="flex flex-col items-center gap-4 w-full">
            {/* Sleek Minimal Logo */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#3b82f6] to-[#a855f7] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4 cursor-pointer transform hover:rotate-6 hover:scale-110 transition-all duration-300 shrink-0" title="CodeSync">
                <span className="text-white text-xl font-black">C</span>
            </div>

            {/* Vertical Navigation Icons */}
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
                       onClick={() => {
    if (isActive) {
        // If it's already active, just toggle the drawer open/closed
        setIsSidebarOpen(!isSidebarOpen);
    } else {
        // If it's a different tab, switch to it and force the drawer open
        setActiveSidebarTab(tab.id);
        setIsSidebarOpen(true);
    }
}}
                        className={`relative w-full aspect-square flex flex-col items-center justify-center gap-1 transition-all duration-300 group
                            ${isActive ? 'bg-[#252526]' : 'hover:bg-[#2a2a2a]'}`}
                        title={tab.label}
                    >
                        <Icon 
                            size={18} 
                            className={`transition-all duration-300 
                                ${isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : 'text-gray-500 group-hover:text-gray-300'}`} 
                        />
                        
                        <span className={`text-[8px] font-medium uppercase tracking-[0.1em] transition-colors duration-300
                            ${isActive ? 'text-white' : 'text-gray-500'}`}>
                            {tab.label}
                        </span>
                        
                        {/* Vertical Active Indicator (Left Edge) */}
                        <div className={`absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-500
                            ${isActive ? 'bg-indigo-500 scale-y-100 shadow-[0_0_10px_#6366f1]' : 'bg-transparent scale-y-0'}`} 
                        />
                    </button>
                );
            })}
        </div>

        {/* Bottom Section: Compact Footer Tools */}
        <div className="flex flex-col items-center gap-2 w-full pt-4 border-t border-[#333]/50 relative">
            
            {/* Floating QR Code Modal */}
           {/* 📱 Floating QR Code Modal (Fixed Positioning) */}
{showQR && (
    <div className="fixed bottom-4 left-20 p-3 bg-white rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-fadeIn z-[9999] border border-gray-200 flex flex-col items-center">
        <QRCode value={roomId} size={120} />
        <div className="text-center text-[10px] text-gray-800 font-black uppercase tracking-widest mt-3">
            Scan to Join
        </div>
    </div>
)}

            <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-gray-500 hover:text-white hover:bg-[#2a2a2a] rounded-xl transition-colors w-full flex justify-center" title="Settings">
                <Settings size={18} />
            </button>
            <button onClick={() => setShowQR(!showQR)} className={`p-3 rounded-xl transition-colors w-full flex justify-center ${showQR ? 'bg-[#2a2a2a] text-white' : 'text-gray-500 hover:text-white hover:bg-[#2a2a2a]'}`} title="Room QR Code">
                <QrCode size={18} />
            </button>
            <button onClick={copyRoomId} className="p-3 text-emerald-600/70 hover:text-emerald-400 hover:bg-[#2a2a2a] rounded-xl transition-colors w-full flex justify-center" title="Copy Room ID">
                <Copy size={18} />
            </button>
            <button onClick={() => navigate('/')} className="p-3 text-red-600/70 hover:text-red-400 hover:bg-[#2a2a2a] rounded-xl transition-colors w-full flex justify-center mb-2" title="Leave Room">
                <LogOut size={18} />
            </button>
        </div>
    </div>

    {/* 2️⃣ COLLAPSIBLE DRAWER (Slides Left/Right) */}
    <div className={`
        ${isSidebarOpen ? 'w-64 border-r' : 'w-0 border-r-0'} 
        transition-all duration-300 ease-in-out 
        bg-[#181818] border-[#333] flex flex-col overflow-hidden relative z-20
    `}>
        {/* Drawer Header with Close Button */}
        <div className="flex items-center justify-between px-4 h-[72px] border-b border-[#333]/30 shrink-0 bg-[#1e1e1e]/50 backdrop-blur-sm">
            <span className="text-xs font-black text-gray-300 uppercase tracking-widest">
                {activeSidebarTab === 'files' ? 'Explorer' : activeSidebarTab}
            </span>
            <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-[#2a2a2a] hover:text-white transition-colors border border-transparent hover:border-[#444]"
                title="Collapse Sidebar"
            >
                <PanelLeftClose size={16} />
            </button>
        </div>

        {/* 🚨 EXACT LOGIC RETAINED HERE 🚨 */}
        <div className="flex-1 overflow-y-auto p-2">
            
            {activeSidebarTab === 'files' && (
                <FileSidebar 
                    items={files.map(f => ({ 
                        ...f, 
                        id: f.id || f.name, 
                        type: f.type || 'file',
                        parentId: f.parentId || null
                    }))}
                    clients={clients}
                    onBulkImport={handleBulkImport}
                    currentUser={user?.username}
                    activeFileId={activeFileName} 
                    onFileClick={(id) => {
                        const clickedFile = files.find(f => f.id === id || f.name === id);
                        if (clickedFile) {
                            handleSwitchFile(clickedFile.name);
                        }
                    }}
                    onCreateItem={(type, parentId = null) => {
                        const itemName = prompt(`Enter ${type} name:`);
                        if (itemName) {
                            createNewItem(itemName, type, parentId);
                        }
                    }}
                    onDeleteItem={(id) => {
                        const fileToDelete = files.find(f => f.id === id || f.name === id);
                        if (fileToDelete) {
                            const dummyEvent = { stopPropagation: () => {} };
                            deleteFileHandler(dummyEvent, fileToDelete.name);
                        }
                    }}
                />
            )}

            {activeSidebarTab === 'comments' && (
                <CommentsPanel 
                    comments={comments} 
                    activeLine={activeLine}
                    onLineSelect={handleCommentClick}
                    onAddComment={handleAddComment}
                    onClose={() => setActiveSidebarTab('files')}
                />
            )}

            {activeSidebarTab === 'users' && (
                <div className="grid grid-cols-3 gap-3 p-2">
                    {clients.map((client) => <ClientAvatar key={client.socketId} username={client.username} />)}
                </div>
            )}

            <div className={`h-full flex flex-col ${activeSidebarTab === 'chat' ? 'flex' : 'hidden'}`}>
                {isSocketConnected && socketRef.current && (
                    <Chat socketRef={socketRef} roomId={roomId} username={user?.username} />
                )}
            </div>       

           {activeSidebarTab === 'ai' && (
     <div className="h-full overflow-hidden">
         <AIAnalysisPanel 
             projectId={roomId} 
             activeFile={activeFileName} 
             currentCode={files.find(f => f.name === activeFileName)?.value} 
             language={files.find(f => f.name === activeFileName)?.language || 'javascript'} 
             onApplyCode={(newCode) => { handleCodeChange(newCode); toast.success("Code updated!"); }} 
             insertCodeAtCursor={insertCodeAtCursor} // 👈 Added the Voice-to-Code prop!
             socket={socketRef.current}      // 👈 ADD THIS
    currentUser={user?.username}
         />
     </div>
 )}
        </div>
    </div>
</div>

            {/* MAIN AREA */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1e1e1e] min-w-0">
                {!isSidebarOpen && (
    <button 
        onClick={() => setIsSidebarOpen(true)}
        className="absolute top-4 left-4 z-50 p-2 bg-[#1e1e1e] border border-[#333] rounded-md text-gray-400 hover:text-white shadow-xl animate-fadeIn"
    >
        <PanelLeftOpen size={20} />
    </button>
)}
            {isOffline && (
                    <div className="bg-red-600 text-white text-xs font-bold py-1 px-4 flex justify-center items-center gap-2 animate-pulse z-50">
                        <span>⚠️</span>
                        Connection lost. Changes will not be saved or synced until you reconnect.
                    </div>
                )}
                <div className="h-12 bg-[#1e1e1e] flex items-center justify-between px-4 border-b border-[#333]">
                    <div className="flex gap-2 items-center">
{/* 🚀 Premium Dashboard Button (Logic Preserved!) */}
<button 
    onClick={() => navigate('/dashboard', { state: { user: user || getSavedUser() } })} 
    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-400 bg-[#252526] hover:bg-[#2a2a2a] hover:text-white rounded-lg transition-all border border-[#333] hover:border-[#555] shadow-sm group mr-4 shrink-0"
>
    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform text-indigo-400" />
    Dashboard
</button>                        <div className="flex bg-[#252526] rounded-md p-1 border border-[#333]">
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
                        
{/* Replace your old button with this one */}
<button 
    onClick={handleDeployClick} 
    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all active:scale-95"
>
    Github
</button>  
{/* ✨ THE SUBMIT FIX BUTTON (Only shows if this project is a fork) */}
{currentProjectMetadata?.isFork && (
    <button 
        onClick={() => setIsSubmitFixModalOpen(true)} 
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all animate-pulse shadow-emerald-500/20"
    >
        <GitPullRequest size={14} /> Submit Fix
    </button>
)}

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
                            {isDbLoaded ? (
                            <Editor 
                                editorRef={editorRef} // 🚨 IMPORTANT: You must pass the ref inside your Editor.jsx component's onMount prop!
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
                                socket={socketRef.current} 
                                activeFileName={activeFileName}
    username={user?.username || "Anonymous"}
                                theme={editorTheme} fontSize={editorFontSize} fontFamily={editorFontFamily} wordWrap={editorWordWrap}
                            />
                            ) : (
            <div className="flex flex-col items-center justify-center h-full w-full text-gray-500 bg-[#1e1e1e]">
                <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-sm font-bold tracking-widest uppercase">Syncing Workspace...</p>
            </div>
        )}
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
                                    <pre className={`flex-1 p-2 text-xs font-mono overflow-auto whitespace-pre-wrap ${output?.includes("Error") ? "text-red-400" : "text-blue-300"}`}>{output || "..."}</pre>
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
                <SubmitFixModal 
    isOpen={isSubmitFixModalOpen}
    onClose={() => setIsSubmitFixModalOpen(false)}
    files={files}
    projectMetadata={currentProjectMetadata}
    currentUser={user}
/>
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
                    activeScreenSharer={activeScreenSharer} 
    username={user?.username}
                />
            )}
            
<SettingsModal 
    isOpen={isSettingsOpen} 
    onClose={() => setIsSettingsOpen(false)} 
    user={user} // 👈 Pass the full user object so the email displays!
    onSaveSettings={(settings) => { 
        setEditorTheme(settings.theme); 
        setEditorFontSize(parseInt(settings.fontSize)); 
        setEditorFontFamily(settings.fontFamily); 
        setEditorWordWrap(settings.wrapText); 
        toast.success("Settings Updated! 🎨"); 
    }} 
    onUpdatePassword={handleUpdatePassword} // 👈 Add the password handler
    onLogout={handleLogout}                 // 👈 Add the logout handler
/>  

 {isDeployModalOpen && (
    <DeployModal 
        isOpen={isDeployModalOpen} 
        onClose={() => setIsDeployModalOpen(false)} 
        files={files} 
        // 👇 Add this so the modal doesn't crash looking for project details
        project={{ 
            title: "My CodeSync Project", 
            roomId: roomId // (Make sure you pass your roomId here!)
        }} 
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