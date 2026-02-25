import React, { useEffect, useRef, useState } from "react";

const Video = ({ peer }) => {
    const ref = useRef();
    const [isVideoScreen, setIsVideoScreen] = useState(false);

    useEffect(() => {
        if (!peer) return;

        // 1. Handle incoming WebRTC streams
        const handleStream = (stream) => {
            console.log("👁️ [RECEIVER] Stream attached to video element.");
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        };

        // 2. Initial load
        if (peer.streams && peer.streams[0]) {
            handleStream(peer.streams[0]);
        }

        peer.on("stream", handleStream);

        // 3. 🚨 THE "ANTI-FREEZE" FIX 🚨
        // When the Native Swap happens, the stream doesn't change, but the video DIMENSIONS do!
        const handleResize = () => {
            if (ref.current) {
                const width = ref.current.videoWidth;
                console.log(`📏 [RECEIVER] Video dimensions changed natively to: ${width}px width`);
                
                // If the width jumps to a massive size (like 1080p+), it's the screen share!
                setIsVideoScreen(width > 1200);

                // Force the video to keep playing so it doesn't freeze on the transition frame
                ref.current.play().catch(e => console.error("Play prevented:", e));
            }
        };

        const videoElement = ref.current;
        if (videoElement) {
            videoElement.addEventListener('resize', handleResize);
        }

        // Cleanup
        return () => {
            peer.off("stream", handleStream);
            if (videoElement) {
                videoElement.removeEventListener('resize', handleResize);
            }
        };
    }, [peer]);

    return (
        <div className="relative w-full h-full bg-[#111] group overflow-hidden rounded-lg">
            <video 
                playsInline 
                autoPlay 
                ref={ref} 
                className={`w-full h-full transition-all duration-500 ${
                    isVideoScreen ? 'object-contain' : 'object-cover scale-x-[-1]'
                }`} 
            />
            
            {/* Awesome indicator that User B is looking at a screen share */}
            {isVideoScreen && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 z-10 animate-fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    VIEWING SCREEN
                </div>
            )}
        </div>
    );
};

export default Video;