import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import api from '../api/client';
import { ADMIN_ACTIVE_RIDES } from '../api/endpoints';
import { ENV } from '../config/env';
import Badge from '../components/ui/Badge';
import { RefreshCw, MapPin, AlertTriangle } from 'lucide-react';

interface ActiveRide {
    id: string;
    status: string;
    region: string;
    riderId: string;
    driverId?: string;
    pickupLocation?: { lat: number; lng: number; address?: string };
    dropoffLocation?: { lat: number; lng: number; address?: string };
    driverLocation?: { lat: number; lng: number };
    driverInfo?: { name: string; licensePlate?: string };
    riderInfo?: { name: string };
    vehicleCategory?: string;
    estimatedFare?: number;
    currency?: string;
    createdAt?: unknown;
}

const STATUS_COLORS: Record<string, string> = {
    finding_driver: 'warning',
    accepted: 'info',
    arrived: 'info',
    in_progress: 'success',
    completed: 'default',
    cancelled: 'danger',
};

const MAPS_API_KEY = ENV.GOOGLE_MAPS_API_KEY;

declare global {
    interface Window {
        google: any;
        initAdminMap: () => void;
    }
}

let mapInstance: any = null;
let markersMap: Map<string, any> = new Map();

const LiveMapPage = () => {
    const mapRef = useRef<HTMLDivElement>(null);
    const { socket, isConnected } = useSocket();
    const [rides, setRides] = useState<ActiveRide[]>([]);
    const [selectedRide, setSelectedRide] = useState<ActiveRide | null>(null);
    const [loading, setLoading] = useState(true);
    const [mapsReady, setMapsReady] = useState(false);
    const [mapsError, setMapsError] = useState(false);

    const loadRides = useCallback(async () => {
        try {
            const res = await api.get(ADMIN_ACTIVE_RIDES);
            const data: ActiveRide[] = Array.isArray(res.data?.rides)
                ? res.data.rides
                : Array.isArray(res.data)
                    ? res.data
                    : [];
            setRides(data);
            return data;
        } catch {
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Initialise Google Maps
    const initMap = useCallback(() => {
        if (!mapRef.current || !window.google) return;
        mapInstance = new window.google.maps.Map(mapRef.current, {
            center: { lat: 6.5244, lng: 3.3792 }, // Lagos default
            zoom: 12,
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
            ],
        });
        setMapsReady(true);
    }, []);

    // Load Google Maps script
    useEffect(() => {
        if (!MAPS_API_KEY) { setMapsError(true); setLoading(false); return; }
        if (window.google?.maps) { initMap(); return; }
        window.initAdminMap = () => initMap();
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=initAdminMap`;
        script.async = true;
        script.onerror = () => setMapsError(true);
        document.head.appendChild(script);
        return () => { window.initAdminMap = () => {}; };
    }, [initMap]);

    // Place/update markers when rides or map change
    useEffect(() => {
        if (!mapsReady || !window.google) return;

        const currentIds = new Set(rides.map(r => r.id));

        // Remove stale markers
        markersMap.forEach((marker, id) => {
            if (!currentIds.has(id)) { marker.setMap(null); markersMap.delete(id); }
        });

        rides.forEach(ride => {
            const loc = ride.driverLocation ?? ride.pickupLocation;
            if (!loc) return;
            const pos = { lat: loc.lat, lng: loc.lng };

            const pinColor = ride.status === 'in_progress' ? '#22c55e'
                : ride.status === 'finding_driver' ? '#f59e0b'
                    : ride.status === 'arrived' ? '#3b82f6' : '#6b7280';

            if (markersMap.has(ride.id)) {
                markersMap.get(ride.id).setPosition(pos);
            } else {
                const marker = new window.google.maps.Marker({
                    position: pos,
                    map: mapInstance,
                    title: ride.driverInfo?.name ?? ride.id,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 9,
                        fillColor: pinColor,
                        fillOpacity: 1,
                        strokeColor: '#fff',
                        strokeWeight: 2,
                    },
                });
                marker.addListener('click', () => setSelectedRide(ride));
                markersMap.set(ride.id, marker);
            }
        });
    }, [rides, mapsReady]);

    // Initial data load
    useEffect(() => { loadRides(); }, [loadRides]);

    // Real-time updates via Socket.IO
    useEffect(() => {
        if (!socket) return;

        const handleRideUpdate = (data: any) => {
            setRides(prev => {
                const idx = prev.findIndex(r => r.id === data.rideId || r.id === data.id);
                if (idx === -1) return prev;
                const updated = { ...prev[idx], ...data, status: data.status ?? prev[idx].status };
                const next = [...prev];
                next[idx] = updated;
                return next;
            });
        };

        const handleLocationUpdate = (data: any) => {
            if (!data?.rideId && !data?.driverId) return;
            setRides(prev => prev.map(r =>
                (r.id === data.rideId || r.driverId === data.driverId)
                    ? { ...r, driverLocation: { lat: data.lat, lng: data.lng } }
                    : r
            ));
        };

        const handleNewRide = (_data: any) => { loadRides(); };

        socket.on('ride:status_updated', handleRideUpdate);
        socket.on('location_update', handleLocationUpdate);
        socket.on('ride:created', handleNewRide);

        return () => {
            socket.off('ride:status_updated', handleRideUpdate);
            socket.off('location_update', handleLocationUpdate);
            socket.off('ride:created', handleNewRide);
        };
    }, [socket, loadRides]);

    const activeCounts = {
        finding: rides.filter(r => r.status === 'finding_driver').length,
        accepted: rides.filter(r => ['accepted', 'arrived'].includes(r.status)).length,
        inProgress: rides.filter(r => r.status === 'in_progress').length,
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Live Operations</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Real-time fleet tracking •{' '}
                        <span className={isConnected ? 'text-green-600' : 'text-red-500'}>
                            {isConnected ? 'Live' : 'Disconnected'}
                        </span>
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); loadRides(); }}
                    className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Searching', count: activeCounts.finding, color: 'text-yellow-600' },
                    { label: 'En Route', count: activeCounts.accepted, color: 'text-blue-600' },
                    { label: 'In Progress', count: activeCounts.inProgress, color: 'text-green-600' },
                ].map(({ label, count, color }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`text-3xl font-bold mt-1 ${color}`}>{count}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Map */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: 520 }}>
                    {mapsError ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
                            <AlertTriangle size={40} className="text-yellow-500" />
                            <p className="font-medium">Google Maps unavailable</p>
                            <p className="text-sm text-center px-6">
                                Set <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your environment to enable the live map.
                            </p>
                        </div>
                    ) : (
                        <div ref={mapRef} className="w-full h-full" />
                    )}
                </div>

                {/* Ride list */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col" style={{ height: 520 }}>
                    <div className="p-4 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">Active Rides ({rides.length})</p>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                        {loading ? (
                            <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
                        ) : rides.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                                <MapPin size={28} className="text-gray-300" />
                                No active rides right now
                            </div>
                        ) : (
                            rides.map(ride => (
                                <button
                                    key={ride.id}
                                    onClick={() => {
                                        setSelectedRide(ride);
                                        const loc = ride.driverLocation ?? ride.pickupLocation;
                                        if (loc && mapInstance) {
                                            mapInstance.panTo({ lat: loc.lat, lng: loc.lng });
                                            mapInstance.setZoom(15);
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedRide?.id === ride.id ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-mono text-gray-500">
                                            {ride.id.substring(0, 8)}
                                        </span>
                                        <Badge variant={STATUS_COLORS[ride.status] as any ?? 'default'}>
                                            {ride.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800 truncate">
                                        {ride.driverInfo?.name ?? 'Unassigned'}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {ride.pickupLocation?.address ?? 'Pickup'} → {ride.dropoffLocation?.address ?? 'Dropoff'}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Ride detail panel */}
            {selectedRide && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-900">Ride Detail</h2>
                        <button onClick={() => setSelectedRide(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                            Close
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {[
                            { label: 'Ride ID', value: selectedRide.id },
                            { label: 'Status', value: selectedRide.status.replace(/_/g, ' ') },
                            { label: 'Driver', value: selectedRide.driverInfo?.name ?? 'Unassigned' },
                            { label: 'Vehicle', value: selectedRide.vehicleCategory ?? '—' },
                            { label: 'Region', value: selectedRide.region },
                            { label: 'Plate', value: selectedRide.driverInfo?.licensePlate ?? '—' },
                            { label: 'Pickup', value: selectedRide.pickupLocation?.address ?? '—' },
                            { label: 'Dropoff', value: selectedRide.dropoffLocation?.address ?? '—' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                                <p className="font-medium text-gray-800 truncate">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LiveMapPage;
