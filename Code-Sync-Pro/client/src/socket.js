import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    
    // ✅ PRODUCTION FIX: Use your environment variable for the backend URL
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    
    return io(BACKEND_URL, options);
};