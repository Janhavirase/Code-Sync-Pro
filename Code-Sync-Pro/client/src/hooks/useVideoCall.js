import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export const useVideoCall = (socketRef, roomId, peersRef) => {
    const [stream, setStream] = useState(null);
    const [isCallActive, setIsCallActive] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Refs for processing and hardware management
    const canvasRef = useRef(document.createElement("canvas"));
    const videoElementRef = useRef(document.createElement("video"));
    const selfieSegmentationRef = useRef(null);
    const requestAnimationRef = useRef(null);
    const originalStreamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

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
    // This is the "Hooks or Crooks" logic that prevents the InvalidStateError
const swapVideoTrack = (newTrack) => {
    if (peersRef.current && peersRef.current.length > 0) {
        peersRef.current.forEach(({ peer }) => {
            if (peer._pc) {
                const senders = peer._pc.getSenders();
                const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                
                if (videoSender) {
                    // 🚨 THE FIX: Set content hint before swapping
                    // 'detail' is optimized for text/screen sharing
                    // 'motion' is optimized for webcams
                    newTrack.contentHint = isScreenSharing ? 'detail' : 'motion';

                    videoSender.replaceTrack(newTrack).then(() => {
                        console.log("♻️ Native Sender Updated with hint:", newTrack.contentHint);
                    }).catch(err => console.error("❌ Swap Failed:", err));
                }
            }
        });
    }

    // Local UI update
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
            
            // 🚨 THE FIX: Wait for the video to actually have dimensions
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play().then(resolve);
                };
            });

            const canvas = canvasRef.current;
            // Use the actual video dimensions to avoid "zero size" errors
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            const processVideo = async () => {
                // 🛡️ Safety check: Ensure video is still playing and has valid data
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
        try {
            console.log("🎬 Initiating NATIVE Screen Share Swap...");
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];

            swapVideoTrack(screenTrack);
            setIsScreenSharing(true);

            // Temporarily disable camera light
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
            // 1. Re-enable the hardware track
            oldCameraTrack.enabled = true;

            // 2. 🛡️ THE FIX: Wait for the track to "warm up" and produce frames
            // This prevents the 2px width collapse
            setTimeout(() => {
                if (oldCameraTrack.readyState === 'live') {
                    swapVideoTrack(oldCameraTrack);
                }
            }, 500); // 500ms is the sweet spot for hardware re-initialization
        }

        // 3. Clean up the screen track
        const screenTrack = stream?.getVideoTracks()[0];
        if (screenTrack && screenTrack !== oldCameraTrack) {
            screenTrack.stop();
        }

        setIsScreenSharing(false);
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
        startCall, endCall, startRecording, stopRecording, getNetworkStats,
        startScreenShare, endScreenShare, toggleMic, toggleVideo, toggleBlur 
    };
};