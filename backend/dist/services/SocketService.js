"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = exports.SocketService = void 0;
const logger_1 = require("../utils/logger");
const NotificationService_1 = require("./NotificationService");
const PUSH_EVENTS = {
    'ride:offer': {
        title: 'New Ride Request',
        getBody: (data) => `New ride request nearby (${data.distanceKm}km)`
    },
    'ride:accepted': {
        title: 'Driver Found',
        getBody: () => 'Your driver is on the way!'
    },
    'ride:driver_arrived': {
        title: 'Driver Arrived',
        getBody: () => 'Your driver is waiting for you.'
    },
    'ride:started': {
        title: 'Ride Started',
        getBody: () => 'You are on your way to the destination.'
    },
    'ride:completed': {
        title: 'Ride Completed',
        getBody: () => 'Your ride has been completed. Thank you!'
    },
    'ride:cancelled': {
        title: 'Ride Cancelled',
        getBody: (data) => `Ride was cancelled: ${data.reason || 'Unknown reason'}`
    },
    'delivery:proof_uploaded': {
        title: 'Delivery Proof',
        getBody: () => 'Proof of delivery has been uploaded.'
    }
};
class SocketService {
    constructor() {
        this.activeRideRooms = new Map();
        this.driverSyncTracker = new Map();
    }
    register(io) {
        this.io = io;
    }
    attachServer(io) {
        this.register(io);
    }
    notifyDriver(driverId, event, data) {
        if (!this.io)
            return;
        this.io.to(`driver:${driverId}`).emit(event, data);
        // Push Notification
        const pushConfig = PUSH_EVENTS[event];
        if (pushConfig) {
            NotificationService_1.notificationService.sendPush(driverId, pushConfig.title, pushConfig.getBody(data), Object.assign({ type: event }, data)).catch(err => logger_1.logger.warn({ err, driverId, event }, 'Failed to send socket push'));
        }
    }
    notifyRider(riderId, event, data) {
        if (!this.io)
            return;
        this.io.to(`rider:${riderId}`).emit(event, data);
        // Push Notification
        const pushConfig = PUSH_EVENTS[event];
        if (pushConfig) {
            NotificationService_1.notificationService.sendPush(riderId, pushConfig.title, pushConfig.getBody(data), Object.assign({ type: event }, data)).catch(err => logger_1.logger.warn({ err, riderId, event }, 'Failed to send socket push'));
        }
    }
    notifyAdmin(event, data) {
        if (!this.io)
            return;
        this.io.to('admin').emit(event, data);
    }
    joinRideRoom(rideId, riderId, driverId) {
        this.activeRideRooms.set(rideId, { rideId, riderId, driverId, lastBroadcast: Date.now() });
    }
    leaveRideRoom(rideId) {
        this.activeRideRooms.delete(rideId);
    }
    emitRideUpdate(rideId, payload) {
        if (!this.io)
            return;
        this.io.to(`ride:${rideId}`).emit('ride:update', payload);
        const room = this.activeRideRooms.get(rideId);
        if (room) {
            room.lastBroadcast = Date.now();
            this.activeRideRooms.set(rideId, room);
        }
    }
    shouldSyncDriver(driverId, intervalMs = 3000) {
        var _a;
        const last = (_a = this.driverSyncTracker.get(driverId)) !== null && _a !== void 0 ? _a : 0;
        if (Date.now() - last < intervalMs)
            return false;
        this.driverSyncTracker.set(driverId, Date.now());
        return true;
    }
}
exports.SocketService = SocketService;
exports.socketService = new SocketService();
//# sourceMappingURL=SocketService.js.map