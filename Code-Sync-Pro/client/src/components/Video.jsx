import React, { useEffect, useRef, useState } from "react";

const Video = ({ peer }) => {
    const ref = useRef();
    const containerRef = useRef();
    const [isVideoScreen, setIsVideoScreen] = useState(false);

    useEffect(() => {
        if (!peer) return;

        const handleStream = (stream) => {
            console.log("👁️ [RECEIVER] Stream attached to video element.");
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        };

        if (peer.streams && peer.streams[0]) {
            handleStream(peer.streams[0]);
        }

        peer.on("stream", handleStream);

        // 🚨 ENHANCED ANTI-FREEZE FIX
        // Inside Video.jsx handleResize function
const handleResize = () => {
    if (ref.current) {
        const width = ref.current.videoWidth;
        console.log(`📏 [RECEIVER] Dimension update: ${width}px`);
        
        setIsVideoScreen(width > 1000);

        // 🚨 THE FORCED RE-BIND: 
        // If dimensions change but it feels "stuck," reset the srcObject 
        // to force the browser to re-negotiate the internal buffer.
        if (width > 0) {
            const video = ref.current;
            const stream = video.srcObject;
            // Poking the video element helps it realize the track changed
            video.play().catch(() => {
                video.srcObject = null;
                video.srcObject = stream;
                video.play();
            });
        }
    }
};
        const videoElement = ref.current;
        if (videoElement) {
            videoElement.addEventListener('resize', handleResize);
        }

        return () => {
            peer.off("stream", handleStream);
            if (videoElement) {
                videoElement.removeEventListener('resize', handleResize);
            }
        };
    }, [peer]);

    const handleDoubleClick = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch((err) => {
                console.error(`Fullscreen Error: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div 
            ref={containerRef} 
            onDoubleClick={handleDoubleClick}
            className="relative w-full h-full bg-[#111] group overflow-hidden rounded-lg cursor-pointer transition-all hover:ring-2 hover:ring-white/20"
        >
            <video 
                playsInline 
                autoPlay 
                ref={ref} 
                className={`w-full h-full transition-all duration-500 ${
                    isVideoScreen ? 'object-contain' : 'object-cover scale-x-[-1]'
                }`} 
            />
            
            {isVideoScreen && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1 z-10 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                    SCREEN SHARE
                </div>
            )}
        </div>
    );
};

export default Video;