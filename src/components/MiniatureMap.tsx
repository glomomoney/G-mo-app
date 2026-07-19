import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MiniatureMapProps {
  pickup: { name: string; lat: number; lng: number } | null;
  destination: { name: string; lat: number; lng: number } | null;
  driverLoc: { lat: number; lng: number } | null;
  rideStatus: string;
  driverType?: string;
  slangMode?: boolean;
}

export default function MiniatureMap({
  pickup,
  destination,
  driverLoc,
  rideStatus,
  driverType = 'ecoride',
  slangMode = false
}: MiniatureMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  
  const completedPolylineRef = useRef<L.Polyline | null>(null);
  const remainingPolylineRef = useRef<L.Polyline | null>(null);
  const completedPulseRef = useRef<L.Polyline | null>(null);
  const remainingPulseRef = useRef<L.Polyline | null>(null);

  // Helper to validate coords
  const isValidCoords = (lat: any, lng: any): boolean => {
    return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet map instance with minimal controls
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      dragging: false, // passive display map, perfect for cards
      touchZoom: false
    }).setView([3.8640, 11.5205], 14);

    // Apply CartoDB Dark Matter tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (err) {
          console.warn("Error removing mini map:", err);
        }
        mapRef.current = null;
      }
      pickupMarkerRef.current = null;
      destMarkerRef.current = null;
      driverMarkerRef.current = null;
      completedPolylineRef.current = null;
      remainingPolylineRef.current = null;
      completedPulseRef.current = null;
      remainingPulseRef.current = null;
    };
  }, []);

  // Update map state (Markers, Polylines, Fit Bounds)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Manage Pickup Marker (A)
    if (pickup && isValidCoords(pickup.lat, pickup.lng)) {
      const pickupIcon = L.divIcon({
        className: 'mini-pin-pickup',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 rounded-full bg-emerald-500/40 animate-ping"></div>
            <div class="relative w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-white font-extrabold text-[8px]">
              A
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      } else {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      }
    } else {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.remove();
        pickupMarkerRef.current = null;
      }
    }

    // 2. Manage Destination Marker (B)
    if (destination && isValidCoords(destination.lat, destination.lng)) {
      const destIcon = L.divIcon({
        className: 'mini-pin-dest',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 rounded-full bg-[#ffd385]/40 animate-ping"></div>
            <div class="relative w-4 h-4 rounded-full bg-[#ffd385] border-2 border-slate-900 shadow-md flex items-center justify-center text-slate-900 font-extrabold text-[8px]">
              B
            </div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      }
    } else {
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    }

    // 3. Manage Active Driver Marker (Emoji)
    if (driverLoc && isValidCoords(driverLoc.lat, driverLoc.lng)) {
       let vehicleSvg = '🚗';
       let bgColor = 'bg-[#ffd385]';
      if (driverType === 'okada') {
        vehicleSvg = '🏍️';
        bgColor = 'bg-sky-500';
      } else if (driverType === 'keke') {
        vehicleSvg = '🛺';
        bgColor = 'bg-[#b8924e]';
      } else if (driverType === 'comfort') {
        vehicleSvg = '🚘';
        bgColor = 'bg-purple-600';
      }

      const driverIcon = L.divIcon({
        className: 'mini-pin-driver',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-7 h-7 rounded-full ${bgColor}/30 animate-pulse"></div>
            <div class="relative w-6 h-6 rounded-full ${bgColor} border border-slate-900 shadow-md flex items-center justify-center text-xs">
              ${vehicleSvg}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([driverLoc.lat, driverLoc.lng]);
      } else {
        driverMarkerRef.current = L.marker([driverLoc.lat, driverLoc.lng], { icon: driverIcon }).addTo(map);
      }
    } else {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
    }

    // 4. Draw Polylines (Completed vs Remaining Route Paths)
    if (pickup && destination && driverLoc) {
      const pickupLatLng = L.latLng(pickup.lat, pickup.lng);
      const destLatLng = L.latLng(destination.lat, destination.lng);
      const driverLatLng = L.latLng(driverLoc.lat, driverLoc.lng);

      let completedPoints: L.LatLng[] = [];
      let remainingPoints: L.LatLng[] = [];

      if (rideStatus === 'driver_found' || rideStatus === 'arriving') {
        // Driver is heading to pickup.
        // Completed: Start point of driver to current driver location.
        // (Since starting position isn't saved as a history array, we draw a path from pickup to current driver location)
        completedPoints = [driverLatLng, pickupLatLng];
        remainingPoints = [pickupLatLng, destLatLng];
      } else if (rideStatus === 'in_progress') {
        // Driver is transporting passenger from pickup to destination
        // Completed: Pickup to current driver location
        completedPoints = [pickupLatLng, driverLatLng];
        // Remaining: Current driver location to destination
        remainingPoints = [driverLatLng, destLatLng];
      }

      // Draw Completed Polyline (Solid Bright Gold with high contrast)
      if (completedPoints.length >= 2) {
        if (completedPolylineRef.current) {
          completedPolylineRef.current.setLatLngs(completedPoints);
        } else {
          completedPolylineRef.current = L.polyline(completedPoints, {
            color: '#ffd385', // brand-gold
            weight: 4,
            opacity: 0.95,
            lineJoin: 'round'
          }).addTo(map);
        }

        // Add Pulsing highlight on completed segment
        if (completedPulseRef.current) {
          completedPulseRef.current.setLatLngs(completedPoints);
        } else {
          completedPulseRef.current = L.polyline(completedPoints, {
            color: '#ffffff',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 20',
            className: 'route-pulse-completed',
            lineJoin: 'round'
          }).addTo(map);
        }
      } else {
        if (completedPolylineRef.current) {
          completedPolylineRef.current.remove();
          completedPolylineRef.current = null;
        }
        if (completedPulseRef.current) {
          completedPulseRef.current.remove();
          completedPulseRef.current = null;
        }
      }

      // Draw Remaining Polyline (Dashed Semi-transparent Gold)
      if (remainingPoints.length >= 2) {
        if (remainingPolylineRef.current) {
          remainingPolylineRef.current.setLatLngs(remainingPoints);
        } else {
          remainingPolylineRef.current = L.polyline(remainingPoints, {
            color: '#ffd385',
            weight: 3,
            opacity: 0.4,
            dashArray: '5, 8',
            lineJoin: 'round'
          }).addTo(map);
        }

        // Add Pulsing highlight on remaining segment
        if (remainingPulseRef.current) {
          remainingPulseRef.current.setLatLngs(remainingPoints);
        } else {
          remainingPulseRef.current = L.polyline(remainingPoints, {
            color: '#ffd385',
            weight: 3,
            opacity: 0.7,
            dashArray: '6, 12',
            className: 'route-pulse-remaining',
            lineJoin: 'round'
          }).addTo(map);
        }
      } else {
        if (remainingPolylineRef.current) {
          remainingPolylineRef.current.remove();
          remainingPolylineRef.current = null;
        }
        if (remainingPulseRef.current) {
          remainingPulseRef.current.remove();
          remainingPulseRef.current = null;
        }
      }
    } else {
      // Clean up all polylines if we don't have enough data
      if (completedPolylineRef.current) {
        completedPolylineRef.current.remove();
        completedPolylineRef.current = null;
      }
      if (completedPulseRef.current) {
        completedPulseRef.current.remove();
        completedPulseRef.current = null;
      }
      if (remainingPolylineRef.current) {
        remainingPolylineRef.current.remove();
        remainingPolylineRef.current = null;
      }
      if (remainingPulseRef.current) {
        remainingPulseRef.current.remove();
        remainingPulseRef.current = null;
      }
    }

    // 5. Fit Map Bounds
    const boundsPoints: L.LatLng[] = [];
    if (pickup && isValidCoords(pickup.lat, pickup.lng)) boundsPoints.push(L.latLng(pickup.lat, pickup.lng));
    if (destination && isValidCoords(destination.lat, destination.lng)) boundsPoints.push(L.latLng(destination.lat, destination.lng));
    if (driverLoc && isValidCoords(driverLoc.lat, driverLoc.lng)) boundsPoints.push(L.latLng(driverLoc.lat, driverLoc.lng));

    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, {
        padding: [15, 15],
        animate: true,
        duration: 0.8
      });
    }

  }, [pickup, destination, driverLoc, rideStatus, driverType]);

  // Handle map resizing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-brand-gold/20 shadow-inner group mt-1" id="passenger-mini-map-container">
      {/* Self-contained CSS animations for glowing pulsing polyline vectors */}
      <style>{`
        @keyframes routePulseCompleted {
          from {
            stroke-dashoffset: 30;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes routePulseRemaining {
          from {
            stroke-dashoffset: 18;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        .route-pulse-completed {
          stroke-linecap: round;
          animation: routePulseCompleted 1s linear infinite;
          filter: drop-shadow(0 0 2.5px rgba(255, 255, 255, 0.7));
        }
        .route-pulse-remaining {
          stroke-linecap: round;
          animation: routePulseRemaining 1.5s linear infinite;
          filter: drop-shadow(0 0 2px rgba(226, 193, 141, 0.4));
        }
      `}</style>
      
      {/* Map container DOM element */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      
      {/* Visual Overlay elements */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none bg-brand-midnight/90 backdrop-blur-md px-2 py-0.5 border border-brand-gold/20 rounded-md text-[8.5px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {slangMode ? "Suivi GPS en direct" : "Live GPS Tracking"}
      </div>

      <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-brand-midnight/90 backdrop-blur-md px-2 py-0.5 border border-brand-input rounded-md text-[7px] font-bold text-brand-text-muted">
        {slangMode ? "Écran mini" : "Mini viewport"}
      </div>
    </div>
  );
}
