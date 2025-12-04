import * as dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { socketService } from './services/SocketService';
import { startDriverStatusMonitor } from './services/DriverStatusService';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all for now, restrict in production
        methods: ['GET', 'POST']
    }
});

// Initialize Socket Service
socketService.attachServer(io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join:admin', () => {
        socket.join('admin');
        console.log(`Socket ${socket.id} joined admin room`);
    });

    socket.on('join:driver', (driverId: string) => {
        socket.join(`driver:${driverId}`);
    });

    socket.on('join:rider', (riderId: string) => {
        socket.join(`rider:${riderId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

startDriverStatusMonitor();

export { io };
