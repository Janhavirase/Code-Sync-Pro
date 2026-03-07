import { useState, useRef, useEffect } from 'react'; // ✨ Added useEffect
import toast from 'react-hot-toast';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

// ✨ ADDED username as the 4th parameter
export const useVideoCall = (socketRef, roomId, peersRef, username) => {
    const [stream, setStream] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
   
    
   
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
 const [isScreenSharing, setIsScreenSharing] = useState(false);
  // ✨ NEW: State to track WHO is currently sharing their screen
    const [activeScreenSharer, setActiveScreenSharer] = useState(null); 
    
    // Refs for processing and hardware management
    const canvasRef = useRef(document.createElement("canvas"));
    const videoElementRef = useRef(document.createElement("video"));
    const selfieSegmentationRef = useRef(null);
    const requestAnimationRef = useRef(null);
    const originalStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // ==========================================
    // ✨ NEW: SCREEN SHARE SOCKET LISTENERS
    // ==========================================
    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;
const handleShareStarted = (sharerName) => {
            // ✨ ADD THIS LINE so we know if the browser actually hears the server!
            console.log("🚨 [FRONTEND] Lock received from server! Sharer is:", sharerName); 
            
            setActiveScreenSharer(sharerName);
            if (sharerName !== username) {
                toast(`${sharerName} started sharing their screen`, { icon: '📺' });
            }
        };

        const handleShareStopped = () => {
            // ✨ ADD THIS LINE
            console.log("🔓 [FRONTEND] Unlock received from server!"); 
            setActiveScreenSharer(null);
        };

        const handleUserDisconnected = ({ username: disconnectedUser }) => {
            // If the person who disconnected was sharing, unlock the screen!
            setActiveScreenSharer((prev) => prev === disconnectedUser ? null : prev);
        };

        socket.on('screen-share-started', handleShareStarted);
        socket.on('screen-share-stopped', handleShareStopped);
        socket.on('disconnected', handleUserDisconnected); // Adjust event name if needed

        return () => {
            socket.off('screen-share-started', handleShareStarted);
            socket.off('screen-share-stopped', handleShareStopped);
            socket.off('disconnected', handleUserDisconnected);
        };
    }, [socketRef.current, username]);
    // ==========================================


    const startCall = async () => {
        try {
            const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            originalStreamRef.current = localStream;
            setStream(localStream);
            setIsCallActive(true);
            toast.success("Joined video call");
        } catch (err) {
            console.error("Media Error:", err);
            toast.error("Could not access camera");
        }
    };

    // 🚨 THE CRITICAL HELPER: Native Track Swapping
    const swapVideoTrack = (newTrack) => {
        if (peersRef.current && peersRef.current.length > 0) {
            peersRef.current.forEach(({ peer }) => {
                if (peer._pc) {
                    const senders = peer._pc.getSenders();
                    const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                    
                    if (videoSender) {
                        newTrack.contentHint = isScreenSharing ? 'detail' : 'motion';

                        videoSender.replaceTrack(newTrack).then(() => {
                            console.log("♻️ Native Sender Updated with hint:", newTrack.contentHint);
                        }).catch(err => console.error("❌ Swap Failed:", err));
                    }
                }
            });
        }

        const audioTrack = originalStreamRef.current?.getAudioTracks()[0];
        const newUiStream = new MediaStream([newTrack, ...(audioTrack ? [audioTrack] : [])]);
        setStream(newUiStream);
    };

    // --- 🌫️ BACKGROUND BLUR LOGIC ---
    const initBlur = () => {
        const selfieSegmentation = new SelfieSegmentation({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
        });

        selfieSegmentation.setOptions({ modelSelection: 1 });
        selfieSegmentation.onResults((results) => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-out';
            ctx.filter = 'blur(8px)';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'destination-atop';
            ctx.filter = 'none';
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            ctx.restore();
        });
        selfieSegmentationRef.current = selfieSegmentation;
    };

    const toggleBlur = async () => {
        if (!isBlurred) {
            console.log("🌫️ Activating Background Blur...");
            if (!selfieSegmentationRef.current) initBlur();

            const video = videoElementRef.current;
            video.srcObject = originalStreamRef.current;
            
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play().then(resolve);
                };
            });

            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            const processVideo = async () => {
                if (video.paused || video.ended || video.readyState < 2) return;
                
                try {
                    await selfieSegmentationRef.current.send({ image: video });
                } catch (err) {
                    console.error("MediaPipe Send Error:", err);
                }
                requestAnimationRef.current = requestAnimationFrame(processVideo);
            };
            
            processVideo();

            const blurredTrack = canvas.captureStream(30).getVideoTracks()[0];
            swapVideoTrack(blurredTrack);
            setIsBlurred(true);
            toast.success("Background blurred");
        } else {
            console.log("📷 Returning to normal camera...");
            if (requestAnimationRef.current) cancelAnimationFrame(requestAnimationRef.current);
            
            const originalTrack = originalStreamRef.current.getVideoTracks()[0];
            swapVideoTrack(originalTrack);
            setIsBlurred(false);
        }
    };

    // --- 🎬 SCREEN SHARE LOGIC ---
    const startScreenShare = async () => {
        // ✨ THE LOCK: Check if someone else is already sharing
        if (activeScreenSharer && activeScreenSharer !== username) {
            toast.error(`${activeScreenSharer} is already sharing their screen!`);
            return;
        }

        try {
            console.log("🎬 Initiating NATIVE Screen Share Swap...");
            
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                video: {
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { max: 15 }, 
                    displaySurface: "monitor",
                    resizeMode: "none"
                } 
            });
            
            const screenTrack = screenStream.getVideoTracks()[0];

            if ('contentHint' in screenTrack) {
                screenTrack.contentHint = 'detail'; 
            }

            swapVideoTrack(screenTrack);
            setIsScreenSharing(true);
            
            // ✨ BROADCAST THE LOCK: Tell the server you took control
            setActiveScreenSharer(username);
            if (socketRef.current) {
                socketRef.current.emit('screen-share-started', { roomId, username });
            }

            const oldCameraTrack = originalStreamRef.current?.getVideoTracks()[0];
            if (oldCameraTrack) setTimeout(() => oldCameraTrack.enabled = false, 500);

            screenTrack.onended = () => endScreenShare();
        } catch (err) {
            console.error("❌ Screen Share failed:", err);
        }
    };

    const endScreenShare = async () => {
        try {
            console.log("🎬 Returning to Webcam...");
            const oldCameraTrack = originalStreamRef.current?.getVideoTracks()[0];
            
            if (oldCameraTrack) {
                oldCameraTrack.enabled = true;
                setTimeout(() => {
                    if (oldCameraTrack.readyState === 'live') {
                        swapVideoTrack(oldCameraTrack);
                    }
                }, 500); 
            }

            const screenTrack = stream?.getVideoTracks()[0];
            if (screenTrack && screenTrack !== oldCameraTrack) {
                screenTrack.stop();
            }

            setIsScreenSharing(false);
            
            // ✨ RELEASE THE LOCK: Tell everyone the screen is free
            setActiveScreenSharer(null);
            if (socketRef.current) {
                socketRef.current.emit('screen-share-stopped', { roomId });
            }

        } catch (err) {
            console.error("❌ Error returning to camera:", err);
        }
    };

    // --- 📊 NETWORK HEALTH LOGIC ---
    const getNetworkStats = async (peer) => {
        if (!peer || !peer._pc) return null;
        try {
            const stats = await peer._pc.getStats();
            let networkInfo = { rtt: 0, packetLoss: 0 };
            
            stats.forEach(report => {
                if (report.type === 'remote-inbound-rtp') {
                    networkInfo.rtt = report.roundTripTime * 1000; 
                    networkInfo.packetLoss = report.packetsLost;
                }
            });
            return networkInfo;
        } catch (e) {
            return null;
        }
    };

    // --- ⏺️ RECORDING LOGIC ---
    const startRecording = () => {
        if (!stream) return;
        recordedChunksRef.current = [];
        
        const options = { mimeType: 'video/webm;codecs=vp9,opus' };
        const recorder = new MediaRecorder(stream, options);

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `meeting-record-${Date.now()}.webm`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success("Recording saved!");
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        toast("Recording started...");
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // --- ⚙️ TOGGLES & END CALL ---
    const toggleMic = () => {
        if (originalStreamRef.current) {
            const audioTrack = originalStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (originalStreamRef.current) {
            const videoTrack = originalStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        if (requestAnimationRef.current) cancelAnimationFrame(requestAnimationRef.current);
        if (originalStreamRef.current) originalStreamRef.current.getTracks().forEach(t => t.stop());
        if (stream) stream.getTracks().forEach(t => t.stop());
        
        if (peersRef.current) {
            peersRef.current.forEach(({ peer }) => peer.destroy());
            peersRef.current = [];
        }
        setStream(null);
        setIsCallActive(false);
        setIsScreenSharing(false);
        setIsBlurred(false);
        toast("Call ended");
    };

    return { 
        stream, isCallActive, isScreenSharing, isMuted, isVideoOff, isBlurred, isRecording,
        activeScreenSharer, // ✨ EXPORT THE LOCK STATE SO THE UI CAN DISABLE THE BUTTON
        startCall, endCall, startRecording, stopRecording, getNetworkStats,
        startScreenShare, endScreenShare, toggleMic, toggleVideo, toggleBlur, // You already have this
        setActiveScreenSharer,
    };
};