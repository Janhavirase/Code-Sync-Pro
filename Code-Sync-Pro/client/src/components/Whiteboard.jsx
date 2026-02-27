import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Pen, Eraser, Trash2, Square, Circle, Minus, Type } from 'lucide-react';

const COLORS = ['#1e1e1e', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'];
const BG_COLOR = '#fafafa';

const Whiteboard = ({ socket, roomId }) => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    
    // --- Advanced Drawing State ---
    const lastPos = useRef({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });
    const snapshot = useRef(null);
    const lastEmitTime = useRef(0);

    // --- UI State ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState(COLORS[4]);
    const [size, setSize] = useState(3);
    const [tool, setTool] = useState('pen'); 
    
    // --- Text Tool State ---
    const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: '' });

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctxRef.current = ctx;

        const handleResize = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCtx.drawImage(canvas, 0, 0);

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            ctx.drawImage(tempCanvas, 0, 0); 
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 📡 LISTEN: Socket Events
    useEffect(() => {
        if (!socket) return;

        socket.on('whiteboard-draw', (data) => {
            const ctx = ctxRef.current;
            if(!ctx) return;

            const originalStroke = ctx.strokeStyle;
            const originalWidth = ctx.lineWidth;
            const originalFill = ctx.fillStyle;

            ctx.strokeStyle = data.color;
            ctx.fillStyle = data.color;
            ctx.lineWidth = data.size;

            ctx.beginPath();

            if (data.type === 'pen' || data.type === 'eraser') {
                ctx.moveTo(data.prevX, data.prevY);
                ctx.lineTo(data.x, data.y);
                ctx.stroke();
            } else if (data.type === 'rect') {
                ctx.rect(data.startX, data.startY, data.w, data.h);
                ctx.stroke();
            } else if (data.type === 'circle') {
                ctx.arc(data.startX, data.startY, data.radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (data.type === 'line') {
                ctx.moveTo(data.startX, data.startY);
                ctx.lineTo(data.endX, data.endY);
                ctx.stroke();
            } else if (data.type === 'text') {
                ctx.font = `${data.size * 6}px sans-serif`;
                ctx.textBaseline = 'top';
                ctx.fillText(data.text, data.x, data.y);
            }

            ctx.strokeStyle = originalStroke;
            ctx.lineWidth = originalWidth;
            ctx.fillStyle = originalFill;
        });

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

    const placeText = (potentialEventOrData) => {
        const target = (potentialEventOrData && typeof potentialEventOrData.text === 'string') 
            ? potentialEventOrData 
            : textInput; 
        
        if (!target || !target.text || !target.text.trim()) {
            setTextInput({ visible: false, x: 0, y: 0, text: '' });
            return;
        }
        
        const ctx = ctxRef.current;
        ctx.font = `${size * 6}px sans-serif`;
        ctx.fillStyle = color;
        ctx.textBaseline = 'top'; 
        ctx.fillText(target.text, target.x, target.y);

        if (socket) {
            socket.emit('whiteboard-draw', {
                roomId, type: 'text', text: target.text, x: target.x, y: target.y, color, size
            });
        }
        
        setTextInput({ visible: false, x: 0, y: 0, text: '' });
    };

    const startDrawing = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        
        if (tool === 'text') {
            if (textInput.visible && textInput.text.trim()) {
                placeText(textInput);
            }
            setTextInput({ visible: true, x: offsetX, y: offsetY, text: '' });
            return;
        }

        setIsDrawing(true);
        startPos.current = { x: offsetX, y: offsetY };
        lastPos.current = { x: offsetX, y: offsetY };

        if (tool !== 'pen' && tool !== 'eraser') {
            snapshot.current = ctxRef.current.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const ctx = ctxRef.current;
        
        const activeColor = tool === 'eraser' ? BG_COLOR : color;
        const activeSize = tool === 'eraser' ? size * 4 : size;

        ctx.strokeStyle = activeColor;
        ctx.lineWidth = activeSize;

        if (tool === 'pen' || tool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(offsetX, offsetY);
            ctx.stroke();

            const now = Date.now();
            if (socket && now - lastEmitTime.current > 15) {
                socket.emit('whiteboard-draw', {
                    roomId, type: tool, x: offsetX, y: offsetY, prevX: lastPos.current.x, prevY: lastPos.current.y, color: activeColor, size: activeSize
                });
                lastEmitTime.current = now;
            }
            lastPos.current = { x: offsetX, y: offsetY };
        } 
        else {
            ctx.putImageData(snapshot.current, 0, 0);
            ctx.beginPath();

            if (tool === 'rect') {
                ctx.rect(startPos.current.x, startPos.current.y, offsetX - startPos.current.x, offsetY - startPos.current.y);
            } else if (tool === 'circle') {
                const radius = Math.sqrt(Math.pow(startPos.current.x - offsetX, 2) + Math.pow(startPos.current.y - offsetY, 2));
                ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
            } else if (tool === 'line') {
                ctx.moveTo(startPos.current.x, startPos.current.y);
                ctx.lineTo(offsetX, offsetY);
            }
            ctx.stroke();
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const { offsetX, offsetY } = e.nativeEvent;

        if (tool !== 'pen' && tool !== 'eraser' && socket) {
            const payload = { roomId, type: tool, color, size };
            
            if (tool === 'rect') {
                payload.startX = startPos.current.x; payload.startY = startPos.current.y;
                payload.w = offsetX - startPos.current.x; payload.h = offsetY - startPos.current.y;
            } else if (tool === 'circle') {
                payload.startX = startPos.current.x; payload.startY = startPos.current.y;
                payload.radius = Math.sqrt(Math.pow(startPos.current.x - offsetX, 2) + Math.pow(startPos.current.y - offsetY, 2));
            } else if (tool === 'line') {
                payload.startX = startPos.current.x; payload.startY = startPos.current.y;
                payload.endX = offsetX; payload.endY = offsetY;
            }
            
            socket.emit('whiteboard-draw', payload);
        }
    };

    const clearBoard = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (socket) socket.emit('whiteboard-clear', { roomId });
    };

    const ToolbarButton = ({ id, icon: Icon, title }) => (
        <button 
            onClick={() => { setTool(id); setTextInput({ visible: false, x: 0, y: 0, text: '' }); }} 
            className={`p-2.5 rounded-xl transition-all ${tool === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
            title={title}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: BG_COLOR }}>
            
            {/* TOOLBAR */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1e1e1e]/90 backdrop-blur-md p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-[#333]">
                <div className="flex items-center gap-1 border-r border-[#444] pr-4">
                    <ToolbarButton id="pen" icon={Pen} title="Pen" />
                    <ToolbarButton id="eraser" icon={Eraser} title="Eraser" />
                    <ToolbarButton id="rect" icon={Square} title="Rectangle" />
                    <ToolbarButton id="circle" icon={Circle} title="Circle" />
                    <ToolbarButton id="line" icon={Minus} title="Line" />
                    <ToolbarButton id="text" icon={Type} title="Text" />
                </div>

                <div className={`flex items-center gap-2 transition-opacity ${tool === 'eraser' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    {COLORS.map((c) => (
                        <button
                            key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e]' : 'hover:scale-110'}`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-3 pl-4 border-l border-[#444]">
                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Size</span>
                    <input type="range" min="1" max="15" value={size} onChange={(e) => setSize(e.target.value)} className="w-20 accent-indigo-500 cursor-pointer" />
                </div>

                <div className="pl-4 border-l border-[#444]">
                    <button onClick={clearBoard} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* FLOATING TEXT INPUT (Upgraded Visibility) */}
            {textInput.visible && (
                <input
                    autoFocus
                    type="text"
                    value={textInput.text}
                    onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                    onKeyDown={(e) => { 
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            placeText(textInput); 
                        }
                    }}
                    style={{
                        position: 'absolute', 
                        left: textInput.x, 
                        top: textInput.y,
                        color: color, 
                        fontSize: `${size * 6}px`, 
                        fontFamily: 'sans-serif',
                        background: 'rgba(255, 255, 255, 0.9)', // 👈 Forces a white background so it pops out
                        outline: 'none', 
                        border: `2px solid #3b82f6`, // 👈 Clear blue border
                        borderRadius: '4px',
                        padding: '4px 8px', 
                        minWidth: '150px', 
                        zIndex: 40, 
                        margin: 0,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' // 👈 Adds a subtle drop shadow
                    }}
                    placeholder="Type here..."
                />
            )}

            {/* CANVAS */}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                className={`w-full h-full block ${tool === 'eraser' ? 'cursor-cell' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
            />
        </div>
    );
};

export default Whiteboard;