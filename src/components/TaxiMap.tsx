import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import * as d3 from 'd3';
import { Location, RideStatus } from '../types';
import { Compass, MapPin, Navigation, Locate, Activity, Check, ChevronDown, ChevronUp, RefreshCw, Flame, Info, CornerUpLeft, CornerUpRight, ArrowUp, Volume2, VolumeX, Clock, Layers, Map as MapIcon, Mountain, Globe } from 'lucide-react';
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

function generateFallbackInstructions(driverLoc: { lat: number; lng: number }, pickupLoc: { lat: number; lng: number }): any[] {
  const dLat = pickupLoc.lat - driverLoc.lat;
  const dLng = pickupLoc.lng - driverLoc.lng;
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
      instruction: "Votre passager vous attend droit devant sur votre gauche",
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
  isZoomLocked = false
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

  // Keep refs for markers and polylines to modify them without reloading map
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const liveMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const activeRouteLineRef = useRef<L.Polyline | null>(null);
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
      activeRouteLineRef.current = null;
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
        opacity = 0.08;
        mode = 'clean';
      } else if (zoom >= 13 && zoom <= 15) {
        // Intermediate zoom: Moderate details, major highway labels and landmarks
        opacity = 0.48;
        mode = 'moderate';
      } else {
        // Zoomed in close: Maximum detail with full POIs and street names for fine-grained navigation
        opacity = 1.0;
        mode = 'full';
      }

      if (darkLabelsLayerRef.current) {
        darkLabelsLayerRef.current.setOpacity(showRoadNames ? opacity : 0);
      }
      setMapDetailMode(mode);
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

    const isRideActive = status === 'driver_found' || status === 'arriving' || status === 'in_progress';

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
          className: 'transition-all duration-300'
        }).addTo(map);

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

  }, [demandZones, showHeatmap, pickup, status]);

  // 3b. Render D3 Demand Heatmap dynamic intensity circles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(map as any)._loaded || !map.getContainer()) return;

    const overlayPane = map.getPanes().overlayPane;
    if (!overlayPane) return;

    const isRideActive = status === 'driver_found' || status === 'arriving' || status === 'in_progress';

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
      const isTransit = status === 'driver_found' || status === 'arriving' || status === 'in_progress';
      const destIcon = L.divIcon({
        className: 'custom-pin-dest',
        html: `
          <div class="relative flex items-center justify-center">
            ${isTransit 
              ? `<div class="absolute w-9 h-9 rounded-full bg-[#ffd385]/25 animate-pulse border border-[#ffd385]/40"></div>
                 <div class="absolute w-12 h-12 rounded-full bg-[#ffd385]/10 animate-ping"></div>`
              : `<div class="absolute w-8 h-8 rounded-full bg-[#ffd385]/30 animate-ping"></div>`
            }
            <div class="relative w-7 h-7 rounded-full bg-[#ffd385] border-2 border-white shadow-md flex items-center justify-center text-[#0a081d] font-black text-xs ${isTransit ? 'transit-pulse-gold' : ''}">
              B
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
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

      if (routeLineRef.current && map.hasLayer(routeLineRef.current)) {
        routeLineRef.current.setLatLngs(mainPoints);
      } else {
        routeLineRef.current = L.polyline(mainPoints, {
          color: '#a39bc9', // faded brand-text-muted
          weight: 3,
          opacity: 0.35,
          dashArray: '4, 8',
          lineJoin: 'round'
        }).addTo(map);
      }
    } else {
      if (routeLineRef.current) {
        if (map.hasLayer(routeLineRef.current)) {
          routeLineRef.current.remove();
        }
        routeLineRef.current = null;
      }
    }

    // --- 2. Active Progress/Completed Trail ---
    // (a) In-progress ride: Draws itself from Pickup to Driver's current position
    if (status === 'in_progress' && pickup && driverLocation && isValidCoords(pickup.lat, pickup.lng) && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      const activePoints: L.LatLngExpression[] = [
        [pickup.lat, pickup.lng],
        [driverLocation.lat, driverLocation.lng]
      ];

      if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
        activeRouteLineRef.current.setLatLngs(activePoints);
        activeRouteLineRef.current.setStyle({
          color: '#ffd385', // brand-gold
          weight: 5,
          opacity: 1,
          className: 'route-glow-animate route-flow-animate'
        } as any);
      } else {
        activeRouteLineRef.current = L.polyline(activePoints, {
          color: '#ffd385', // brand-gold
          weight: 5,
          opacity: 1,
          lineJoin: 'round',
          className: 'route-glow-animate route-flow-animate'
        } as any).addTo(map);
      }
    }
    // (b) Driver heading to pickup: Draws itself from Driver's starting point to current Driver position
    else if ((status === 'driver_found' || status === 'arriving') && driverStartLocRef.current && driverLocation && isValidCoords(driverLocation.lat, driverLocation.lng)) {
      const approachTrailPoints: L.LatLngExpression[] = [
        [driverStartLocRef.current.lat, driverStartLocRef.current.lng],
        [driverLocation.lat, driverLocation.lng]
      ];

      if (activeRouteLineRef.current && map.hasLayer(activeRouteLineRef.current)) {
        activeRouteLineRef.current.setLatLngs(approachTrailPoints);
        activeRouteLineRef.current.setStyle({
          color: '#38bdf8', // approach cyan
          weight: 4,
          opacity: 0.9,
          className: 'route-glow-animate-blue'
        } as any);
      } else {
        activeRouteLineRef.current = L.polyline(approachTrailPoints, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.9,
          lineJoin: 'round',
          className: 'route-glow-animate-blue'
        } as any).addTo(map);
      }
    } else {
      if (activeRouteLineRef.current) {
        if (map.hasLayer(activeRouteLineRef.current)) {
          activeRouteLineRef.current.remove();
        }
        activeRouteLineRef.current = null;
      }
    }

    // --- 3. Approach Path Remaining (Driver current position -> Pickup) ---
    if (status === 'driver_found' && driverLocation && pickup && isValidCoords(driverLocation.lat, driverLocation.lng) && isValidCoords(pickup.lat, pickup.lng)) {
      const remainingApproachPoints: L.LatLngExpression[] = [
        [driverLocation.lat, driverLocation.lng],
        [pickup.lat, pickup.lng]
      ];

      if (approachLineRef.current && map.hasLayer(approachLineRef.current)) {
        approachLineRef.current.setLatLngs(remainingApproachPoints);
      } else {
        approachLineRef.current = L.polyline(remainingApproachPoints, {
          color: '#38bdf8',
          weight: 3.5,
          opacity: 0.8,
          lineJoin: 'round',
          className: 'route-dash-animate-blue'
        } as any).addTo(map);
      }
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
    if (status !== 'driver_found' && status !== 'arriving') {
      setNavInstructions([]);
      setCurrentStepIndex(0);
      return;
    }

    if (!pickup || !driverLocation || !isValidCoords(pickup.lat, pickup.lng) || !isValidCoords(driverLocation.lat, driverLocation.lng)) {
      return;
    }

    let isSubscribed = true;

    const fetchOSRMRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${pickup.lng},${pickup.lat}?overview=full&steps=true&geometries=geojson`;
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
            setNavInstructions(generateFallbackInstructions(driverLocation, pickup));
          } else {
            setNavInstructions(steps);
          }

          if (route.geometry && route.geometry.coordinates && mapRef.current) {
            const pathLatLngs = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
            
            if (activeRouteLineRef.current && mapRef.current.hasLayer(activeRouteLineRef.current)) {
              activeRouteLineRef.current.setLatLngs(pathLatLngs as L.LatLngExpression[]);
            } else {
              activeRouteLineRef.current = L.polyline(pathLatLngs as L.LatLngExpression[], {
                color: '#ffd385', // brand-gold
                weight: 5,
                opacity: 1,
                lineJoin: 'round',
                className: 'route-glow-animate route-flow-animate'
              } as any).addTo(mapRef.current);
            }
          }
        } else {
          setNavInstructions(generateFallbackInstructions(driverLocation, pickup));
        }
      } catch (err) {
        console.warn("OSRM API error, using local fallback:", err);
        if (isSubscribed) {
          setNavInstructions(generateFallbackInstructions(driverLocation, pickup));
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
  }, [pickup, status]);

  // Effect 2: Update navigation progress based on driver movement (live state updates)
  useEffect(() => {
    if (!pickup || !driverLocation || !isValidCoords(pickup.lat, pickup.lng) || !isValidCoords(driverLocation.lat, driverLocation.lng)) {
      return;
    }

    if (status !== 'driver_found' && status !== 'arriving') return;

    const distMeters = getHaversineDistanceInMeters(driverLocation, pickup);
    setTotalDistanceRemaining(distMeters);
    setTotalDurationRemaining(Math.round(distMeters / 8.3));

    if (navInstructions.length > 0) {
      // Divide total average distance (1.5 km) dynamically to trace index
      const initialDist = 1500; 
      const ratio = Math.min(1, Math.max(0, distMeters / initialDist));
      const stepIndex = Math.min(
        navInstructions.length - 1,
        Math.floor((1 - ratio) * navInstructions.length)
      );
      
      setCurrentStepIndex(stepIndex);
    }
  }, [driverLocation, pickup, navInstructions, status]);

  // Effect 3: Voice synthesizer voice guide
  useEffect(() => {
    // Disabled as requested: No voice guidance
    return;
  }, [currentStepIndex, isVoiceMuted, navInstructions, slangMode]);

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
      {role === 'driver' && (status === 'driver_found' || status === 'arriving') && navInstructions.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1015] w-[90%] max-w-sm" id="driver-gps-nav-hud">
          {isNavCompact ? (
            /* COMPACT MINIMIZED NAV BAR (1/3 to 1/2 of full height) */
            <div className="bg-emerald-600/95 backdrop-blur border border-emerald-500/40 text-white rounded-xl shadow-lg py-1.5 px-3 flex items-center gap-2.5 animate-fade-in">
              {/* Direction Icon Wrapper (Compact scaled) */}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <div className="scale-75 origin-center flex items-center justify-center">
                  {getManeuverIcon(navInstructions[currentStepIndex]?.modifier || navInstructions[currentStepIndex]?.type)}
                </div>
              </div>

              {/* Condensed Content on a single primary line + smaller instruction text */}
              <div className="flex-1 min-w-0 flex flex-col justify-center leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white whitespace-nowrap">
                    {formatDistance(totalDistanceRemaining)}
                  </span>
                  <span className="text-emerald-300 font-black text-[10px]">•</span>
                  <span className="text-xs font-black text-emerald-200 whitespace-nowrap">
                    ETA: {formatDuration(totalDurationRemaining)}
                  </span>
                </div>
                {/* Secondary smaller instructions text */}
                <span className="text-[9.5px] text-emerald-100/90 font-medium truncate leading-snug mt-0.5">
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
            <div className="bg-emerald-600/95 backdrop-blur border border-emerald-500/40 text-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 animate-fade-in">
              {/* Direction Icon Wrapper */}
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                {getManeuverIcon(navInstructions[currentStepIndex]?.modifier || navInstructions[currentStepIndex]?.type)}
              </div>
              
              {/* Instruction content */}
              <div className="flex-1 min-w-0">
                <span className="text-[9px] uppercase font-black text-emerald-200 tracking-wider">
                  {slangMode ? "WANDA GUIDAGE GPS" : "WANDA GPS NAVIGATION"}
                </span>
                <h4 className="text-xs font-black leading-snug truncate">
                  {navInstructions[currentStepIndex]?.instruction}
                </h4>
                <p className="text-[10px] text-emerald-100 font-bold flex items-center gap-1.5 mt-0.5">
                  <span>{formatDistance(totalDistanceRemaining)}</span>
                  <span className="opacity-50">•</span>
                  <span>ETA: {formatDuration(totalDurationRemaining)}</span>
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
        </div>
      )}

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
                      {getCollapsedText()}
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
                      ) : status === 'in_progress' ? (
                        <span>
                          ⏱️ {etaMinutes === 0.5 ? "Less than 1 minute" : `${etaMinutes} minute${etaMinutes > 1 ? 's' : ''}`} to arrive
                        </span>
                      ) : (
                        <span>
                          ⏱️ {etaMinutes === 0.5 ? "Less than 1 minute" : `${etaMinutes} minute${etaMinutes > 1 ? 's' : ''}`} to you
                        </span>
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

                {/* Extra helper details for passive expanded state */}
                <div className="pt-2 border-t border-brand-input/30 text-[10px] text-brand-text-muted flex justify-between items-center font-semibold">
                  <span>{slangMode ? "Service de course sécurisé" : "Secure Ride Tracking"}</span>
                  <span className="text-[9px] text-brand-gold font-bold px-1.5 py-0.5 rounded bg-brand-gold/10">
                    {slangMode ? "TAP POUR RÉDUIRE" : "TAP TO COLLAPSE"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
