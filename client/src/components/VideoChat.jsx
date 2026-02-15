import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import Video from './Video'; 
import { ACTIONS } from '../Actions';
import Draggable from 'react-draggable';

const VideoChat = ({ socketRef, roomId, stream }) => {
    const [peers, setPeers] = useState([]);
    const peersRef = useRef([]); 
    const [isMinimized, setIsMinimized] = useState(false); 

    // ✅ FIX 1: Create a Ref for the Draggable component
    const nodeRef = useRef(null);

    // State for Audio & Video Controls
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        if (!stream || !socketRef.current) return;

        // 1. Handle New Joiners (Initiator)
        socketRef.current.on(ACTIONS.JOINED, ({ socketId, username }) => {
            if (socketId === socketRef.current.id) return;
            if (peersRef.current.find(p => p.peerID === socketId)) return;

            const peer = createPeer(socketId, socketRef.current.id, stream);
            peersRef.current.push({ peerID: socketId, peer });
            setPeers((users) => [...users, { peerID: socketId, peer }]);
        });

        // 2. Handle Incoming Calls (Receiver)
        socketRef.current.on("user-joined", (payload) => {
            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({ peerID: payload.callerID, peer });
            setPeers((users) => [...users, { peerID: payload.callerID, peer }]);
        });

        // 3. Handle Signal Back
        socketRef.current.on("receiving-returned-signal", (payload) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            if (item) item.peer.signal(payload.signal);
        });

        // 4. Handle Disconnect
        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId }) => {
            const peerObj = peersRef.current.find(p => p.peerID === socketId);
            if(peerObj) peerObj.peer.destroy();
            const newPeers = peersRef.current.filter(p => p.peerID !== socketId);
            peersRef.current = newPeers;
            setPeers(newPeers);
        });

    }, [stream, socketRef, roomId]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on("signal", (signal) => socketRef.current.emit("sending-signal", { userToSignal, callerID, signal }));
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on("signal", (signal) => socketRef.current.emit("returning-signal", { signal, callerID }));
        peer.signal(incomingSignal);
        return peer;
    }

    const toggleMic = (e) => {
        e.stopPropagation(); 
        if (stream && stream.getAudioTracks().length > 0) {
            const audioTrack = stream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled; 
            setIsMuted(!audioTrack.enabled);
        }
    };

    const toggleCamera = (e) => {
        e.stopPropagation(); 
        if (stream && stream.getVideoTracks().length > 0) {
            const videoTrack = stream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled; 
            setIsVideoOff(!videoTrack.enabled);
        }
    };

    // --- RENDER ---
    return (
        <Draggable
            nodeRef={nodeRef} // ✅ FIX 2: Pass the ref to Draggable
            handle=".drag-handle" 
            bounds="parent"       
        >
            <div 
                ref={nodeRef} // ✅ FIX 3: Pass the SAME ref to the div
                className={`fixed top-20 left-20 z-50 bg-[#1a1a1a] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col ${
                    isMinimized ? 'w-16 h-16 rounded-full cursor-pointer hover:scale-110' : 'w-72 md:w-80 h-auto max-h-[80vh]'
                }`}
                style={{ transition: isMinimized ? 'width 0.3s, height 0.3s' : 'none' }}
            >
                {/* 1. Header / Controls */}
                <div 
                    className={`drag-handle flex items-center justify-between px-4 py-3 bg-[#252525] shrink-0 ${isMinimized ? 'h-full justify-center p-0 cursor-move' : 'cursor-move'}`}
                >
                    {isMinimized ? (
                        <span className="text-2xl select-none" title="Expand Video" onClick={() => setIsMinimized(false)}>📹</span>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider select-none">
                                    Team Call ({peers.length + 1})
                                </h3>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                                onMouseDown={(e) => e.stopPropagation()} 
                                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors"
                                title="Minimize"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                        </>
                    )}
                </div>

                {/* 2. Video Grid & Controls */}
                {!isMinimized && (
                    <>
                        <div className="p-3 grid grid-cols-2 gap-2 bg-[#1a1a1a] overflow-y-auto max-h-[60vh] custom-scrollbar">
                            
                            {/* My Video */}
                            <div className={`relative aspect-video rounded-lg overflow-hidden border bg-black group transition-colors ${isVideoOff ? 'border-red-500/50' : 'border-green-500/50'}`}>
                                <video 
                                    muted 
                                    ref={(ref) => ref && (ref.srcObject = stream)} 
                                    autoPlay 
                                    className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`} 
                                />
                                {isVideoOff && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                        <span className="text-2xl text-gray-500">👤</span>
                                    </div>
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-md flex items-center gap-1">
                                    You {isMuted && <span className="text-red-400">🔇</span>}
                                </div>
                            </div>

                            {/* Remote Peers */}
                            {peers.map((peerObj) => (
                                <div key={peerObj.peerID} className="relative aspect-video rounded-lg overflow-hidden border border-blue-500/30 bg-black">
                                    <Video peer={peerObj.peer} />
                                </div>
                            ))}
                            
                            {peers.length === 0 && (
                                <div className="aspect-video rounded-lg border border-dashed border-white/10 flex items-center justify-center text-center p-2">
                                    <p className="text-[10px] text-gray-500">Waiting for others...</p>
                                </div>
                            )}
                        </div>

                        {/* 3. Media Controls Bar */}
                        <div className="bg-[#252525] p-3 border-t border-white/5 flex justify-center gap-4 shrink-0">
                            <button 
                                onClick={toggleMic}
                                onMouseDown={(e) => e.stopPropagation()} 
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-lg ${
                                    isMuted 
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                                    : 'bg-[#333] text-gray-200 hover:bg-[#444] hover:text-white'
                                }`}
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? '🔇' : '🎤'}
                            </button>

                            <button 
                                onClick={toggleCamera} 
                                onMouseDown={(e) => e.stopPropagation()} 
                                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-lg ${
                                    isVideoOff 
                                    ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                                    : 'bg-[#333] text-gray-200 hover:bg-[#444] hover:text-white'
                                }`}
                                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                            >
                                {isVideoOff ? '📷❌' : '📷'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Draggable>
    );
};

export default VideoChat;