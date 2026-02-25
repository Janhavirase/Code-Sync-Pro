import { useState } from 'react';
import toast from 'react-hot-toast';

export const useVideoCall = (socketRef, roomId, peersRef) => {
    const [stream, setStream] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const startCall = async () => {
        try {
            const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(localStream);
            setIsCallActive(true);
            toast.success("Joined video call");
        } catch (err) {
            console.error("Media Error:", err);
            toast.error("Could not access camera");
        }
    };

    const startScreenShare = async () => {
        try {
            console.log("🎬 Initiating NATIVE Screen Share Swap...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            // 1. 🚨 NATIVE SWAP: Completely bypass simple-peer!
            // This forces the 1080p screen pixels down the existing wire instantly.
            if (peersRef.current) {
                peersRef.current.forEach(({ peer }) => {
                    if (peer._pc) {
                        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(screenTrack).catch(e => console.error("Native swap error:", e));
                        }
                    }
                });
            }

            // 2. Safely Update React UI
            const oldCameraTrack = stream?.getVideoTracks()[0];
            const audioTrack = stream?.getAudioTracks()[0];
            
            // Create a fresh stream for your local UI so React updates your own video box
            const newUiStream = new MediaStream([screenTrack, ...(audioTrack ? [audioTrack] : [])]);
            setStream(newUiStream);
            setIsScreenSharing(true);

            // Safely turn off the physical webcam light AFTER the swap is complete
            if (oldCameraTrack) {
                setTimeout(() => oldCameraTrack.stop(), 500); 
            }

            screenTrack.onended = () => endScreenShare();
        } catch (err) {
            console.error("❌ Screen Share failed:", err);
        }
    };

    const endScreenShare = async () => {
        try {
            console.log("🎬 Returning to Webcam...");
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            const oldScreenTrack = stream?.getVideoTracks()[0];

            // 1. 🚨 NATIVE SWAP BACK TO CAMERA
            if (peersRef.current) {
                peersRef.current.forEach(({ peer }) => {
                    if (peer._pc) {
                        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(cameraTrack).catch(e => console.error("Native swap error:", e));
                        }
                    }
                });
            }

            // 2. Update React UI
            const audioTrack = stream?.getAudioTracks()[0];
            const newUiStream = new MediaStream([cameraTrack, ...(audioTrack ? [audioTrack] : [])]);
            setStream(newUiStream);
            setIsScreenSharing(false);

            if (oldScreenTrack) oldScreenTrack.stop();

        } catch (err) {
            console.error("❌ Error returning to camera:", err);
        }
    };

    const toggleMic = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        if (peersRef.current) {
            peersRef.current.forEach(({ peer }) => peer.destroy());
            peersRef.current = [];
        }
        setStream(null);
        setIsCallActive(false);
        setIsScreenSharing(false);
        toast("Call ended");
    };

    return { stream, isCallActive, isScreenSharing, isMuted, isVideoOff, startCall, endCall, startScreenShare, endScreenShare, toggleMic, toggleVideo };
};