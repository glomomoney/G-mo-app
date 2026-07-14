import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import * as d3 from 'd3';
import { Location, RideStatus } from '../types';
import { Compass, MapPin, Navigation, Locate, Activity, Check, ChevronDown, ChevronUp, RefreshCw, Flame, Info } from 'lucide-react';
import { LAGOS_LOCATIONS as DOUALA_LOCATIONS, YAOUNDE_LOCATIONS } from '../data';

export interface DemandZone {
  id: string;
  name: string;
  city: 'Yaoundé' | 'Douala';
  center: [number, number];
  vertices: [number, number][];
  demandLevel: 'critical' | 'high' | 'medium' | 'stable';
  activeRequests: number;
  surgeMultiplier: number;
}

function generateIrregularPolygon(centerLat: number, centerLng: number, numSides: number = 6, baseRadius: number = 0.005): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < numSides; i++) {
    const angle = (i * 2 * Math.PI) / numSides;
    const noise = 0.8 + Math.random() * 0.4; // 80% to 120% variance
    const r = baseRadius * noise;
    const lat = centerLat + r * Math.sin(angle);
    const lng = centerLng + r * Math.cos(angle) * 1.25; // compensate for aspect ratio at this latitude
    points.push([lat, lng]);
  }
  return points;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export interface MapDriver {
  id: string;
  name: string;
  vehicleType: string;
  rating: number;
  lat: number;
  lng: number;
  city: 'Yaoundé' | 'Douala';
  vehicleModel: string;
  vehiclePlate: string;
}

const AVAILABLE_DRIVERS_DATA: MapDriver[] = [
  { id: 'av_d1', name: 'Jean-Pierre Kamga', vehicleType: 'comfort', rating: 4.9, lat: 3.8910, lng: 11.5130, city: 'Yaoundé', vehicleModel: 'Toyota RAV4 (Black)', vehiclePlate: 'LT-284-AA' },
  { id: 'av_d2', name: 'Dieudonné Tagne', vehicleType: 'ecoride', rating: 4.7, lat: 3.8655, lng: 11.5190, city: 'Yaoundé', vehicleModel: 'Hyundai Elantra (Silver)', vehiclePlate: 'LT-491-BB' },
  { id: 'av_d3', name: 'Alhadji Ousmanou', vehicleType: 'keke', rating: 4.8, lat: 3.8640, lng: 11.5205, city: 'Yaoundé', vehicleModel: 'Toyota Corolla Yellow', vehiclePlate: 'LT-381-YY' },
  { id: 'av_d4', name: 'Fabrice Eto\'o', vehicleType: 'okada', rating: 4.6, lat: 3.8290, lng: 11.5180, city: 'Yaoundé', vehicleModel: 'Nanfang Moto (Red)', vehiclePlate: 'LT-129-XX' },
  { id: 'av_d5', name: 'Arthur Mbarga', vehicleType: 'keke', rating: 4.7, lat: 3.8710, lng: 11.4980, city: 'Yaoundé', vehicleModel: 'Toyota Yaris Yellow', vehiclePlate: 'LT-702-AA' },
  
  { id: 'av_d6', name: 'Jean-Pierre Kamga', vehicleType: 'comfort', rating: 4.9, lat: 4.0435, lng: 9.6895, city: 'Douala', vehicleModel: 'Toyota RAV4 (Black)', vehiclePlate: 'LT-284-AA' },
  { id: 'av_d7', name: 'Dieudonné Tagne', vehicleType: 'ecoride', rating: 4.7, lat: 4.0620, lng: 9.7090, city: 'Douala', vehicleModel: 'Hyundai Elantra (Silver)', vehiclePlate: 'LT-491-BB' },
  { id: 'av_d8', name: 'Alhadji Ousmanou', vehicleType: 'keke', rating: 4.8, lat: 4.0415, lng: 9.7420, city: 'Douala', vehicleModel: 'Toyota Corolla Yellow', vehiclePlate: 'LT-381-YY' },
  { id: 'av_d9', name: 'Fabrice Eto\'o', vehicleType: 'okada', rating: 4.6, lat: 4.0825, lng: 9.7405, city: 'Douala', vehicleModel: 'Nanfang Moto (Red)', vehiclePlate: 'LT-129-XX' },
  { id: 'av_d10', name: 'Arthur Mbarga', vehicleType: 'keke', rating: 4.7, lat: 4.0780, lng: 9.7710, city: 'Douala', vehicleModel: 'Toyota Yaris Yellow', vehiclePlate: 'LT-702-AA' }
];

const isValidCoords = (lat: any, lng: any): boolean => {
  return typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng);
};

interface TaxiMapProps {
  pickup: Location | null;
  destination: Location | null;
  driverLocation: { lat: number; lng: number } | null;
  status: RideStatus;
  driverType: string;
  onMapClick?: (lat: number, lng: number) => void;
  // Live GPS Support
  role?: 'passenger' | 'driver';
  slangMode?: boolean;
  onSetPickup?: (loc: Location) => void;
  onSetDestination?: (loc: Location) => void;
  onSetDriverLoc?: (loc: { lat: number; lng: number }) => void;
}

export default function TaxiMap({
  pickup,
  destination,
  driverLocation,
  status,
  driverType,
  onMapClick,
  role = 'passenger',
  slangMode = false,
  onSetPickup,
  onSetDestination,
  onSetDriverLoc
}: TaxiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Geolocation States
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPassengerTrackingPickup, setIsPassengerTrackingPickup] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);

  // Keep refs for markers and polylines to modify them without reloading map
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const liveMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const polygonLayersRef = useRef<{ [zoneId: string]: L.Polygon }>({});
  const nearbyDriverMarkersRef = useRef<L.Marker[]>([]);
  const d3OverlayRef = useRef<SVGSVGElement | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered around Douala, Cameroon
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([4.0435, 9.7100], 12);

    // Dark styled map tiles (CartoDB Dark Matter fits our Wanda Brand Palette perfectly)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    // Add clean zoom control at bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapRef.current = map;

    // Map click handler to select custom coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    });

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.off('click');
          mapRef.current.remove();
        } catch (err) {
          console.warn("Error during map removal:", err);
        }
        mapRef.current = null;
      }
      // Set all references to null to avoid memory leaks or using detached elements
      pickupMarkerRef.current = null;
      destMarkerRef.current = null;
      driverMarkerRef.current = null;
      liveMarkerRef.current = null;
      routeLineRef.current = null;
      polygonLayersRef.current = {};
      nearbyDriverMarkersRef.current = [];
      if (d3OverlayRef.current) {
        d3.select(d3OverlayRef.current).remove();
        d3OverlayRef.current = null;
      }
    };
  }, []);

  // 1. Initialize stable demand zones with organic polygon vertices
  useEffect(() => {
    const yaoundeZones: DemandZone[] = [
      { id: 'y1', name: 'Bastos Embassy District', city: 'Yaoundé', center: [3.8910, 11.5130], vertices: generateIrregularPolygon(3.8910, 11.5130, 6, 0.006), demandLevel: 'high', activeRequests: 42, surgeMultiplier: 1.5 },
      { id: 'y2', name: 'Marché Central (Central Market)', city: 'Yaoundé', center: [3.8655, 11.5190], vertices: generateIrregularPolygon(3.8655, 11.5190, 7, 0.005), demandLevel: 'critical', activeRequests: 87, surgeMultiplier: 1.8 },
      { id: 'y3', name: 'Poste Centrale & Blvd 20 Mai', city: 'Yaoundé', center: [3.8640, 11.5205], vertices: generateIrregularPolygon(3.8640, 11.5205, 5, 0.004), demandLevel: 'critical', activeRequests: 95, surgeMultiplier: 1.9 },
      { id: 'y4', name: 'Ngoa-Ekelle University Area', city: 'Yaoundé', center: [3.8490, 11.5030], vertices: generateIrregularPolygon(3.8490, 11.5030, 6, 0.007), demandLevel: 'medium', activeRequests: 28, surgeMultiplier: 1.2 },
      { id: 'y5', name: 'Mvan Bus Terminal (Gare)', city: 'Yaoundé', center: [3.8290, 11.5180], vertices: generateIrregularPolygon(3.8290, 11.5180, 6, 0.0055), demandLevel: 'high', activeRequests: 56, surgeMultiplier: 1.6 },
      { id: 'y6', name: 'Omnisports Stadium Area', city: 'Yaoundé', center: [3.8855, 11.5395], vertices: generateIrregularPolygon(3.8855, 11.5395, 6, 0.0065), demandLevel: 'stable', activeRequests: 14, surgeMultiplier: 1.0 },
      { id: 'y7', name: 'Mokolo Market (Marché Mokolo)', city: 'Yaoundé', center: [3.8710, 11.4980], vertices: generateIrregularPolygon(3.8710, 11.4980, 7, 0.005), demandLevel: 'critical', activeRequests: 78, surgeMultiplier: 1.7 }
    ];

    const doualaZones: DemandZone[] = [
      { id: 'd1', name: 'Akwa Palace & Blvd de la Liberté', city: 'Douala', center: [4.0485, 9.6974], vertices: generateIrregularPolygon(4.0485, 9.6974, 6, 0.0055), demandLevel: 'critical', activeRequests: 91, surgeMultiplier: 1.9 },
      { id: 'd2', name: 'Bonanjo Administrative Center', city: 'Douala', center: [4.0435, 9.6895], vertices: generateIrregularPolygon(4.0435, 9.6895, 6, 0.006), demandLevel: 'high', activeRequests: 48, surgeMultiplier: 1.4 },
      { id: 'd3', name: 'Deido Roundabout (Rond-point)', city: 'Douala', center: [4.0620, 9.7090], vertices: generateIrregularPolygon(4.0620, 9.7090, 7, 0.005), demandLevel: 'critical', activeRequests: 84, surgeMultiplier: 1.7 },
      { id: 'd4', name: 'Ndokoti Junction (Carrefour)', city: 'Douala', center: [4.0415, 9.7420], vertices: generateIrregularPolygon(4.0415, 9.7420, 6, 0.0065), demandLevel: 'critical', activeRequests: 112, surgeMultiplier: 2.1 },
      { id: 'd5', name: 'Bonamoussadi Market (Marché)', city: 'Douala', center: [4.0825, 9.7405], vertices: generateIrregularPolygon(4.0825, 9.7405, 5, 0.005), demandLevel: 'medium', activeRequests: 32, surgeMultiplier: 1.2 },
      { id: 'd6', name: 'Douala Grand Mall & Airport Zone', city: 'Douala', center: [4.0152, 9.7360], vertices: generateIrregularPolygon(4.0152, 9.7360, 6, 0.007), demandLevel: 'high', activeRequests: 65, surgeMultiplier: 1.5 },
      { id: 'd7', name: 'Logbessou Campus Area', city: 'Douala', center: [4.0780, 9.7710], vertices: generateIrregularPolygon(4.0780, 9.7710, 6, 0.006), demandLevel: 'stable', activeRequests: 19, surgeMultiplier: 1.0 }
    ];

    setDemandZones([...yaoundeZones, ...doualaZones]);
  }, []);

  // 2. Real-time dynamic simulation updates for demand density (subtle fluctuations)
  useEffect(() => {
    const intervalId = setInterval(() => {
      setDemandZones(prevZones => prevZones.map(zone => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4 change
        const nextRequests = Math.max(2, zone.activeRequests + delta);
        
        let demandLevel: 'critical' | 'high' | 'medium' | 'stable' = 'stable';
        let surgeMultiplier = 1.0;
        if (nextRequests >= 70) {
          demandLevel = 'critical';
          surgeMultiplier = parseFloat((1.6 + Math.random() * 0.4).toFixed(1));
        } else if (nextRequests >= 40) {
          demandLevel = 'high';
          surgeMultiplier = parseFloat((1.3 + Math.random() * 0.3).toFixed(1));
        } else if (nextRequests >= 15) {
          demandLevel = 'medium';
          surgeMultiplier = parseFloat((1.1 + Math.random() * 0.2).toFixed(1));
        } else {
          demandLevel = 'stable';
          surgeMultiplier = 1.0;
        }

        return {
          ...zone,
          activeRequests: nextRequests,
          demandLevel,
          surgeMultiplier
        };
      }));
    }, 6000);

    return () => clearInterval(intervalId);
  }, []);

  // 3. Render and update Heatmap Polygons dynamically on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    // Clear everything if heatmap is hidden
    if (!showHeatmap) {
      (Object.values(polygonLayersRef.current) as L.Polygon[]).forEach(layer => {
        if (layer && map.hasLayer(layer)) {
          layer.remove();
        }
      });
      polygonLayersRef.current = {};
      return;
    }

    // Determine currently displayed city on map
    const isYaounde = pickup ? (Math.abs(pickup.lat - 3.86) < Math.abs(pickup.lat - 4.04)) : true;
    const currentCityName = isYaounde ? 'Yaoundé' : 'Douala';

    const activeZones = demandZones.filter(zone => zone.city === currentCityName);
    const activeZoneIds = new Set(activeZones.map(z => z.id));

    // Remove old polygons that are not in the current city or active set
    Object.keys(polygonLayersRef.current).forEach(id => {
      if (!activeZoneIds.has(id)) {
        const layer = polygonLayersRef.current[id];
        if (layer && map.hasLayer(layer)) {
          layer.remove();
        }
        delete polygonLayersRef.current[id];
      }
    });

    // Draw / Refresh polygons
    activeZones.forEach(zone => {
      let color = '#10b981'; // stable
      let weight = 1.5;
      let fillOpacity = 0.14;
      
      if (zone.demandLevel === 'critical') {
        color = '#ef4444'; // critical (red)
        weight = 2.5;
        fillOpacity = 0.35;
      } else if (zone.demandLevel === 'high') {
        color = '#f97316'; // high (orange)
        weight = 2.0;
        fillOpacity = 0.28;
      } else if (zone.demandLevel === 'medium') {
        color = '#f59e0b'; // medium (amber)
        weight = 1.8;
        fillOpacity = 0.22;
      }

      const popupContent = `
        <div class="p-2 text-slate-100 min-w-[170px]">
          <h4 class="font-extrabold text-[12px] text-white border-b border-white/10 pb-1 mb-1.5 flex items-center gap-1">
            🔥 ${zone.name}
          </h4>
          <div class="space-y-1.5 text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Demand:</span>
              <span class="font-black uppercase text-[9px] px-1.5 py-0.5 rounded ${
                zone.demandLevel === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                zone.demandLevel === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                zone.demandLevel === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }">${zone.demandLevel}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Active Requests:</span>
              <span class="font-mono font-bold text-white">${zone.activeRequests} / min</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Surge Pricing:</span>
              <span class="font-bold text-brand-gold font-mono">x${zone.surgeMultiplier.toFixed(1)}</span>
            </div>
          </div>
        </div>
      `;

      if (polygonLayersRef.current[zone.id]) {
        const poly = polygonLayersRef.current[zone.id];
        poly.setStyle({
          color,
          weight,
          fillColor: color,
          fillOpacity
         });
        poly.getPopup()?.setContent(popupContent);
      } else {
        const poly = L.polygon(zone.vertices, {
          color,
          weight,
          fillColor: color,
          fillOpacity,
          lineJoin: 'round',
          className: 'transition-all duration-300'
        }).addTo(map);

        const popup = L.popup({
          className: 'custom-heatmap-popup',
          closeButton: false,
          offset: [0, 0]
        }).setContent(popupContent);

        poly.bindPopup(popup);

        // Hover feedback
        poly.on('mouseover', () => {
          poly.setStyle({
            fillOpacity: Math.min(0.6, fillOpacity + 0.15),
            weight: weight + 1
          });
        });
        poly.on('mouseout', () => {
          poly.setStyle({
            fillOpacity,
            weight
          });
        });

        polygonLayersRef.current[zone.id] = poly;
      }
    });

  }, [demandZones, showHeatmap, pickup]);

  // 3b. Render D3 Demand Heatmap dynamic intensity circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    const overlayPane = map.getPanes().overlayPane;
    if (!overlayPane) return;

    // If heatmap is disabled, clear any existing D3 overlays and return
    if (!showHeatmap) {
      if (d3OverlayRef.current) {
        d3.select(d3OverlayRef.current).remove();
        d3OverlayRef.current = null;
      }
      return;
    }

    // Determine current city
    const isYaounde = pickup ? (Math.abs(pickup.lat - 3.86) < Math.abs(pickup.lat - 4.04)) : true;
    const currentCityName = isYaounde ? 'Yaoundé' : 'Douala';
    const activeZones = demandZones.filter(zone => zone.city === currentCityName);

    // Create or select the D3 SVG overlay
    let svg = d3.select(overlayPane).select<SVGSVGElement>(".d3-demand-heatmap-svg");
    if (svg.empty()) {
      svg = d3.select(overlayPane).append("svg")
        .attr("class", "d3-demand-heatmap-svg")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("z-index", "300");
      d3OverlayRef.current = svg.node();
    }

    // Add a group container if not present
    let g = svg.select<SVGGElement>("g.heatmap-group");
    if (g.empty()) {
      g = svg.append("g").attr("class", "heatmap-group");
    }

    // Define colors for each demand level
    const colorScale = (level: string) => {
      switch (level) {
        case 'critical': return '#ef4444'; // Red
        case 'high': return '#f97316';     // Orange
        case 'medium': return '#f59e0b';   // Amber
        default: return '#10b981';         // Emerald (stable)
      }
    };

    // Define base sizes
    const radiusScale = (level: string) => {
      switch (level) {
        case 'critical': return 16;
        case 'high': return 12;
        case 'medium': return 8;
        default: return 5;
      }
    };

    // Bind activeZones data to groups
    const zoneGroups = g.selectAll<SVGGElement, DemandZone>(".demand-group")
      .data(activeZones, (d: any) => d.id);

    // Remove old groups
    zoneGroups.exit().remove();

    // Enter new groups
    const enterGroups = zoneGroups.enter()
      .append("g")
      .attr("class", "demand-group");

    // Add radiating wave circles (pulsing effect) to entered groups
    enterGroups.append("circle")
      .attr("class", "pulse-circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", (d: any) => colorScale(d.demandLevel))
      .attr("fill-opacity", 0.4)
      .attr("stroke", (d: any) => colorScale(d.demandLevel))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8);

    // Add solid center core circles to entered groups
    enterGroups.append("circle")
      .attr("class", "core-circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", (d: any) => colorScale(d.demandLevel))
      .attr("r", (d: any) => radiusScale(d.demandLevel))
      .attr("fill-opacity", 0.85)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    // Add tiny glow circles to core centers
    enterGroups.append("circle")
      .attr("class", "glow-circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("fill", "#ffffff")
      .attr("fill-opacity", 0.7)
      .attr("r", 2);

    // Merge enter and update groups to configure/transition attributes
    const allGroups = enterGroups.merge(zoneGroups);

    // Update styling attributes for core circle
    allGroups.select(".core-circle")
      .transition()
      .duration(600)
      .attr("fill", (d: any) => colorScale(d.demandLevel))
      .attr("r", (d: any) => radiusScale(d.demandLevel));

    // Update styling for glow circles
    allGroups.select(".glow-circle")
      .attr("r", (d: any) => Math.max(1.5, radiusScale(d.demandLevel) * 0.25));

    // Update pulsing animation for radiating circles using a repeating transition function
    allGroups.select(".pulse-circle")
      .each(function(d: any) {
        const circle = d3.select(this);
        const baseRadius = radiusScale(d.demandLevel);
        const targetRadius = baseRadius * 4.5;
        const color = colorScale(d.demandLevel);

        // Keep updating color
        circle.attr("fill", color).attr("stroke", color);

        // Start repeating pulse animation
        function triggerPulse() {
          circle
            .transition()
            .duration(1800)
            .ease(d3.easeQuadOut)
            .attr("r", targetRadius)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .transition()
            .duration(0)
            .attr("r", baseRadius)
            .attr("fill-opacity", 0.45)
            .attr("stroke-opacity", 0.9)
            .on("end", triggerPulse);
        }
        triggerPulse();
      });

    // Positioning function that aligns SVG overlay on Leaflet coordinate system
    const updateOverlayPositions = () => {
      const currentMap = mapRef.current;
      if (!currentMap) return;
      // Ensure the map is loaded and not destroyed/removing
      if (!(currentMap as any)._loaded || !currentMap.getContainer()) return;

      try {
        const container = currentMap.getContainer();
        if (!container || !currentMap.getPanes || !currentMap.getPanes()) return;

        const bounds = currentMap.getBounds();
        if (!bounds) return;

        const topLeft = currentMap.latLngToLayerPoint(bounds.getNorthWest());
        const bottomRight = currentMap.latLngToLayerPoint(bounds.getSouthEast());

        svg
          .attr("width", bottomRight.x - topLeft.x)
          .attr("height", bottomRight.y - topLeft.y)
          .style("left", topLeft.x + "px")
          .style("top", topLeft.y + "px");

        g.attr("transform", `translate(${-topLeft.x}, ${-topLeft.y})`);

        // Update positions of each group based on geographic coordinates
        allGroups.each(function(d: any) {
          if (d && d.center && isValidCoords(d.center[0], d.center[1])) {
            const pt = currentMap.latLngToLayerPoint(new L.LatLng(d.center[0], d.center[1]));
            d3.select(this).attr("transform", `translate(${pt.x}, ${pt.y})`);
          }
        });
      } catch (err) {
        console.warn("D3 Heatmap overlay position update skipped:", err);
      }
    };

    // Run positioning immediately and bind to Leaflet events
    updateOverlayPositions();
    map.on("zoomend moveend viewreset move", updateOverlayPositions);

    // Cleanup events and elements on dependencies change or component unmount
    return () => {
      map.off("zoomend moveend viewreset move", updateOverlayPositions);
      if (d3OverlayRef.current) {
        d3.select(d3OverlayRef.current).remove();
        d3OverlayRef.current = null;
      }
    };
  }, [showHeatmap, demandZones, pickup]);

  // 4. Render nearby available drivers on map during idle or searching status
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    // Clear existing nearby drivers
    if (nearbyDriverMarkersRef.current) {
      nearbyDriverMarkersRef.current.forEach(m => {
        if (m && map.hasLayer(m)) {
          m.remove();
        }
      });
    }
    nearbyDriverMarkersRef.current = [];

    // Only show nearby available drivers when there is no active booking
    if (status === 'idle' || status === 'searching') {
      // Determine active city based on pickup coordinate, default to Yaoundé
      const isYaounde = pickup ? (Math.abs(pickup.lat - 3.86) < Math.abs(pickup.lat - 4.04)) : true;
      const currentCityName = isYaounde ? 'Yaoundé' : 'Douala';

      const activeDrivers = AVAILABLE_DRIVERS_DATA.filter(d => d.city === currentCityName);

      activeDrivers.forEach(driver => {
        let vehicleSvg = '🚗';
        let bgColor = 'bg-[#e2c18d]';
        if (driver.vehicleType === 'okada') {
          vehicleSvg = '🏍️';
          bgColor = 'bg-sky-500';
        } else if (driver.vehicleType === 'keke') {
          vehicleSvg = '🛺';
          bgColor = 'bg-[#b8924e]';
        } else if (driver.vehicleType === 'comfort') {
          vehicleSvg = '🚘';
          bgColor = 'bg-purple-600';
        }

        const nearbyIcon = L.divIcon({
          className: 'custom-pin-nearby-driver',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 z-50 animate-pulse"></div>
              <div class="relative w-8 h-8 rounded-full ${bgColor} border-2 border-slate-900 shadow-xl flex items-center justify-center text-sm">
                ${vehicleSvg}
              </div>
              <div class="absolute -bottom-1 w-2.5 h-1 bg-slate-950/40 blur-xs rounded-full"></div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const marker = L.marker([driver.lat, driver.lng], { icon: nearbyIcon }).addTo(map);

        const popupContent = `
          <div class="p-2 text-slate-100 min-w-[155px]">
            <h4 class="font-extrabold text-[12px] text-white border-b border-white/10 pb-1 mb-1.5 flex items-center gap-1.5">
              🟢 ${driver.name}
            </h4>
            <div class="space-y-1 text-[10px]">
              <p class="text-slate-300 font-medium leading-tight">${driver.vehicleModel}</p>
              <div class="flex items-center justify-between mt-1 text-slate-400">
                <span class="font-bold text-[9px] px-1 py-0.5 rounded bg-brand-input border border-brand-card uppercase text-brand-gold">${driver.vehicleType}</span>
                <span class="text-brand-gold font-extrabold flex items-center gap-0.5">★ ${driver.rating}</span>
              </div>
              <div class="text-[8px] text-emerald-400 font-semibold italic mt-1">Disponible • Active nearby</div>
            </div>
          </div>
        `;

        const popup = L.popup({
          className: 'custom-heatmap-popup',
          closeButton: false,
          offset: [0, 0]
        }).setContent(popupContent);

        marker.bindPopup(popup);
        nearbyDriverMarkersRef.current.push(marker);
      });
    }

    return () => {
      const currentMap = mapRef.current;
      if (nearbyDriverMarkersRef.current) {
        nearbyDriverMarkersRef.current.forEach(m => {
          if (m && currentMap && currentMap.hasLayer(m)) {
            m.remove();
          }
        });
      }
      nearbyDriverMarkersRef.current = [];
    };
  }, [pickup, status]);

  // Update Pickup Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (pickup && isValidCoords(pickup.lat, pickup.lng)) {
      const pickupIcon = L.divIcon({
        className: 'custom-pin-pickup',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
            <div class="relative w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      if (pickupMarkerRef.current && map.hasLayer(pickupMarkerRef.current)) {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      } else {
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      }
      
      // Auto pan/zoom to include elements if destination is not yet set
      if (!destination && status === 'idle') {
        map.setView([pickup.lat, pickup.lng], 14, { animate: true });
      }
    } else {
      if (pickupMarkerRef.current) {
        if (map.hasLayer(pickupMarkerRef.current)) {
          pickupMarkerRef.current.remove();
        }
        pickupMarkerRef.current = null;
      }
    }
  }, [pickup, destination, status]);

  // Update Destination Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (destination && isValidCoords(destination.lat, destination.lng)) {
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-[#e2c18d]/30 animate-ping"></div>
            <div class="relative w-7 h-7 rounded-full bg-[#e2c18d] border-2 border-white shadow-md flex items-center justify-center text-[#0e0a2b] font-black text-xs">
              B
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      if (destMarkerRef.current && map.hasLayer(destMarkerRef.current)) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      } else {
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      }
    } else {
      if (destMarkerRef.current) {
        if (map.hasLayer(destMarkerRef.current)) {
          destMarkerRef.current.remove();
        }
        destMarkerRef.current = null;
      }
    }
  }, [destination]);

  // Update Route Polyline & Fit Bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (pickup && destination && isValidCoords(pickup.lat, pickup.lng) && isValidCoords(destination.lat, destination.lng)) {
      const points: L.LatLngExpression[] = [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      ];

      if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
        routeLineRef.current.setLatLngs(points);
      } else {
        routeLineRef.current = L.polyline(points, {
          color: '#e2c18d',
          weight: 4,
          opacity: 0.9,
          dashArray: '10, 10',
          lineJoin: 'round'
        }).addTo(map);
      }

      // Fit map to show both markers nicely
      const bounds = L.latLngBounds(points);
      if (driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
        bounds.extend([driverLocation.lat, driverLocation.lng]);
      }
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    } else {
      if (routeLineRef.current) {
        if (map.hasLayer(routeLineRef.current)) {
          routeLineRef.current.remove();
        }
        routeLineRef.current = null;
      }
    }
  }, [pickup, destination, driverLocation]);

  // Update Driver Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      // Choose emoji or icon based on vehicle type
      let vehicleSvg = '🚗';
      let bgColor = 'bg-[#e2c18d]';
      if (driverType === 'okada') {
        vehicleSvg = '🏍️';
        bgColor = 'bg-sky-500';
      } else if (driverType === 'keke') {
        vehicleSvg = '🛺';
        bgColor = 'bg-[#b8924e]'; // dark metallic gold
      } else if (driverType === 'comfort') {
        vehicleSvg = '🚘';
        bgColor = 'bg-purple-600';
      }

      const driverIcon = L.divIcon({
        className: 'custom-pin-driver',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 rounded-full ${bgColor}/20 animate-ping"></div>
            <div class="relative w-9 h-9 rounded-full ${bgColor} border-2 border-slate-900 shadow-xl flex items-center justify-center text-lg z-50">
              ${vehicleSvg}
            </div>
            <div class="absolute -bottom-1 w-3 h-1.5 bg-slate-950/40 blur-sm rounded-full"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (driverMarkerRef.current && map.hasLayer(driverMarkerRef.current)) {
        driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
      } else {
        driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon }).addTo(map);
      }

      // If driver is active, let's keep map focused or panning smoothly
      if (status === 'arriving' || status === 'in_progress') {
        map.panTo([driverLocation.lat, driverLocation.lng], { animate: true });
      }
    } else {
      if (driverMarkerRef.current) {
        if (map.hasLayer(driverMarkerRef.current)) {
          driverMarkerRef.current.remove();
        }
        driverMarkerRef.current = null;
      }
    }
  }, [driverLocation, driverType, status]);

  // Render and update live physical GPS marker on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (liveCoords && isValidCoords(liveCoords.lat, liveCoords.lng)) {
      const liveIcon = L.divIcon({
        className: 'custom-pin-live-gps',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-sky-500/35 animate-ping"></div>
            <div class="relative w-5 h-5 rounded-full bg-sky-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-[9px] font-black">
              🎯
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (liveMarkerRef.current && map.hasLayer(liveMarkerRef.current)) {
        liveMarkerRef.current.setLatLng([liveCoords.lat, liveCoords.lng]);
      } else {
        liveMarkerRef.current = L.marker([liveCoords.lat, liveCoords.lng], { icon: liveIcon }).addTo(map);
      }
    } else {
      if (liveMarkerRef.current) {
        if (map.hasLayer(liveMarkerRef.current)) {
          liveMarkerRef.current.remove();
        }
        liveMarkerRef.current = null;
      }
    }
  }, [liveCoords]);

  // GPS Watcher and general cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (liveMarkerRef.current && mapRef.current && mapRef.current.hasLayer(liveMarkerRef.current)) {
        liveMarkerRef.current.remove();
      }
      liveMarkerRef.current = null;
    };
  }, []);

  // Handler: Single-shot Fetch Position
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsError(slangMode ? "GPS non supporté" : "GPS not supported by device.");
      return;
    }

    setIsResolving(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setLiveCoords(coords);
        setIsResolving(false);

        // Center map
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15, { animate: true });
        }

        // If driver role, automatically update position
        if (role === 'driver' && onSetDriverLoc) {
          onSetDriverLoc(coords);
        }
      },
      (error) => {
        setIsResolving(false);
        setGpsError(error.message || "GPS error");
        console.warn("GPS lookup error:", error);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Handler: Real-time dynamic watch position
  const toggleTracking = () => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } else {
      if (!navigator.geolocation) {
        setGpsError(slangMode ? "GPS non supporté" : "GPS not supported.");
        return;
      }

      setGpsError(null);
      setIsTracking(true);

      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          setLiveCoords(coords);

          // Auto center
          if (mapRef.current) {
            mapRef.current.panTo([latitude, longitude], { animate: true });
          }

          // If driver role is active, continuously sync driver coordinate state
          if (role === 'driver' && onSetDriverLoc) {
            onSetDriverLoc(coords);
          }

          // If passenger, and linked to lock pickup
          if (role === 'passenger' && isPassengerTrackingPickup && onSetPickup) {
            onSetPickup({
              name: slangMode ? "📍 Position GPS Actuelle" : "📍 Current GPS Location",
              lat: latitude,
              lng: longitude
            });
          }
        },
        (error) => {
          setGpsError(error.message || "GPS watch error");
          console.warn("GPS tracking error:", error);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );

      watchIdRef.current = id;
    }
  };

  // Passenger Quick Actions
  const handleSetAsPickup = () => {
    if (!liveCoords || !onSetPickup) return;
    onSetPickup({
      name: slangMode ? "📍 Ma Position GPS" : "📍 My GPS Location",
      lat: liveCoords.lat,
      lng: liveCoords.lng
    });
  };

  const handleSetAsDestination = () => {
    if (!liveCoords || !onSetDestination) return;
    onSetDestination({
      name: slangMode ? "🏁 Ma Destination GPS" : "🏁 My GPS Destination",
      lat: liveCoords.lat,
      lng: liveCoords.lng
    });
  };

  return (
    <div className="w-full h-full relative overflow-hidden" id="taxi-map-wrapper">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-midnight/80 to-transparent pointer-events-none z-[1000]"></div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-midnight/80 to-transparent pointer-events-none z-[1000]"></div>
      
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" id="map-element" />

      {/* FLOATING GPS CONSOLE WIDGET */}
      <div className="absolute bottom-4 left-4 z-[1010] max-w-[285px] w-auto">
        {!isConsoleExpanded ? (
          /* Minimized circular float button */
          <button
            onClick={() => setIsConsoleExpanded(true)}
            className="w-12 h-12 rounded-full bg-brand-midnight/95 backdrop-blur border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-2xl hover:bg-brand-card transition cursor-pointer active:scale-95"
            title={slangMode ? "Ouvrir Console GPS" : "Open GPS Console"}
          >
            <Locate size={20} className={isTracking ? "text-emerald-400 animate-pulse" : "text-brand-gold animate-spin-slow"} />
          </button>
        ) : (
          /* Fully expanded elegant GPS Console */
          <div className="bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/30 p-3.5 rounded-2xl shadow-2xl text-white text-xs space-y-3 w-72 transition-all">
            {/* Console Header */}
            <div className="flex items-center justify-between border-b border-brand-input/40 pb-2">
              <span className="font-black text-brand-gold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Compass size={14} className={isTracking ? "animate-spin" : ""} />
                {slangMode ? "Wanda Terminal GPS" : "Wanda GPS Terminal"}
              </span>
              <button
                onClick={() => setIsConsoleExpanded(false)}
                className="text-brand-text-muted hover:text-white p-0.5 rounded cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Error notifications */}
            {gpsError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] p-2 rounded-xl">
                ⚠️ {gpsError}. Please authorize GPS services.
              </div>
            )}

            {/* Main Action buttons */}
            <div className="space-y-2">
              {/* Locate Me button */}
              <button
                onClick={handleLocateMe}
                disabled={isResolving}
                className="w-full bg-brand-gold hover:bg-brand-gold/90 disabled:bg-brand-card/50 disabled:text-brand-text-muted text-brand-midnight font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition text-xs shadow-md"
              >
                {isResolving ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    {slangMode ? "Recherche du signal..." : "Locating GPS..."}
                  </>
                ) : (
                  <>
                    <Locate size={13} />
                    {slangMode ? "Me localiser (GPS Live)" : "Locate My Phone"}
                  </>
                )}
              </button>

              {/* Real-time Tracking Toggle */}
              <button
                onClick={toggleTracking}
                className={`w-full py-2 px-3 rounded-xl font-bold flex items-center justify-between text-[11px] border transition cursor-pointer ${
                  isTracking
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-brand-input/40 border-brand-card text-brand-text-muted hover:text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Activity size={12} className={isTracking ? "animate-pulse text-emerald-400" : ""} />
                  {slangMode ? "Suivi en temps réel" : "Continuous Live Tracking"}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${isTracking ? 'bg-emerald-500 text-white' : 'bg-brand-card text-brand-text-muted'}`}>
                  {isTracking ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Coordinates display or placeholder */}
            {liveCoords ? (
              <div className="bg-brand-input/40 border border-brand-card p-2 rounded-xl text-[10px] font-mono flex items-center justify-between text-brand-text-muted">
                <span>Lat: {liveCoords.lat.toFixed(6)}</span>
                <span>Lng: {liveCoords.lng.toFixed(6)}</span>
                <span className="text-emerald-400">● Live</span>
              </div>
            ) : (
              <div className="text-[10px] text-brand-text-muted text-center italic py-1 font-medium">
                {slangMode ? "Tapez 'Me localiser' pour capter le signal" : "Tap 'Locate My Phone' to acquire signal"}
              </div>
            )}

            {/* Conditional Role actions */}
            {liveCoords && (
              <div className="border-t border-brand-input/40 pt-2.5 space-y-2">
                {role === 'passenger' ? (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleSetAsPickup}
                        className="bg-brand-input hover:bg-brand-card text-white hover:text-brand-gold border border-brand-card py-2 rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                      >
                        <MapPin size={10} className="text-emerald-400" />
                        {slangMode ? "Fixer Départ" : "Set Pickup"}
                      </button>
                      <button
                        onClick={handleSetAsDestination}
                        className="bg-brand-input hover:bg-brand-card text-white hover:text-brand-gold border border-brand-card py-2 rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1"
                      >
                        <Navigation size={10} className="text-brand-gold" />
                        {slangMode ? "Fixer Dépôt" : "Set Dropoff"}
                      </button>
                    </div>

                    {isTracking && (
                      <label className="flex items-center gap-2 text-[10px] text-brand-text-muted cursor-pointer hover:text-white font-semibold select-none pt-0.5">
                        <input
                          type="checkbox"
                          checked={isPassengerTrackingPickup}
                          onChange={(e) => setIsPassengerTrackingPickup(e.target.checked)}
                          className="rounded border-brand-card text-brand-gold focus:ring-0 cursor-pointer bg-brand-input"
                        />
                        <span>{slangMode ? "Verrouiller le Départ à mon GPS" : "Bind Active Pickup to GPS"}</span>
                      </label>
                    )}
                  </>
                ) : (
                  /* Driver actions */
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (onSetDriverLoc) onSetDriverLoc(liveCoords);
                      }}
                      className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 py-2 rounded-xl text-[10px] font-bold cursor-pointer transition flex items-center justify-center gap-1.5"
                    >
                      <Navigation size={11} className="rotate-45" />
                      {slangMode ? "Actualiser Chauffeur" : "Sync Driver Location"}
                    </button>
                    <p className="text-[9px] text-brand-text-muted text-center leading-normal">
                      {slangMode 
                        ? "Activez le 'Suivi en temps réel' pour synchroniser votre trajet physique avec le client pendant que vous roulez !"
                        : "Enable continuous live tracking to sync your physical coordinates with the passenger client as you move!"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FLOATING DEMAND HEATMAP LEGEND & TOGGLER */}
      <div className="absolute top-4 right-4 z-[1010] flex flex-col items-end gap-2" id="demand-heatmap-overlay">
        <div className="bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/35 p-3 rounded-2xl shadow-2xl text-white text-xs space-y-2 w-52">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-input/40 pb-1.5">
            <span className="font-extrabold text-brand-gold uppercase tracking-wider text-[9px] flex items-center gap-1">
              <Flame size={12} className="text-red-500 animate-pulse fill-red-500" />
              {slangMode ? "Wanda Zones Chaudes" : "Wanda Demand Heatmap"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showHeatmap} 
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-brand-input rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-gold"></div>
            </label>
          </div>

          {/* Legend Items (Only show if heatmap is enabled) */}
          {showHeatmap ? (
            <div className="space-y-1.5 text-[9px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-brand-text-muted">
                  <span className="w-2.5 h-2.5 rounded bg-red-500/80 border border-red-500"></span>
                  {slangMode ? "Critique" : "Critical Demand"}
                </span>
                <span className="font-mono text-red-400 font-bold">x1.6 - x2.0+</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-brand-text-muted">
                  <span className="w-2.5 h-2.5 rounded bg-orange-500/80 border border-orange-500"></span>
                  {slangMode ? "Élevé" : "High Demand"}
                </span>
                <span className="font-mono text-orange-400 font-bold">x1.3 - x1.5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-brand-text-muted">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/80 border border-amber-500"></span>
                  {slangMode ? "Moyen" : "Medium Demand"}
                </span>
                <span className="font-mono text-amber-400 font-bold">x1.1 - x1.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-brand-text-muted">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/80 border border-emerald-500"></span>
                  {slangMode ? "Calme" : "Stable Demand"}
                </span>
                <span className="font-mono text-emerald-400 font-bold">x1.0</span>
              </div>
              <div className="text-[8px] text-brand-text-muted leading-tight border-t border-brand-input/30 pt-1.5 italic flex flex-col gap-1">
                <div className="flex items-center gap-1 text-brand-gold font-semibold">
                  <Activity size={10} className="text-brand-gold shrink-0 animate-pulse" />
                  <span>{slangMode ? "Zones Chaudes D3 Live" : "D3 Live Heat Points"}</span>
                </div>
                <span>
                  {slangMode 
                    ? "Les cercles D3 palpitent en temps réel pour cibler le centre de la demande."
                    : "Pulsing D3 circles track high-request centers with live activity waves."}
                </span>
                <span className="text-[7.5px] text-white/50 pt-0.5 border-t border-brand-input/20">
                  {slangMode 
                    ? "Cliquez sur une zone pour voir les statistiques !"
                    : "Click any zone on the map to see real-time request statistics."}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[9px] text-brand-text-muted leading-tight py-1 text-center italic">
              {slangMode ? "Activer pour voir les zones de forte demande" : "Enable to overlay high-demand sectors"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
