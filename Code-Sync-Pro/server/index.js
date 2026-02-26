require('dotenv').config(); 
    // Add these near your other imports at the top
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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
// --- REMOTE CODE EXECUTION (RCE) ENDPOINT ---
app.post('/api/execute', (req, res) => {
    const { code, language } = req.body;

    // Right now, we are only testing JavaScript
    if (language !== 'javascript') {
        return res.status(400).json({ output: 'Error: Only JavaScript is supported right now!' });
    }

    // 1. Create a "temp" folder if it doesn't exist
    const tempFolder = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder);
    }

    // 2. Save the user's code to a temporary file
    const fileId = Date.now();
    const filePath = path.join(tempFolder, `${fileId}.js`);
    fs.writeFileSync(filePath, code);

    // 3. Build the Docker Sandbox Command
    // --rm: Destroy container after running
    // -m "50m": Limit RAM so they can't crash your server
    // --network none: Disable internet (prevents hacking/DDoS)
    // -v: Mount the temp file into the container
    // 3. Build the Docker Sandbox Command
  // 3. Build the Docker Sandbox Command
    // We convert Windows backslashes to forward slashes for Docker compatibility
    const linuxFriendlyPath = filePath.replace(/\\/g, '/');
    
    // We use the short syntax for the volume mount
    const dockerCmd = `docker run --rm -m "50m" --network none -v "//${linuxFriendlyPath}":/app/code.js node:18-alpine node /app/code.js`;

    console.log("🚨 RUNNING DOCKER COMMAND:", dockerCmd);

    // 4. Run the container! (Increased to 15 seconds for Windows cold-start)
    exec(dockerCmd, { timeout: 15000 }, (error, stdout, stderr) => {
        // Instantly delete the temp file so your server doesn't get cluttered
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Handle Infinite Loops
        if (error && error.killed) {
            return res.json({ output: 'Error: Execution Timed Out (Infinite loop detected!)' });
        }

        // Handle Syntax Errors
        if (error || stderr) {
            return res.json({ output: stderr || error.message });
        }

        // Success! Send the console logs back to the frontend
        res.json({ output: stdout });
    });
});
io.on('connection', (socket) => {
    // 🚨 THE WIRETAP: Catch EVERYTHING coming from the frontend
    socket.onAny((eventName, ...args) => {
        console.log(`[WIRETAP] 📡 Caught event from frontend: "${eventName}"`);
    });
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
// Inside io.on('connection', (socket) => { ... })

// 1. User A invites the room
// 🚨 THIS IS THE MISSING KICKSTART
// It tells the user who just joined the call who else they need to connect to.
socket.on('request-call-join', ({ roomId }) => {
    // 1. Find everyone currently in this specific room
    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    
    // 2. Filter out the person asking, so they don't call themselves
    const otherUsers = clientsInRoom.filter(id => id !== socket.id);
    
    // 3. Send the phonebook back to the frontend
    socket.emit('all-users', otherUsers);
});
socket.on('client:invite-call', ({ roomId, username }) => {
    socket.to(roomId).emit('server:invite-call', { 
        from: username, 
        callerId: socket.id 
    });
});

// 2. User B accepts the invitation
socket.on('client:accept-call', ({ roomId, callerId }) => {
    // Tell User A that User B is ready to handshake
    io.to(callerId).emit('server:call-accepted', { signalTarget: socket.id });
    // Tell User B to prepare their own video
    socket.emit('server:prepare-local-stream');
});
// 3. User A sends their WebRTC "Offer" (Signal) to User B
socket.on("sending-signal", (payload) => {
    // This forwards User A's connection data to User B
    io.to(payload.userToSignal).emit('user-joined', { 
        signal: payload.signal, 
        callerID: payload.callerID 
    });
});

// 4. User B sends their "Answer" back to User A
socket.on("returning-signal", (payload) => {
    // This completes the handshake so they can see each other
    io.to(payload.callerID).emit('receiving-returned-signal', { 
        signal: payload.signal, 
        id: socket.id 
    });
});
    // 3. FILE SYSTEM EVENTS
   // 3. FILE SYSTEM EVENTS (Make sure this is in server.js!)
    // Inside server.js
    // Inside server.js
   // 3. FILE SYSTEM EVENTS (Using hardcoded strings to bypass the bug)
    socket.on('file-created', ({ roomId, files }) => {
        console.log(`🚨 [SERVER] Syncing NEW FILE to room ${roomId}`);
        socket.to(roomId).emit('file-created', { files });
    });

    socket.on('file-deleted', ({ roomId, files }) => {
        console.log(`🚨 [SERVER] Syncing DELETED FILE to room ${roomId}`);
        socket.to(roomId).emit('file-deleted', { files });
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
socket.on('comment:new', ({ roomId, comment }) => {
        // This tells the server: "Broadcast this comment to everyone in the room EXCEPT the sender"
        socket.in(roomId).emit('comment:new', { comment });
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