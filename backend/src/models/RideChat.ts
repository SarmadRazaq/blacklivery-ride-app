// src/models/RideChat.ts
export interface IChatMessage {
    id?: string;
    rideId: string;
    senderId: string;
    senderRole: 'rider' | 'driver';
    message: string;
    messageType: 'text' | 'location' | 'system';
    metadata?: {
        lat?: number;
        lng?: number;
        [key: string]: any;
    };
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRideChat {
    id?: string;
    rideId: string;
    riderId: string;
    driverId: string;
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCountRider: number;
    unreadCountDriver: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}