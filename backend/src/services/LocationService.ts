import { rtdb } from '../config/firebase';

export interface DriverLocationPayload {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp: number;
}

type LocationCallback = (payload: DriverLocationPayload) => void;

export class LocationService {
    private subscriberMap = new Map<string, Set<LocationCallback>>();
    private listenerMap = new Map<string, () => void>();

    async publishDriverLocation(
        driverId: string,
        lat: number,
        lng: number,
        heading?: number,
        speed?: number,
        accuracy?: number
    ): Promise<DriverLocationPayload> {
        const payload: DriverLocationPayload = {
            lat,
            lng,
            heading,
            speed,
            accuracy,
            timestamp: Date.now()
        };

        await rtdb.ref(`drivers/${driverId}/location`).set(payload);
        return payload;
    }

    subscribeToDriverLocation(driverId: string, callback: LocationCallback): () => void {
        if (!this.subscriberMap.has(driverId)) {
            this.subscriberMap.set(driverId, new Set());
        }
        this.subscriberMap.get(driverId)!.add(callback);

        if (!this.listenerMap.has(driverId)) {
            const ref = rtdb.ref(`drivers/${driverId}/location`);
            const handler = ref.on('value', (snapshot) => {
                const data = snapshot.val() as DriverLocationPayload | null;
                if (!data) return;
                this.dispatch(driverId, data);
            });
            this.listenerMap.set(driverId, () => ref.off('value', handler));
        }

        return () => {
            const subscribers = this.subscriberMap.get(driverId);
            if (!subscribers) return;
            subscribers.delete(callback);

            if (subscribers.size === 0) {
                this.subscriberMap.delete(driverId);
                const detach = this.listenerMap.get(driverId);
                detach?.();
                this.listenerMap.delete(driverId);
            }
        };
    }

    private dispatch(driverId: string, payload: DriverLocationPayload) {
        const subscribers = this.subscriberMap.get(driverId);
        if (!subscribers) return;
        subscribers.forEach((cb) => cb(payload));
    }
}

export const locationService = new LocationService();
