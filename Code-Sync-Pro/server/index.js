require('dotenv').config(); 
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./Actions');
const cors = require('cors'); 
const connectDB = require('./db');
const axios = require('axios');
const https = require('https'); // Native Node module
// ✅ IMPORT ROUTES
const authRoutes = require('./routes/auth'); 
const projectRoutes = require('./routes/projects'); 
const aiRoutes = require('./routes/ai'); 
const userRoutes = require('./routes/userRoutes'); // <--- ✅ NEW: Import your User Routes
const templateRoutes = require('./routes/templates');
// ✅ IMPORT MODELS (For Socket Logic only)
const Project = require('./models/Project');
const deployRoutes = require('./routes/deployRoutes');
const server = http.createServer(app);
// 👇 ENABLE HTTP CORS
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 👈 Added PATCH here
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    credentials: true
}));

app.use(express.json());

// Connect to Database
connectDB();

// 👇 USE ROUTES (The "Brain" of your API)
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes); 
app.use('/api/projects', projectRoutes); 
app.use('/api/users', userRoutes); // <--- ✅ CONNECT THE NEW BRAIN HERE
app.use('/api/templates', templateRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/admin', require('./routes/adminRoutes'));
// ❌ DELETED: The old manual 'app.get(/profile)' code is GONE.
// Now the server will look inside 'routes/userRoutes.js' for instructions!
app.use('/api/library', require('./routes/libraryRoutes'));
// --- SOCKET.IO SETUP ---
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    
    // 1. JOIN (Updated to Save Collaborators)
    socket.on(ACTIONS.JOIN, async ({ roomId, username }) => { 
        if (!username) return;
        
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        // ✅ NEW: Save this user as a collaborator in MongoDB
       try {
            const project = await Project.findOne({ roomId });
            
            if (project) {
                if (!project.collaborators) {
                    project.collaborators = [];
                }

                // Add user if not already in list
                if (!project.collaborators.includes(username)) {
                    project.collaborators.push(username);
                    await project.save();
                    console.log(`✅ Recorded ${username} as a collaborator!`);
                }
            }
        } catch (err) {
            console.error("Error saving collaborator:", err);
        }

        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    // 2. CODE SYNC
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileName, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { fileName, code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, files }) => {
        io.to(socketId).emit(ACTIONS.SYNC_CODE, { files });
    });

    // 3. FILE SYSTEM EVENTS
    socket.on(ACTIONS.FILE_CREATED, ({ roomId, files }) => {
        socket.to(roomId).emit(ACTIONS.FILE_CREATED, { files });
    });

    socket.on(ACTIONS.FILE_DELETED, ({ roomId, files }) => {
        socket.to(roomId).emit(ACTIONS.FILE_DELETED, { files });
    });

    // 4. FEATURES (Chat, Comments)
    socket.on('comment:new', ({ roomId, comment }) => {
        socket.to(roomId).emit('comment:new', comment);
    });

    socket.on('sync-history', ({ socketId, history }) => {
        io.to(socketId).emit('sync-history', { history });
    });
        // 🎛️ ADMIN CONFIG UPDATE
    socket.on('admin:configUpdate', (newConfig) => {
        // Broadcast to everyone so their UI updates instantly
        io.emit('server:configUpdate', newConfig);
    });
    // 📢 ADMIN BROADCAST EVENT
    socket.on('admin:notify', ({ message }) => {
        // In a real production app, you would check if socket.user.role === 'admin' here
        // For now, we trust the source because the Admin Panel is protected
        console.log(`📢 System Broadcast: ${message}`);
        
        // 'broadcast' sends to everyone EXCEPT the sender
        // 'emit' sends to EVERYONE including sender (good for confirmation)
        io.emit('server:broadcast', { 
            message, 
            type: 'system', 
            time: new Date().toISOString() 
        });
    });
    socket.on('send-message', ({ roomId, message, username, time }) => {
        socket.to(roomId).emit('receive-message', { message, username, time });
    });

    // 5. WHITEBOARD EVENTS
    socket.on('whiteboard-draw', ({ roomId, x, y, prevX, prevY, color, size }) => {
        socket.to(roomId).emit('whiteboard-draw', { x, y, prevX, prevY, color, size });
    });

    socket.on('whiteboard-clear', ({ roomId }) => {
        socket.to(roomId).emit('whiteboard-clear');
    });

    // 6. VIDEO CALL SIGNALING
    socket.on('sending-signal', payload => {
        io.to(payload.userToSignal).emit('user-joined', { 
            signal: payload.signal, 
            callerID: payload.callerID 
        });
    });

    socket.on('returning-signal', payload => {
        io.to(payload.callerID).emit('receiving-returned-signal', { 
            signal: payload.signal, 
            id: socket.id 
        });
    });

    // 7. DISCONNECT
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        // socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));