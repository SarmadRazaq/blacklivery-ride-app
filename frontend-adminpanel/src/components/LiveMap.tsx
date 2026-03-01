import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useSocket } from '../context/SocketContext';
import api from '../api/client';
import { ENV } from '../config/env';
import { MAP_CONTAINER_HEIGHT, MAP_DEFAULT_ZOOM, MAP_MARKER_SCALE, MAP_MARKER_STROKE_WEIGHT, MAP_LOADER_ID, MAP_POLL_INTERVAL_MS } from '../config/constants';
import { DEFAULT_MAP_CENTER } from '../config/regions';
import { MAP_MARKER_COLORS } from '../config/theme';
import { ADMIN_RIDES_ACTIVE } from '../api/endpoints';

const containerStyle = {
    width: '100%',
    height: MAP_CONTAINER_HEIGHT,
    borderRadius: '0.75rem'
};

const center = DEFAULT_MAP_CENTER;

interface DriverLocation {
    id: string;
    lat: number;
    lng: number;
    status: 'online' | 'busy' | 'offline';
}

const LiveMap = () => {
    const mapsApiKey = ENV.GOOGLE_MAPS_API_KEY;
    const { isLoaded } = useJsApiLoader({
        id: MAP_LOADER_ID,
        googleMapsApiKey: mapsApiKey
    });

    const [drivers, setDrivers] = useState<DriverLocation[]>([]);
    const { socket } = useSocket();

    const fetchActiveDriverLocations = useCallback(async () => {
        try {
            const response = await api.get(ADMIN_RIDES_ACTIVE, {
                headers: { 'X-Suppress-Global-Error': 'true' }
            });

            const rides = Array.isArray(response.data) ? response.data : [];

            const nextDrivers: DriverLocation[] = rides
                .map((ride: any) => {
                    const loc = ride?.driverLocation;
                    const lat = Number(loc?.lat);
                    const lng = Number(loc?.lng);

                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

                    return {
                        id: String(ride?.driverId || ride?.id || `${lat}:${lng}`),
                        lat,
                        lng,
                        status: ride?.status === 'in_progress' ? 'busy' : 'online'
                    } as DriverLocation;
                })
                .filter(Boolean) as DriverLocation[];

            setDrivers(nextDrivers);
        } catch (error) {
            console.error('Failed to fetch active driver locations', error);
        }
    }, []);

    useEffect(() => {
        fetchActiveDriverLocations();
        const interval = window.setInterval(fetchActiveDriverLocations, MAP_POLL_INTERVAL_MS);
        return () => window.clearInterval(interval);
    }, [fetchActiveDriverLocations]);

    useEffect(() => {
        if (!socket) return;

        socket.on('driver:location', (data: DriverLocation) => {
            setDrivers(prev => {
                const index = prev.findIndex(d => d.id === data.id);
                if (index > -1) {
                    const newDrivers = [...prev];
                    newDrivers[index] = data;
                    return newDrivers;
                }
                return [...prev, data];
            });
        });

        return () => {
            socket.off('driver:location');
        };
    }, [socket]);

    const onLoad = useCallback(function callback() {
        // map instance available here
    }, []);

    const onUnmount = useCallback(function callback() {
        // clean up
    }, []);

    if (!mapsApiKey) {
        return (
            <div className="h-96 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-center text-yellow-700 text-sm px-4 text-center">
                Google Maps key is missing. Set VITE_GOOGLE_MAPS_API_KEY in frontend-adminpanel .env.
            </div>
        );
    }

    if (!isLoaded) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={drivers.length ? { lat: drivers[0].lat, lng: drivers[0].lng } : center}
            zoom={MAP_DEFAULT_ZOOM}
            onLoad={onLoad}
            onUnmount={onUnmount}
        >
            {drivers.map(driver => (
                <Marker
                    key={driver.id}
                    position={{ lat: driver.lat, lng: driver.lng }}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: MAP_MARKER_SCALE,
                        fillColor: driver.status === 'busy' ? MAP_MARKER_COLORS.BUSY : MAP_MARKER_COLORS.ONLINE,
                        fillOpacity: 1,
                        strokeWeight: MAP_MARKER_STROKE_WEIGHT,
                        strokeColor: MAP_MARKER_COLORS.STROKE,
                    }}
                />
            ))}
        </GoogleMap>
    );
}

export default React.memo(LiveMap);
