"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const SocketService_1 = require("./services/SocketService");
const DriverStatusService_1 = require("./services/DriverStatusService");
const PORT = process.env.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*', // Allow all for now, restrict in production
        methods: ['GET', 'POST']
    }
});
exports.io = io;
// Initialize Socket Service
SocketService_1.socketService.attachServer(io);
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join:admin', () => {
        socket.join('admin');
        console.log(`Socket ${socket.id} joined admin room`);
    });
    socket.on('join:driver', (driverId) => {
        socket.join(`driver:${driverId}`);
    });
    socket.on('join:rider', (riderId) => {
        socket.join(`rider:${riderId}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
(0, DriverStatusService_1.startDriverStatusMonitor)();
//# sourceMappingURL=server.js.map