import { io } from 'socket.io-client';

// 👇 ENSURE 'export' IS WRITTEN HERE
export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempt: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    
    // Ensure this matches your server port (5000)
    return io('http://localhost:5000', options);
};