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
const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    python: "3.10.0",
    java: "15.0.2",
    c: "10.2.0",
    cpp: "10.2.0",
    php: "8.2.3"
};

const EditorPage = () => {
    // --- 1. HOOKS ---
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    
    // --- 2. REFS ---
    const socketRef = useRef(null);
    const peersRef = useRef([]);
    const userVideo = useRef();
    const userStream = useRef();

    // --- 3. FILES STATE (Must be unique!) ---
    const [files, setFiles] = useState(() => {
        if (location.state?.templateFiles) {
            return location.state.templateFiles;
        }
        return [
            { name: 'main.js', language: 'javascript', value: '// Write JS here\nconsole.log("Hello World");' },
            { name: 'index.html', language: 'html', value: '\n<div class="container">\n  <h1>Hello World 🌍</h1>\n  <p>Live Preview Active!</p>\n</div>' },
            { name: 'style.css', language: 'css', value: 'body { font-family: sans-serif; background: #222; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; } \n.container { text-align: center; border: 2px solid tomato; padding: 20px; border-radius: 10px; } \nh1 { color: tomato; }' },
            { name: 'script.js', language: 'javascript', value: 'console.log("Loaded script.js");' }
        ];
    });

    // --- 4. ACTIVE FILE STATE ---
    const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'main.js');

    // --- 5. DEPENDENT REFS ---
    const activeFileNameRef = useRef(activeFileName); 
    const codeRef = useRef(files[0]?.value || '');

    // --- 6. SETTINGS STATE ---
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editorTheme, setEditorTheme] = useState('dracula');
    const [editorFontSize, setEditorFontSize] = useState(16);
    const [editorFontFamily, setEditorFontFamily] = useState('monospace'); 
    const [editorWordWrap, setEditorWordWrap] = useState(false);
const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    // ... continue with the rest of your component logic ...
   // ✅ MODIFIED: Check for template files first!
    // 🔍 DEBUG: See if template data arrived
// 1. Get the files first (so we know what names are available)

    // 2. Initialize activeFileName to the FIRST file in the list
    
    // 3. Ensure the CodeRef starts with the correct content too!

    // ⏳ TIME TRAVEL STATE
    const [isTimeTravelActive, setIsTimeTravelActive] = useState(false);
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const savedLiveCodeRef = useRef(null); 
    const isTimeTravelActiveRef = useRef(false); 
    const fileHistoryRef = useRef({ 
        'main.js': ['// Write JS here\nconsole.log("Hello World");']
    });




    
    // UI State
    const [activeSidebarTab, setActiveSidebarTab] = useState('files');
    const [activeMainView, setActiveMainView] = useState('editor');
    // Bottom Tab State (Console vs Web)
    const [activeBottomTab, setActiveBottomTab] = useState('console');
    // ✅ NEW: Resizable Console State & Logic
    // const [consoleHeight, setConsoleHeight] = useState(250); // Default height
    const [isResizing, setIsResizing] = useState(false);
const [layoutMode, setLayoutMode] = useState('bottom'); // 'bottom' or 'side'
    const [consoleSize, setConsoleSize] = useState(250);
// ✅ REPLACE YOUR EXISTING MOUSE DOWN LOGIC WITH THIS
// ✅ CORRECT HANDLERS
const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true); // Fixed: Was setIsDragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
};


   // ✅ REPLACE YOUR MOUSE MOVE LOGIC
const handleMouseMove = (e) => {
    if (layoutMode === 'bottom') {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight > 50 && newHeight < window.innerHeight * 0.8) {
            setConsoleSize(newHeight);
        }
    } else {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < window.innerWidth * 0.5) {
            setConsoleSize(newWidth);
        }
    }
};

    // ✅ REPLACE YOUR MOUSE UP LOGIC
const stopResizing = () => {
    setIsResizing(false); // Fixed: Was setIsDragging
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
};
   // ✅ ADD THIS CLEANUP EFFECT INSTEAD
useEffect(() => {
    // Just a safety cleanup in case the user leaves the page while dragging
    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    };
}, []);

    const [isCreatingFile, setIsCreatingFile] = useState(false);
    const [newFileName, setNewFileName] = useState("");
    const [customInput, setCustomInput] = useState("");
    const [clients, setClients] = useState([]);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [comments, setComments] = useState([]);
    const [activeLine, setActiveLine] = useState(null);
const [liveRepoUrl, setLiveRepoUrl] = useState(null);
    // Web Preview State
    const [srcDoc, setSrcDoc] = useState('');
    // Add state for stream
    const [stream, setStream] = useState(null);
    // Video/Socket State
    const [peers, setPeers] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);

    // User Info
    const getSavedUser = () => {
        try { return JSON.parse(localStorage.getItem('userInfo')); } catch { return null; }
    };
    const savedUser = getSavedUser();
    const user = location.state?.user || (location.state?.username ? location.state : savedUser);
    const userId = location.state?.userId || user?.user?._id || user?._id || user?.id;
    const isHost = location.state?.isHost || !!userId;

    // --- 3. EFFECTS ---

    // Get Media on mount
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
            })
            .catch(err => console.error("Media Error:", err));
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const htmlFile = files.find(f => f.name === 'index.html') || files.find(f => f.name.endsWith('.html'));
            const cssFile = files.find(f => f.name === 'style.css');
            const jsFile = files.find(f => f.name === 'script.js');

            if (htmlFile) {
                const htmlContent = htmlFile.value;
                const cssContent = cssFile ? `<style>${cssFile.value}</style>` : '';
                const jsContent = jsFile ? `<script>${jsFile.value}</script>` : '';

                setSrcDoc(`
                    <!DOCTYPE html>
                    <html>
                        <head>
                            ${cssContent}
                        </head>
                        <body>
                            ${htmlContent}
                            ${jsContent}
                        </body>
                    </html>
                `);
            }
        }, 500); 

        return () => clearTimeout(timeout);
    }, [files]);

    useEffect(() => {
        activeFileNameRef.current = activeFileName;
    }, [activeFileName]);

    useEffect(() => {
        isTimeTravelActiveRef.current = isTimeTravelActive;
    }, [isTimeTravelActive]);

    useEffect(() => {
        if (!userId && !location.state?.username) {
            toast.error("Session expired. Please login.");
            navigate('/');
        }
    }, [userId, navigate, location.state]);

  useEffect(() => {
    const loadProject = async () => {
        try {
            // 1. Try to fetch existing project
            const response = await fetch(`http://127.0.0.1:5000/api/projects/${roomId}`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.files && data.files.length > 0) {
                    setFiles(data.files);
                    setActiveFileName(data.files[0].name);
                    codeRef.current = data.files[0].value;
                    if (data.githubUrl) setLiveRepoUrl(data.githubUrl);
                    toast.success("Project Loaded");
                }
            } else if (response.status === 404) {
                // ✅ 2. IF NOT FOUND: Automatically create it so Deploy works later
                console.log("🆕 New Room detected. Initializing in DB...");
                await fetch('http://127.0.0.1:5000/api/projects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        roomId, 
                        name: `Project ${roomId.slice(0, 4)}`, 
                        userId, 
                        files 
                    })
                });
            }
        } catch (error) { 
            console.error("Error loading/initializing project:", error); 
        }
    };
    if (roomId && userId) loadProject();
}, [roomId, userId]); // Add userId to dependency
useEffect(() => {
    const handleSave = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            // ... your existing save logic ...
            updateActivity(); // ✅ TRIGGER THE UPDATE
        }
    };
    window.addEventListener('keydown', handleSave);
    return () => window.removeEventListener('keydown', handleSave);
}, []);
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));
            setIsSocketConnected(true);

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Connection failed, try again later.');
                navigate('/');
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                userStream.current = stream;
                if (userVideo.current) {
                    userVideo.current.srcObject = stream;
                    userVideo.current.muted = true;
                }
                joinRoom(stream);
            } catch (err) {
                toast.error("Could not access Camera/Mic. Joining without video.");
                joinRoom(null);
            }

            socketRef.current.on('comment:new', (newComment) => {
                setComments((prev) => [...prev, newComment]);
                toast(`${newComment.username} commented on line ${newComment.line}`, { icon: '💬' });
            });

            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ fileName, code }) => {
                if (!fileHistoryRef.current[fileName]) {
                    fileHistoryRef.current[fileName] = [];
                }
                fileHistoryRef.current[fileName].push(code);

                setFiles(prevFiles => prevFiles.map(file => 
                    file.name === fileName ? { ...file, value: code } : file
                ));

                if (fileName === activeFileNameRef.current) {
                    if (!isTimeTravelActiveRef.current) {
                        codeRef.current = code;
                    }
                }
            });

            socketRef.current.on(ACTIONS.FILE_CREATED, ({ files: remoteFiles }) => {
                setFiles(currentFiles => {
                     const newFiles = [...currentFiles];
                     remoteFiles.forEach(rf => {
                         if (!newFiles.some(cf => cf.name === rf.name)) {
                             newFiles.push(rf);
                             if(!fileHistoryRef.current[rf.name]) fileHistoryRef.current[rf.name] = [rf.value];
                         }
                     });
                     return newFiles;
                });
                toast.success("New file created by peer");
            });

            socketRef.current.on(ACTIONS.FILE_DELETED, ({ files: updatedFiles }) => {
                setFiles(updatedFiles);
                const currentFile = activeFileNameRef.current;
                const stillExists = updatedFiles.some(f => f.name === currentFile);
                if (!stillExists && updatedFiles.length > 0) {
                    const firstFile = updatedFiles[0];
                    setActiveFileName(firstFile.name);
                    codeRef.current = firstFile.value;
                    toast("Current file was deleted by peer");
                }
            });

            socketRef.current.on(ACTIONS.SYNC_CODE, ({ files: syncedFiles }) => {
                 if (syncedFiles && syncedFiles.length > 0) {
                     setFiles(syncedFiles);
                     syncedFiles.forEach(f => {
                         if(!fileHistoryRef.current[f.name]) fileHistoryRef.current[f.name] = [f.value];
                     });

                     const currentFile = activeFileNameRef.current;
                     if (!syncedFiles.find(f => f.name === currentFile)) {
                         const firstFile = syncedFiles[0];
                         setActiveFileName(firstFile.name);
                         codeRef.current = firstFile.value;
                     }
                 }
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left.`);
                setClients((prev) => prev.filter((client) => client.socketId !== socketId));
                const peerObj = peersRef.current.find(p => p.peerID === socketId);
                if(peerObj) peerObj.peer.destroy();
                const newPeers = peersRef.current.filter(p => p.peerID !== socketId);
                peersRef.current = newPeers;
                setPeers(newPeers.map(p => p.peer));
            });

            socketRef.current.on('all-users', users => {
                if(!userStream.current) return;
                const peersList = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, userStream.current);
                    peersRef.current.push({ peerID: userID, peer });
                    peersList.push(peer);
                });
                setPeers(peersList);
            });

            socketRef.current.on('user-joined', payload => {
                if(!userStream.current) return;
                const peer = addPeer(payload.signal, payload.callerID, userStream.current);
                peersRef.current.push({ peerID: payload.callerID, peer });
                setPeers(users => [...users, peer]);
            });

            socketRef.current.on('receiving-returned-signal', payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                if(item) item.peer.signal(payload.signal);
            });
        };
          
        const joinRoom = (stream) => {
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username || user?.username,
            });

            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== (location.state?.username || user?.username)) {
                    toast.success(`${username} joined.`);
                    socketRef.current.emit(ACTIONS.SYNC_CODE, { files, socketId });
                }
                setClients(clients);
            });
        };

        if(roomId) init();
        return () => {
            if(socketRef.current) socketRef.current.disconnect();
            if(userStream.current) userStream.current.getTracks().forEach(track => track.stop());
        };
    }, []);


      const downloadZip = async () => {
        const zip = new JSZip();
        
        // Add all files to the zip folder
        files.forEach(file => {
            zip.file(file.name, file.value);
        });

        // Generate the zip file
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `CodeSync-Project-${roomId}.zip`);
        toast.success("Project downloaded! 📦");

    };
    // Add this inside EditorPage component
const updateActivity = async () => {
    if (!location.state?.userId) return;
    
    try {
        await fetch('http://127.0.0.1:5000/api/users/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: location.state.userId })
        });
        console.log("⏱️ Hours updated!");
    } catch (err) {
        console.error("Failed to update activity", err);
    }
};
    // --- 4. HELPER FUNCTIONS ---

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

    // SENDER: Handle code changes 
    const handleCodeChange = (newCode) => {
        // STOP IMMEDIATELY if we are time traveling
        if (isTimeTravelActiveRef.current) return;

        // 1. Capture History
        if (!fileHistoryRef.current[activeFileName]) {
            fileHistoryRef.current[activeFileName] = [];
        }
        fileHistoryRef.current[activeFileName].push(newCode);

        // 2. Update Reference & State
        codeRef.current = newCode;
        setFiles(prevFiles => prevFiles.map(f => 
            f.name === activeFileName ? { ...f, value: newCode } : f
        ));

        // 3. Emit
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                fileName: activeFileName,
                code: newCode,
            });
        }
    };

    // TIME TRAVEL HELPERS (STASH STRATEGY)
    const toggleTimeTravel = () => {
        if (!isTimeTravelActive) {
            // --- ENTERING HISTORY MODE ---
            
            // 1. STASH THE LIVE CODE (The Truth)
            savedLiveCodeRef.current = codeRef.current; 

            // 2. Ensure History has this latest version too
            const history = fileHistoryRef.current[activeFileName] || [];
            if (history.length === 0 || history[history.length - 1] !== codeRef.current) {
                history.push(codeRef.current);
                fileHistoryRef.current[activeFileName] = history;
            }

            if(history.length === 0) return toast.error("No history yet!");
            
            setPlaybackIndex(history.length - 1);
            setIsTimeTravelActive(true);
            toast("🔴 Time Travel Active");

        } else {
            // --- EXITING HISTORY MODE ---
            
            setIsTimeTravelActive(false);
            toast("🟢 Back to Live Editing");
            
            // RESTORE FROM STASH (Not History)
            const originalCode = savedLiveCodeRef.current;

            if (originalCode !== null) {
                codeRef.current = originalCode;
                setFiles(prev => prev.map(f => 
                    f.name === activeFileName ? { ...f, value: originalCode } : f
                ));
            }
        }
    };

    const handleTimeTravelChange = (e) => {
        setPlaybackIndex(parseInt(e.target.value));
    };

    const switchFile = (fileName) => {
        setActiveFileName(fileName);
        setIsTimeTravelActive(false);
        
        // AUTO-SWITCH TABS: If html/css/js, show preview
        if (fileName.endsWith('.html') || fileName.endsWith('.css') || fileName.endsWith('.js')) {
            setActiveBottomTab('preview');
        } else {
            setActiveBottomTab('console');
        }

        const fileToLoad = files.find(f => f.name === fileName);
        if (fileToLoad) {
            codeRef.current = fileToLoad.value;
        }
    };

    const toggleMute = () => {
        if(userStream.current) {
            userStream.current.getAudioTracks()[0].enabled = !userStream.current.getAudioTracks()[0].enabled;
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if(userStream.current) {
            userStream.current.getVideoTracks()[0].enabled = !userStream.current.getVideoTracks()[0].enabled;
            setIsVideoOff(!isVideoOff);
        }
    };

    const handleAddComment = (text, line) => {
        const newComment = {
            username: location.state?.username || user?.username || 'Guest',
            text, line, timestamp: Date.now()
        };
        setComments((prev) => [...prev, newComment]);
        if(socketRef.current) socketRef.current.emit('comment:new', { roomId, comment: newComment });
    };

    const saveProject = async () => {
        if (!userId) return toast.error("Guest Mode: Cannot Save.");
        const updatedFiles = files.map(f => f.name === activeFileName ? {...f, value: codeRef.current} : f);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, name: `Project ${roomId.slice(0, 4)}`, userId, files: updatedFiles })
            });
            response.ok ? toast.success('Saved! 💾') : toast.error('Save failed.');
        } catch (error) { toast.error('Server error.'); }
    };

    const createNewFile = () => {
        if (!newFileName) return setIsCreatingFile(false);
        if (files.some(f => f.name === newFileName)) {
            toast.error("File already exists!");
            return;
        }
        
        let language = 'javascript';
        let value = `// ${newFileName}`; 

        // Auto-fill templates
        if (newFileName.endsWith('.html')) {
            language = 'html';
            value = `<!DOCTYPE html>\n<html>\n<head>\n\t<title>Page</title>\n</head>\n<body>\n\t<h1>Hello World</h1>\n</body>\n</html>`;
        } else if (newFileName.endsWith('.css')) {
            language = 'css';
            value = `body { background: #fff; }`;
        } else if (newFileName.endsWith('.java')) {
            language = 'java';
            value = `public class ${newFileName.split('.')[0]} {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`;
        } else if (newFileName.endsWith('.py')) language = 'python';
        
        const newFile = { name: newFileName, language, value };
        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        socketRef.current.emit(ACTIONS.FILE_CREATED, { roomId, files: updatedFiles });
        setNewFileName("");
        setIsCreatingFile(false);
        fileHistoryRef.current[newFileName] = [value];
        toast.success("File created!");
    };

    const deleteFile = (e, fileNameToDelete) => {
        e.stopPropagation(); 
        if (files.length === 1) return toast.error("Cannot delete the last file!");
        const updatedFiles = files.filter(f => f.name !== fileNameToDelete);
        setFiles(updatedFiles);
        if (activeFileName === fileNameToDelete) {
            setActiveFileName(updatedFiles[0].name);
            codeRef.current = updatedFiles[0].value;
        }
        socketRef.current.emit(ACTIONS.FILE_DELETED, { roomId, files: updatedFiles });
        toast.success("File deleted");
    };

    const runCode = async () => {
        setIsRunning(true);
        setActiveBottomTab('console'); 
        const currentFile = files.find(f => f.name === activeFileName);
        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: currentFile.language,
                    version: LANGUAGE_VERSIONS[currentFile.language],
                    files: [{ content: codeRef.current || '' }],
                    stdin: customInput, 
                }),
            });
            const result = await response.json();
            if(result.run) {
                setOutput(result.run.output);
                if(result.run.stderr) toast.error("Runtime Error");
            } else {
                toast.error("Execution failed");
            }
        } catch (error) { toast.error("Network Error"); } 
        finally { setIsRunning(false); }
    };

    const handleDashboardNavigation = () => {
        navigate('/dashboard', { state: { user: user || getSavedUser() } });
    };

    async function copyRoomId() {
        try { await navigator.clipboard.writeText(roomId); toast.success('Room ID copied'); } 
        catch (err) { toast.error('Could not copy Room ID'); }
    }

    if (!location.state && !userId) return <Navigate to="/" state={{ roomId }} />;

    return (
        <div className="flex h-screen bg-[#1e1e1e] text-white overflow-hidden">
            <aside className="w-80 bg-[#181818] border-r border-[#333] flex flex-col z-20 shrink-0 shadow-2xl">
                <div className="p-4 border-b border-[#333] flex items-center gap-2">
                    <img className="w-8" src="/code-sync.png" alt="logo" />
                    <span className="font-bold text-lg">CodeSync</span>
                </div>
                <div className="flex border-b border-[#333] bg-[#252526]">
                    <button onClick={() => setActiveSidebarTab('files')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'files' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`} title="Files">📁</button>
                    <button onClick={() => setActiveSidebarTab('users')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'users' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`} title="Users">👥</button>
                    <button onClick={() => setActiveSidebarTab('chat')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'chat' ? 'text-green-400 border-b-2 border-green-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`} title="Chat">💬</button>
                    <button onClick={() => setActiveSidebarTab('ai')} className={`flex-1 p-3 text-sm transition-colors ${activeSidebarTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400 bg-[#1e1e1e]' : 'text-gray-400 hover:bg-[#2a2a2a]'}`} title="AI Doctor">⚡</button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {activeSidebarTab === 'files' && (
                        <div className="flex flex-col gap-1">
                             <div className="flex justify-between items-center px-2 py-1 mb-1">
                                <div className="text-xs text-gray-500 uppercase font-bold">Explorer</div>
                                <button onClick={() => setIsCreatingFile(true)} className="text-gray-400 hover:text-white text-lg font-bold p-1" title="New File">+</button>
                             </div>
                             {isCreatingFile && (
                                <div className="flex items-center px-2 mb-2 animate-fadeIn">
                                    <span className="text-gray-400 mr-1">📄</span>
                                    <input 
                                            autoFocus
                                            className="bg-[#333] text-white text-xs p-1 rounded w-full outline-none border border-blue-500"
                                            value={newFileName}
                                            onChange={(e) => setNewFileName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') createNewFile();
                                                if (e.key === 'Escape') setIsCreatingFile(false);
                                            }}
                                            onBlur={() => setIsCreatingFile(false)}
                                            placeholder="index.html"
                                    />
                                </div>
                             )}
                            {files.map((file, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => switchFile(file.name)} 
                                    className={`group p-2 text-left rounded text-sm flex items-center justify-between cursor-pointer transition-colors ${
                                        activeFileName === file.name
                                        ? 'bg-[#37373d] text-white border-l-2 border-green-500' 
                                        : 'text-gray-400 hover:bg-[#2a2a2a]'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="opacity-50 font-mono text-xs">
                                            {file.language === 'javascript' ? 'JS' : 
                                             file.language === 'python' ? 'PY' : 
                                             file.language === 'html' ? 'HTML' :
                                             file.language === 'css' ? 'CSS' :
                                             file.language === 'java' ? 'JV' : 'TXT'}
                                        </span>
                                        <span className="truncate">{file.name}</span>
                                    </div>
                                    <button 
                                        onClick={(e) => deleteFile(e, file.name)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity p-1 rounded hover:bg-[#252526]"
                                        title="Delete File"
                                    >
                                        🗑
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setActiveSidebarTab('comments')} className="mt-4 p-2 text-left rounded text-sm text-gray-400 hover:bg-[#2a2d2e] border-t border-[#333] flex gap-2 w-full">
                                📝 View Comments ({comments.length})
                            </button>
                        </div>
                    )}
                    {activeSidebarTab === 'users' && (
                        <div className="grid grid-cols-3 gap-3 p-2">
                            {clients.map((client) => <ClientAvatar key={client.socketId} username={client.username} />)}
                        </div>
                    )}
                    {activeSidebarTab === 'chat' && (
                         <div className="h-full flex flex-col">
                            <Chat socketRef={socketRef} roomId={roomId} username={location.state?.username || user?.username} />
                         </div>
                    )}
                    {activeSidebarTab === 'ai' && (
                         <div className="h-full overflow-hidden">
                             <AIAnalysisPanel 
                                currentCode={files.find(f => f.name === activeFileName)?.value} 
                                language={files.find(f => f.name === activeFileName)?.language || 'javascript'} 
                                onApplyCode={(newCode) => {
                                    handleCodeChange(newCode); 
                                    toast.success("Code updated!");
                                }}
                            />
                         </div>
                    )}
                    {activeSidebarTab === 'comments' && (
                        <CommentsPanel comments={comments} activeLine={activeLine} onAddComment={handleAddComment} />
                    )}
                </div>

                <div className="p-4 border-t border-[#333] flex flex-col gap-2 bg-[#181818]">
                    <button className="btn bg-[#333] hover:bg-[#444] text-white py-2 rounded text-sm" onClick={() => setShowQR(!showQR)}>{showQR ? 'Hide QR' : 'Show QR'}</button>
                    {showQR && <div className="p-2 bg-white rounded flex justify-center"><QRCode value={roomId} size={100} /></div>}
                    <div className="flex gap-2">
                        <button className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded text-sm font-bold" onClick={copyRoomId}>Copy ID</button>
                        <button className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded text-sm font-bold" onClick={() => navigate('/')}>Leave</button>
                    </div>
                </div>

                <div className="p-2 border-t border-[#333]">
                     <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full p-3 flex items-center gap-3 text-gray-400 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                     >
                        <span className="text-xl">⚙️</span>
                        <span className="text-sm font-bold">Settings</span>
                     </button>
                </div>

            
            </aside>

            <main className="flex-1 flex flex-col relative overflow-hidden bg-[#1e1e1e] min-w-0">
                <div className="h-12 bg-[#1e1e1e] flex items-center justify-between px-4 border-b border-[#333]">
                    <div className="flex gap-2 items-center">
                         <button onClick={handleDashboardNavigation} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs transition-colors mr-4">⬅ Dashboard</button>
                        <div className="flex bg-[#252526] rounded-md p-1 border border-[#333]">
                            <button onClick={() => setActiveMainView('editor')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'editor' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                &lt;/&gt; Code
                            </button>
                            <button onClick={() => setActiveMainView('board')} className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${activeMainView === 'board' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                🎨 Whiteboard
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <button 
                             onClick={toggleTimeTravel} 
                             className={`px-3 py-1 rounded-sm text-xs font-bold transition-all ${isTimeTravelActive ? 'bg-red-600 animate-pulse' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                          >
                            {isTimeTravelActive ? 'Exit Replay' : '🕒 History'}
                          </button>
                          {/* Inside your Editor Header JSX */}
<div className="flex items-center gap-3">
    {liveRepoUrl && (
        <a 
            href={liveRepoUrl} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold animate-fadeIn hover:bg-green-500/20 transition-all"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            LIVE ON GITHUB
        </a>
    )}
    
</div>
<button 
    onClick={() => setIsDeployModalOpen(true)}
    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all active:scale-95"
>
    <span>🚀</span> Deploy
</button>

<button 
                              onClick={downloadZip}
                              className="px-3 py-1 rounded-sm text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-colors"
                          >
                              📥 Download
                          </button>
    
                          {isHost && <button className="px-3 py-1 rounded-sm text-xs font-bold bg-[#333] hover:bg-[#444] text-white border border-gray-600" onClick={saveProject}>💾 Save</button>}
                          <button className={`px-5 py-1 rounded-sm text-xs font-bold flex items-center gap-2 ${isRunning ? 'bg-gray-600' : 'bg-green-600 hover:bg-green-700'}`} onClick={runCode} disabled={isRunning}>{isRunning ? 'Running...' : '▶ Run'}</button>
                    </div>
                </div>

                {/* ✅ UPDATED MAIN AREA WITH DRAGGABLE CONSOLE */}
                <div 
                    className="flex-1 flex overflow-hidden relative"
                    style={{ flexDirection: layoutMode === 'bottom' ? 'column' : 'row' }} 
                >
                <div className={`flex-1 flex flex-col relative ${activeMainView === 'editor' ? 'flex' : 'hidden'}`}>
                    
                    {/* 1. EDITOR AREA */}
                    <div className="flex-1 relative overflow-hidden flex flex-col">
                        <div className="flex-1 relative">
                             <Editor 
    // ⬇️ THE KEY FIX: Forces React to re-build the editor when settings change
    key={`${activeFileName}-${editorTheme}-${editorFontSize}-${editorFontFamily}-${editorWordWrap}`} 
    
    socketRef={socketRef} 
    roomId={roomId} 
    language={files.find(f => f.name === activeFileName)?.language || 'javascript'}
    code={
        isTimeTravelActive 
        ? (fileHistoryRef.current[activeFileName]?.[playbackIndex] || '') 
        : (files.find(f => f.name === activeFileName)?.value || '')
    } 
    onCodeChange={handleCodeChange}
    onLineSelect={(line, forceOpen) => { setActiveLine(line); if (forceOpen) setActiveSidebarTab('comments'); }}
    comments={comments} 
    
    // Pass the settings props
    theme={editorTheme}
    fontSize={editorFontSize}
    fontFamily={editorFontFamily}
    wordWrap={editorWordWrap}
/>
                         </div>
                         
                         {/* Time Travel Controls */}
                         {isTimeTravelActive && (
                             <div className="h-12 bg-[#252526] border-t border-[#333] flex items-center px-4 gap-4 z-20 shadow-xl shrink-0">
                                <span className="text-xs font-bold text-red-400 whitespace-nowrap min-w-[100px]">
                                    REPLAY: {playbackIndex + 1} / {fileHistoryRef.current[activeFileName]?.length || 0}
                                </span>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max={(fileHistoryRef.current[activeFileName]?.length || 1) - 1} 
                                    value={playbackIndex} 
                                    onChange={handleTimeTravelChange}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400"
                                />
                             </div>
                         )}

                         {/* 🛡️ INVISIBLE OVERLAY: Prevents iframe/editor from swallowing mouse events during drag */}
                         {isResizing && <div className="absolute inset-0 z-50 cursor-row-resize bg-transparent" />}
                    </div>

                    {/* ✅ 2. DRAGGABLE SPLITTER BAR */}
                    <div 
                        onMouseDown={startResizing}
                        className="h-2 bg-[#1e1e1e] hover:bg-[#007acc] border-t border-[#333] cursor-row-resize flex items-center justify-center transition-colors z-40 shrink-0"
                    >
                        <div className="w-10 h-1 bg-gray-600 rounded-full pointer-events-none"></div>
                    </div>

                    {/* ✅ 3. CONSOLE AREA (Dynamic Height) */}
                    <div 
                        style={{ height: `${consoleHeight}px` }} 
                        className="bg-[#1e1e1e] flex flex-col z-30 shrink-0 relative"
                    >
                        {/* Tab Headers */}
                        <div className="flex justify-between items-center bg-[#252526] border-b border-[#333]">
                            <div className="flex">
                                <button 
                                    onClick={() => setActiveBottomTab('console')}
                                    className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'console' ? 'text-white border-b-2 border-blue-500 bg-[#1e1e1e]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Console (Stdin/Stdout)
                                </button>
                                <button 
                                    onClick={() => setActiveBottomTab('preview')}
                                    className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${activeBottomTab === 'preview' ? 'text-white border-b-2 border-orange-500 bg-[#1e1e1e]' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    🌐 Web Preview
                                </button>
                            </div>
                            <button onClick={() => setOutput("")} className="px-4 text-xs text-gray-500 hover:text-gray-300">Clear</button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* CONSOLE TAB */}
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

                            {/* WEB PREVIEW TAB */}
                            <div className={`w-full h-full bg-white ${activeBottomTab === 'preview' ? 'block' : 'hidden'}`}>
                                <iframe 
                                    srcDoc={srcDoc} 
                                    title="output" 
                                    sandbox="allow-scripts"
                                    className="w-full h-full border-none" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`absolute inset-0 z-40 bg-white h-full w-full overflow-hidden ${activeMainView === 'board' ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'}`}>
                    <div className="absolute top-4 left-4 z-50">
                        <button onClick={() => setActiveMainView('editor')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow-xl flex items-center gap-2 transition-all">⬅ Back to Code</button>
                    </div>
                    {isSocketConnected && socketRef.current && (
                         <Whiteboard socket={socketRef.current} roomId={roomId} />
                    )}
                </div>
                </div>
            </main>
           {/* ✅ FIXED DEPLOY MODAL INTEGRATION */}
{isDeployModalOpen && (
    <DeployModal 
        project={{ 
            title: `Project-${roomId.slice(0, 5)}`, 
            code: files.find(f => f.name === activeFileName)?.value || '', 
            language: files.find(f => f.name === activeFileName)?.language || 'javascript',
            roomId: roomId // ✅ Pass roomId so it can be saved to MongoDB
        }} 
        // ✅ PASS THE FUNCTION HERE
        onSuccess={(url) => setLiveRepoUrl(url)} 
        onClose={() => setIsDeployModalOpen(false)} 
    />
)}
            {isShareModalOpen && <ShareSnippetModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} code={files.find(f => f.name === activeFileName)?.value} language={files.find(f => f.name === activeFileName)?.language} />}
                {stream && socketRef.current && (
                <VideoChat 
                    socketRef={socketRef} 
                    roomId={roomId} 
                    stream={stream} 
                />
            )}
<SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                user={{ username: location.state?.username }} 
                onSaveSettings={(settings) => {
                    console.log("✅ PARENT RECEIVED SETTINGS:", settings);
                    
                    // Apply State Changes
                    setEditorTheme(settings.theme);
                    setEditorFontSize(parseInt(settings.fontSize));
                    setEditorFontFamily(settings.fontFamily);
                    setEditorWordWrap(settings.wrapText); // 👈 Apply Word Wrap
                    
                    toast.success("Settings Updated! 🎨");
                }}
            />
        </div>
    );
};

export default EditorPage;