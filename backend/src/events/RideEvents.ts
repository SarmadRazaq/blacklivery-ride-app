import { EventEmitter } from 'events';

export interface RideCreatedPayload {
    rideId: string;
    riderId: string;
    requestedDriverIds: string[];
}

export interface RideAcceptedPayload {
    rideId: string;
    riderId: string;
    driverId: string;
}

export interface RideLifecyclePayload {
    rideId: string;
    riderId: string;
    driverId?: string;
}

export const rideEvents = new EventEmitter();
rideEvents.setMaxListeners(100);