import React, { useEffect, useRef, useState } from 'react';
import Video from './Video'; 
import { ACTIONS } from '../Actions';
import Draggable from 'react-draggable';
import Peer from 'simple-peer';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, ChevronDown } from 'lucide-react';

const VideoChat = ({ 
    socketRef, 
    stream, 
    isScreenSharing, 
    onEndCall, 
    peersRef, 
    onToggleMic, 
    onToggleCamera, 
    onToggleScreenShare,
    isMuted, 
    isVideoOff,
    clients 
}) => {
    const [peers, setPeers] = useState([]);
    const isSetupRef = useRef(false);
    const [isMinimized, setIsMinimized] = useState(false); 
    const nodeRef = useRef(null);

    useEffect(() => {
        if (!stream || !socketRef.current || isSetupRef.current) return;
        isSetupRef.current = true; 
        const roomId = window.location.pathname.split('/').pop();
        
        console.log(`🎬 Call initializing for Room: ${roomId}`);

        // 🚨 Define strict named handlers to prevent React ghost listeners
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
                // 🛡️ THE GHOST SHIELD: Ignore exact duplicate signals from React Strict Mode!
                if (existingPeerObj.lastSignal === signalHash) return; 
                
                existingPeerObj.lastSignal = signalHash;
                console.log("🔄 Screen Share Upgrade Received! Applying safely...");
                try { existingPeerObj.peer.signal(payload.signal); } catch (e) { console.error(e); }
                return; 
            }

            const peer = addPeer(payload.signal, payload.callerID, stream);
            peersRef.current.push({ peerID: payload.callerID, peer, lastSignal: signalHash });
            setPeers(prev => [...prev, { peerID: payload.callerID, peer }]);
        };

        const handleReturnedSignal = (payload) => {
            const existingPeerObj = peersRef.current.find(p => p.peerID === payload.id);
            if (existingPeerObj) {
                const signalHash = JSON.stringify(payload.signal);
                if (existingPeerObj.lastSignal === signalHash) return; 
                
                existingPeerObj.lastSignal = signalHash;
                try { existingPeerObj.peer.signal(payload.signal); } catch (e) { console.error(e); }
            }
        };

        const handleDisconnect = ({ socketId }) => {
            const peerObj = peersRef.current.find(p => p.peerID === socketId);
            if(peerObj) peerObj.peer.destroy();
            peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
            setPeers(prev => prev.filter(p => p.peerID !== socketId));
        };

        // Attach strict listeners
        socketRef.current.on('all-users', handleAllUsers);
        socketRef.current.on("user-joined", handleUserJoined);
        socketRef.current.on("receiving-returned-signal", handleReturnedSignal);
        socketRef.current.on(ACTIONS.DISCONNECTED, handleDisconnect);

        socketRef.current.emit('request-call-join', { roomId });

        return () => {
            // Clean up exact named listeners
            if (socketRef.current) {
                socketRef.current.off('all-users', handleAllUsers);
                socketRef.current.off("user-joined", handleUserJoined);
                socketRef.current.off("receiving-returned-signal", handleReturnedSignal);
                socketRef.current.off(ACTIONS.DISCONNECTED, handleDisconnect);
            }
            isSetupRef.current = false;
        };
    }, []); 

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({ initiator: true, trickle: false, stream });
        peer.on("signal", (signal) => {
            socketRef.current.emit("sending-signal", { userToSignal, callerID, signal });
        });
        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({ initiator: false, trickle: false, stream });
        peer.on("signal", (signal) => {
            socketRef.current.emit("returning-signal", { signal, callerID });
        });
        peer.signal(incomingSignal);
        return peer;
    }

    return (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
            <div ref={nodeRef} className={`fixed z-[100] bg-[#1a1a1a] border border-white/10 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isMinimized ? 'w-16 h-16 rounded-full top-20 left-20' : isScreenSharing ? 'inset-x-20 top-20 bottom-20 w-auto h-auto rounded-xl' : 'w-80 h-auto bottom-6 right-6 rounded-2xl'}`}>
                <div className="drag-handle flex items-center justify-between px-4 py-3 bg-[#252525] shrink-0 cursor-move">
                    {isMinimized ? (
                        <div className="w-full h-full flex items-center justify-center" onClick={() => setIsMinimized(false)}><VideoIcon size={20} className="text-green-500" /></div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isScreenSharing ? 'Screen Sharing' : `Call (${peers.length + 1})`}</h3>
                            </div>
                            <button onClick={() => setIsMinimized(true)} className="text-gray-500 hover:text-white transition-colors"><ChevronDown size={16} /></button>
                        </>
                    )}
                </div>

                {!isMinimized && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-black">
                        <div className={`p-2 grid ${isScreenSharing || peers.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 overflow-y-auto max-h-[60vh] custom-scrollbar`}>
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-[#111]">
                                <video muted ref={(ref) => ref && (ref.srcObject = stream)} autoPlay playsInline className={`w-full h-full transition-all duration-300 ${isScreenSharing ? 'object-contain' : 'object-cover scale-x-[-1]'}`} />
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold">You {isMuted && "🔇"}</div>
                            </div>
                            {peers.map((peerObj) => (
                                <div key={peerObj.peerID} className="relative aspect-video rounded-lg overflow-hidden border border-white/5">
                                    <Video peer={peerObj.peer} />
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-[#252525] border-t border-white/5 flex justify-center gap-4">
                            <button onClick={onToggleMic} className={`p-2 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-[#333] hover:bg-[#444]'}`}>{isMuted ? <MicOff size={18} /> : <Mic size={18} />}</button>
                            <button onClick={onToggleCamera} className={`p-2 rounded-full transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'bg-[#333] hover:bg-[#444]'}`}>{isVideoOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}</button>
                            <button onClick={onToggleScreenShare} className={`p-2 rounded-full transition-all ${isScreenSharing ? 'bg-green-600 text-white' : 'bg-[#333] hover:bg-[#444]'}`}><Monitor size={18} /></button>
                            <button onClick={onEndCall} className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg active:scale-95 transition-transform"><PhoneOff size={18} /></button>
                        </div>
                    </div>
                )}
            </div>
        </Draggable>
    );
};

export default VideoChat;