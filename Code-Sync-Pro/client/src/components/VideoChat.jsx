import React, { useEffect, useRef, useState } from 'react';
import Video from './Video'; 
import { ACTIONS } from '../Actions';
import Draggable from 'react-draggable';
import Peer from 'simple-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, ChevronDown, Sparkles, Circle, Clock } from 'lucide-react';

// 🎙️ Audio Visualizer Component
const AudioVisualizer = ({ stream, onVolumeChange }) => {
    const [volume, setVolume] = useState(0);
    const audioContextRef = useRef(null);
    const analyzerRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) return;
        try {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyzerRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyzerRef.current);
            analyzerRef.current.fftSize = 256;
            const bufferLength = analyzerRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const updateVolume = () => {
                if (!analyzerRef.current) return;
                analyzerRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength;
                setVolume(avg);
                if (onVolumeChange) onVolumeChange(avg); 
                animationRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (err) { console.error("Visualizer Error:", err); }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [stream, onVolumeChange]);

    return (
        <div className="flex gap-0.5 items-end h-3 w-6 px-1 ml-1">
            {[1, 2, 3].map((i) => (
                <div key={i} className="w-1 bg-green-500 rounded-full transition-all duration-75"
                    style={{ height: `${Math.min(100, (volume / 50) * 100 * (i * 0.3))}%` }}
                />
            ))}
        </div>
    );
};

const VideoChat = ({ 
    socketRef, stream, isScreenSharing, onEndCall, peersRef, 
    onToggleMic, onToggleCamera, onToggleScreenShare,
    isMuted, isVideoOff, clients,activeScreenSharer,
    username,
    isRecording, startRecording, stopRecording, getNetworkStats, toggleBlur, isBlurred
}) => {
    const [peers, setPeers] = useState([]);
    const [networkHealth, setNetworkHealth] = useState({});
    const isSetupRef = useRef(false);
    const [isMinimized, setIsMinimized] = useState(false); 
    const nodeRef = useRef(null);
    const [seconds, setSeconds] = useState(0);
    const [localVolume, setLocalVolume] = useState(0);

    // 🕒 Call Timer Logic
    useEffect(() => {
        const timer = setInterval(() => setSeconds(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    // Auto-minimize on screen share
    useEffect(() => {
        if (isScreenSharing) setIsMinimized(true);
    }, [isScreenSharing]);

    // 📊 Network Health Polling
    useEffect(() => {
        const interval = setInterval(async () => {
            if (typeof getNetworkStats !== 'function') return;
            const healthMap = {};
            for (const peerObj of peersRef.current) {
                try {
                    const stats = await getNetworkStats(peerObj.peer);
                    if (stats) healthMap[peerObj.peerID] = stats.rtt;
                } catch (err) { }
            }
            setNetworkHealth(healthMap);
        }, 5000); 
        return () => clearInterval(interval);
    }, [peers, getNetworkStats, peersRef]);

    // --- 🚀 RESTORED WORKING SIGNALING LOGIC ---
    useEffect(() => {
        if (!stream || !socketRef.current || isSetupRef.current) return;
        isSetupRef.current = true; 
        const roomId = window.location.pathname.split('/').pop();

        const handleAllUsers = (users) => {
            const newPeers = [];
            users.forEach((userID) => {
                if (!peersRef.current.find(p => p.peerID === userID)) {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({ peerID: userID, peer, lastSignal: null });
                    newPeers.push({ peerID: userID, peer });
                }
            });
            setPeers(prev => [...prev, ...newPeers]); 
        };

        const handleUserJoined = (payload) => {
            const existingPeerObj = peersRef.current.find(p => p.peerID === payload.callerID);
            const signalHash = JSON.stringify(payload.signal);

            if (existingPeerObj) {
                // 🛡️ RE-APPLY THE WORKING GHOST SHIELD
                if (existingPeerObj.lastSignal === signalHash) return; 
                existingPeerObj.lastSignal = signalHash;
                
                // FORCE THE UPDATE FOR SCREEN SHARE
                console.log("🔄 Native Media Update Received! Applying...");
                try { existingPeerObj.peer.signal(payload.signal); } catch (e) { console.error(e); }
                return; 
            }

            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({ peerID: payload.callerID, peer, lastSignal: signalHash });
            setPeers(prev => [...prev, { peerID: payload.callerID, peer }]);
        };

        const handleReturnedSignal = (payload) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            if (item) {
                const signalHash = JSON.stringify(payload.signal);
                if (item.lastSignal === signalHash) return;
                item.lastSignal = signalHash;
                try { item.peer.signal(payload.signal); } catch (e) { console.error(e); }
            }
        };

        const handleDisconnect = ({ socketId }) => {
            const peerObj = peersRef.current.find(p => p.peerID === socketId);
            if(peerObj) peerObj.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            setPeers(prev => prev.filter(p => p.peerID !== socketId));
        };

        socketRef.current.on('all-users', handleAllUsers);
        socketRef.current.on("user-joined", handleUserJoined);
        socketRef.current.on("receiving-returned-signal", handleReturnedSignal);
        socketRef.current.on(ACTIONS.DISCONNECTED, handleDisconnect);
        socketRef.current.emit('request-call-join', { roomId });

        return () => {
            if (socketRef.current) {
                socketRef.current.off('all-users', handleAllUsers);
                socketRef.current.off("user-joined", handleUserJoined);
                socketRef.current.off("receiving-returned-signal", handleReturnedSignal);
                socketRef.current.off(ACTIONS.DISCONNECTED, handleDisconnect);
            }
            isSetupRef.current = false;
        };
    }, []); 

    // ✅ ADDED STUN SERVERS HERE!
    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({ 
            initiator: true, 
            trickle: false, 
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        peer.on("signal", (signal) => {
            socketRef.current.emit("sending-signal", { userToSignal, callerID, signal });
        });
        return peer;
    }

    // ✅ ADDED STUN SERVERS HERE!
    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ 
            initiator: false, 
            trickle: false, 
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });
        peer.on("signal", (signal) => {
            socketRef.current.emit("returning-signal", { signal, callerID });
        });
        peer.signal(incomingSignal);
        return peer;
    }

    return (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
            <div ref={nodeRef} className={`fixed z-[100] bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'w-16 h-16 rounded-full top-20 left-20' : isScreenSharing ? 'inset-x-20 top-20 bottom-20 w-auto h-auto rounded-xl' : 'w-80 h-auto bottom-6 right-6 rounded-2xl'}`}>
                <div className="drag-handle flex items-center justify-between px-4 py-3 bg-[#252525] shrink-0 cursor-move border-b border-white/5">
                    {isMinimized ? (
                        <div className="w-full h-full flex items-center justify-center" onClick={() => setIsMinimized(false)}>
                            <VideoIcon size={20} className={isRecording ? "text-red-500 animate-pulse" : "text-green-500"} />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full animate-pulse ${isRecording ? 'bg-red-500' : isScreenSharing ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    {isRecording ? '⏺ Recording' : isScreenSharing ? 'Sharing' : `Call (${peers.length + 1})`}
                                    <span className="ml-2 text-white flex items-center gap-1 opacity-70"><Clock size={10}/> {formatTime(seconds)}</span>
                                </h3>
                            </div>
                            <button onClick={() => setIsMinimized(true)} className="text-gray-500 hover:text-white transition-colors"><ChevronDown size={16} /></button>
                        </>
                    )}
                </div>

                {!isMinimized && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-black">
                        <div className={`p-2 grid ${peers.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar`}>
                            
                            {/* LOCAL VIDEO - Fixed with Callback Ref */}
                            <div className={`relative aspect-video rounded-lg overflow-hidden border transition-all duration-300 ${localVolume > 30 ? 'border-green-500 ring-2 ring-green-500/50' : 'border-white/5'} bg-[#111]`}>
                                <video 
                                    muted 
                                    autoPlay 
                                    playsInline 
                                    ref={(el) => {
                                        if (el && stream && el.srcObject !== stream) {
                                            el.srcObject = stream;
                                            console.log("📹 Local stream synced");
                                        }
                                    }} 
                                    className={`w-full h-full transition-all duration-300 ${isScreenSharing ? 'object-contain' : 'object-cover scale-x-[-1]'}`} 
                                />
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold flex items-center">
                                    You {isMuted ? "🔇" : <AudioVisualizer stream={stream} onVolumeChange={setLocalVolume} />}
                                </div>
                            </div>

                            {/* REMOTE PEERS */}
                            {peers.map((peerObj) => (
                                <div key={peerObj.peerID} className="relative aspect-video rounded-lg overflow-hidden border border-white/5">
                                    <Video peer={peerObj.peer} />
                                    <div className="absolute top-2 right-2 flex gap-0.5 items-end h-3" title={`Latency: ${Math.round(networkHealth[peerObj.peerID] || 0)}ms`}>
                                        {[1, 2, 3].map(bar => (
                                            <div key={bar} className={`w-1 rounded-full ${(networkHealth[peerObj.peerID] || 0) < 150 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                style={{ height: `${bar * 33}%`, opacity: bar > 2 && (networkHealth[peerObj.peerID] > 300) ? 0.3 : 1 }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-[#252525] border-t border-white/5 flex justify-center gap-3">
                            <button onClick={onToggleMic} className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-[#333] hover:bg-[#444]'}`}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>
                            <button onClick={onToggleCamera} className={`p-2 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-[#333] hover:bg-[#444]'}`}>{isVideoOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}</button>
                            
                            <button onClick={toggleBlur} className={`p-2 rounded-full transition-all ${isBlurred ? 'bg-purple-600 text-white' : 'bg-[#333] hover:bg-[#444]'}`} title="Blur Background">
                                <Sparkles size={18} />
                            </button>

                            <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-600 animate-pulse text-white' : 'bg-[#333] hover:bg-[#444]'}`} title={isRecording ? "Stop Recording" : "Record Locally"}>
                                <Circle size={18} fill={isRecording ? "white" : "currentColor"} />
                            </button>

<button 
    onClick={onToggleScreenShare} 
    disabled={activeScreenSharer && activeScreenSharer !== username}
    title={
        isScreenSharing ? "Stop Sharing" : 
        (activeScreenSharer && activeScreenSharer !== username) ? `Locked by ${activeScreenSharer}` : 
        "Share Screen"
    }
    className={`p-2 rounded-full transition-all ${
        isScreenSharing 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
            : (activeScreenSharer && activeScreenSharer !== username)
            ? 'bg-[#1a1a1a] text-[#555] cursor-not-allowed' 
            : 'bg-[#333] hover:bg-[#444] text-white'
    }`}
>
    <Monitor size={18} />
</button>                            <button onClick={onEndCall} className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95 transition-transform ml-1"><PhoneOff size={18} /></button>
                        </div>
                    </div>
                )}
            </div>
        </Draggable>
    );
};

export default VideoChat;