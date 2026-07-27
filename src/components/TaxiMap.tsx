import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import * as d3 from 'd3';
import { Location, RideStatus } from '../types';
import { Compass, MapPin, Navigation, Locate, Activity, Check, ChevronDown, ChevronUp, RefreshCw, Flame, Info, CornerUpLeft, CornerUpRight, ArrowUp, Volume2, VolumeX, Clock, Layers, Map as MapIcon, Mountain, Globe, ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import { LAGOS_LOCATIONS as DOUALA_LOCATIONS, YAOUNDE_LOCATIONS } from '../data';
import { LiveCountdownTimer } from './LiveCountdownTimer';

export interface BookingItem {
  id: string;
  zoneName: string;
  rideClass: string;
  timeAgo: string;
  status: 'completed' | 'active' | 'cancelled';
  fare: number;
  city: 'Yaoundé' | 'Douala';
}

export interface DemandZone {
  id: string;
  name: string;
  city: 'Yaoundé' | 'Douala';
  center: [number, number];
  vertices: [number, number][];
  demandLevel: 'critical' | 'high' | 'medium' | 'stable';
  activeRequests: number;
  surgeMultiplier: number;
  baseRequests?: number;
  recentBookingsCount?: number;
  activeBookingsCount?: number;
  recentTotalFare?: number;
  matchedBookings?: BookingItem[];
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

// Turn-by-turn Navigation Helpers
function getHaversineDistanceInMeters(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function generateFallbackInstructions(driverLoc: { lat: number; lng: number }, targetLoc: { lat: number; lng: number }, isToDestination?: boolean): any[] {
  const dLat = targetLoc.lat - driverLoc.lat;
  const dLng = targetLoc.lng - driverLoc.lng;
  return [
    {
      instruction: dLat > 0 ? "Dirigez-vous vers le nord sur l'Avenue Principale" : "Dirigez-vous vers le sud sur l'Avenue Principale",
      distance: 350,
      type: "depart",
      modifier: "straight"
    },
    {
      instruction: dLng > 0 ? "Tournez à droite au prochain carrefour" : "Tournez à gauche au prochain carrefour",
      distance: 400,
      type: "turn",
      modifier: dLng > 0 ? "right" : "left"
    },
    {
      instruction: "Prenez la deuxième sortie au rond-point",
      distance: 300,
      type: "roundabout",
      modifier: "straight"
    },
    {
      instruction: dLat > 0 ? "Tournez à gauche après la station service" : "Tournez à droite après la station service",
      distance: 250,
      type: "turn",
      modifier: dLat > 0 ? "left" : "right"
    },
    {
      instruction: isToDestination 
        ? "Votre passager est arrivé à sa destination finale"
        : "Votre passager vous attend droit devant sur votre gauche",
      distance: 100,
      type: "arrive",
      modifier: "arrive"
    }
  ];
}

const getManeuverIcon = (modifier: string) => {
  const mod = modifier?.toLowerCase() || '';
  if (mod.includes('left')) return <CornerUpLeft size={20} className="text-white" />;
  if (mod.includes('right')) return <CornerUpRight size={20} className="text-white" />;
  if (mod.includes('arrive')) return <MapPin size={20} className="text-emerald-300 fill-emerald-300" />;
  return <ArrowUp size={20} className="text-white animate-pulse" />;
};

const getManeuverIconSmall = (modifier: string, isActive: boolean) => {
  const mod = modifier?.toLowerCase() || '';
  const colorClass = isActive ? 'text-brand-gold font-black' : 'text-brand-text-muted';
  if (mod.includes('left')) return <CornerUpLeft size={12} className={colorClass} />;
  if (mod.includes('right')) return <CornerUpRight size={12} className={colorClass} />;
  if (mod.includes('arrive')) return <MapPin size={12} className={isActive ? 'text-brand-gold' : 'text-emerald-400'} />;
  return <ArrowUp size={12} className={colorClass} />;
};

const formatDistance = (m: number) => {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
};

const formatDuration = (s: number) => {
  if (s < 60) return `${s}s`;
  return `${Math.ceil(s / 60)} min`;
};

const animatePolylineDraw = (poly: L.Polyline | null, duration: number = 1800) => {
  if (!poly) return;
  setTimeout(() => {
    try {
      const path = poly.getElement() as SVGPathElement | null;
      if (path && typeof path.getTotalLength === 'function') {
        const length = path.getTotalLength();
        if (length && length > 0) {
          path.style.strokeDasharray = `${length}`;
          path.style.strokeDashoffset = `${length}`;
          // Force layout reflow
          path.getBoundingClientRect();
          path.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
          path.style.strokeDashoffset = '0';
        }
      }
    } catch (e) {
      console.warn("Polyline animation error:", e);
    }
  }, 40);
};

const TILE_PROVIDERS = {
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  terrain: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

const TILE_ATTRIBUTIONS = {
  dark: '&copy; <a href="https://carto.com/">CARTO</a>',
  streets: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
  terrain: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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
  etaMinutes?: number;
  isTilted?: boolean | 'flat' | 'isometric' | 'tilted';
  isZoomLocked?: boolean;
  onZoomChange?: (zoom: number) => void;
  showMapGrid?: boolean;
  centerCoords?: { lat: number; lng: number } | null;
  recentBookings?: BookingItem[];
  onSelectZoneTarget?: (zone: DemandZone) => void;
  summaryMetricMode?: 'time' | 'distance';
  onToggleSummaryMetricMode?: (mode: 'time' | 'distance') => void;
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
  onSetDriverLoc,
  etaMinutes = 3,
  isTilted = false,
  isZoomLocked = false,
  onZoomChange,
  showMapGrid = false,
  centerCoords = null,
  recentBookings = [],
  onSelectZoneTarget,
  summaryMetricMode,
  onToggleSummaryMetricMode
}: TaxiMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Selected Heatmap Zone state for interactive details modal
  const [selectedZone, setSelectedZone] = useState<DemandZone | null>(null);

  // Geolocation States
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPassengerTrackingPickup, setIsPassengerTrackingPickup] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [demandZones, setDemandZones] = useState<DemandZone[]>([]);

  // Turn-by-Turn Navigation State
  const [navInstructions, setNavInstructions] = useState<any[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalDistanceRemaining, setTotalDistanceRemaining] = useState<number>(0);
  const [totalDurationRemaining, setTotalDurationRemaining] = useState<number>(0);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [isNavCompact, setIsNavCompact] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Ride Summary Display Metric State (Time vs Distance)
  const [internalMetricMode, setInternalMetricMode] = useState<'time' | 'distance'>('time');
  const currentMetricMode = summaryMetricMode ?? internalMetricMode;

  const handleMetricToggle = (mode: 'time' | 'distance') => {
    if (onToggleSummaryMetricMode) {
      onToggleSummaryMetricMode(mode);
    } else {
      setInternalMetricMode(mode);
    }
  };

  // New Tactical Navigation Overlay States
  const [isTacticalOverlayMinimized, setIsTacticalOverlayMinimized] = useState(() => {
    const saved = localStorage.getItem('wanda_nav_overlay_minimized');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('wanda_nav_overlay_minimized', isTacticalOverlayMinimized.toString());
  }, [isTacticalOverlayMinimized]);

  const [previewStepIndex, setPreviewStepIndex] = useState<number | null>(null);

  useEffect(() => {
    setPreviewStepIndex(null); // Auto-sync when driver progress updates
  }, [currentStepIndex]);

  // Keep refs for markers and polylines to modify them without reloading map
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const liveMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const routeLineBgRef = useRef<L.Polyline | null>(null);
  const routeLineMidRef = useRef<L.Polyline | null>(null);
  const activeRouteLineRef = useRef<L.Polyline | null>(null);
  const activeRouteLineBgRef = useRef<L.Polyline | null>(null);
  const activeRouteLineMidRef = useRef<L.Polyline | null>(null);
  const approachLineRef = useRef<L.Polyline | null>(null);
  const driverStartLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const polygonLayersRef = useRef<{ [zoneId: string]: L.Polygon }>({});
  const nearbyDriverMarkersRef = useRef<L.Marker[]>([]);
  const d3OverlayRef = useRef<SVGSVGElement | null>(null);
  const heatmapOverlayRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  const onZoomChangeRef = useRef(onZoomChange);
  useEffect(() => {
    onZoomChangeRef.current = onZoomChange;
  }, [onZoomChange]);

  // Map Detail Mode States and Refs
  const [mapDetailMode, setMapDetailMode] = useState<'clean' | 'moderate' | 'full'>('full');
  const darkLabelsLayerRef = useRef<L.TileLayer | null>(null);

  // Custom Layers and Map Detail Advanced Settings States & Refs
  const [isLayersMenuExpanded, setIsLayersMenuExpanded] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<'dark' | 'streets' | 'satellite' | 'terrain'>('dark');
  const [showRoadNames, setShowRoadNames] = useState(true);
  const [showBuildingPois, setShowBuildingPois] = useState(true);
  const [showPublicTransit, setShowPublicTransit] = useState(true);

  const layersMenuRef = useRef<HTMLDivElement>(null);

  const darkLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);
  const terrainLayerRef = useRef<L.TileLayer | null>(null);

  const roadNamesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const buildingPoisLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const publicTransitLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Click outside layers menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isLayersMenuExpanded && layersMenuRef.current && !layersMenuRef.current.contains(event.target as Node)) {
        setIsLayersMenuExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isLayersMenuExpanded]);

  // Synchronize React Selected Base Layer with Leaflet Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const removeIfExists = (layer: L.Layer | null) => {
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    };

    removeIfExists(darkLayerGroupRef.current);
    removeIfExists(streetLayerRef.current);
    removeIfExists(satelliteLayerRef.current);
    removeIfExists(terrainLayerRef.current);

    if (selectedBaseLayer === 'dark' && darkLayerGroupRef.current) {
      darkLayerGroupRef.current.addTo(map);
    } else if (selectedBaseLayer === 'streets' && streetLayerRef.current) {
      streetLayerRef.current.addTo(map);
    } else if (selectedBaseLayer === 'satellite' && satelliteLayerRef.current) {
      satelliteLayerRef.current.addTo(map);
    } else if (selectedBaseLayer === 'terrain' && terrainLayerRef.current) {
      terrainLayerRef.current.addTo(map);
    }
  }, [selectedBaseLayer]);

  // Dynamic Map Layer Settings Sync
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showRoadNames) {
      if (roadNamesLayerGroupRef.current && !map.hasLayer(roadNamesLayerGroupRef.current)) {
        roadNamesLayerGroupRef.current.addTo(map);
      }
    } else {
      if (roadNamesLayerGroupRef.current && map.hasLayer(roadNamesLayerGroupRef.current)) {
        roadNamesLayerGroupRef.current.remove();
      }
    }
  }, [showRoadNames]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showBuildingPois) {
      if (buildingPoisLayerGroupRef.current && !map.hasLayer(buildingPoisLayerGroupRef.current)) {
        buildingPoisLayerGroupRef.current.addTo(map);
      }
    } else {
      if (buildingPoisLayerGroupRef.current && map.hasLayer(buildingPoisLayerGroupRef.current)) {
        buildingPoisLayerGroupRef.current.remove();
      }
    }
  }, [showBuildingPois]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showPublicTransit) {
      if (publicTransitLayerGroupRef.current && !map.hasLayer(publicTransitLayerGroupRef.current)) {
        publicTransitLayerGroupRef.current.addTo(map);
      }
    } else {
      if (publicTransitLayerGroupRef.current && map.hasLayer(publicTransitLayerGroupRef.current)) {
        publicTransitLayerGroupRef.current.remove();
      }
    }
  }, [showPublicTransit]);

  // Collapsible Passenger ETA Status Card States, Refs and Handlers
  const [isEtaCardExpanded, setIsEtaCardExpanded] = useState(false);
  const collapseTimerRef = useRef<any>(null);
  const etaCardRef = useRef<HTMLDivElement>(null);

  // Trigger auto-expand when status changes, then auto-collapse
  useEffect(() => {
    if (status === 'driver_found' || status === 'arriving' || status === 'in_progress') {
      setIsEtaCardExpanded(true);
      
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
      
      collapseTimerRef.current = setTimeout(() => {
        setIsEtaCardExpanded(false);
      }, 4000); // 4 seconds
    }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, [status]);

  // Click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEtaCardExpanded && etaCardRef.current && !etaCardRef.current.contains(event.target as Node)) {
        setIsEtaCardExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isEtaCardExpanded]);

  const handleToggleEtaCard = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setIsEtaCardExpanded(prev => {
      const nextState = !prev;
      if (nextState) {
        if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = setTimeout(() => {
          setIsEtaCardExpanded(false);
        }, 5000);
      } else {
        if (collapseTimerRef.current) {
          clearTimeout(collapseTimerRef.current);
          collapseTimerRef.current = null;
        }
      }
      return nextState;
    });
  };

  const handleCardInteraction = () => {
    if (isEtaCardExpanded) {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        setIsEtaCardExpanded(false);
      }, 5000);
    }
  };

  const getCollapsedText = () => {
    if (status === 'arriving') {
      return slangMode ? "Le djo est là (Chauffeur arrivé) !" : "Driver is outside !";
    }
    const mins = etaMinutes === 0.5 ? "1 min" : `${etaMinutes} min`;
    if (status === 'in_progress') {
      return slangMode ? `En route (Dépôt : ${mins})` : `On Trip: ${mins} to destination`;
    }
    return slangMode ? `Le chauffeur arrive (${mins})` : `Driver is ${mins} away`;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered around Douala, Cameroon
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([4.0435, 9.7100], 12);

    // Initialize all requested layer styles
    // We split Wanda Dark into base (no labels) and separate labels layer so we can toggle detail levels dynamically
    const darkBaseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTIONS.dark
    });

    const darkLabelsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTIONS.dark
    });

    darkLabelsLayerRef.current = darkLabelsLayer;

    const darkLayerGroup = L.layerGroup([darkBaseLayer, darkLabelsLayer]);

    const streetLayer = L.tileLayer(TILE_PROVIDERS.streets, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTIONS.streets
    });

    const satelliteLayer = L.tileLayer(TILE_PROVIDERS.satellite, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTIONS.satellite
    });

    const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
    });

    // Default layer is Wanda Dark (which contains both base + labels)
    darkLayerGroup.addTo(map);

    // Assign tile layers and groups to refs for React state control
    darkLayerGroupRef.current = darkLayerGroup;
    streetLayerRef.current = streetLayer;
    satelliteLayerRef.current = satelliteLayer;
    terrainLayerRef.current = terrainLayer;

    // Set up heatmap overlay layer group
    const heatmapOverlay = L.layerGroup();
    heatmapOverlayRef.current = heatmapOverlay;
    heatmapOverlay.addTo(map);

    // Initialize custom map detail layers
    const roadNamesLayerGroup = L.layerGroup();
    const buildingPoisLayerGroup = L.layerGroup();
    const publicTransitLayerGroup = L.layerGroup();

    roadNamesLayerGroupRef.current = roadNamesLayerGroup;
    buildingPoisLayerGroupRef.current = buildingPoisLayerGroup;
    publicTransitLayerGroupRef.current = publicTransitLayerGroup;

    // Add them to map initially
    roadNamesLayerGroup.addTo(map);
    buildingPoisLayerGroup.addTo(map);
    publicTransitLayerGroup.addTo(map);

    // Define and populate Road Names overlay data
    const roadNamesData = [
      { name: "Boulevard de la Liberté", lat: 4.0485, lng: 9.6974 },
      { name: "Avenue de l'Indépendance", lat: 4.0435, lng: 9.6895 },
      { name: "Route de l'Aéroport", lat: 4.0080, lng: 9.7220 },
      { name: "Boulevard de l'Unité", lat: 4.0620, lng: 9.7090 },
      { name: "Axe Lourd Douala-Yaoundé", lat: 4.0415, lng: 9.7420 },
      { name: "Boulevard de la République", lat: 4.0530, lng: 9.7150 },
      { name: "Avenue Winston Churchill", lat: 3.8910, lng: 11.5130 },
      { name: "Boulevard du 20 Mai", lat: 3.8612, lng: 11.5175 },
      { name: "Route de Nsimalen", lat: 3.7320, lng: 11.5510 },
      { name: "Avenue de l'Indépendance", lat: 3.8640, lng: 11.5205 },
      { name: "Rue Melen", lat: 3.8580, lng: 11.4940 }
    ];

    roadNamesData.forEach(road => {
      const icon = L.divIcon({
        className: 'custom-road-label-icon',
        html: `<div class="bg-brand-midnight/90 text-white border border-brand-gold/30 rounded-md px-1.5 py-0.5 text-[8.5px] font-bold font-sans uppercase tracking-wider whitespace-nowrap shadow-md flex items-center gap-1">
                 <span class="w-1.5 h-1.5 bg-brand-gold rounded-full"></span>
                 ${road.name}
               </div>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10]
      });
      L.marker([road.lat, road.lng], { icon, interactive: false }).addTo(roadNamesLayerGroup);
    });

    // Define and populate Building POIs overlay data
    const buildingPoisData = [
      { name: "Douala Grand Mall", lat: 4.0152, lng: 9.7360, type: "mall" },
      { name: "Akwa Palace Hotel", lat: 4.0485, lng: 9.6974, type: "hotel" },
      { name: "Bonanjo Administrative Block", lat: 4.0435, lng: 9.6895, type: "office" },
      { name: "Bonamoussadi Market", lat: 4.0825, lng: 9.7405, type: "market" },
      { name: "Japoma Omnisports Stadium", lat: 4.0150, lng: 9.8250, type: "stadium" },
      { name: "Logbessou University Campus", lat: 4.0780, lng: 9.7710, type: "university" },
      { name: "Bastos Embassy Block", lat: 3.8910, lng: 11.5130, type: "office" },
      { name: "Yaoundé Central Market", lat: 3.8655, lng: 11.5190, type: "market" },
      { name: "Ngoa-Ekelle University Campus", lat: 3.8490, lng: 11.5030, type: "university" },
      { name: "Omnisports Stadium", lat: 3.8855, lng: 11.5395, type: "stadium" },
      { name: "Santa Lucia Supermarket", lat: 3.8560, lng: 11.4920, type: "market" },
      { name: "Mokolo Market", lat: 3.8710, lng: 11.4980, type: "market" }
    ];

    buildingPoisData.forEach(poi => {
      let iconHtml = '';
      if (poi.type === 'mall' || poi.type === 'market') {
        iconHtml = '🛍️';
      } else if (poi.type === 'hotel') {
        iconHtml = '🏨';
      } else if (poi.type === 'stadium') {
        iconHtml = '🏟️';
      } else if (poi.type === 'university') {
        iconHtml = '🎓';
      } else {
        iconHtml = '🏢';
      }
      
      const icon = L.divIcon({
        className: 'custom-building-poi-icon',
        html: `<div class="bg-brand-midnight/95 text-brand-text-muted hover:text-white border border-brand-input/55 rounded-xl px-2 py-1 text-[9px] font-black shadow-lg flex items-center gap-1.5 whitespace-nowrap transition-all hover:scale-105 active:scale-95 cursor-pointer">
                 <span class="text-[11px]">${iconHtml}</span>
                 <span>${poi.name}</span>
               </div>`,
        iconSize: [140, 24],
        iconAnchor: [70, 12]
      });
      L.marker([poi.lat, poi.lng], { icon }).addTo(buildingPoisLayerGroup);
    });

    // Define and populate Public Transit Stops
    const publicTransitData = [
      { name: "Douala International Airport (DLA)", lat: 4.0053, lng: 9.7194, type: "airport" },
      { name: "Deido Roundabout Transit Hub", lat: 4.0620, lng: 9.7090, type: "hub" },
      { name: "Ndokoti Junction Railway", lat: 4.0415, lng: 9.7420, type: "rail" },
      { name: "Bonamoussadi Bus Station", lat: 4.0840, lng: 9.7420, type: "bus" },
      { name: "Yaoundé Nsimalen International Airport (NSI)", lat: 3.7225, lng: 11.5532, type: "airport" },
      { name: "Mvan Bus Terminal", lat: 3.8290, lng: 11.5180, type: "bus" },
      { name: "Poste Centrale Transit Hub", lat: 3.8640, lng: 11.5205, type: "hub" },
      { name: "Melen Taxi Park", lat: 3.8595, lng: 11.4915, type: "taxi" }
    ];

    publicTransitData.forEach(transit => {
      let iconHtml = '';
      if (transit.type === 'airport') {
        iconHtml = '✈️';
      } else if (transit.type === 'bus') {
        iconHtml = '🚌';
      } else if (transit.type === 'rail') {
        iconHtml = '🚊';
      } else if (transit.type === 'taxi') {
        iconHtml = '🚖';
      } else {
        iconHtml = '🔄';
      }

      const icon = L.divIcon({
        className: 'custom-transit-poi-icon',
        html: `<div class="bg-blue-950/95 text-blue-300 hover:text-white border border-blue-500/40 rounded-xl px-2 py-1 text-[9px] font-black shadow-lg flex items-center gap-1.5 whitespace-nowrap transition-all hover:scale-105 active:scale-95 cursor-pointer">
                 <span class="text-[11.5px]">${iconHtml}</span>
                 <span>${transit.name}</span>
               </div>`,
        iconSize: [150, 24],
        iconAnchor: [75, 12]
      });
      L.marker([transit.lat, transit.lng], { icon }).addTo(publicTransitLayerGroup);
    });

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
      routeLineBgRef.current = null;
      routeLineMidRef.current = null;
      activeRouteLineRef.current = null;
      activeRouteLineBgRef.current = null;
      activeRouteLineMidRef.current = null;
      approachLineRef.current = null;
      driverStartLocRef.current = null;
      polygonLayersRef.current = {};
      nearbyDriverMarkersRef.current = [];
      heatmapOverlayRef.current = null;
      roadNamesLayerGroupRef.current = null;
      buildingPoisLayerGroupRef.current = null;
      publicTransitLayerGroupRef.current = null;
      darkLayerGroupRef.current = null;
      streetLayerRef.current = null;
      satelliteLayerRef.current = null;
      terrainLayerRef.current = null;
      if (d3OverlayRef.current) {
        d3.select(d3OverlayRef.current).remove();
        d3OverlayRef.current = null;
      }
    };
  }, []);

  // Track size changes of the map container to invalidate map size automatically
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sync map center to centerCoords prop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;
    if (centerCoords && isValidCoords(centerCoords.lat, centerCoords.lng)) {
      map.setView([centerCoords.lat, centerCoords.lng], 14, { animate: true });
    }
  }, [centerCoords]);

  // Dynamic Map Detail Control Effect (Toggles road names & POIs based on Zoom & Status)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleZoomOrStatusChange = () => {
      const zoom = map.getZoom();
      
      let opacity = 1.0;
      let mode: 'clean' | 'moderate' | 'full' = 'full';

      if (zoom <= 12) {
        // Zoomed out: Minimal labels, highly clean layout to avoid clutter
        opacity = 0.02;
        mode = 'clean';
      } else if (zoom >= 13 && zoom <= 15) {
        // Intermediate zoom: Moderate details, major highway labels and landmarks
        opacity = 0.15;
        mode = 'moderate';
      } else {
        // Zoomed in close: Maximum detail with full POIs and street names for fine-grained navigation
        opacity = 0.45;
        mode = 'full';
      }

      if (darkLabelsLayerRef.current) {
        darkLabelsLayerRef.current.setOpacity(showRoadNames ? opacity : 0);
      }
      setMapDetailMode(mode);
      if (onZoomChangeRef.current) {
        onZoomChangeRef.current(zoom);
      }
    };

    // Run immediately to sync on status change
    handleZoomOrStatusChange();

    // Bind event listeners
    map.on('zoomend', handleZoomOrStatusChange);

    return () => {
      map.off('zoomend', handleZoomOrStatusChange);
    };
  }, [status, showRoadNames]);

  // Sync showHeatmap state changes back to Leaflet layer control status
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !heatmapOverlayRef.current) return;
    const hasLayer = map.hasLayer(heatmapOverlayRef.current);
    if (showHeatmap && !hasLayer) {
      heatmapOverlayRef.current.addTo(map);
    } else if (!showHeatmap && hasLayer) {
      heatmapOverlayRef.current.remove();
    }
  }, [showHeatmap]);

  // Helper function to match booking zone name to demand zone name
  const isBookingInZone = (bookingZoneName: string, demandZoneName: string): boolean => {
    if (!bookingZoneName || !demandZoneName) return false;
    const bLower = bookingZoneName.toLowerCase();
    const dLower = demandZoneName.toLowerCase();

    if (bLower.includes(dLower) || dLower.includes(bLower)) return true;

    const keywords = dLower
      .replace(/[\(\)\,\&\-\.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !['area', 'center', 'zone', 'district', 'du', 'de', 'la', 'le', 'les', 'and'].includes(w));

    return keywords.some(kw => bLower.includes(kw));
  };

  // 1. Initialize stable demand zones with organic polygon vertices and base requests
  useEffect(() => {
    const yaoundeZones: DemandZone[] = [
      { id: 'y1', name: 'Bastos Embassy District', city: 'Yaoundé', center: [3.8910, 11.5130], vertices: generateIrregularPolygon(3.8910, 11.5130, 6, 0.006), demandLevel: 'high', activeRequests: 42, surgeMultiplier: 1.5, baseRequests: 25 },
      { id: 'y2', name: 'Marché Central (Central Market)', city: 'Yaoundé', center: [3.8655, 11.5190], vertices: generateIrregularPolygon(3.8655, 11.5190, 7, 0.005), demandLevel: 'critical', activeRequests: 87, surgeMultiplier: 1.8, baseRequests: 45 },
      { id: 'y3', name: 'Poste Centrale & Blvd 20 Mai', city: 'Yaoundé', center: [3.8640, 11.5205], vertices: generateIrregularPolygon(3.8640, 11.5205, 5, 0.004), demandLevel: 'critical', activeRequests: 95, surgeMultiplier: 1.9, baseRequests: 50 },
      { id: 'y4', name: 'Ngoa-Ekelle University Area', city: 'Yaoundé', center: [3.8490, 11.5030], vertices: generateIrregularPolygon(3.8490, 11.5030, 6, 0.007), demandLevel: 'medium', activeRequests: 28, surgeMultiplier: 1.2, baseRequests: 15 },
      { id: 'y5', name: 'Mvan Bus Terminal (Gare)', city: 'Yaoundé', center: [3.8290, 11.5180], vertices: generateIrregularPolygon(3.8290, 11.5180, 6, 0.0055), demandLevel: 'high', activeRequests: 56, surgeMultiplier: 1.6, baseRequests: 30 },
      { id: 'y6', name: 'Omnisports Stadium Area', city: 'Yaoundé', center: [3.8855, 11.5395], vertices: generateIrregularPolygon(3.8855, 11.5395, 6, 0.0065), demandLevel: 'stable', activeRequests: 14, surgeMultiplier: 1.0, baseRequests: 10 },
      { id: 'y7', name: 'Mokolo Market (Marché Mokolo)', city: 'Yaoundé', center: [3.8710, 11.4980], vertices: generateIrregularPolygon(3.8710, 11.4980, 7, 0.005), demandLevel: 'critical', activeRequests: 78, surgeMultiplier: 1.7, baseRequests: 40 }
    ];

    const doualaZones: DemandZone[] = [
      { id: 'd1', name: 'Akwa Palace & Blvd de la Liberté', city: 'Douala', center: [4.0485, 9.6974], vertices: generateIrregularPolygon(4.0485, 9.6974, 6, 0.0055), demandLevel: 'critical', activeRequests: 91, surgeMultiplier: 1.9, baseRequests: 50 },
      { id: 'd2', name: 'Bonanjo Administrative Center', city: 'Douala', center: [4.0435, 9.6895], vertices: generateIrregularPolygon(4.0435, 9.6895, 6, 0.006), demandLevel: 'high', activeRequests: 48, surgeMultiplier: 1.4, baseRequests: 25 },
      { id: 'd3', name: 'Deido Roundabout (Rond-point)', city: 'Douala', center: [4.0620, 9.7090], vertices: generateIrregularPolygon(4.0620, 9.7090, 7, 0.005), demandLevel: 'critical', activeRequests: 84, surgeMultiplier: 1.7, baseRequests: 45 },
      { id: 'd4', name: 'Ndokoti Junction (Carrefour)', city: 'Douala', center: [4.0415, 9.7420], vertices: generateIrregularPolygon(4.0415, 9.7420, 6, 0.0065), demandLevel: 'critical', activeRequests: 112, surgeMultiplier: 2.1, baseRequests: 60 },
      { id: 'd5', name: 'Bonamoussadi Market (Marché)', city: 'Douala', center: [4.0825, 9.7405], vertices: generateIrregularPolygon(4.0825, 9.7405, 5, 0.005), demandLevel: 'medium', activeRequests: 32, surgeMultiplier: 1.2, baseRequests: 18 },
      { id: 'd6', name: 'Douala Grand Mall & Airport Zone', city: 'Douala', center: [4.0152, 9.7360], vertices: generateIrregularPolygon(4.0152, 9.7360, 6, 0.007), demandLevel: 'high', activeRequests: 65, surgeMultiplier: 1.5, baseRequests: 35 },
      { id: 'd7', name: 'Logbessou Campus Area', city: 'Douala', center: [4.0780, 9.7710], vertices: generateIrregularPolygon(4.0780, 9.7710, 6, 0.006), demandLevel: 'stable', activeRequests: 19, surgeMultiplier: 1.0, baseRequests: 12 }
    ];

    setDemandZones([...yaoundeZones, ...doualaZones]);
  }, []);

  // 2. Dynamic synchronization effect driven directly by recentBookings
  useEffect(() => {
    if (!recentBookings || recentBookings.length === 0) return;

    setDemandZones(prevZones => {
      if (!prevZones || prevZones.length === 0) return prevZones;

      return prevZones.map(zone => {
        const matchedBookings = recentBookings.filter(b =>
          b.city === zone.city && isBookingInZone(b.zoneName, zone.name)
        );

        const activeCount = matchedBookings.filter(b => b.status === 'active').length;
        const recentCount = matchedBookings.length;
        const totalFare = matchedBookings.reduce((sum, b) => sum + b.fare, 0);

        const base = zone.baseRequests || 20;
        const calculatedActiveRequests = Math.max(10, base + (activeCount * 32) + (recentCount * 10));

        let demandLevel: 'critical' | 'high' | 'medium' | 'stable' = 'stable';
        if (calculatedActiveRequests >= 70 || activeCount >= 2) {
          demandLevel = 'critical';
        } else if (calculatedActiveRequests >= 40 || activeCount >= 1) {
          demandLevel = 'high';
        } else if (calculatedActiveRequests >= 22) {
          demandLevel = 'medium';
        } else {
          demandLevel = 'stable';
        }

        const surgeMultiplier = parseFloat((1.0 + Math.min(1.4, (calculatedActiveRequests / 75) + (activeCount * 0.25))).toFixed(1));

        return {
          ...zone,
          activeRequests: calculatedActiveRequests,
          demandLevel,
          surgeMultiplier,
          recentBookingsCount: recentCount,
          activeBookingsCount: activeCount,
          recentTotalFare: totalFare,
          matchedBookings
        };
      });
    });
  }, [recentBookings]);

  // 3. Render and update Heatmap Polygons dynamically on the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    const isRideActive = (status === 'driver_found' || status === 'arriving' || status === 'in_progress') && role !== 'driver';

    // Clear everything if heatmap is hidden or a ride is active
    if (!showHeatmap || isRideActive) {
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
      let fillOpacity = 0.16;
      
      if (zone.demandLevel === 'critical') {
        color = '#ef4444'; // critical (red)
        weight = 3.0;
        fillOpacity = 0.42;
      } else if (zone.demandLevel === 'high') {
        color = '#f97316'; // high (orange)
        weight = 2.2;
        fillOpacity = 0.32;
      } else if (zone.demandLevel === 'medium') {
        color = '#f59e0b'; // medium (amber)
        weight = 1.8;
        fillOpacity = 0.24;
      }

      if (polygonLayersRef.current[zone.id]) {
        const poly = polygonLayersRef.current[zone.id];
        poly.setStyle({
          color,
          weight,
          fillColor: color,
          fillOpacity
         });
      } else {
        const poly = L.polygon(zone.vertices, {
          color,
          weight,
          fillColor: color,
          fillOpacity,
          lineJoin: 'round',
          className: 'transition-all duration-300 cursor-pointer'
        }).addTo(map);

        // Click handler to select zone for interactive demand detail card
        poly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedZone(zone);
          if (mapRef.current) {
            mapRef.current.flyTo(zone.center, Math.max(14, mapRef.current.getZoom()), { duration: 0.8 });
          }
        });

        // Hover feedback
        poly.on('mouseover', () => {
          poly.setStyle({
            fillOpacity: Math.min(0.65, fillOpacity + 0.18),
            weight: weight + 1.2
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

  }, [demandZones, showHeatmap, pickup, status]);

  // 3b. Render D3 Demand Heatmap dynamic intensity circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    const overlayPane = map.getPanes().overlayPane;
    if (!overlayPane) return;

    const isRideActive = (status === 'driver_found' || status === 'arriving' || status === 'in_progress') && role !== 'driver';

    // If heatmap is disabled or a ride is active, clear any existing D3 overlays and return
    if (!showHeatmap || isRideActive) {
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
  }, [showHeatmap, demandZones, pickup, status]);

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
        let bgColor = 'bg-[#ffd385]';
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
      const isTransit = status === 'driver_found' || status === 'arriving' || status === 'in_progress';
      const pickupIcon = L.divIcon({
        className: 'custom-pin-pickup',
        html: `
          <div class="relative flex items-center justify-center">
            ${isTransit 
              ? `<div class="absolute w-9 h-9 rounded-full bg-emerald-500/25 animate-pulse border border-emerald-500/40"></div>
                 <div class="absolute w-12 h-12 rounded-full bg-emerald-500/10 animate-ping"></div>`
              : `<div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>`
            }
            <div class="relative w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-xs ${isTransit ? 'transit-pulse-emerald' : ''}">
              A
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      if (pickupMarkerRef.current && map.hasLayer(pickupMarkerRef.current)) {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
        pickupMarkerRef.current.setIcon(pickupIcon);
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
      const isCompleted = status === 'completed';
      const isTransit = status === 'driver_found' || status === 'arriving' || status === 'in_progress';
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div class="relative flex items-center justify-center">
            ${isCompleted
              ? `<div class="absolute w-12 h-12 rounded-full bg-emerald-500/40 animate-ping"></div>
                 <div class="absolute w-16 h-16 rounded-full bg-amber-400/30 animate-pulse border-2 border-amber-400/60"></div>
                 <div class="relative w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-sm animate-bounce">
                   ✓
                 </div>`
              : isTransit 
              ? `<div class="absolute w-9 h-9 rounded-full bg-[#ffd385]/25 animate-pulse border border-[#ffd385]/40"></div>
                 <div class="absolute w-12 h-12 rounded-full bg-[#ffd385]/10 animate-ping"></div>
                 <div class="relative w-7 h-7 rounded-full bg-[#ffd385] border-2 border-white shadow-md flex items-center justify-center text-[#0a081d] font-black text-xs transit-pulse-gold">
                   B
                 </div>`
              : `<div class="absolute w-8 h-8 rounded-full bg-[#ffd385]/30 animate-ping"></div>
                 <div class="relative w-7 h-7 rounded-full bg-[#ffd385] border-2 border-white shadow-md flex items-center justify-center text-[#0a081d] font-black text-xs">
                   B
                 </div>`
            }
          </div>
        `,
        iconSize: isCompleted ? [40, 40] : [30, 30],
        iconAnchor: isCompleted ? [20, 20] : [15, 15]
      });

      if (destMarkerRef.current && map.hasLayer(destMarkerRef.current)) {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
        destMarkerRef.current.setIcon(destIcon);
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
  }, [destination, status]);

  // Update Route Polylines & Fit Bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    // Manage Driver Start Location for approach path animation
    if (status === 'driver_found' && driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      if (!driverStartLocRef.current) {
        driverStartLocRef.current = { lat: driverLocation.lat, lng: driverLocation.lng };
      }
    } else if (status === 'idle' || status === 'searching') {
      driverStartLocRef.current = null;
    }

    // --- 1. Background Planned Trip Polyline (Pickup -> Destination) ---
    if (pickup && destination && isValidCoords(pickup.lat, pickup.lng) && isValidCoords(destination.lat, destination.lng)) {
      const mainPoints: L.LatLngExpression[] = [
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      ];

      const isAssigned = status === 'driver_found' || status === 'arriving' || status === 'in_progress';

      if (isAssigned && role === 'passenger') {
        // RENDER A SPECTACULAR ANIMATED "ROUTE DISCOVERY" GLOWING GRADIENT!
        
        // Layer 1. Thick background neon gold glow
        if (routeLineBgRef.current && map.hasLayer(routeLineBgRef.current)) {
          routeLineBgRef.current.setLatLngs(mainPoints);
        } else {
          routeLineBgRef.current = L.polyline(mainPoints, {
            color: '#ff9d00',
            weight: 12,
            opacity: 0.35,
            lineJoin: 'round',
            className: 'route-discovery-glow-bg'
          } as any).addTo(map);
          animatePolylineDraw(routeLineBgRef.current, 2800);
        }

        // Layer 2. Middle vibrant brand-gold layer
        if (routeLineMidRef.current && map.hasLayer(routeLineMidRef.current)) {
          routeLineMidRef.current.setLatLngs(mainPoints);
        } else {
          routeLineMidRef.current = L.polyline(mainPoints, {
            color: '#ffd385',
            weight: 6,
            opacity: 0.7,
            lineJoin: 'round',
            className: 'route-discovery-glow-mid'
          } as any).addTo(map);
          animatePolylineDraw(routeLineMidRef.current, 2200);
        }

        // Layer 3. Core hot white highlight laser line
        if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
          routeLineRef.current.setLatLngs(mainPoints);
          routeLineRef.current.setStyle({
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            className: 'route-discovery-glow-core'
          } as any);
        } else {
          routeLineRef.current = L.polyline(mainPoints, {
            color: '#ffffff',
            weight: 2,
            opacity: 0.95,
            lineJoin: 'round',
            className: 'route-discovery-glow-core'
          } as any).addTo(map);
          animatePolylineDraw(routeLineRef.current, 1600);
        }
      } else {
        // Standard Faded/Dashed Planned Trip Polyline
        if (routeLineBgRef.current && map.hasLayer(routeLineBgRef.current)) {
          routeLineBgRef.current.remove();
        }
        routeLineBgRef.current = null;

        if (routeLineMidRef.current && map.hasLayer(routeLineMidRef.current)) {
          routeLineMidRef.current.remove();
        }
        routeLineMidRef.current = null;

        if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
          routeLineRef.current.setLatLngs(mainPoints);
          routeLineRef.current.setStyle({
            color: '#a39bc9', // faded brand-text-muted
            weight: 3,
            opacity: 0.35,
            className: ''
          } as any);
        } else {
          routeLineRef.current = L.polyline(mainPoints, {
            color: '#a39bc9',
            weight: 3,
            opacity: 0.35,
            dashArray: '4, 8',
            lineJoin: 'round'
          }).addTo(map);
        }
      }
    } else {
      if (routeLineRef.current) {
        if (map.hasLayer(routeLineRef.current)) {
          routeLineRef.current.remove();
        }
        routeLineRef.current = null;
      }
      if (routeLineBgRef.current) {
        if (map.hasLayer(routeLineBgRef.current)) {
          routeLineBgRef.current.remove();
        }
        routeLineBgRef.current = null;
      }
      if (routeLineMidRef.current) {
        if (map.hasLayer(routeLineMidRef.current)) {
          routeLineMidRef.current.remove();
        }
        routeLineMidRef.current = null;
      }
    }

    // --- 2. Active Progress/Completed Trail ---
    // (a) In-progress ride: Draws itself from Pickup to Driver's current position
    if (status === 'in_progress' && pickup && driverLocation && isValidCoords(pickup.lat, pickup.lng) && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      const activePoints: L.LatLngExpression[] = [
        [pickup.lat, pickup.lng],
        [driverLocation.lat, driverLocation.lng]
      ];

      if (role === 'passenger') {
        if (activeRouteLineBgRef.current && map.hasLayer(activeRouteLineBgRef.current)) {
          activeRouteLineBgRef.current.remove();
        }
        activeRouteLineBgRef.current = L.polyline(activePoints, {
          color: '#ff9d00',
          weight: 12,
          opacity: 0.35,
          lineJoin: 'round',
          className: 'route-discovery-glow-bg'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineBgRef.current, 1500);

        if (activeRouteLineMidRef.current && map.hasLayer(activeRouteLineMidRef.current)) {
          activeRouteLineMidRef.current.remove();
        }
        activeRouteLineMidRef.current = L.polyline(activePoints, {
          color: '#ffd385',
          weight: 6,
          opacity: 0.7,
          lineJoin: 'round',
          className: 'route-discovery-glow-mid'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineMidRef.current, 1200);

        if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = L.polyline(activePoints, {
          color: '#ffffff',
          weight: 2,
          opacity: 0.95,
          lineJoin: 'round',
          className: 'route-discovery-glow-core'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineRef.current, 900);
      } else {
        if (activeRouteLineBgRef.current && map.hasLayer(activeRouteLineBgRef.current)) {
          activeRouteLineBgRef.current.remove();
        }
        activeRouteLineBgRef.current = null;
        if (activeRouteLineMidRef.current && map.hasLayer(activeRouteLineMidRef.current)) {
          activeRouteLineMidRef.current.remove();
        }
        activeRouteLineMidRef.current = null;

        if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = L.polyline(activePoints, {
          color: '#ffd385', // brand-gold
          weight: 5,
          opacity: 1,
          lineJoin: 'round',
          className: 'route-glow-animate route-flow-animate'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineRef.current, 1200);
      }
    }
    // (b) Driver heading to pickup: Draws itself from Driver's starting point to current Driver position
    else if ((status === 'driver_found' || status === 'arriving') && driverStartLocRef.current && driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      const approachTrailPoints: L.LatLngExpression[] = [
        [driverStartLocRef.current.lat, driverStartLocRef.current.lng],
        [driverLocation.lat, driverLocation.lng]
      ];

      if (role === 'passenger') {
        if (activeRouteLineBgRef.current && map.hasLayer(activeRouteLineBgRef.current)) {
          activeRouteLineBgRef.current.remove();
        }
        activeRouteLineBgRef.current = L.polyline(approachTrailPoints, {
          color: '#0ea5e9',
          weight: 12,
          opacity: 0.35,
          lineJoin: 'round',
          className: 'route-discovery-glow-bg-blue'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineBgRef.current, 1500);

        if (activeRouteLineMidRef.current && map.hasLayer(activeRouteLineMidRef.current)) {
          activeRouteLineMidRef.current.remove();
        }
        activeRouteLineMidRef.current = L.polyline(approachTrailPoints, {
          color: '#38bdf8',
          weight: 6,
          opacity: 0.7,
          lineJoin: 'round',
          className: 'route-discovery-glow-mid-blue'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineMidRef.current, 1200);

        if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = L.polyline(approachTrailPoints, {
          color: '#ffffff',
          weight: 2,
          opacity: 0.95,
          lineJoin: 'round',
          className: 'route-discovery-glow-core-blue'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineRef.current, 900);
      } else {
        if (activeRouteLineBgRef.current && map.hasLayer(activeRouteLineBgRef.current)) {
          activeRouteLineBgRef.current.remove();
        }
        activeRouteLineBgRef.current = null;
        if (activeRouteLineMidRef.current && map.hasLayer(activeRouteLineMidRef.current)) {
          activeRouteLineMidRef.current.remove();
        }
        activeRouteLineMidRef.current = null;

        if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = L.polyline(approachTrailPoints, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9,
          lineJoin: 'round',
          className: 'route-glow-animate-blue'
        } as any).addTo(map);
        animatePolylineDraw(activeRouteLineRef.current, 1200);
      }
    } else {
      if (activeRouteLineRef.current) {
        if (map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = null;
      }
      if (activeRouteLineBgRef.current) {
        if (map.hasLayer(activeRouteLineBgRef.current)) {
          activeRouteLineBgRef.current.remove();
        }
        activeRouteLineBgRef.current = null;
      }
      if (activeRouteLineMidRef.current) {
        if (map.hasLayer(activeRouteLineMidRef.current)) {
          activeRouteLineMidRef.current.remove();
        }
        activeRouteLineMidRef.current = null;
      }
    }

    // --- 3. Approach Path Remaining (Driver current position -> Pickup) ---
    if (status === 'driver_found' && driverLocation && pickup && isValidCoords(driverLocation.lat, driverLocation.lng) && isValidCoords(pickup.lat, pickup.lng)) {
      const remainingApproachPoints: L.LatLngExpression[] = [
        [driverLocation.lat, driverLocation.lng],
        [pickup.lat, pickup.lng]
      ];

      if (approachLineRef.current && map.hasLayer(approachLineRef.current)) {
        approachLineRef.current.remove();
      }
      approachLineRef.current = L.polyline(remainingApproachPoints, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.8,
        lineJoin: 'round',
        className: 'route-dash-animate-blue'
      } as any).addTo(map);
      animatePolylineDraw(approachLineRef.current, 1200);
    } else {
      if (approachLineRef.current) {
        if (map.hasLayer(approachLineRef.current)) {
          approachLineRef.current.remove();
        }
        approachLineRef.current = null;
      }
    }

    // --- 4. Fit bounds smoothly to encompass relevant elements ---
    if (!isZoomLocked) {
      const boundsPoints: L.LatLngExpression[] = [];
      if (pickup && isValidCoords(pickup.lat, pickup.lng)) boundsPoints.push([pickup.lat, pickup.lng]);
      if (destination && isValidCoords(destination.lat, destination.lng)) boundsPoints.push([destination.lat, destination.lng]);
      if (driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) boundsPoints.push([driverLocation.lat, driverLocation.lng]);

      if (boundsPoints.length >= 2) {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      }
    }
  }, [pickup, destination, driverLocation, status, isZoomLocked]);

  // Update Driver Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    if (driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      // Choose emoji or icon based on vehicle type
      let vehicleSvg = '🚗';
      // Use brighter gold
      let bgColor = 'bg-[#ffd385]';
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
      if (!isZoomLocked && (status === 'arriving' || status === 'in_progress')) {
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
  }, [driverLocation, driverType, status, isZoomLocked]);

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

  // Handler: Re-center on user's GPS position with smooth viewport transition animation
  const handleRecenterGPS = () => {
    if (!navigator.geolocation) {
      setGpsError(slangMode ? "GPS non supporté" : "GPS not supported by device.");
      return;
    }

    if (liveCoords && isValidCoords(liveCoords.lat, liveCoords.lng)) {
      if (mapRef.current) {
        mapRef.current.flyTo([liveCoords.lat, liveCoords.lng], 15, {
          animate: true,
          duration: 1.3
        });
      }
    } else {
      setIsResolving(true);
      setGpsError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          setLiveCoords(coords);
          setIsResolving(false);
          
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 15, {
              animate: true,
              duration: 1.3
            });
          }

          if (role === 'driver' && onSetDriverLoc) {
            onSetDriverLoc(coords);
          }
        },
        (error) => {
          setIsResolving(false);
          setGpsError(error.message || "GPS error");
          console.warn("GPS re-center lookup error:", error);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
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

  // --- TURN-BY-TURN ROUTING & NAVIGATION EFFECTS ---
  
  // Effect 1: Fetch Routing path & directions from OSRM driving profile
  useEffect(() => {
    if (status !== 'driver_found' && status !== 'arriving' && status !== 'in_progress') {
      setNavInstructions([]);
      setCurrentStepIndex(0);
      return;
    }

    const targetCoords = status === 'in_progress' ? destination : pickup;

    if (!targetCoords || !driverLocation || !isValidCoords(targetCoords.lat, targetCoords.lng) || !isValidCoords(driverLocation.lat, driverLocation.lng)) {
      return;
    }

    let isSubscribed = true;

    const fetchOSRMRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${targetCoords.lng},${targetCoords.lat}?overview=full&steps=true&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM routing server error");
        const data = await res.json();
        
        if (!isSubscribed) return;

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const legs = route.legs[0] || {};
          const rawSteps = legs.steps || [];
          
          const steps = rawSteps.map((s: any) => ({
            instruction: s.maneuver?.instruction || "Continue on road",
            distance: s.distance || 0,
            duration: s.duration || 0,
            type: s.maneuver?.type || "straight",
            modifier: s.maneuver?.modifier || ""
          }));

          if (steps.length === 0) {
            setNavInstructions(generateFallbackInstructions(driverLocation, targetCoords, status === 'in_progress'));
          } else {
            setNavInstructions(steps);
          }

          if (route.geometry && route.geometry.coordinates && mapRef.current) {
            const pathLatLngs = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            
            if (role === 'passenger') {
              // RENDER A SPECTACULAR ANIMATED GLOWING GRADIENT OSRM ROUTE DISCOVERY!
              // 1. Bottom Glow Layer (deep cyan/teal neon glow for approach, or gold/amber for ride)
              const glowColor = status === 'in_progress' ? '#ff9d00' : '#0ea5e9';
              const glowClass = status === 'in_progress' ? 'route-discovery-glow-bg' : 'route-discovery-glow-bg-blue';

              if (activeRouteLineBgRef.current && mapRef.current.hasLayer(activeRouteLineBgRef.current)) {
                activeRouteLineBgRef.current.remove();
              }
              activeRouteLineBgRef.current = L.polyline(pathLatLngs as L.LatLngExpression[], {
                color: glowColor,
                weight: 12,
                opacity: 0.35,
                lineJoin: 'round',
                className: glowClass
              } as any).addTo(mapRef.current);
              animatePolylineDraw(activeRouteLineBgRef.current, 1500);

              // 2. Middle Vivid Layer (cyan or gold with flow dash)
              const midColor = status === 'in_progress' ? '#ffd385' : '#38bdf8';
              const midClass = status === 'in_progress' ? 'route-discovery-glow-mid' : 'route-discovery-glow-mid-blue';

              if (activeRouteLineMidRef.current && mapRef.current.hasLayer(activeRouteLineMidRef.current)) {
                activeRouteLineMidRef.current.remove();
              }
              activeRouteLineMidRef.current = L.polyline(pathLatLngs as L.LatLngExpression[], {
                color: midColor,
                weight: 6,
                opacity: 0.7,
                lineJoin: 'round',
                className: midClass
              } as any).addTo(mapRef.current);
              animatePolylineDraw(activeRouteLineMidRef.current, 1200);

              // 3. Core Laser Layer (bright white highlight)
              const coreClass = status === 'in_progress' ? 'route-discovery-glow-core' : 'route-discovery-glow-core-blue';

              if (activeRouteLineRef.current && mapRef.current.hasLayer(activeRouteLineRef.current)) {
                activeRouteLineRef.current.remove();
              }
              activeRouteLineRef.current = L.polyline(pathLatLngs as L.LatLngExpression[], {
                color: '#ffffff',
                weight: 2,
                opacity: 0.95,
                lineJoin: 'round',
                className: coreClass
              } as any).addTo(mapRef.current);
              animatePolylineDraw(activeRouteLineRef.current, 900);
            } else {
              // Standard driver path
              if (activeRouteLineBgRef.current && mapRef.current.hasLayer(activeRouteLineBgRef.current)) {
                activeRouteLineBgRef.current.remove();
              }
              activeRouteLineBgRef.current = null;

              if (activeRouteLineMidRef.current && mapRef.current.hasLayer(activeRouteLineMidRef.current)) {
                activeRouteLineMidRef.current.remove();
              }
              activeRouteLineMidRef.current = null;

              if (activeRouteLineRef.current && mapRef.current.hasLayer(activeRouteLineRef.current)) {
                activeRouteLineRef.current.remove();
              }
              activeRouteLineRef.current = L.polyline(pathLatLngs as L.LatLngExpression[], {
                color: status === 'in_progress' ? '#ffd385' : '#38bdf8',
                weight: 5,
                opacity: 1,
                lineJoin: 'round',
                className: status === 'in_progress' ? 'route-glow-animate route-flow-animate' : 'route-glow-animate-blue'
              } as any).addTo(mapRef.current);
              animatePolylineDraw(activeRouteLineRef.current, 1200);
            }
          }
        } else {
          setNavInstructions(generateFallbackInstructions(driverLocation, targetCoords, status === 'in_progress'));
        }
      } catch (err) {
        console.warn("OSRM API error, using local fallback:", err);
        if (isSubscribed) {
          setNavInstructions(generateFallbackInstructions(driverLocation, targetCoords, status === 'in_progress'));
        }
      } finally {
        if (isSubscribed) {
          setIsLoadingRoute(false);
        }
      }
    };

    fetchOSRMRoute();

    return () => {
      isSubscribed = false;
    };
  }, [pickup, destination, status]);

  // Effect 2: Update navigation progress based on driver movement (live state updates)
  useEffect(() => {
    const targetCoords = status === 'in_progress' ? destination : pickup;
    if (!targetCoords || !driverLocation || !isValidCoords(targetCoords.lat, targetCoords.lng) || !isValidCoords(driverLocation.lat, driverLocation.lng)) {
      return;
    }

    if (status !== 'driver_found' && status !== 'arriving' && status !== 'in_progress') return;

    const distMeters = getHaversineDistanceInMeters(driverLocation, targetCoords);
    setTotalDistanceRemaining(distMeters);
    setTotalDurationRemaining(Math.round(distMeters / 8.3));

    if (navInstructions.length > 0) {
      // Divide total average distance dynamically to trace index
      const initialDist = status === 'in_progress' 
        ? (pickup && destination ? getHaversineDistanceInMeters(pickup, destination) : 3000)
        : 1500; 
      const ratio = Math.min(1, Math.max(0, distMeters / initialDist));
      const stepIndex = Math.min(
        navInstructions.length - 1,
        Math.floor((1 - ratio) * navInstructions.length)
      );
      
      setCurrentStepIndex(stepIndex);
    }
  }, [driverLocation, pickup, destination, navInstructions, status]);

  // Effect 3: Voice synthesizer voice guide
  useEffect(() => {
    // Disabled as requested: No voice guidance
    return;
  }, [currentStepIndex, isVoiceMuted, navInstructions, slangMode]);

  // Distance to next turn/maneuver calculation
  const getDistanceToNextManeuver = () => {
    if (!driverLocation || navInstructions.length === 0) return 999;
    const targetCoords = status === 'in_progress' ? destination : pickup;
    if (!targetCoords) return 999;
    
    const distMeters = getHaversineDistanceInMeters(driverLocation, targetCoords);
    const initialDist = status === 'in_progress' 
      ? (pickup && destination ? getHaversineDistanceInMeters(pickup, destination) : 3000)
      : 1500;
    
    // Each step spans initialDist / navInstructions.length.
    // The end boundary of the current step in terms of total remaining distance is:
    const endBoundaryOfStep = initialDist * (1 - (currentStepIndex + 1) / navInstructions.length);
    const remaining = distMeters - endBoundaryOfStep;
    return Math.max(0, remaining);
  };
  
  const distanceToNextManeuver = getDistanceToNextManeuver();
  const isTurnClose = distanceToNextManeuver < 50;

  return (
    <div className="w-full h-full relative overflow-hidden" id="taxi-map-wrapper">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-brand-midnight/80 to-transparent pointer-events-none z-[1000]"></div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-midnight/80 to-transparent pointer-events-none z-[1000]"></div>
      
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        id="map-element"
        style={{
          transform: isTilted === 'isometric'
            ? 'perspective(1200px) rotateX(45deg) rotateZ(-1deg) scale(1.26) translateY(-4%)'
            : (isTilted === true || isTilted === 'tilted')
              ? 'perspective(1200px) rotateX(54deg) rotateZ(-2deg) scale(1.38) translateY(-6%)'
              : 'perspective(1200px) rotateX(0deg) rotateZ(0deg) scale(1) translateY(0)',
          transformOrigin: 'bottom center',
          transition: 'transform 1.1s cubic-bezier(0.25, 1, 0.3, 1), filter 1.1s cubic-bezier(0.25, 1, 0.3, 1), opacity 1.1s cubic-bezier(0.25, 1, 0.3, 1)',
          opacity: (isTilted === 'isometric' || isTilted === true || isTilted === 'tilted') ? 0.98 : 1,
          filter: (isTilted === 'isometric' || isTilted === true || isTilted === 'tilted')
            ? 'contrast(1.04) saturate(1.02) brightness(0.96)'
            : 'contrast(1) saturate(1) brightness(1)',
          willChange: 'transform, filter, opacity',
        }}
      />

      {/* Tactical Coordinate Grid Overlay */}
      {showMapGrid && (
        <div 
          className="absolute inset-0 z-[499] pointer-events-none overflow-hidden select-none"
          id="map-coordinate-grid"
          style={{
            transform: isTilted === 'isometric'
              ? 'perspective(1200px) rotateX(45deg) rotateZ(-1deg) scale(1.26) translateY(-4%)'
              : (isTilted === true || isTilted === 'tilted')
                ? 'perspective(1200px) rotateX(54deg) rotateZ(-2deg) scale(1.38) translateY(-6%)'
                : 'perspective(1200px) rotateX(0deg) rotateZ(0deg) scale(1) translateY(0)',
            transformOrigin: 'bottom center',
            transition: 'transform 1.1s cubic-bezier(0.25, 1, 0.3, 1), opacity 1.1s cubic-bezier(0.25, 1, 0.3, 1)',
            backgroundImage: `
              linear-gradient(to right, rgba(255, 211, 67, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 211, 67, 0.03) 1px, transparent 1px),
              linear-gradient(to right, rgba(255, 211, 67, 0.08) 1.5px, transparent 1.5px),
              linear-gradient(to bottom, rgba(255, 211, 67, 0.08) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '40px 40px, 40px 40px, 160px 160px, 160px 160px',
            backgroundPosition: 'center center',
          }}
        >
          {/* Edge Tick Coordinate Labels */}
          <div className="absolute top-[10%] left-6 text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LAT: 04.0580° N
          </div>
          <div className="absolute top-[50%] left-6 text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LAT: 04.0435° N
          </div>
          <div className="absolute top-[90%] left-6 text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LAT: 04.0290° N
          </div>

          <div className="absolute bottom-6 left-[10%] text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LNG: 09.6950° E
          </div>
          <div className="absolute bottom-6 left-[50%] -translate-x-1/2 text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LNG: 09.7100° E
          </div>
          <div className="absolute bottom-6 right-[10%] text-[7px] font-mono text-brand-gold/45 bg-brand-midnight/40 px-1 py-0.5 rounded backdrop-blur-xs">
            LNG: 09.7250° E
          </div>

          {/* Grid Scale Indicator Info */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-brand-midnight/70 backdrop-blur-md px-2 py-0.5 rounded-full text-[7.5px] font-mono text-brand-gold/60 border border-brand-gold/10 font-bold uppercase tracking-wider">
            {slangMode ? "Échelle Grille: 1 Bloc = ~500m" : "Grid Overlay: 1 Square = ~500m"}
          </div>
        </div>
      )}

      {/* Map Detail Mode Adaptive Badge */}
      <div 
        id="map-detail-badge"
        className="absolute top-4 left-4 z-[1010] flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-midnight/95 backdrop-blur-md border border-brand-input/40 shadow-2xl transition-all duration-300 pointer-events-auto"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            mapDetailMode === 'clean' 
              ? 'bg-emerald-400' 
              : mapDetailMode === 'moderate' 
                ? 'bg-sky-400' 
                : 'bg-brand-gold/80'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            mapDetailMode === 'clean' 
              ? 'bg-emerald-500' 
              : mapDetailMode === 'moderate' 
                ? 'bg-sky-500' 
                : 'bg-brand-gold'
          }`}></span>
        </span>
        <div className="flex flex-col">
          <span className="text-[7.5px] font-extrabold uppercase tracking-widest text-white leading-none">
            {slangMode ? "Densité Détails" : "Label Density"}
          </span>
          <span className="text-[8.5px] font-bold text-brand-text-muted mt-0.5 leading-none">
            {mapDetailMode === 'clean' 
              ? (slangMode ? "Épuré (Zoom éloigné)" : "Minimal (High Speed)") 
              : mapDetailMode === 'moderate'
                ? (slangMode ? "Modéré (Rues principales)" : "Medium (Transit)")
                : (slangMode ? "Complet (Arrêt/POI)" : "Full Detail (Approach)")
            }
          </span>
        </div>
      </div>

      {/* Dynamic Custom Map Layer & Advanced Settings Controller */}
      <div 
        ref={layersMenuRef}
        id="map-layers-settings-control"
        className="absolute top-4 right-4 z-[1010] flex flex-col items-end pointer-events-auto"
      >
        {/* Toggle Floating Action Button */}
        <button
          onClick={() => setIsLayersMenuExpanded(prev => !prev)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl border active:scale-95 cursor-pointer ${
            isLayersMenuExpanded
              ? 'bg-brand-gold text-brand-midnight border-brand-gold shadow-[0_0_12px_rgba(255,211,67,0.45)]'
              : 'bg-brand-midnight/95 text-brand-text-muted hover:text-brand-gold border-brand-input/40'
          }`}
          title={slangMode ? "Calques et réglages avancés" : "Layers & Advanced Map Details"}
        >
          <Layers size={18} className={isLayersMenuExpanded ? "scale-110" : "group-hover:scale-110"} />
        </button>

        {/* Dropdown settings panel */}
        {isLayersMenuExpanded && (
          <div className="mt-2 w-64 bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/30 rounded-2xl shadow-2xl p-4 text-white text-xs space-y-3.5 animate-fade-in animate-duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-input/40 pb-2">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-brand-gold">
                {slangMode ? "Calques de la carte" : "Map Layer & Theme"}
              </span>
              <span className="text-[9px] text-brand-text-muted font-mono uppercase">
                {selectedBaseLayer}
              </span>
            </div>

            {/* Base Layer Selection */}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-brand-text-muted">
                {slangMode ? "Style de Fond" : "Map Styles"}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Wanda Dark */}
                <button
                  onClick={() => setSelectedBaseLayer('dark')}
                  className={`px-2.5 py-1.5 rounded-xl border font-bold text-left transition flex items-center gap-1.5 text-[10px] cursor-pointer ${
                    selectedBaseLayer === 'dark'
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                      : 'border-brand-input/30 hover:border-brand-gold/45 text-brand-text-muted'
                  }`}
                >
                  <Layers size={11} />
                  <span>Wanda Dark</span>
                </button>

                {/* OpenStreetMap */}
                <button
                  onClick={() => setSelectedBaseLayer('streets')}
                  className={`px-2.5 py-1.5 rounded-xl border font-bold text-left transition flex items-center gap-1.5 text-[10px] cursor-pointer ${
                    selectedBaseLayer === 'streets'
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                      : 'border-brand-input/30 hover:border-brand-gold/45 text-brand-text-muted'
                  }`}
                >
                  <MapIcon size={11} />
                  <span>OSM Streets</span>
                </button>

                {/* Esri WorldImagery */}
                <button
                  onClick={() => setSelectedBaseLayer('satellite')}
                  className={`px-2.5 py-1.5 rounded-xl border font-bold text-left transition flex items-center gap-1.5 text-[10px] cursor-pointer ${
                    selectedBaseLayer === 'satellite'
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                      : 'border-brand-input/30 hover:border-brand-gold/45 text-brand-text-muted'
                  }`}
                >
                  <Globe size={11} />
                  <span>Satellite</span>
                </button>

                {/* OpenTopoMap */}
                <button
                  onClick={() => setSelectedBaseLayer('terrain')}
                  className={`px-2.5 py-1.5 rounded-xl border font-bold text-left transition flex items-center gap-1.5 text-[10px] cursor-pointer ${
                    selectedBaseLayer === 'terrain'
                      ? 'border-brand-gold bg-brand-gold/15 text-brand-gold'
                      : 'border-brand-input/30 hover:border-brand-gold/45 text-brand-text-muted'
                  }`}
                >
                  <Mountain size={11} />
                  <span>Terrain</span>
                </button>
              </div>
            </div>

            {/* Overlays / Heatmap Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-brand-input/35">
              <div className="flex flex-col">
                <span className="font-extrabold text-[10px] text-white">
                  {slangMode ? "Surintensité (Zones)" : "Heatmap Overlay"}
                </span>
                <span className="text-[8.5px] text-brand-text-muted">
                  {slangMode ? "Visualiser la forte demande" : "View active demand zones"}
                </span>
              </div>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`w-8 h-4 rounded-full p-0.5 transition-all duration-200 cursor-pointer ${
                  showHeatmap ? 'bg-brand-gold' : 'bg-brand-input/50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full bg-brand-midnight transition-transform duration-200 ${
                  showHeatmap ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Advanced Settings Expandable Header */}
            <div className="pt-2 border-t border-brand-input/35 space-y-2">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full flex items-center justify-between text-brand-text-muted hover:text-white font-extrabold uppercase text-[9px] tracking-wider cursor-pointer"
              >
                <span>{slangMode ? "Réglages Avancés" : "Advanced Map Settings"}</span>
                {showAdvancedSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {/* Advanced Settings Switch list */}
              {showAdvancedSettings && (
                <div className="space-y-2 pt-1.5 pl-0.5 animate-fade-in">
                  {/* Road Names Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] text-brand-text-muted font-bold">
                      {slangMode ? "Noms des routes" : "Road Names"}
                    </span>
                    <button
                      onClick={() => setShowRoadNames(!showRoadNames)}
                      className={`w-7 h-3.5 rounded-full p-0.5 transition-all duration-200 cursor-pointer ${
                        showRoadNames ? 'bg-emerald-500' : 'bg-brand-input/50'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-brand-midnight transition-transform duration-200 ${
                        showRoadNames ? 'translate-x-3.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Building POIs Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] text-brand-text-muted font-bold">
                      {slangMode ? "Monuments / POI" : "Building POIs"}
                    </span>
                    <button
                      onClick={() => setShowBuildingPois(!showBuildingPois)}
                      className={`w-7 h-3.5 rounded-full p-0.5 transition-all duration-200 cursor-pointer ${
                        showBuildingPois ? 'bg-emerald-500' : 'bg-brand-input/50'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-brand-midnight transition-transform duration-200 ${
                        showBuildingPois ? 'translate-x-3.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Public Transit Icons Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] text-brand-text-muted font-bold">
                      {slangMode ? "Icônes de Transport" : "Public Transit Icons"}
                    </span>
                    <button
                      onClick={() => setShowPublicTransit(!showPublicTransit)}
                      className={`w-7 h-3.5 rounded-full p-0.5 transition-all duration-200 cursor-pointer ${
                        showPublicTransit ? 'bg-emerald-500' : 'bg-brand-input/50'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-brand-midnight transition-transform duration-200 ${
                        showPublicTransit ? 'translate-x-3.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating GPS Re-center Viewport Button */}
      <button
        onClick={handleRecenterGPS}
        className="absolute top-[302px] right-[10px] z-[1000] flex flex-col items-center justify-center w-[40px] h-[40px] rounded-full border transition-all duration-200 active:scale-95 cursor-pointer group bg-brand-midnight/95 border-brand-input/60 hover:border-brand-gold/80 text-brand-gold hover:text-white shadow-lg"
        title={slangMode ? "Recentrer sur ma position GPS (Vol fluide)" : "Re-center Map on My GPS (Smooth fly)"}
        id="map-recenter-gps-control"
      >
        <div className="relative">
          <Locate size={14} className={`transition-transform duration-300 group-hover:scale-115 ${isResolving ? 'animate-spin text-brand-gold' : ''}`} />
          {liveCoords && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_4px_#10b981]" />
          )}
        </div>
        <span className="text-[5.5px] font-black tracking-widest mt-0.5 leading-none uppercase font-mono">
          {isResolving ? "Find" : "Gps"}
        </span>
      </button>

      {/* FLOATING LIVE TURN-BY-TURN NAVIGATION HUD */}
      <AnimatePresence mode="wait">
        {role === 'driver' && (status === 'driver_found' || status === 'arriving' || status === 'in_progress') && navInstructions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            className="absolute top-4 left-1/2 z-[1015] w-[90%] max-w-sm"
            id="driver-gps-nav-hud"
          >
            {isNavCompact ? (
              /* COMPACT MINIMIZED NAV BAR (1/3 to 1/2 of full height) */
              <div className={`backdrop-blur text-white rounded-xl shadow-lg py-1.5 px-3 flex items-center gap-2.5 transition-all duration-300 ${
                isTurnClose 
                  ? 'bg-rose-950/95 border-2 border-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                  : 'bg-emerald-600/95 border border-emerald-500/40 shadow-lg'
              }`}>
                {/* Direction Icon Wrapper (Compact scaled) */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-inner ${
                  isTurnClose ? 'bg-rose-800 animate-pulse' : 'bg-white/20'
                }`}>
                  <div className="scale-75 origin-center flex items-center justify-center">
                    {getManeuverIcon(navInstructions[currentStepIndex]?.modifier || navInstructions[currentStepIndex]?.type)}
                  </div>
                </div>

                {/* Condensed Content on a single primary line + smaller instruction text */}
                <div className="flex-1 min-w-0 flex flex-col justify-center leading-none">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black text-white whitespace-nowrap ${isTurnClose ? 'text-rose-200' : ''}`}>
                      {formatDistance(totalDistanceRemaining)}
                    </span>
                    <span className={`${isTurnClose ? 'text-rose-400' : 'text-emerald-300'} font-black text-[10px]`}>•</span>
                    <span className={`text-xs font-black whitespace-nowrap ${isTurnClose ? 'text-rose-300' : 'text-emerald-200'}`}>
                      ETA: {formatDuration(totalDurationRemaining)}
                    </span>
                    {isTurnClose && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-rose-400 px-1.5 py-0.5 rounded bg-rose-950 border border-rose-500/30 animate-pulse shrink-0">
                        {slangMode ? "TOURNER" : "TURN"}
                      </span>
                    )}
                  </div>
                  {/* Secondary smaller instructions text */}
                  <span className={`text-[9.5px] font-semibold truncate leading-snug mt-0.5 transition-all duration-300 ${
                    isTurnClose 
                      ? 'text-rose-100 font-extrabold animate-[pulse_1s_infinite] scale-[1.01]' 
                      : 'text-emerald-100/90 font-medium'
                  }`}>
                    {navInstructions[currentStepIndex]?.instruction}
                  </span>
                </div>

                {/* Action controls (Voice Toggle & Expand Toggle) */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                    title={isVoiceMuted ? "Unmute GPS Voice" : "Mute GPS Voice"}
                  >
                    {isVoiceMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                  <button
                    onClick={() => setIsNavCompact(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                    title="Expand GPS Details"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            ) : (
              /* FULL DETAILED NAVIGATION HUD */
              <div className={`backdrop-blur text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 transition-all duration-300 ${
                isTurnClose 
                  ? 'bg-rose-950/95 border-2 border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' 
                  : 'bg-emerald-600/95 border border-emerald-500/40 shadow-2xl'
              }`}>
                {/* Direction Icon Wrapper */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner transition-colors ${
                  isTurnClose ? 'bg-rose-800 animate-pulse' : 'bg-white/20'
                }`}>
                  {getManeuverIcon(navInstructions[currentStepIndex]?.modifier || navInstructions[currentStepIndex]?.type)}
                </div>
                
                {/* Instruction content */}
                <div className="flex-1 min-w-0">
                  <span className={`text-[9px] uppercase font-black tracking-wider ${isTurnClose ? 'text-rose-300 animate-pulse' : 'text-emerald-200'}`}>
                    {isTurnClose 
                      ? (slangMode ? "⚠️ RESTE MOINS DE 50M !" : "⚠️ LESS THAN 50M TO TURN !") 
                      : (slangMode ? "WANDA GUIDAGE GPS" : "WANDA GPS NAVIGATION")}
                  </span>
                  <h4 className={`text-xs font-black leading-snug truncate transition-all duration-300 ${
                    isTurnClose 
                      ? 'text-rose-100 font-extrabold animate-[pulse_1s_infinite] scale-[1.02]' 
                      : ''
                  }`}>
                    {navInstructions[currentStepIndex]?.instruction}
                  </h4>
                  <p className="text-[10px] font-bold flex items-center gap-1.5 mt-0.5">
                    <span className={isTurnClose ? 'text-rose-200 font-black' : 'text-emerald-100'}>{formatDistance(totalDistanceRemaining)}</span>
                    <span className="opacity-50">•</span>
                    <span className={isTurnClose ? 'text-rose-300' : 'text-emerald-100'}>ETA: {formatDuration(totalDurationRemaining)}</span>
                  </p>
                </div>
                
                {/* Action controls (Voice Toggle & List Toggle & Collapse Toggle) */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                    title={isVoiceMuted ? "Unmute GPS Voice" : "Mute GPS Voice"}
                  >
                    {isVoiceMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <button
                    onClick={() => setShowItinerary(!showItinerary)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                    title="View Full Itinerary"
                  >
                    {showItinerary ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                  <button
                    onClick={() => setIsNavCompact(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                    title="Collapse to Compact View"
                  >
                    <ChevronUp size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Itinerary steps dropdown (Only available when expanded) */}
            {!isNavCompact && showItinerary && (
              <div className="mt-1.5 bg-brand-midnight/95 backdrop-blur border border-brand-card/85 rounded-2xl shadow-2xl p-3 max-h-48 overflow-y-auto space-y-2 text-xs scrollbar-thin">
                <div className="flex justify-between items-center pb-1.5 border-b border-brand-input/40">
                  <span className="font-extrabold text-brand-gold uppercase text-[9px]">Full Route Steps</span>
                  <span className="text-[9px] text-brand-text-muted font-bold">
                    {navInstructions.length} maneuvers
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {navInstructions.map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-2.5 p-1 rounded-lg transition ${
                        idx === currentStepIndex ? 'bg-brand-gold/15 text-brand-gold font-bold' : 'text-brand-text-muted hover:text-white'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getManeuverIconSmall(step.modifier || step.type, idx === currentStepIndex)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="leading-snug text-[11px]">{step.instruction}</p>
                        <p className="text-[9px] opacity-70 mt-0.5">{formatDistance(step.distance)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* CELEBRATORY COMPLETED RIDE MAP BANNER OVERLAY */}
      <AnimatePresence>
        {status === 'completed' && (
          <motion.div
            initial={{ y: -80, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[1020] w-[92%] max-w-sm bg-gradient-to-r from-emerald-950/95 via-brand-midnight/95 to-emerald-950/95 border-2 border-emerald-400/70 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-white flex items-center justify-between gap-3 select-none"
            id="map-completed-celebration-banner"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="absolute inset-0 rounded-full bg-emerald-400/50 blur-sm"
                />
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-300 text-brand-midnight flex items-center justify-center font-black shadow-lg shadow-emerald-500/40 relative z-10">
                  <Check size={22} className="stroke-[3.5]" />
                </div>
              </div>

              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                    {slangMode ? "🎉 COURSE TERMINÉE !" : "🎉 RIDE COMPLETED!"}
                  </span>
                </div>
                <p className="text-xs font-bold text-white truncate">
                  {destination ? destination.name : (slangMode ? "Arrivée à destination !" : "Arrived at destination!")}
                </p>
              </div>
            </div>

            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-lg shrink-0 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-xl"
            >
              🏁
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PASSENGER RIDE STATUS & ETA HUD */}
      {role === 'passenger' && (status === 'driver_found' || status === 'arriving' || status === 'in_progress') && (
        <div 
          ref={etaCardRef}
          onClick={handleToggleEtaCard}
          onMouseEnter={handleCardInteraction}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1015] w-[90%] max-w-sm transition-all duration-300 ease-out cursor-pointer hover:scale-[1.01] active:scale-[0.99] select-none"
          id="passenger-eta-hud"
        >
          <div className={`bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 text-white rounded-2xl shadow-2xl transition-all duration-300 ease-out overflow-hidden ${
            isEtaCardExpanded ? 'p-4' : 'px-3 py-2.5 h-[56px] flex items-center justify-between'
          }`}>
            {!isEtaCardExpanded ? (
              /* COLLAPSED COMPACT SLIM BAR (56px tall) */
              <div className="flex items-center justify-between w-full gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Status Icon with pulsating outer circle */}
                  <div className="w-8 h-8 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center shrink-0 relative">
                    <span className="absolute inset-0 rounded-full bg-brand-gold/10 animate-ping"></span>
                    {status === 'in_progress' ? (
                      <Navigation size={14} className="text-brand-gold rotate-45" />
                    ) : (
                      <Clock size={14} className="text-brand-gold" />
                    )}
                  </div>

                  {/* Status text */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[8px] uppercase font-black text-brand-gold tracking-widest block leading-none mb-0.5">
                      {status === 'in_progress' 
                        ? (slangMode ? "EN ROUTE" : "TRIP ACTIVE")
                        : (status === 'arriving'
                            ? (slangMode ? "ARRIVÉ" : "ARRIVED")
                            : (slangMode ? "CHAUFFEUR EN ROUTE" : "DRIVER EN ROUTE")
                          )
                      }
                    </span>
                    <p className="text-xs font-bold truncate text-white leading-tight">
                      {status === 'driver_found' ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-brand-text-muted font-normal">{slangMode ? "Arrivée dans" : "Pickup in"}</span>
                          <LiveCountdownTimer
                            driverLoc={driverLocation}
                            targetLoc={pickup}
                            etaMinutes={etaMinutes}
                            slangMode={slangMode}
                            size="sm"
                          />
                        </span>
                      ) : (
                        getCollapsedText()
                      )}
                    </p>
                  </div>
                </div>

                {/* Tap to expand chevron indicator */}
                <div className="shrink-0 text-brand-text-muted hover:text-white transition-colors duration-200 p-1">
                  <ChevronDown size={14} />
                </div>
              </div>
            ) : (
              /* EXPANDED DETAILED HUD CARD */
              <div className="w-full space-y-3 animate-fade-in">
                {/* Header block with icon, titles, and close/collapse button */}
                <div className="flex items-start gap-3.5">
                  {/* Status Icon */}
                  <div className="w-10 h-10 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center shrink-0 relative mt-0.5">
                    <span className="absolute inset-0 rounded-full bg-brand-gold/10 animate-ping"></span>
                    {status === 'in_progress' ? (
                      <Navigation size={18} className="text-brand-gold rotate-45" />
                    ) : (
                      <Clock size={18} className="text-brand-gold" />
                    )}
                  </div>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] uppercase font-black text-brand-gold tracking-widest block mb-0.5">
                      {status === 'in_progress' 
                        ? (slangMode ? "📍 EN ROUTE VERS DESTINATION" : "📍 TRACING ROUTE TO DESTINATION")
                        : (slangMode ? "🚖 CHAUFFEUR EN ROUTE" : "🚖 DRIVER HEADING TO YOU")}
                    </span>
                    <h4 className="text-xs font-bold leading-tight text-brand-text-muted">
                      {status === 'in_progress' ? (
                        <>
                          {slangMode ? "Dépôt :" : "Dropoff:"} <span className="text-white font-black">{destination?.name || 'Destination'}</span>
                        </>
                      ) : (
                        <>
                          {slangMode ? "Départ :" : "Pickup:"} <span className="text-white font-black">{pickup?.name || 'My Location'}</span>
                        </>
                      )}
                    </h4>
                    <div className="text-brand-gold font-black text-sm tracking-tight mt-1 flex items-center gap-1.5 font-mono">
                      {status === 'arriving' ? (
                        <span className="text-emerald-400 uppercase font-black animate-pulse text-xs">
                          🎉 {slangMode ? "Le djo est là !" : "Driver is outside !"}
                        </span>
                      ) : currentMetricMode === 'distance' ? (
                        <motion.div 
                          key="hud-distance"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1.5 text-xs text-brand-gold"
                        >
                          <Ruler size={14} className="text-brand-gold shrink-0" />
                          <span>
                            {status === 'in_progress' && destination && driverLocation
                              ? `${(getHaversineDistanceInMeters(driverLocation, destination) / 1000).toFixed(1)} km ${slangMode ? "restant" : "remaining"}`
                              : pickup && driverLocation
                                ? `${(getHaversineDistanceInMeters(driverLocation, pickup) / 1000).toFixed(1)} km ${slangMode ? "restant" : "remaining"}`
                                : `${(totalDistanceRemaining / 1000).toFixed(1)} km remaining`
                            }
                          </span>
                        </motion.div>
                      ) : status === 'in_progress' ? (
                        <motion.div
                          key="hud-time"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1.5 text-xs text-brand-gold"
                        >
                          <Clock size={14} className="text-brand-gold animate-pulse shrink-0" />
                          <span>
                            ⏱️ {etaMinutes === 0.5 ? "Less than 1 minute" : `${etaMinutes} minute${etaMinutes > 1 ? 's' : ''}`} to arrive
                          </span>
                        </motion.div>
                      ) : (
                        <LiveCountdownTimer
                          driverLoc={driverLocation}
                          targetLoc={pickup}
                          etaMinutes={etaMinutes}
                          slangMode={slangMode}
                          size="md"
                          showLabel={true}
                        />
                      )}
                    </div>
                  </div>

                  {/* Collapse button */}
                  <button 
                    onClick={handleToggleEtaCard}
                    className="shrink-0 text-brand-text-muted hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all self-start mt-0.5"
                  >
                    <ChevronUp size={16} />
                  </button>
                </div>

                {/* Visual Segmented Metric Toggle Control */}
                <div 
                  className="pt-2 border-t border-brand-input/30 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[9px] font-black uppercase text-brand-text-muted tracking-wider flex items-center gap-1">
                    {slangMode ? "AFFICHER :" : "DISPLAY MODE:"}
                  </span>
                  <div className="flex bg-brand-deep/90 p-0.5 rounded-lg border border-brand-card/80 relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMetricToggle('time');
                      }}
                      className={`relative px-2.5 py-1 text-[10px] font-extrabold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        currentMetricMode === 'time'
                          ? 'text-brand-midnight font-black'
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                    >
                      {currentMetricMode === 'time' && (
                        <motion.div
                          layoutId="hudMetricPill"
                          className="absolute inset-0 bg-brand-gold rounded-md shadow-sm -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        />
                      )}
                      <Clock size={11} className={currentMetricMode === 'time' ? 'stroke-[2.5]' : ''} />
                      <span>{slangMode ? "Temps Estimé" : "Est. Time"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMetricToggle('distance');
                      }}
                      className={`relative px-2.5 py-1 text-[10px] font-extrabold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                        currentMetricMode === 'distance'
                          ? 'text-brand-midnight font-black'
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                    >
                      {currentMetricMode === 'distance' && (
                        <motion.div
                          layoutId="hudMetricPill"
                          className="absolute inset-0 bg-brand-gold rounded-md shadow-sm -z-10"
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        />
                      )}
                      <Ruler size={11} className={currentMetricMode === 'distance' ? 'stroke-[2.5]' : ''} />
                      <span>{slangMode ? "Distance Estimée" : "Est. Distance"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING TACTICAL TURN-BY-TURN INSTRUCTION CARD (Optional & Interactive) */}
      {navInstructions.length > 0 && (
        <div 
          id="floating-turn-instruction-card" 
          className="absolute top-4 left-4 z-[1010] max-w-xs w-72 transition-all duration-300"
        >
          {isTacticalOverlayMinimized ? (
            /* Minimized coin button */
            <button
              onClick={() => setIsTacticalOverlayMinimized(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 hover:border-brand-gold text-brand-gold shadow-2xl hover:bg-brand-card transition-all duration-200 cursor-pointer active:scale-95 text-xs font-bold"
              title={slangMode ? "Déployer Guide Tactique" : "Expand Tactical Copilot"}
            >
              <Navigation size={14} className="text-brand-gold rotate-45 animate-pulse" />
              <span>{slangMode ? "Prochain Virage" : "Next Turn"}</span>
            </button>
          ) : (
            /* Fully Expanded Co-Pilot HUD Card */
            <div className="bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 rounded-2xl shadow-2xl text-white p-3.5 space-y-3.5 transition-all animate-fade-in relative overflow-hidden">
              {/* Card top banner with amber warning neon glow */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-brand-gold via-yellow-400 to-brand-gold animate-pulse" />
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-black text-brand-gold uppercase tracking-widest text-[9px] flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping" />
                  {slangMode ? "CO-PILOTE TACTIQUE" : "TACTICAL CO-PILOT"}
                </span>
                <button
                  onClick={() => setIsTacticalOverlayMinimized(true)}
                  className="text-brand-text-muted hover:text-white transition p-0.5 rounded hover:bg-white/5 cursor-pointer"
                  title={slangMode ? "Réduire l'overlay" : "Minimize HUD"}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Main Instruction Body */}
              <div className="flex items-start gap-3 bg-brand-input/20 p-2.5 rounded-xl border border-brand-input/30 relative">
                {/* Visual Turn Icon */}
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 shadow-inner">
                  {getManeuverIcon(navInstructions[previewStepIndex !== null ? previewStepIndex : currentStepIndex]?.modifier || navInstructions[previewStepIndex !== null ? previewStepIndex : currentStepIndex]?.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-black text-brand-gold tracking-wider leading-none">
                    {previewStepIndex !== null ? (slangMode ? `ÉTAPE SIMULÉE ${previewStepIndex + 1}/${navInstructions.length}` : `PREVIEWING STEP ${previewStepIndex + 1}/${navInstructions.length}`) : (slangMode ? "VIRAGE IMMINENT" : "NEXT ACTION")}
                  </p>
                  <h4 className="text-[11.5px] font-black leading-snug mt-1 text-white">
                    {navInstructions[previewStepIndex !== null ? previewStepIndex : currentStepIndex]?.instruction}
                  </h4>
                  <p className="text-[10px] text-brand-text-muted font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="text-brand-gold">
                      {formatDistance(navInstructions[previewStepIndex !== null ? previewStepIndex : currentStepIndex]?.distance || 0)}
                    </span>
                    <span>•</span>
                    <span>{formatDuration(navInstructions[previewStepIndex !== null ? previewStepIndex : currentStepIndex]?.duration || 0)}</span>
                  </p>
                </div>
              </div>

              {/* Step Navigation Slider & Control buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[8.5px] text-brand-text-muted font-bold uppercase tracking-wider font-mono">
                  <span>{slangMode ? "Parcours Étapes" : "Route Step Navigator"}</span>
                  <span className="text-brand-gold font-bold">
                    {previewStepIndex !== null ? `${previewStepIndex + 1} / ${navInstructions.length}` : `${currentStepIndex + 1} / ${navInstructions.length}`}
                  </span>
                </div>

                {/* Progress bar representing our position in the steps */}
                <div className="h-1.5 w-full bg-brand-input/40 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-brand-gold transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(255,211,67,0.6)]"
                    style={{
                      width: `${((previewStepIndex !== null ? previewStepIndex : currentStepIndex) + 1) / navInstructions.length * 100}%`
                    }}
                  />
                </div>

                {/* Left/Right controls to browse the route steps */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    disabled={(previewStepIndex !== null ? previewStepIndex : currentStepIndex) === 0}
                    onClick={() => {
                      const currentIdx = previewStepIndex !== null ? previewStepIndex : currentStepIndex;
                      if (currentIdx > 0) {
                        setPreviewStepIndex(currentIdx - 1);
                      }
                    }}
                    className="p-1 rounded-lg border border-brand-input/50 text-brand-text-muted hover:text-white hover:border-brand-gold/60 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer bg-brand-midnight/45"
                    title="Previous maneuver"
                  >
                    <ChevronLeft size={13} />
                    <span className="text-[8.5px] font-bold uppercase pr-1">{slangMode ? "Préc" : "Prev"}</span>
                  </button>

                  {/* Auto-sync / Reset button to jump back to real driver live step */}
                  {previewStepIndex !== null && previewStepIndex !== currentStepIndex && (
                    <button
                      onClick={() => setPreviewStepIndex(null)}
                      className="text-[8.5px] font-black text-brand-gold hover:text-white uppercase px-2 py-0.5 rounded border border-brand-gold/20 hover:border-white transition flex items-center gap-1 cursor-pointer animate-fade-in bg-brand-gold/10"
                      title="Sync back to live position"
                    >
                      <RefreshCw size={9} className="animate-spin-slow" />
                      <span>{slangMode ? "SYNC DIRECT" : "LIVE SYNC"}</span>
                    </button>
                  )}

                  <button
                    disabled={(previewStepIndex !== null ? previewStepIndex : currentStepIndex) === navInstructions.length - 1}
                    onClick={() => {
                      const currentIdx = previewStepIndex !== null ? previewStepIndex : currentStepIndex;
                      if (currentIdx < navInstructions.length - 1) {
                        setPreviewStepIndex(currentIdx + 1);
                      }
                    }}
                    className="p-1 rounded-lg border border-brand-input/50 text-brand-text-muted hover:text-white hover:border-brand-gold/60 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 cursor-pointer bg-brand-midnight/45"
                    title="Next maneuver"
                  >
                    <span className="text-[8.5px] font-bold uppercase pl-1">{slangMode ? "Suiv" : "Next"}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FLOATING INTERACTIVE DEMAND ZONE DETAIL CARD (Real-Time Heatmap Inspector) */}
      <AnimatePresence>
        {selectedZone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="absolute bottom-6 right-4 z-[1025] w-80 max-w-[92vw] bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 rounded-2xl p-4 shadow-2xl text-white space-y-3"
            id="heatmap-zone-modal"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-brand-input/40 pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white">{selectedZone.name}</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-brand-card border border-brand-card/80 text-brand-gold">
                    {selectedZone.city}
                  </span>
                </div>
                <p className="text-[10px] text-brand-text-muted font-bold mt-0.5 flex items-center gap-1">
                  <Flame size={11} className={selectedZone.demandLevel === 'critical' ? 'text-rose-500 animate-pulse' : 'text-amber-400'} />
                  <span>{slangMode ? "Haute Demande (Flux de Réservations Live)" : "Real-Time Demand Heatmap"}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-brand-text-muted hover:text-white p-1 rounded-lg hover:bg-brand-card transition cursor-pointer"
                title="Close"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-brand-input/30 border border-brand-card/60 p-2.5 rounded-xl text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-brand-text-muted block">{slangMode ? "Surge Multiplicateur" : "Surge Multiplier"}</span>
                <span className="text-base font-mono font-black text-brand-gold flex items-center justify-center gap-1">
                  ⚡ {selectedZone.surgeMultiplier}x
                </span>
              </div>

              <div className="bg-brand-input/30 border border-brand-card/60 p-2.5 rounded-xl text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-brand-text-muted block">{slangMode ? "Niveau de Demande" : "Demand Level"}</span>
                <span className={`text-xs font-black uppercase tracking-wider block mt-0.5 ${
                  selectedZone.demandLevel === 'critical' ? 'text-rose-400' : selectedZone.demandLevel === 'high' ? 'text-orange-400' : 'text-amber-300'
                }`}>
                  {selectedZone.demandLevel === 'critical' ? "🔥 CRITIQUE" : selectedZone.demandLevel === 'high' ? "⚡ ÉLEVÉE" : "MODÉRÉE"}
                </span>
              </div>
            </div>

            {/* Live Bookings Feed in Zone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-brand-text-muted font-bold">
                <span>{slangMode ? "Activité Réservations Récentes:" : "Recent Bookings Feed:"}</span>
                <span className="text-brand-gold font-mono">{(selectedZone.matchedBookings || []).length} events</span>
              </div>

              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {(!selectedZone.matchedBookings || selectedZone.matchedBookings.length === 0) ? (
                  <p className="text-[10px] text-brand-text-muted italic py-1">
                    {slangMode ? "Aucune réservation récente détectée." : "No recent booking activity in this area."}
                  </p>
                ) : (
                  selectedZone.matchedBookings.map(b => (
                    <div key={b.id} className="bg-brand-card/50 border border-brand-card/80 p-2 rounded-xl flex items-center justify-between text-[10.5px]">
                      <div>
                        <span className="font-bold text-white block">{b.rideClass}</span>
                        <span className="text-[9px] text-brand-text-muted font-bold">{b.timeAgo} • {b.fare.toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        b.status === 'active' ? 'bg-brand-gold/20 text-brand-gold animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Target Action Button */}
            <button
              onClick={() => {
                if (onSelectZoneTarget) {
                  onSelectZoneTarget(selectedZone);
                }
                if (mapRef.current) {
                  mapRef.current.flyTo(selectedZone.center, 15, { duration: 1.2 });
                }
              }}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
            >
              <Navigation size={13} />
              <span>{slangMode ? "Mettre Cap sur cette Zone" : "Route to High-Demand Area"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
