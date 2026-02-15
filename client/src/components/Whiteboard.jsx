import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import rough from 'roughjs/bundled/rough.esm';

const Whiteboard = ({ socket, roomId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [elements, setElements] = useState([]);
    
    // Store the last position for smooth drawing lines
    const ctxRef = useRef(null);
    const lastPos = useRef({ x: 0, y: 0 });

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        // Set canvas to full width/height of container
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Styles
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctxRef.current = ctx;

        // Handle window resize to keep drawing context valid
        const handleResize = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.drawImage(canvas, 0, 0);

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.lineCap = 'round'; // Reset styles after resize
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!socket) return;

        // ✅ LISTEN: Receive drawing from other users
        socket.on('whiteboard-draw', ({ x, y, prevX, prevY, color, size }) => {
            const ctx = ctxRef.current;
            if(!ctx) return;

            const originalStyle = ctx.strokeStyle;
            const originalWidth = ctx.lineWidth;

            ctx.strokeStyle = color || '#000000';
            ctx.lineWidth = size || 2;

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();

            // Reset to local user preferences (optional, keeps consistency)
            ctx.strokeStyle = originalStyle;
            ctx.lineWidth = originalWidth;
        });

        // ✅ LISTEN: Clear board
        socket.on('whiteboard-clear', () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        return () => {
            socket.off('whiteboard-draw');
            socket.off('whiteboard-clear');
        };
    }, [socket]);

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        lastPos.current = { x: offsetX, y: offsetY };
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = ctxRef.current;
        
        // 1. Draw Locally
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();

        // 2. Emit to Server
        if (socket) {
            socket.emit('whiteboard-draw', {
                roomId,
                x: offsetX,
                y: offsetY,
                prevX: lastPos.current.x,
                prevY: lastPos.current.y,
                color: ctx.strokeStyle,
                size: ctx.lineWidth
            });
        }

        // Update position
        lastPos.current = { x: offsetX, y: offsetY };
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (socket) {
            socket.emit('whiteboard-clear', { roomId });
        }
    };

    return (
        <div className="w-full h-full relative bg-white cursor-crosshair">
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 bg-gray-100 p-2 rounded shadow-md">
                <button onClick={clearBoard} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                    Clear Board
                </button>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full block"
            />
        </div>
    );
};

export default Whiteboard;