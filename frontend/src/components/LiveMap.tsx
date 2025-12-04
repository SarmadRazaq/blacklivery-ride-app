import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { useSocket } from '../context/SocketContext';

const containerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem'
};

const center = {
    lat: 6.5244, // Lagos
    lng: 3.3792
};

interface DriverLocation {
    id: string;
    lat: number;
    lng: number;
    status: 'online' | 'busy' | 'offline';
}

const LiveMap = () => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "YOUR_API_KEY_HERE" // User needs to provide this or I use env var
    });

    const [drivers, setDrivers] = useState<DriverLocation[]>([]);
    const { socket } = useSocket();

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

    const onLoad = useCallback(function callback(_map: google.maps.Map) {
        // map instance available here
        console.log("Map Loaded");
    }, []);

    const onUnmount = useCallback(function callback(_map: google.maps.Map) {
        // clean up
        console.log("Map Unmounted");
    }, []);

    if (!isLoaded) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">Loading Map...</div>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
        >
            {drivers.map(driver => (
                <Marker
                    key={driver.id}
                    position={{ lat: driver.lat, lng: driver.lng }}
                    icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: driver.status === 'busy' ? '#EF4444' : '#10B981',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: 'white',
                    }}
                />
            ))}
        </GoogleMap>
    );
}

export default React.memo(LiveMap);
