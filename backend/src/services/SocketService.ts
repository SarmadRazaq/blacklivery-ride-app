import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import { notificationService } from './NotificationService';

interface ActiveRideRoom {
    rideId: string;
    riderId: string;
    driverId: string;
    lastBroadcast?: number;
}

const PUSH_EVENTS: Record<string, { title: string; getBody: (data: any) => string }> = {
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

export class SocketService {
    private io?: Server;
    private activeRideRooms = new Map<string, ActiveRideRoom>();
    private driverSyncTracker = new Map<string, number>();
    private syncCleanupTimer?: ReturnType<typeof setInterval>;

    public register(io: Server): void {
        this.io = io;
        // Periodically purge stale driverSyncTracker entries to prevent memory leak
        if (!this.syncCleanupTimer) {
            this.syncCleanupTimer = setInterval(() => {
                const staleThreshold = Date.now() - 30_000; // 30 seconds
                for (const [driverId, lastSync] of this.driverSyncTracker) {
                    if (lastSync < staleThreshold) {
                        this.driverSyncTracker.delete(driverId);
                    }
                }
            }, 60_000); // Run every 60 seconds
        }
    }

    public attachServer(io: Server): void {
        this.register(io);
    }

    public notifyDriver(driverId: string, event: string, data: any): void {
        if (!this.io) return;
        this.io.to(`driver:${driverId}`).emit(event, data);

        // Push Notification
        const pushConfig = PUSH_EVENTS[event];
        if (pushConfig) {
            notificationService.sendPush(
                driverId,
                pushConfig.title,
                pushConfig.getBody(data),
                { type: event, ...data }
            ).catch(err => logger.warn({ err, driverId, event }, 'Failed to send socket push'));
        }
    }

    public notifyRider(riderId: string, event: string, data: any): void {
        if (!this.io) return;
        this.io.to(`rider:${riderId}`).emit(event, data);

        // Push Notification
        const pushConfig = PUSH_EVENTS[event];
        if (pushConfig) {
            notificationService.sendPush(
                riderId,
                pushConfig.title,
                pushConfig.getBody(data),
                { type: event, ...data }
            ).catch(err => logger.warn({ err, riderId, event }, 'Failed to send socket push'));
        }
    }

    public notifyAdmin(event: string, data: any): void {
        if (!this.io) return;
        this.io.to('admin').emit(event, data);
    }

    public joinRideRoom(rideId: string, riderId: string, driverId: string): void {
        this.activeRideRooms.set(rideId, { rideId, riderId, driverId, lastBroadcast: Date.now() });
    }

    public leaveRideRoom(rideId: string): void {
        this.activeRideRooms.delete(rideId);
    }

    public emitRideUpdate(rideId: string, payload: any): void {
        if (!this.io) return;
        this.io.to(`ride:${rideId}`).emit('ride:update', payload);

        const room = this.activeRideRooms.get(rideId);
        if (room) {
            room.lastBroadcast = Date.now();
            this.activeRideRooms.set(rideId, room);
        }
    }

    public emitChatMessage(rideId: string, message: any, recipientId: string, recipientRole: 'rider' | 'driver'): void {
        if (!this.io) return;
        
        // Emit to ride room
        this.io.to(`ride:${rideId}`).emit('chat:message', message);
        
        // Emit directly to recipient
        const recipientRoom = recipientRole === 'rider' ? `rider:${recipientId}` : `driver:${recipientId}`;
        this.io.to(recipientRoom).emit('chat:new_message', message);
        
        // Send push notification
        notificationService.sendPush(
            recipientId,
            'New Message',
            message.message,
            { type: 'chat:message', rideId, messageId: message.id }
        ).catch(err => logger.warn({ err, recipientId }, 'Failed to send chat push notification'));
    }

    public emitTypingIndicator(rideId: string, userId: string, userRole: 'rider' | 'driver', isTyping: boolean): void {
        if (!this.io) return;
        this.io.to(`ride:${rideId}`).emit('chat:typing', { userId, userRole, isTyping });
    }

    public shouldSyncDriver(driverId: string, intervalMs = 3000): boolean {
        const last = this.driverSyncTracker.get(driverId) ?? 0;
        if (Date.now() - last < intervalMs) return false;
        this.driverSyncTracker.set(driverId, Date.now());
        return true;
    }
}

export const socketService = new SocketService();
