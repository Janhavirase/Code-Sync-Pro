import React, { useEffect, useRef } from "react";

const Video = ({ peer }) => {
    const ref = useRef();

    useEffect(() => {
        // Listen for the 'stream' event from the remote peer
        peer.on("stream", (stream) => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });
    }, [peer]);

    return (
        <div className="relative rounded-lg overflow-hidden border-2 border-blue-500/50 shadow-lg bg-black">
            <video 
                playsInline 
                autoPlay 
                ref={ref} 
                className="w-full h-full object-cover" 
            />
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md">
                Peer
            </div>
        </div>
    );
};

export default Video;