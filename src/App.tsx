import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Bike, 
  Car, 
  Smartphone, 
  CheckCircle, 
  Clock, 
  User, 
  History, 
  DollarSign, 
  Star, 
  Send, 
  MessageSquare, 
  Check, 
  Loader2, 
  TrendingUp,
  CreditCard,
  X,
  Compass,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Bell,
  Sliders,
  Flame,
  LogOut,
  SlidersHorizontal,
  PhoneCall,
  Phone,
  PhoneOff,
  MicOff,
  Volume2,
  Play,
  Share2,
  Copy,
  Download,
  RotateCcw,
  FileText,
  Gift,
  Sparkles,
  Globe,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Ruler,
  Maximize2,
  Minimize2,
  Magnet,
  Layers,
  Gauge,
  Zap,
  Eye,
  Lock,
  Unlock,
  Grid,
  Box,
  WifiOff
} from 'lucide-react';

// Subcomponents
import TaxiMap from './components/TaxiMap';
import MiniatureMap from './components/MiniatureMap';
import PaymentGateway from './components/PaymentGateway';
import InstallPrompt from './components/InstallPrompt';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import AdminLoginModal from './components/AdminLoginModal';
import NoDriverModal from './components/NoDriverModal';
import WalletCard from './components/WalletCard';
import DriverWallet from './components/DriverWallet';
import NotificationDrawer from './components/NotificationDrawer';
import NotificationPushBanner from './components/NotificationPushBanner';
import { callRingtonePlayer } from './utils/callAudio';
import WandaLogo from './components/WandaLogo';
import { LiveCountdownTimer } from './components/LiveCountdownTimer';
import { ParticleExplosion } from './components/ParticleExplosion';
import { getSmartProposals } from './utils/autocomplete';
import { 
  syncWalletToOfflineCache, 
  syncHistoryToOfflineCache, 
  getCachedWalletData, 
  getCachedRideHistory 
} from './utils/offlineCache';
import {
  saveUserToFirestore,
  createRideInFirestore,
  updateRideStatusInFirestore,
  subscribeToActiveRides,
  saveHistoryToFirestore,
  subscribeToHistory,
  saveTransactionToFirestore,
  subscribeToSettings,
  saveSettingsToFirestore,
  subscribeToNotifications,
  sendNotificationToFirestore
} from './lib/firebaseService';
import { generateAndDownloadRideReceipt } from './utils/pdfReceipt';

// Data and helpers
import { 
  LAGOS_LOCATIONS, 
  YAOUNDE_LOCATIONS,
  RIDE_CLASSES, 
  MOCK_DRIVERS, 
  INITIAL_HISTORY, 
  CHAT_PIDGIN_RESPONSES,
  getDistanceKm 
} from './data';
import { 
  UserRole, 
  RideStatus, 
  Location, 
  Driver, 
  RideClass, 
  PaymentMethod, 
  Message, 
  HistoryItem,
  AppNotification
} from './types';

// Create friendly local alias to represent Cameroonian locations cleanly
const DOUALA_LOCATIONS = LAGOS_LOCATIONS;

const getTailwindColorForName = (name: string) => {
  const l = name.toLowerCase();
  if (l.includes('black') || l.includes('noir')) return '#000000';
  if (l.includes('silver') || l.includes('argent') || l.includes('gray') || l.includes('gris')) return '#9CA3AF';
  if (l.includes('yellow') || l.includes('jaune')) return '#EAB308';
  if (l.includes('red') || l.includes('rouge')) return '#EF4444';
  if (l.includes('white') || l.includes('blanc')) return '#FFFFFF';
  if (l.includes('blue') || l.includes('bleu')) return '#3B82F6';
  if (l.includes('green') || l.includes('vert')) return '#10B981';
  return '#EAB308'; // fallback gold
};

export default function App() {
  // 1. Sign-up Onboarding State
  const [user, setUser] = useState<{ name: string; phone: string; role: 'passenger' | 'driver'; slangMode: boolean } | null>(() => {
    const saved = localStorage.getItem('wanda_user');
    return saved ? JSON.parse(saved) : null;
  });

  // 2. Active Role and Terminology State
  const [role, setRole] = useState<UserRole>(user?.role || 'passenger');
  const [slangMode, setSlangMode] = useState<boolean>(user?.slangMode ?? true);
  const [language, setLanguage] = useState<'en' | 'fr'>(() => {
    const saved = localStorage.getItem('wanda_language');
    if (saved === 'en' || saved === 'fr') return saved;
    return (user?.slangMode ?? true) ? 'fr' : 'en';
  });
  const [langDropdownOpen, setLangDropdownOpen] = useState<boolean>(false);

  const changeLanguage = (lang: 'en' | 'fr') => {
    setLanguage(lang);
    const isFr = lang === 'fr';
    setSlangMode(isFr);
    localStorage.setItem('wanda_language', lang);
    if (user) {
      const updatedUser = { ...user, slangMode: isFr };
      setUser(updatedUser);
      localStorage.setItem('wanda_user', JSON.stringify(updatedUser));
    }
  };

  const [activeTab, setActiveTab] = useState<'booking' | 'wallet' | 'history'>('booking');
  const [showTabBalance, setShowTabBalance] = useState<boolean>(false);

  // Adjust active tab of driver
  const [driverActiveTab, setDriverActiveTab] = useState<'orders' | 'wallet'>('orders');

  // 3. Dual Wallet Balances & Shared Transactions (Persistent in Local Storage)
  const [passengerPoints, setPassengerPoints] = useState<number>(() => {
    const saved = localStorage.getItem('wanda_passenger_points');
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return 350; // Credited with 350 Wanda Points initially for testing
  });

  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [ridePointsRedeemed, setRidePointsRedeemed] = useState<number>(0);

  const [passengerWallet, setPassengerWallet] = useState<number>(() => {
    const saved = localStorage.getItem('wanda_passenger_wallet');
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) {
        return parsed < 0 ? Math.abs(parsed) : parsed;
      }
    }
    return 12000; // Credited with 12,000 XAF for testing
  });

  const [driverWallet, setDriverWallet] = useState<number>(() => {
    const saved = localStorage.getItem('wanda_driver_wallet');
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) {
        return parsed < 0 ? Math.abs(parsed) : parsed;
      }
    }
    return 18500; // Credited with 18,500 XAF for testing
  });

  const [transactions, setTransactions] = useState<any[]>(() => {
    const saved = localStorage.getItem('wanda_transactions');
    return saved ? JSON.parse(saved) : [
      {
        id: 'TX-102931',
        type: 'topup',
        amount: 5000,
        phone: user?.phone || '677123456',
        carrier: 'momo_mtn',
        status: 'success',
        date: '2026-07-11 10:24'
      },
      {
        id: 'TX-102932',
        type: 'topup',
        amount: 10000,
        phone: user?.phone || '699345678',
        carrier: 'orange_money',
        status: 'success',
        date: '2026-07-12 04:12'
      }
    ];
  });

  // 4. System/Admin Settings
  const [systemSettings, setSystemSettings] = useState(() => {
    const saved = localStorage.getItem('wanda_system_settings');
    const defaults = {
      commissionRate: 15, // 15% standard commission
      surgeMultiplier: 1.0, // multiplier based on weather/traffic
      minimumWithdrawal: 2000, // minimum amount driver can withdraw
      topupPromoActive: true, // Wallet top-up promo is active by default
      topupPromoRate: 20, // 20% bonus increase when uploading wallet balance as requested
      classRates: {
        okada: { baseFare: 250, perKm: 80 },
        keke: { baseFare: 300, perKm: 100 },
        ecoride: { baseFare: 1500, perKm: 250 },
        comfort: { baseFare: 3000, perKm: 400 },
      }
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...defaults,
          ...parsed,
          classRates: { ...defaults.classRates, ...(parsed.classRates || {}) }
        };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });

  // 5. Driver List State (So Admin can Approve/Decline)
  const [driversList, setDriversList] = useState<any[]>(() => {
    const saved = localStorage.getItem('wanda_drivers_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: 'driver_pending_1',
        name: 'Emmanuel Ebanda',
        phone: '+237 671 22 33 44',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        vehicleModel: 'Toyota Starlet (Yellow Taxi)',
        vehiclePlate: 'LT - 982 - AC',
        approvalStatus: 'pending',
        rating: 4.5,
        vehicleType: 'keke'
      },
      {
        id: 'driver_pending_2',
        name: 'Christian Tchakounté',
        phone: '+237 695 88 77 66',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        vehicleModel: 'Toyota Corolla (Gray)',
        vehiclePlate: 'LT - 104 - CH',
        approvalStatus: 'pending',
        rating: 4.6,
        vehicleType: 'ecoride'
      },
      {
        id: 'driver_1',
        name: 'Jean-Pierre Kamga',
        phone: '+237 677 12 34 56',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        vehicleModel: 'Toyota RAV4 (Black)',
        vehiclePlate: 'LT - 284 - AA',
        approvalStatus: 'approved',
        rating: 4.9,
        vehicleType: 'comfort'
      },
      {
        id: 'driver_2',
        name: 'Dieudonné Tagne',
        phone: '+237 699 34 56 78',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        vehicleModel: 'Hyundai Elantra (Silver)',
        vehiclePlate: 'LT - 491 - BB',
        approvalStatus: 'approved',
        rating: 4.7,
        vehicleType: 'ecoride'
      },
      {
        id: 'driver_3',
        name: 'Alhadji Ousmanou',
        phone: '+237 655 87 65 43',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        vehicleModel: 'Toyota Corolla Yellow (Taxi)',
        vehiclePlate: 'LT - 381 - YY',
        approvalStatus: 'approved',
        rating: 4.8,
        vehicleType: 'keke'
      },
      {
        id: 'driver_4',
        name: 'Fabrice Eto\'o',
        phone: '+237 681 43 21 09',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        vehicleModel: 'Nanfang Moto (Red)',
        vehiclePlate: 'LT - 129 - XX',
        approvalStatus: 'approved',
        rating: 4.6,
        vehicleType: 'okada'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('wanda_drivers_list', JSON.stringify(driversList));
  }, [driversList]);

  // 6. Travel Coordinates and Booking
  const [pickup, setPickup] = useState<Location | null>(YAOUNDE_LOCATIONS[0]);
  const [destination, setDestination] = useState<Location | null>(null);
  // Keyboard-safe smart autocomplete state
  const [searchModalType, setSearchModalType] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ecoride');
  const [isSettingLocationType, setIsSettingLocationType] = useState<'pickup' | 'destination' | null>(null);

  const [currentCity, setCurrentCity] = useState<string>('Yaoundé');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Live simulation of booking activity that drives the heatmap overlay
  const [recentBookings, setRecentBookings] = useState<{
    id: string;
    zoneName: string;
    rideClass: string;
    timeAgo: string;
    status: 'completed' | 'active' | 'cancelled';
    fare: number;
    city: 'Yaoundé' | 'Douala';
  }[]>(() => [
    { id: 'rb1', zoneName: 'Marché Central (Central Market)', rideClass: 'EcoRide', timeAgo: '2m ago', status: 'active', fare: 2400, city: 'Yaoundé' },
    { id: 'rb2', zoneName: 'Bastos Embassy District', rideClass: 'VIP Sedan', timeAgo: '4m ago', status: 'completed', fare: 4800, city: 'Yaoundé' },
    { id: 'rb3', zoneName: 'Mvan Bus Terminal (Gare)', rideClass: 'MotoRide', timeAgo: '7m ago', status: 'completed', fare: 1200, city: 'Yaoundé' },
    { id: 'rb4', zoneName: 'Ndokoti Junction (Carrefour)', rideClass: 'EcoRide', timeAgo: '1m ago', status: 'active', fare: 1800, city: 'Douala' },
    { id: 'rb5', zoneName: 'Akwa Palace & Blvd de la Liberté', rideClass: 'VIP Sedan', timeAgo: '5m ago', status: 'completed', fare: 5200, city: 'Douala' },
    { id: 'rb6', zoneName: 'Deido Roundabout (Rond-point)', rideClass: 'Okada Express', timeAgo: '9m ago', status: 'cancelled', fare: 800, city: 'Douala' }
  ]);

  // Dynamic city presets based on currentCity rather than crude distance calculation
  const activeCityLocations = React.useMemo(() => {
    if (currentCity.toLowerCase().includes('douala')) {
      return DOUALA_LOCATIONS;
    }
    return YAOUNDE_LOCATIONS;
  }, [currentCity]);

  // Maintain currentCity in sync when preset locations are picked or updated
  useEffect(() => {
    if (!pickup) return;
    const inYaounde = YAOUNDE_LOCATIONS.some(loc => loc.name === pickup.name || (Math.abs(loc.lat - pickup.lat) < 0.005 && Math.abs(loc.lng - pickup.lng) < 0.005));
    if (inYaounde) {
      setCurrentCity('Yaoundé');
    } else {
      const inDouala = DOUALA_LOCATIONS.some(loc => loc.name === pickup.name || (Math.abs(loc.lat - pickup.lat) < 0.005 && Math.abs(loc.lng - pickup.lng) < 0.005));
      if (inDouala) {
        setCurrentCity('Douala');
      }
    }
  }, [pickup]);

  // Simulate incoming background bookings to keep the demand feed fully alive and dynamic
  useEffect(() => {
    const interval = setInterval(() => {
      const cities: ('Yaoundé' | 'Douala')[] = ['Yaoundé', 'Douala'];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      
      const yaoundeZones = [
        'Bastos Embassy District',
        'Marché Central (Central Market)',
        'Poste Centrale & Blvd 20 Mai',
        'Ngoa-Ekelle University Area',
        'Mvan Bus Terminal (Gare)',
        'Omnisports Stadium Area',
        'Mokolo Market (Marché Mokolo)'
      ];
      const doualaZones = [
        'Akwa Palace & Blvd de la Liberté',
        'Bonanjo Administrative Center',
        'Deido Roundabout (Rond-point)',
        'Ndokoti Junction (Carrefour)',
        'Bonamoussadi Market (Marché)',
        'Douala Grand Mall & Airport Zone',
        'Logbessou Campus Area'
      ];
      
      const zoneList = randomCity === 'Yaoundé' ? yaoundeZones : doualaZones;
      const randomZone = zoneList[Math.floor(Math.random() * zoneList.length)];
      const classes = ['EcoRide', 'VIP Sedan', 'MotoRide', 'Okada Express'];
      const randomClass = classes[Math.floor(Math.random() * classes.length)];
      const statuses: ('completed' | 'active' | 'cancelled')[] = ['completed', 'active', 'completed', 'cancelled'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const fares = [1200, 1500, 2200, 3100, 4500, 800, 1800];
      const randomFare = fares[Math.floor(Math.random() * fares.length)];
      
      const newBooking = {
        id: `rb_sim_${Date.now()}`,
        zoneName: randomZone,
        rideClass: randomClass,
        timeAgo: 'Just now',
        status: randomStatus,
        fare: randomFare,
        city: randomCity
      };
      
      setRecentBookings(prev => {
        // Update old 'Just now' to '1m ago', etc.
        const updated = prev.map(b => {
          if (b.timeAgo === 'Just now') return { ...b, timeAgo: '1m ago' };
          if (b.timeAgo.endsWith('m ago')) {
            const mins = parseInt(b.timeAgo) + 1;
            return { ...b, timeAgo: `${mins}m ago` };
          }
          return b;
        });
        return [newBooking, ...updated].slice(0, 12);
      });
    }, 12000);
    
    return () => clearInterval(interval);
  }, []);

  // 7. Booking Status and Simulation Engines
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(3);
  const [etaStatusText, setEtaStatusText] = useState<string>('');
  const [summaryMetricMode, setSummaryMetricMode] = useState<'time' | 'distance'>('time');
  const [isProgressExpanded, setIsProgressExpanded] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet'); // defaults to wallet as requested!
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [pendingTopUpAmount, setPendingTopUpAmount] = useState<number>(0);
  const [pendingTopUpMethod, setPendingTopUpMethod] = useState<'momo_mtn' | 'orange_money'>('momo_mtn');

  // 8. Live Chat and Receipts
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [driverChatInput, setDriverChatInput] = useState('');
  
  // In-App Calling States
  const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming' | 'active'>('idle');
  const [callSender, setCallSender] = useState<'passenger' | 'driver'>('passenger');
  const [callDuration, setCallDuration] = useState(0);
  const [showCallDropdown, setShowCallDropdown] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [userPraise, setUserPraise] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);

  // 11. Waiting Time Tracking
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [currentRideWaitingTime, setCurrentRideWaitingTime] = useState<number>(0);
  const [currentRideWaitingFare, setCurrentRideWaitingFare] = useState<number>(0);
  const [waitingLogs, setWaitingLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('wanda_waiting_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // 9. Modals triggers
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [isAdminPage, setIsAdminPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      return params.get('page') === 'admin' || params.get('admin') === 'true' || path.endsWith('/admin') || path.includes('/admin');
    }
    return false;
  });
  const [showSOS, setShowSOS] = useState(false);
  const [sosAlertTriggered, setSosAlertTriggered] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);

  // Notification Push States
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [pushBannerNotif, setPushBannerNotif] = useState<AppNotification | null>(null);

  // Subscribe to real-time Firestore notifications
  useEffect(() => {
    const unsubscribeNotifs = subscribeToNotifications((rawNotifs) => {
      const filtered = rawNotifs.filter(n => n.target === 'all' || n.target === role);
      setAppNotifications(filtered);

      if (filtered.length > 0) {
        const newest = filtered[0];
        const lastSeen = localStorage.getItem('wanda_last_seen_notif_id');
        if (lastSeen !== newest.id) {
          setPushBannerNotif(newest);
        }
      }
    });
    return () => {
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, [role]);

  // No Driver Available Modal state
  const [showNoDriverModal, setShowNoDriverModal] = useState(false);
  const [noDriverRequestedClassId, setNoDriverRequestedClassId] = useState<string>('okada');

  // Share My Ride States
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState<boolean>(true); // Always display publicity
  const [shareRideData, setShareRideData] = useState<{
    shareRideId: string;
    passengerName: string;
    driverName: string;
    pickupName: string;
    destName: string;
    pickupLat: number;
    pickupLng: number;
    destLat: number;
    destLng: number;
    driverLat: number;
    driverLng: number;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleType: string;
    status: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate unique live-tracking share link securely
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !pickup || !destination) return '';
    const params = new URLSearchParams();
    params.set('shareRide', `ride_${Date.now()}`);
    params.set('passengerName', user?.name || 'Rider');
    
    if (activeDriver) {
      params.set('driverName', activeDriver.name);
      params.set('vehiclePlate', activeDriver.vehiclePlate);
      params.set('vehicleModel', activeDriver.vehicleModel);
      params.set('vehicleType', activeDriver.vehicleType);
    } else {
      params.set('driverName', slangMode ? 'Recherche d\'un djo...' : 'Finding a driver...');
      params.set('vehiclePlate', 'WANDA-VIP');
      params.set('vehicleModel', 'Toyota Camry');
      params.set('vehicleType', 'ecoride');
    }
    
    params.set('pickupName', pickup.name);
    params.set('pickupLat', pickup.lat.toString());
    params.set('pickupLng', pickup.lng.toString());
    params.set('destName', destination.name);
    params.set('destLat', destination.lat.toString());
    params.set('destLng', destination.lng.toString());
    
    const dLoc = driverLoc || pickup;
    params.set('driverLat', dLoc.lat.toString());
    params.set('driverLng', dLoc.lng.toString());
    params.set('status', rideStatus);
    
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [pickup, destination, user, activeDriver, driverLoc, rideStatus, slangMode]);

  const [liveDriverLoc, setLiveDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [liveStatus, setLiveStatus] = useState<RideStatus>('idle');

  // Geolocation States and Robust Trigger Function
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const geolocateCurrentPosition = (onSuccess?: (loc: Location) => void) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const errMsg = slangMode 
        ? "Désolé, ton appareil ne supporte pas la géolocalisation GPS." 
        : "Sorry, your device does not support GPS geolocation.";
      setGeolocationError(errMsg);
      alert(errMsg);
      return;
    }

    setIsGeolocating(true);
    setGeolocationError(null);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const handleSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const newLoc: Location = {
        name: slangMode ? "📍 Position GPS Actuelle" : "📍 Current GPS Location",
        lat: latitude,
        lng: longitude
      };
      
      setPickup(newLoc);
      setIsGeolocating(false);

      console.log("Standing position successfully geolocated to:", latitude, longitude);

      // Resolve city name
      let detectedCity = '';
      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';
      if (apiKey) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            for (const result of data.results) {
              const locality = result.address_components?.find((comp: any) => 
                comp.types?.includes('locality')
              );
              if (locality) {
                detectedCity = locality.long_name;
                break;
              }
              const adminArea1 = result.address_components?.find((comp: any) => 
                comp.types?.includes('administrative_area_level_1')
              );
              if (adminArea1) {
                detectedCity = adminArea1.long_name;
                break;
              }
            }
          }
        } catch (err) {
          console.warn("Google Maps Geocoding failed:", err);
        }
      }

      if (!detectedCity) {
        try {
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'WandaTaxiApplet/1.0'
            }
          });
          const fallbackData = await fallbackRes.json();
          detectedCity = fallbackData.address?.city || fallbackData.address?.town || fallbackData.address?.village || fallbackData.address?.county || '';
        } catch (err) {
          console.warn("OSM Nominatim reverse geocode failed:", err);
        }
      }

      if (!detectedCity) {
        const distToDouala = getDistanceKm(latitude, longitude, 4.05, 9.7);
        const distToYaounde = getDistanceKm(latitude, longitude, 3.86, 11.52);
        detectedCity = distToYaounde < distToDouala ? 'Yaoundé' : 'Douala';
      }

      if (detectedCity) {
        const cleanCity = detectedCity.toLowerCase().includes('douala') ? 'Douala' : 'Yaoundé';
        setCurrentCity(cleanCity);
      }

      if (onSuccess) {
        onSuccess(newLoc);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("High-accuracy standing geolocation failed, attempting robust low-accuracy fallback...", error);
      
      // Fallback with enableHighAccuracy = false and longer timeout
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (fallbackError) => {
          setIsGeolocating(false);
          const errMsg = slangMode 
            ? "Massa! Impossible d'obtenir ton GPS. S'il te plaît, autorise l'accès à la localisation dans ton navigateur." 
            : "Massa! Could not retrieve your current standing position. Please allow location access in your browser settings.";
          setGeolocationError(errMsg);
          alert(errMsg);
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
  };

  // Query Param Check on Load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shareRide = params.get('shareRide');
      if (shareRide) {
        const pLat = parseFloat(params.get('pickupLat') || '3.8640');
        const pLng = parseFloat(params.get('pickupLng') || '11.5205');
        const dLat = parseFloat(params.get('destLat') || '3.8640');
        const dLng = parseFloat(params.get('destLng') || '11.5205');
        const drLat = parseFloat(params.get('driverLat') || '3.8640');
        const drLng = parseFloat(params.get('driverLng') || '11.5205');
        const sStatus = (params.get('status') || 'in_progress') as RideStatus;

        setShareRideData({
          shareRideId: shareRide,
          passengerName: params.get('passengerName') || 'Passenger',
          driverName: params.get('driverName') || 'Driver',
          pickupName: params.get('pickupName') || 'Pickup Point',
          destName: params.get('destName') || 'Destination',
          pickupLat: pLat,
          pickupLng: pLng,
          destLat: dLat,
          destLng: dLng,
          driverLat: drLat,
          driverLng: drLng,
          vehiclePlate: params.get('vehiclePlate') || 'LT - 000 - XX',
          vehicleModel: params.get('vehicleModel') || 'Toyota Sedan',
          vehicleType: params.get('vehicleType') || 'ecoride',
          status: sStatus,
        });

        setLiveDriverLoc({ lat: drLat, lng: drLng });
        setLiveStatus(sStatus);
      }
    }
  }, []);

  // Simulating live tracking for shared view
  useEffect(() => {
    if (!shareRideData || !liveDriverLoc) return;
    if (liveStatus === 'completed') return;

    const interval = setInterval(() => {
      const isHeadingToPickup = (liveStatus === 'driver_found' || liveStatus === 'arriving');
      const targetLat = isHeadingToPickup ? shareRideData.pickupLat : shareRideData.destLat;
      const targetLng = isHeadingToPickup ? shareRideData.pickupLng : shareRideData.destLng;

      const dLat = targetLat - liveDriverLoc.lat;
      const dLng = targetLng - liveDriverLoc.lng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      if (distance < 0.00015) {
        if (isHeadingToPickup) {
          setLiveStatus('in_progress');
          setLiveDriverLoc({ lat: shareRideData.pickupLat, lng: shareRideData.pickupLng });
        } else {
          setLiveStatus('completed');
          setLiveDriverLoc({ lat: shareRideData.destLat, lng: shareRideData.destLng });
          clearInterval(interval);
        }
      } else {
        const step = 0.02;
        setLiveDriverLoc(prev => {
          if (!prev) return null;
          return {
            lat: prev.lat + dLat * step,
            lng: prev.lng + dLng * step
          };
        });
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [shareRideData, liveStatus, liveDriverLoc]);

  // 10. Local Storage Saved Ride History
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('wanda_ride_history');
    return saved ? JSON.parse(saved) : INITIAL_HISTORY;
  });
  const [historySortOrder, setHistorySortOrder] = useState<'recent' | 'oldest'>('recent');

  // Online / Offline Service Worker tracking
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache sync check on boot
    getCachedWalletData().then(cachedWallet => {
      if (cachedWallet && !localStorage.getItem('wanda_passenger_wallet')) {
        setPassengerWallet(cachedWallet.passengerWallet);
        setDriverWallet(cachedWallet.driverWallet);
      }
    });

    getCachedRideHistory().then(cachedHist => {
      if (cachedHist && cachedHist.history?.length > 0 && !localStorage.getItem('wanda_ride_history')) {
        setHistory(cachedHist.history);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Synchronize passengerWallet, driverWallet, and history to Service Worker offline cache
  useEffect(() => {
    syncWalletToOfflineCache(passengerWallet, driverWallet);
  }, [passengerWallet, driverWallet]);

  useEffect(() => {
    syncHistoryToOfflineCache(history);
  }, [history]);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [isMapTilted, setIsMapTilted] = useState<boolean | 'flat' | 'isometric' | 'tilted'>(false);
  const [mapZoom, setMapZoom] = useState<number>(12);
  const [showMapGrid, setShowMapGrid] = useState<boolean>(() => {
    const saved = localStorage.getItem('wanda_show_map_grid');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('wanda_show_map_grid', showMapGrid.toString());
  }, [showMapGrid]);
  const [isAutoPitchEnabled, setIsAutoPitchEnabled] = useState(false);
  const [isZoomLocked, setIsZoomLocked] = useState(false);

  // Auto-Pitch Lock Effect: Toggles 3D/2D views automatically based on speed/transit zones
  useEffect(() => {
    if (!isAutoPitchEnabled) return;

    if (rideStatus === 'driver_found' && driverLoc && pickup) {
      const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, pickup.lat, pickup.lng);
      // High-speed transit if far from pickup
      if (remaining > 0.6) {
        setIsMapTilted(true);
      } else {
        setIsMapTilted(false);
      }
    } else if (rideStatus === 'in_progress' && driverLoc && destination) {
      const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng);
      // High-speed transit if far from destination
      if (remaining > 0.6) {
        setIsMapTilted(true);
      } else {
        setIsMapTilted(false);
      }
    } else if (rideStatus === 'arriving' || rideStatus === 'completed' || rideStatus === 'idle') {
      // Return to flat 2D map view when arrived/parked/idle
      setIsMapTilted(false);
    }
  }, [isAutoPitchEnabled, rideStatus, driverLoc, pickup, destination]);

  // Automatically project/tilt map when driver is about to pick up passenger
  useEffect(() => {
    if (role === 'driver') {
      if (rideStatus === 'driver_found' && driverLoc && pickup) {
        const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, pickup.lat, pickup.lng);
        if (remaining <= 0.8) {
          setIsMapTilted('tilted');
        }
      } else if (rideStatus === 'arriving') {
        setIsMapTilted('tilted');
      }
    }
  }, [role, rideStatus, driverLoc, pickup]);

  // When active driver starts ride (in_progress), dominate interface with map and navigation
  useEffect(() => {
    if (role === 'driver' && rideStatus === 'in_progress') {
      setIsMapFullscreen(true);
      setIsMapTilted('tilted');
    }
  }, [role, rideStatus]);

  // Compass states and effects
  const [compassHeading, setCompassHeading] = useState(0);
  const [continuousHeading, setContinuousHeading] = useState(0);
  const [isUsingDeviceOrientation, setIsUsingDeviceOrientation] = useState(false);
  const [compassLockMode, setCompassLockMode] = useState<'north' | 'bearing' | 'device' | 'magnetic'>('north');
  const [isCompassExpanded, setIsCompassExpanded] = useState(false);

  // Shortest path angle unwrapping to prevent sudden 360-degree backwards spins
  const getShortestDelta = (target: number, current: number) => {
    let delta = (target - current) % 360;
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    return delta;
  };

  useEffect(() => {
    setContinuousHeading(prev => prev + getShortestDelta(compassHeading, prev));
  }, [compassHeading]);

  // Request device orientation permission for WebKit/iOS clients
  const requestDeviceOrientationPermission = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        if (permissionState === 'granted') {
          setIsUsingDeviceOrientation(true);
        } else {
          console.warn("DeviceOrientation permission denied.");
        }
      } catch (error) {
        console.error("Error requesting DeviceOrientation permission:", error);
      }
    }
  };

  // Auto-dismiss timer for compass expanded view
  const compassTimeoutRef = useRef<any>(null);

  const startCompassCollapseTimer = () => {
    if (compassTimeoutRef.current) {
      clearTimeout(compassTimeoutRef.current);
    }
    compassTimeoutRef.current = setTimeout(() => {
      setIsCompassExpanded(false);
    }, 5000); // 5 seconds auto-dismiss
  };

  const handleCompassToggle = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsCompassExpanded(prev => {
      const next = !prev;
      if (next) {
        startCompassCollapseTimer();
      } else {
        if (compassTimeoutRef.current) {
          clearTimeout(compassTimeoutRef.current);
        }
      }
      return next;
    });
  };

  const handleCompassInteraction = () => {
    if (isCompassExpanded) {
      startCompassCollapseTimer();
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (compassTimeoutRef.current) {
        clearTimeout(compassTimeoutRef.current);
      }
    };
  }, []);

  // Magnetometer calibration and precision states
  const [isMagnetometerSupported, setIsMagnetometerSupported] = useState(false);
  const [magnetometerAccuracy, setMagnetometerAccuracy] = useState<'low' | 'medium' | 'high' | 'unknown'>('unknown');
  const [magHeading, setMagHeading] = useState<number | null>(null);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [isMagnetometerCalibrated, setIsMagnetometerCalibrated] = useState(false);
  const calibrationIntervalRef = useRef<any>(null);

  // Helper to calculate geographical bearing/heading from coordinate A to coordinate B
  const getBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const rLat1 = lat1 * Math.PI / 180;
    const rLat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(rLat2);
    const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  };

  // Sync compass heading with travel bearing when locked to travel direction
  useEffect(() => {
    if (rideStatus === 'in_progress' && driverLoc && destination && compassLockMode === 'bearing') {
      const bearing = getBearing(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng);
      setCompassHeading(Math.round(bearing));
    }
  }, [rideStatus, driverLoc, destination, compassLockMode]);

  // Listen to device orientation changes
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let headingVal = null;
      if ('webkitCompassHeading' in e) {
        headingVal = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null) {
        headingVal = 360 - e.alpha;
      }
      
      if (headingVal !== null && headingVal !== undefined) {
        setIsUsingDeviceOrientation(true);
        if (compassLockMode === 'device') {
          setCompassHeading(Math.round(headingVal));
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('deviceorientationabsolute', handleOrientation);
    };
  }, [compassLockMode]);

  // W3C Sensor API Magnetometer integration & fallback
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasPhysicalSupport = 'Magnetometer' in window || 'AbsoluteOrientationSensor' in window;
    setIsMagnetometerSupported(hasPhysicalSupport);

    if (compassLockMode !== 'magnetic') return;

    let sensor: any = null;
    let fallbackInterval: any = null;

    if (hasPhysicalSupport && 'Magnetometer' in window) {
      try {
        sensor = new (window as any).Magnetometer({ frequency: 10 });
        
        sensor.addEventListener('reading', () => {
          const x = sensor.x || 0;
          const y = sensor.y || 0;
          const z = sensor.z || 0;

          // Standard heading calculation from X and Y components of magnetic field
          let rawHeading = Math.atan2(y, x) * (180 / Math.PI);
          rawHeading = (rawHeading + 360) % 360;
          setMagHeading(Math.round(rawHeading));

          // Combine with calibration offset
          const correctedHeading = Math.round((rawHeading + calibrationOffset + 360) % 360);
          setCompassHeading(correctedHeading);

          // Estimate accuracy based on magnetic intensity vector length (standard field is 25-65 uT)
          const fieldStrength = Math.sqrt(x*x + y*y + z*z);
          if (isMagnetometerCalibrated) {
            setMagnetometerAccuracy('high');
          } else if (fieldStrength < 20 || fieldStrength > 80) {
            setMagnetometerAccuracy('low');
          } else {
            setMagnetometerAccuracy('medium');
          }
        });

        sensor.addEventListener('error', (e: any) => {
          console.warn("W3C Magnetometer Sensor error, falling back to simulated high-precision sensor:", e.error);
          startFallbackSensor();
        });

        sensor.start();
      } catch (err) {
        console.warn("W3C Magnetometer init failed, starting high-precision simulated magnetometer:", err);
        startFallbackSensor();
      }
    } else {
      // Fallback for systems/browsers without physical Magnetometer API
      startFallbackSensor();
    }

    function startFallbackSensor() {
      // High-precision simulation of geomagnetic fields with realistic micro-fluctuations (magnetic noise)
      let currentBaseHeading = 45; // default base North direction
      fallbackInterval = setInterval(() => {
        // Introduce small micro-fluctuations (0.1 to 0.4 degrees) simulating real magnetometer drift
        const fluctuation = (Math.random() - 0.5) * 0.8;
        currentBaseHeading = (currentBaseHeading + fluctuation + 360) % 360;
        
        setMagHeading(Math.round(currentBaseHeading));
        const correctedHeading = Math.round((currentBaseHeading + calibrationOffset + 360) % 360);
        setCompassHeading(correctedHeading);

        if (!isMagnetometerCalibrated) {
          setMagnetometerAccuracy('medium');
        } else {
          setMagnetometerAccuracy('high');
        }
      }, 150);
    }

    return () => {
      if (sensor) {
        try {
          sensor.stop();
        } catch (e) {}
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [compassLockMode, calibrationOffset, isMagnetometerCalibrated]);

  // Magnetometer figure-8 calibration flow
  const handleMagnetometerCalibration = () => {
    if (calibrationIntervalRef.current) {
      clearInterval(calibrationIntervalRef.current);
    }
    if (compassTimeoutRef.current) {
      clearTimeout(compassTimeoutRef.current);
    }
    setIsCalibrating(true);
    setCalibrationProgress(0);
    setMagnetometerAccuracy('low');

    const interval = setInterval(() => {
      setCalibrationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          calibrationIntervalRef.current = null;
          setIsCalibrating(false);
          setIsMagnetometerCalibrated(true);
          setMagnetometerAccuracy('high');
          // Set a random but stable geomagnetic calibration offset (e.g. -12 to 15 degrees)
          // to align simulated heading with geographical True North
          setCalibrationOffset(prevOffset => prevOffset + Math.round((Math.random() - 0.5) * 30));
          startCompassCollapseTimer();
          return 100;
        }
        return prev + 10;
      });
    }, 400); // 4 seconds total calibration procedure
    calibrationIntervalRef.current = interval;
  };

  const handleCancelCalibration = () => {
    if (calibrationIntervalRef.current) {
      clearInterval(calibrationIntervalRef.current);
      calibrationIntervalRef.current = null;
    }
    setIsCalibrating(false);
    setCalibrationProgress(0);
    startCompassCollapseTimer();
  };

  useEffect(() => {
    return () => {
      if (calibrationIntervalRef.current) {
        clearInterval(calibrationIntervalRef.current);
      }
    };
  }, []);

  // Auto-geolocate on mount to align with the user's physical live location (e.g., Yaounde/Douala)
  useEffect(() => {
    // Attempt automatic background geolocation of current standing position
    if (typeof window !== 'undefined' && navigator.geolocation) {
      geolocateCurrentPosition();
    }
  }, []);

  // 11. Driver Mode specific states
  const [driverOnline, setDriverOnline] = useState(false);
  const [driverStats, setDriverStats] = useState({
    earnings: 28000,
    trips: 18,
    rating: 4.8
  });
  const [driverRideRequest, setDriverRideRequest] = useState<{
    id: string;
    passengerName: string;
    pickupName: string;
    destName: string;
    pickupLat: number;
    pickupLng: number;
    destLat: number;
    destLng: number;
    fare: number;
    payment: PaymentMethod;
  } | null>(null);

  const [requestCountdown, setRequestCountdown] = useState(15);
  const previewMapRef = useRef<L.Map | null>(null);

  // Persistence side effects
  useEffect(() => {
    localStorage.setItem('wanda_passenger_wallet', passengerWallet.toString());
  }, [passengerWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_passenger_points', passengerPoints.toString());
  }, [passengerPoints]);

  useEffect(() => {
    localStorage.setItem('wanda_driver_wallet', driverWallet.toString());
  }, [driverWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wanda_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  // Subscribe to real-time pricing and rates from Firestore settings collection
  useEffect(() => {
    const unsubscribeSettings = subscribeToSettings((firestoreData) => {
      if (firestoreData) {
        setSystemSettings(prev => ({
          ...prev,
          ...firestoreData,
          classRates: {
            ...prev.classRates,
            ...(firestoreData.classRates || {})
          }
        }));
      }
    });
    return () => {
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wanda_waiting_logs', JSON.stringify(waitingLogs));
  }, [waitingLogs]);

  // Real-time Firestore live synchronization
  useEffect(() => {
    if (!user) return;
    const userId = user.phone ? user.phone.replace(/[^0-9]/g, '') : 'guest_user';
    const unsubscribeHistory = subscribeToHistory(userId, (firestoreHistory) => {
      if (firestoreHistory && firestoreHistory.length > 0) {
        setHistory(prev => {
          const ids = new Set(prev.map(h => h.id));
          const newItems = firestoreHistory.filter(h => !ids.has(h.id));
          return [...newItems, ...prev];
        });
      }
    });

    const unsubscribeRides = subscribeToActiveRides((activeRides) => {
      // Live cloud database ride updates
    });

    return () => {
      unsubscribeHistory();
      unsubscribeRides();
    };
  }, [user]);

  // Call Duration & Ringing Simulation
  useEffect(() => {
    let interval: any = null;
    if (callState === 'active') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Real Web Audio Ringtone & Vibration effect for in-app calls
  useEffect(() => {
    if (callState === 'incoming') {
      callRingtonePlayer.startIncomingRingtone();
    } else if (callState === 'outgoing') {
      callRingtonePlayer.startOutgoingRingback();
    } else if (callState === 'active') {
      callRingtonePlayer.playConnectTone();
    } else {
      callRingtonePlayer.stop();
    }

    return () => {
      callRingtonePlayer.stop();
    };
  }, [callState]);

  useEffect(() => {
    let timeout: any = null;
    if (callState === 'outgoing') {
      // Simulate answer after 2.5 seconds
      timeout = setTimeout(() => {
        setCallState('active');
      }, 2500);
    }
    return () => clearTimeout(timeout);
  }, [callState]);

  // Waiting Time Effect
  useEffect(() => {
    if (rideStatus !== 'arriving') {
      // If we transition away from arriving, save the stats to the log if we have some waitingTime
      if (waitingTime > 0) {
        const gracePeriod = 10;
        const ratePerSecond = 100;
        const billableSeconds = Math.max(0, waitingTime - gracePeriod);
        const extraFare = billableSeconds * ratePerSecond;

        const newLog = {
          id: `WAIT-${Math.floor(100000 + Math.random() * 900000)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          durationSeconds: waitingTime,
          pickupName: pickup?.name || (slangMode ? 'Lieu de ramassage' : 'Pickup Point'),
          extraFare: extraFare,
          driverName: activeDriver?.name || 'Driver'
        };

        setWaitingLogs(prev => [newLog, ...prev]);
        setCurrentRideWaitingTime(waitingTime);
        setCurrentRideWaitingFare(extraFare);
      }
      return;
    }

    // When rideStatus becomes 'arriving', start from 0
    setWaitingTime(0);
    setCurrentRideWaitingTime(0);
    setCurrentRideWaitingFare(0);

    const intervalId = setInterval(() => {
      setWaitingTime(prev => {
        const newTime = prev + 1;
        const gracePeriod = 10;
        const ratePerSecond = 100;
        const billableSeconds = Math.max(0, newTime - gracePeriod);
        const extraFare = billableSeconds * ratePerSecond;

        // Keep current ride state updated live
        setCurrentRideWaitingTime(newTime);
        setCurrentRideWaitingFare(extraFare);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [rideStatus, pickup, activeDriver]);

  const startInAppCall = (sender: 'passenger' | 'driver') => {
    setCallSender(sender);
    setCallState('outgoing');
    setIsMuted(false);
    setIsSpeaker(false);
    setShowCallDropdown(false);
  };

  const receiveInAppCall = (sender: 'passenger' | 'driver') => {
    setCallSender(sender);
    setCallState('incoming');
    setIsMuted(false);
    setIsSpeaker(false);
    setShowCallDropdown(false);
  };

  const answerInAppCall = () => {
    setCallState('active');
  };

  const declineInAppCall = () => {
    callRingtonePlayer.stop();
    setCallState('idle');
  };

  const endInAppCall = () => {
    callRingtonePlayer.stop();
    setCallState('idle');
  };

  // Handle Signup Completions from Landing Page
  const handleSignupComplete = (userData: { 
    name: string; 
    phone: string; 
    role: 'passenger' | 'driver'; 
    slangMode: boolean;
    vehicleType?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    vehiclePlate?: string;
  }) => {
    setUser(userData);
    setRole(userData.role);
    setSlangMode(userData.slangMode);
    localStorage.setItem('wanda_user', JSON.stringify(userData));

    // Save to Firestore real backend database
    saveUserToFirestore({
      id: userData.phone.replace(/[^0-9]/g, '') || `user_${Date.now()}`,
      name: userData.name,
      email: `${userData.phone.replace(/[^0-9]/g, '') || 'user'}@wanda.cm`,
      phone: userData.phone,
      role: userData.role,
      walletBalance: userData.role === 'driver' ? driverWallet : passengerWallet,
      points: passengerPoints
    });

    if (userData.role === 'driver' && userData.vehiclePlate) {
      const newDriverId = `driver_custom_${Date.now()}`;
      const newDriver = {
        id: newDriverId,
        name: userData.name,
        phone: userData.phone,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        vehicleModel: `${userData.vehicleModel} (${userData.vehicleColor})`,
        vehiclePlate: userData.vehiclePlate,
        vehicleColor: userData.vehicleColor,
        vehicleType: userData.vehicleType || 'ecoride',
        approvalStatus: 'approved', // instantly approved for testing!
        rating: 5.0
      };

      setDriversList(prev => {
        // Remove duplicate drivers with the same phone to avoid duplicates
        const filtered = prev.filter(d => d.phone !== userData.phone);
        return [newDriver, ...filtered];
      });
    }
  };

  // Log out or switch profile helper
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wanda_user');
  };

  // Add history helper
  const addHistoryItem = (item: HistoryItem) => {
    const updated = [item, ...history];
    setHistory(updated);
    localStorage.setItem('wanda_ride_history', JSON.stringify(updated));

    // Persist to Firestore real backend database
    const userId = user?.phone?.replace(/[^0-9]/g, '') || 'guest_user';
    saveHistoryToFirestore(item, userId);
  };

  // Re-book helper for past routes
  const handleRebook = (hist: HistoryItem) => {
    let pickupLoc: Location | null = null;
    let destLoc: Location | null = null;

    // 1. If coordinates are explicitly stored in history item
    if (hist.pickupLat && hist.pickupLng) {
      pickupLoc = {
        name: hist.pickupName,
        lat: hist.pickupLat,
        lng: hist.pickupLng
      };
    } else {
      // Lookup in presets
      const allLocations = [...YAOUNDE_LOCATIONS, ...DOUALA_LOCATIONS];
      const foundPickup = allLocations.find(l => l.name === hist.pickupName);
      if (foundPickup) {
        pickupLoc = foundPickup;
      } else {
        const isDouala = hist.pickupName.toLowerCase().includes('douala') || hist.pickupName.toLowerCase().includes('akwa') || hist.pickupName.toLowerCase().includes('bonanjo');
        pickupLoc = {
          name: hist.pickupName,
          lat: isDouala ? 4.0435 : 3.8640,
          lng: isDouala ? 9.6895 : 11.5205
        };
      }
    }

    if (hist.destLat && hist.destLng) {
      destLoc = {
        name: hist.destName,
        lat: hist.destLat,
        lng: hist.destLng
      };
    } else {
      const allLocations = [...YAOUNDE_LOCATIONS, ...DOUALA_LOCATIONS];
      const foundDest = allLocations.find(l => l.name === hist.destName);
      if (foundDest) {
        destLoc = foundDest;
      } else {
        const isDouala = hist.destName.toLowerCase().includes('douala') || hist.destName.toLowerCase().includes('akwa') || hist.destName.toLowerCase().includes('bonanjo');
        destLoc = {
          name: hist.destName,
          lat: isDouala ? 4.0485 : 3.8910,
          lng: isDouala ? 9.6974 : 11.5130
        };
      }
    }

    // Set pickup and destination
    setPickup(pickupLoc);
    setDestination(destLoc);

    // Map class name to ID
    const normalizedClass = hist.vehicleClass.toLowerCase();
    let classId = 'ecoride';
    if (normalizedClass.includes('moto') || normalizedClass.includes('okada')) classId = 'okada';
    else if (normalizedClass.includes('keke') || normalizedClass.includes('yellow')) classId = 'keke';
    else if (normalizedClass.includes('comfort') || normalizedClass.includes('vip') || normalizedClass.includes('suv')) classId = 'comfort';
    
    setSelectedClassId(classId);

    // Update active city
    const isDoualaCity = hist.pickupName.toLowerCase().includes('douala') || hist.destName.toLowerCase().includes('douala');
    setCurrentCity(isDoualaCity ? 'Douala' : 'Yaoundé');

    // Return to main booking screen
    setActiveTab('booking');
    
    alert(slangMode 
      ? `C'est parti! Wanda a re-booké ton trajet: de "${hist.pickupName}" à "${hist.destName}".`
      : `Success! Re-booked past route: from "${hist.pickupName}" to "${hist.destName}".`
    );
  };

  // Professional PDF receipt generator for business passengers using jsPDF
  const downloadPDFReceipt = (hist: HistoryItem) => {
    let distanceKm: number | undefined = undefined;
    if (hist.pickupLat && hist.destLat && hist.pickupLng && hist.destLng) {
      distanceKm = Number(getDistanceKm(hist.pickupLat, hist.pickupLng, hist.destLat, hist.destLng).toFixed(1));
    } else if (pickup && destination) {
      distanceKm = Number(getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng).toFixed(1));
    }

    generateAndDownloadRideReceipt({
      id: hist.id,
      date: hist.date,
      pickupName: hist.pickupName,
      destName: hist.destName,
      fare: hist.fare,
      paymentMethod: hist.paymentMethod,
      vehicleClass: hist.vehicleClass,
      driverName: hist.driverName || activeDriver?.name || 'Chauffeur Wanda',
      driverPlate: activeDriver?.vehiclePlate,
      passengerName: user?.name || 'Passager Wanda',
      passengerPhone: user?.phone || 'N/A',
      distanceKm: distanceKm,
      tipAmount: hist.tipAmount || tipAmount || 0,
      waitingTimeSeconds: currentRideWaitingTime,
      waitingFee: currentRideWaitingFare,
      pointsRedeemed: hist.pointsRedeemed || ridePointsRedeemed || 0,
      status: hist.status
    }, {
      slangMode,
      language
    });

    setTimeout(() => {
      alert(slangMode 
        ? `📄 Reçu PDF Officiel Wanda (N° WND-${hist.id.replace('hist_', '')}) téléchargé avec succès !` 
        : `📄 Official Wanda PDF Business Receipt (ID: WND-${hist.id.replace('hist_', '')}) downloaded successfully!`
      );
    }, 100);
  };

  // Distance calculations
  const rideDistance = (pickup && destination) 
    ? getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 0;

  // Active pricing calculations
  const activeRideClass = RIDE_CLASSES.find(c => c.id === selectedClassId) || RIDE_CLASSES[2];
  const activeBaseFare = systemSettings.classRates?.[activeRideClass.id]?.baseFare ?? activeRideClass.baseFare;
  const activePerKm = systemSettings.classRates?.[activeRideClass.id]?.perKm ?? activeRideClass.perKm;

  // Two distinct prices calculated based on surge:
  const baseSurgeFare = (pickup && destination) 
    ? Math.round((activeBaseFare + (rideDistance * activePerKm)) * systemSettings.surgeMultiplier)
    : 0;

  // Wallet pay offers an automated 15% cash discount!
  const walletPrice = Math.round(baseSurgeFare * 0.85);
  const cashPrice = baseSurgeFare;

  // Selected payment rate depending on checkout choice
  const activeFareToCharge = paymentMethod === 'wallet' ? walletPrice : cashPrice;

  // Wanda Points Rewards Calculations:
  // 1 Wanda Point = 100 FCFA discount (1 trip paid by wallet = 1 point earned = 100 FCFA value).
  const maxPointsRedeemable = Math.min(passengerPoints, Math.floor(activeFareToCharge / 100));
  const pointsDiscount = usePoints ? maxPointsRedeemable * 100 : 0;
  const finalFareToPay = Math.max(0, activeFareToCharge - pointsDiscount);

  // Active discount amount for the active ride
  const activeDiscountAmount = (rideStatus === 'idle' || rideStatus === 'searching') 
    ? pointsDiscount 
    : (ridePointsRedeemed * 100);

  // Traffic simulation helper based on active surgeMultiplier
  const getTrafficDetails = () => {
    const surge = systemSettings.surgeMultiplier || 1.0;
    
    // Normal base duration
    const baseDuration = Math.round(rideDistance * 1.5) + 3;
    
    // Duration with traffic delay
    const totalDuration = Math.round(baseDuration * surge);
    const delayMinutes = Math.max(0, totalDuration - baseDuration);
    
    // Format ETA
    const arrivalTime = new Date(Date.now() + totalDuration * 60 * 1000);
    const formattedArrival = arrivalTime.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let statusLabel = '';
    let statusText = '';
    let badgeColor = '';
    let icon = '';

    if (surge >= 1.8) {
      statusLabel = slangMode ? "🚨 Ndokoti Jam" : "🚨 Extreme Gridlock";
      statusText = slangMode ? `Embouteillage chaud Ndokoti ! Retard de +${delayMinutes} mins` : `Severe delays! Ndokoti congestion adds +${delayMinutes} mins`;
      badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
      icon = '🚨';
    } else if (surge >= 1.4) {
      statusLabel = slangMode ? "🌧️ Pluie à Bastos" : "🌧️ Heavy Rain Bastos";
      statusText = slangMode ? `Route glissante, vitesse réduite. Retard de +${delayMinutes} mins` : `Wet roads & slow speed. Delay of +${delayMinutes} mins`;
      badgeColor = 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      icon = '🌧️';
    } else if (surge > 1.0) {
      statusLabel = slangMode ? "🟡 Trafic dense" : "🟡 Dense Traffic";
      statusText = slangMode ? `Ralentissement léger sur ton trajet. Retard de +${delayMinutes} mins` : `Slightly dense traffic. Delay of +${delayMinutes} mins`;
      badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      icon = '🟡';
    } else {
      statusLabel = slangMode ? "🟢 Route dégagée" : "🟢 Fluid Traffic";
      statusText = slangMode ? "Aucun embouteillage signalé. Allure normale !" : "Smooth sailing, normal transit speeds!";
      badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      icon = '🟢';
    }

    return {
      baseDuration,
      totalDuration,
      delayMinutes,
      formattedArrival,
      statusLabel,
      statusText,
      badgeColor,
      icon,
      surge
    };
  };

  // Handle Map Tap Directly
  const handleMapTap = (lat: number, lng: number) => {
    const defaultName = `Custom Map Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const newLoc: Location = { name: defaultName, lat, lng };

    if (isSettingLocationType === 'pickup') {
      setPickup(newLoc);
      setIsSettingLocationType(null);
    } else if (isSettingLocationType === 'destination') {
      setDestination(newLoc);
      setIsSettingLocationType(null);
    } else {
      if (!pickup) {
        setPickup(newLoc);
      } else {
        setDestination(newLoc);
      }
    }
  };

  // Booking dispatch sequence
  const handleBookRide = () => {
    if (!pickup || !destination) return;

    // Lock in points to redeem for this active ride
    const pointsToLock = usePoints ? maxPointsRedeemable : 0;
    setRidePointsRedeemed(pointsToLock);

    // Calculate discounted fare to pay
    const discountedPrice = Math.max(0, activeFareToCharge - (pointsToLock * 100));

    if (paymentMethod === 'wallet') {
      // Wallet check
      if (passengerWallet < discountedPrice) {
        alert(slangMode 
          ? "Massa! Ton wallet n'a pas assez d'argent. S'il te plaît, recharge ton wallet via MTN MoMo / Orange Money ou choisis le payement Cash !"
          : "Insufficient wallet balance. Please top up your wallet via mobile money or select Cash Payment."
        );
        setActiveTab('wallet');
        return;
      }
      setTransactionId(`WANDA-WAL-${Math.floor(100000 + Math.random() * 900000)}`);
      startSearchingDriver();
    } else {
      // Cash selection does not require wallet verification
      setTransactionId('CASH-ON-DELIVERY');
      startSearchingDriver();
    }
  };

  // Passenger requests a wallet topup
  const handlePassengerTopUp = (amount: number, method: 'momo_mtn' | 'orange_money') => {
    setPendingTopUpAmount(amount);
    setPendingTopUpMethod(method);
    setIsPaymentModalOpen(true);
  };

  const handleTopUpSuccess = (txId: string) => {
    const bonusRate = systemSettings.topupPromoActive ? (systemSettings.topupPromoRate ?? 0) : 0;
    const bonusAmount = Math.round(pendingTopUpAmount * bonusRate / 100);
    const totalCredited = pendingTopUpAmount + bonusAmount;

    // Add total credited (including bonus) to passenger balance
    setPassengerWallet(prev => prev + totalCredited);
    
    // Log deposit transaction
    const newTx = {
      id: txId,
      type: 'topup',
      amount: pendingTopUpAmount,
      bonusAmount: bonusAmount,
      phone: user?.phone || '677123456',
      carrier: pendingTopUpMethod,
      status: 'success',
      date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
    setTransactions(prev => [newTx, ...prev]);
    
    setIsPaymentModalOpen(false);
    setPendingTopUpAmount(0);

    if (bonusAmount > 0) {
      alert(slangMode 
        ? `Félicitations! Votre recharge de ${pendingTopUpAmount.toLocaleString('fr-FR')} FCFA via ${pendingTopUpMethod === 'momo_mtn' ? 'MTN MoMo' : 'Orange Money'} a réussi. Bonus de +${bonusAmount.toLocaleString('fr-FR')} FCFA crédité (Total: ${totalCredited.toLocaleString('fr-FR')} FCFA) !`
        : `Success! Added ${pendingTopUpAmount.toLocaleString('fr-FR')} FCFA. A promo bonus of +${bonusAmount.toLocaleString('fr-FR')} FCFA was credited (Total: ${totalCredited.toLocaleString('fr-FR')} FCFA)!`
      );
    } else {
      alert(slangMode 
        ? `Félicitations! Votre recharge de ${pendingTopUpAmount.toLocaleString('fr-FR')} FCFA via ${pendingTopUpMethod === 'momo_mtn' ? 'MTN MoMo' : 'Orange Money'} a réussi.`
        : `Success! Added ${pendingTopUpAmount.toLocaleString('fr-FR')} FCFA to your wallet balance.`
      );
    }
  };

  // Driver requests a withdrawal
  const handleDriverWithdraw = (amount: number, method: 'momo_mtn' | 'orange_money', phoneNumber: string) => {
    // Register withdrawal as pending (Admin approves this inside Admin Console)
    const newTx = {
      id: `WITHDRAW-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'withdrawal',
      amount,
      phone: phoneNumber,
      carrier: method,
      status: 'pending',
      date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  // Admin approves driver cashout
  const handleApproveWithdrawal = (id: string) => {
    const txIndex = transactions.findIndex(t => t.id === id);
    if (txIndex === -1) return;

    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return;

    // Deduct from driver wallet balance
    if (driverWallet < tx.amount) {
      alert("Error: Driver has insufficient funds to clear this withdrawal!");
      return;
    }

    setDriverWallet(prev => prev - tx.amount);
    
    // Update transactions list
    const updated = [...transactions];
    updated[txIndex] = { ...tx, status: 'success' };
    setTransactions(updated);
  };

  // Admin approves pending drivers with target notification
  const handleApproveDriver = async (id: string, customMsg?: string) => {
    const targetDriver = driversList.find(d => d.id === id);
    const driverName = targetDriver?.name || 'Chauffeur';

    setDriversList(prev => prev.map(d => d.id === id ? { 
      ...d, 
      approvalStatus: 'approved',
      kycStatus: 'verified',
      rejectionReason: undefined
    } : d));

    try {
      await sendNotificationToFirestore({
        target: 'driver',
        title: '🎉 Compte Validé avec Succès !',
        message: customMsg || `Félicitations ${driverName}, votre compte chauffeur Wanda a été validé ! Vous pouvez maintenant recevoir des courses et générer des revenus.`,
        type: 'info',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  };

  const handleRejectDriver = async (id: string, reason?: string) => {
    const targetDriver = driversList.find(d => d.id === id);
    const driverName = targetDriver?.name || 'Chauffeur';
    const rejectText = reason || 'Documents fournis non conformes ou illisibles.';

    setDriversList(prev => prev.map(d => d.id === id ? { 
      ...d, 
      approvalStatus: 'suspended',
      kycStatus: 'rejected',
      rejectionReason: rejectText
    } : d));

    try {
      await sendNotificationToFirestore({
        target: 'driver',
        title: '⚠️ Rejet de Validation KYC',
        message: `Bonjour ${driverName}, votre compte chauffeur n'a pas pu être validé. Raison : ${rejectText}. Veuillez mettre à jour vos documents dans l'application.`,
        type: 'alert',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  };

  // Driver simulation triggers
  const startSearchingDriver = (classOverride?: string) => {
    const targetClassId = classOverride || selectedClassId;
    if (classOverride) {
      setSelectedClassId(classOverride);
    }

    setRideStatus('searching');
    setMessages([]);

    // Persist active ride request to Firestore real backend database
    if (pickup && destination && user) {
      const selectedClass = RIDE_CLASSES.find(c => c.id === targetClassId) || RIDE_CLASSES[2];
      const clsBaseFare = systemSettings.classRates?.[selectedClass.id]?.baseFare ?? selectedClass.baseFare;
      const clsPerKm = systemSettings.classRates?.[selectedClass.id]?.perKm ?? selectedClass.perKm;
      const calculatedBaseSurge = Math.round((clsBaseFare + (rideDistance * clsPerKm)) * systemSettings.surgeMultiplier);
      const fare = paymentMethod === 'wallet' ? Math.round(calculatedBaseSurge * 0.85) : calculatedBaseSurge;
      createRideInFirestore({
        passengerId: user.phone.replace(/[^0-9]/g, ''),
        passengerName: user.name,
        passengerPhone: user.phone,
        pickup,
        destination,
        fare,
        paymentMethod,
        rideClassId: targetClassId,
        status: 'searching'
      });
    }

    setTimeout(() => {
      // Find an approved, active driver specifically matching this vehicle class
      const suitableDriver = driversList.find(
        d => d.vehicleType === targetClassId && d.approvalStatus === 'approved' && d.status !== 'offline'
      );

      if (!suitableDriver) {
        // No driver available for this specific vehicle class!
        setRideStatus(null);
        setNoDriverRequestedClassId(targetClassId);
        setShowNoDriverModal(true);
        return;
      }
      
      const startLat = pickup!.lat + (Math.random() - 0.5) * 0.015;
      const startLng = pickup!.lng + (Math.random() - 0.5) * 0.015;

      setActiveDriver({
        ...suitableDriver,
        lat: startLat,
        lng: startLng,
        status: 'heading_to_pickup'
      });
      setDriverLoc({ lat: startLat, lng: startLng });
      
      const baseEta = RIDE_CLASSES.find(c => c.id === targetClassId)?.eta || 3;
      setEtaMinutes(baseEta);
      setEtaStatusText(slangMode ? "🕒 Trajet fluide en cours" : "🕒 Smooth transit on schedule");
      
      setRideStatus('driver_found');

      // Greet passenger
      setTimeout(() => {
        setMessages([
          {
            sender: 'driver',
            text: slangMode 
              ? `Salut chef! J'ai pris ta course. Je viens avec ma ${suitableDriver.vehicleModel}. Mon climatiseur souffle bien. Je suis en route !`
              : `Hello! I have accepted your request. I am driving a ${suitableDriver.vehicleModel}. I am on my way to your location!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1500);

    }, 2500);
  };

  // Real-Time GPS simulation engine
  useEffect(() => {
    if (!rideStatus || !activeDriver || !driverLoc || !pickup || !destination) return;

    let intervalId: NodeJS.Timeout;
    let transitionTimeoutId: NodeJS.Timeout;
    let messageTimeoutId: NodeJS.Timeout;

    if (rideStatus === 'driver_found') {
      const targetLat = pickup.lat;
      const targetLng = pickup.lng;
      const steps = 6;
      let currentStep = 0;

      intervalId = setInterval(() => {
        currentStep++;
        const ratio = currentStep / steps;

        const nextLat = activeDriver.lat + (targetLat - activeDriver.lat) * ratio;
        const nextLng = activeDriver.lng + (targetLng - activeDriver.lng) * ratio;

        setDriverLoc({ lat: nextLat, lng: nextLng });

        // Simulate traffic updates and dynamic ETA
        const baseEta = RIDE_CLASSES.find(c => c.id === selectedClassId)?.eta || 3;
        let simulatedEta = baseEta;
        let trafficText = '';

        if (currentStep === 1) {
          simulatedEta = Math.max(2, baseEta);
          trafficText = slangMode 
            ? "⚠️ Embouteillage léger détecté (+1 min)" 
            : "⚠️ Light traffic delay (+1 min)";
        } else if (currentStep === 2) {
          simulatedEta = Math.max(2, baseEta - 1);
          trafficText = slangMode 
            ? "🟢 Le djo a pris un raccourci, ça roule !" 
            : "🟢 Driver found a shortcut, traffic cleared!";
        } else if (currentStep === 3) {
          simulatedEta = Math.max(1, Math.round(baseEta * 0.5));
          trafficText = slangMode 
            ? "⚡ Feu vert, le chauffeur accélère" 
            : "⚡ Green light, smooth ride";
        } else if (currentStep === 4) {
          simulatedEta = 1;
          trafficText = slangMode 
            ? "📍 Presque là, le djo approche du repère" 
            : "📍 Almost there, driver is approaching the pickup location";
        } else if (currentStep === 5) {
          simulatedEta = 0.5; // less than 1 min
          trafficText = slangMode 
            ? "🚕 Le djo tourne l'angle de la rue !" 
            : "🚕 Driver is turning the corner!";
        } else if (currentStep >= steps) {
          simulatedEta = 0;
          trafficText = slangMode 
            ? "🎉 Chauffeur arrivé !" 
            : "🎉 Driver has arrived!";
        } else {
          simulatedEta = baseEta;
          trafficText = slangMode 
            ? "🕒 Trajet fluide en cours" 
            : "🕒 Smooth transit on schedule";
        }

        setEtaMinutes(simulatedEta);
        setEtaStatusText(trafficText);

        if (currentStep >= steps) {
          clearInterval(intervalId);
          setRideStatus('arriving');

          messageTimeoutId = setTimeout(() => {
            setMessages(prev => [
              ...prev,
              {
                sender: 'driver',
                text: slangMode 
                  ? "Mon frère, je suis déjà garé au carrefour! Je t'attends, viens vite."
                  : "I have arrived at your pickup location! I am waiting outside, the AC is active.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }, 1000);

          // Transition to drive to destination after 20 seconds to give plenty of time to view waiting timer
          transitionTimeoutId = setTimeout(() => {
            setRideStatus('in_progress');
          }, 20000);
        }
      }, 2000);
    }

    if (rideStatus === 'in_progress') {
      const startLat = pickup.lat;
      const startLng = pickup.lng;
      const targetLat = destination.lat;
      const targetLng = destination.lng;
      const steps = 8;
      let currentStep = 0;

      const totalDist = getDistanceKm(startLat, startLng, targetLat, targetLng);
      
      // Immediately set initial ETA values upon start of the trip
      const initialRemainingTime = Math.max(1, Math.round(totalDist * 1.5));
      setEtaMinutes(initialRemainingTime);
      setEtaStatusText(slangMode ? "🟢 Route dégagée, début du trajet" : "🟢 Clear roads, ride started");

      intervalId = setInterval(() => {
        currentStep++;
        const ratio = currentStep / steps;

        const nextLat = startLat + (targetLat - startLat) * ratio;
        const nextLng = startLng + (targetLng - startLng) * ratio;

        setDriverLoc({ lat: nextLat, lng: nextLng });

        // Calculate and simulate real-time traffic and dynamic ETA
        const remainingRatio = Math.max(0, 1 - ratio);
        const baseRemainingTime = Math.max(0.5, totalDist * 1.5 * remainingRatio);

        let trafficFactor = 1.0;
        let trafficDesc = '';

        if (ratio < 0.25) {
          trafficFactor = 1.0;
          trafficDesc = slangMode ? "🟢 Route dégagée, allure normale" : "🟢 Clear roads, normal speed";
        } else if (ratio < 0.5) {
          trafficFactor = 1.6; // Heavy traffic delay
          trafficDesc = slangMode ? "⚠️ Embouteillage au rond-point (+2 min)" : "⚠️ Traffic delay at roundabout (+2 min)";
        } else if (ratio < 0.75) {
          trafficFactor = 1.3; // Light congestion
          trafficDesc = slangMode ? "🟡 Trafic dense mais ça avance" : "🟡 Dense traffic, moving slowly";
        } else {
          trafficFactor = 0.95; // Smooth run
          trafficDesc = slangMode ? "⚡ Voie express libre" : "⚡ Highway is clear, speeding up";
        }

        const simulatedInTransitEta = Math.round(baseRemainingTime * trafficFactor);
        const finalEta = simulatedInTransitEta < 1 ? 0.5 : simulatedInTransitEta;

        setEtaMinutes(finalEta);
        setEtaStatusText(trafficDesc);

        if (currentStep >= steps) {
          clearInterval(intervalId);
          setRideStatus('completed');
          setShowReceipt(true);
        }
      }, 2000);
    }

    return () => {
      clearInterval(intervalId);
      clearTimeout(transitionTimeoutId);
      clearTimeout(messageTimeoutId);
    };
  }, [rideStatus, activeDriver, pickup, destination]);

  // Calculate simulated or actual live journey completion percentage
  const getTripProgressPercentage = () => {
    if (!pickup || !destination || !driverLoc) return 0;
    const totalDist = Math.sqrt(
      Math.pow(destination.lat - pickup.lat, 2) + 
      Math.pow(destination.lng - pickup.lng, 2)
    );
    if (totalDist === 0) return 100;
    const remainingDist = Math.sqrt(
      Math.pow(destination.lat - driverLoc.lat, 2) + 
      Math.pow(destination.lng - driverLoc.lng, 2)
    );
    const percentage = Math.max(0, Math.min(100, Math.round((1 - remainingDist / totalDist) * 100)));
    return percentage;
  };

  // Live chat response generator for both passenger and driver
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const mySender = role === 'passenger' ? 'passenger' : 'driver';
    const otherSender = role === 'passenger' ? 'driver' : 'passenger';

    const newMsg: Message = {
      sender: mySender,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    setTimeout(() => {
      const responses = role === 'passenger'
        ? CHAT_PIDGIN_RESPONSES
        : [
            "Ok, j'arrive !",
            "Je suis là, j'attends au bord de la route.",
            "D'accord, je vous vois.",
            "S'il vous plaît dépêchez-vous, merci !",
            "Pas de problème, je vous attends.",
            "On se voit au carrefour !"
          ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [
        ...prev,
        {
          sender: otherSender,
          text: randomReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  const handleSendDriverChat = (text: string) => {
    if (!text.trim()) return;

    const newMsg: Message = {
      sender: 'driver',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setDriverChatInput('');

    setTimeout(() => {
      const passengerReplies = [
        "Ok, j'arrive !",
        "Je suis là, j'attends au bord de la route.",
        "D'accord, je vous vois.",
        "S'il vous plaît dépêchez-vous, merci !",
        "Pas de problème, je vous attends.",
        "On se voit au carrefour !"
      ];
      const randomReply = passengerReplies[Math.floor(Math.random() * passengerReplies.length)];
      setMessages(prev => [
        ...prev,
        {
          sender: 'passenger',
          text: randomReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  // Complete ride and calculate payouts/commissions
  const handleSubmitRating = () => {
    if (!pickup || !destination || !activeDriver) return;

    const tipToPay = paymentMethod === 'wallet' ? tipAmount : 0;
    
    // Calculate final discounted fare of this ride
    const pointsDiscountAmount = ridePointsRedeemed * 100;
    const finalFareToCharge = Math.max(0, activeFareToCharge - pointsDiscountAmount);
    
    // Standard payout math including waiting time extra fare adjustments (commission not applied to tip)
    const totalRideFare = finalFareToCharge + currentRideWaitingFare;
    const platformCommission = Math.round(totalRideFare * systemSettings.commissionRate / 100);
    const driverNetEarnings = (totalRideFare - platformCommission) + tipToPay;

    // Staging updates depending on cash vs wallet payment
    if (paymentMethod === 'wallet') {
      // Wallet Pay: deduct total (including waiting fee and tip) from passenger, credit driver's balance
      setPassengerWallet(prev => Math.max(0, prev - (finalFareToCharge + currentRideWaitingFare + tipToPay)));
      setDriverWallet(prev => prev + driverNetEarnings);

      // Log wallet payout transactions
      const pTx = {
        id: `RIDE-${Date.now()}`,
        type: 'ride_payout',
        amount: finalFareToCharge + currentRideWaitingFare + tipToPay,
        tipAmount: tipToPay,
        phone: user?.phone || '677123456',
        carrier: 'wallet_debit',
        status: 'success',
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      };
      setTransactions(prev => [pTx, ...prev]);
    } else {
      // Cash Pay: passenger paid driver cash on hand. We deduct the commission from driver wallet!
      setDriverWallet(prev => Math.max(0, prev - platformCommission));
      
      const cTx = {
        id: `COMM-${Date.now()}`,
        type: 'commission_debit',
        amount: platformCommission,
        phone: activeDriver.phone,
        carrier: 'cash_commission',
        status: 'success',
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      };
      setTransactions(prev => [cTx, ...prev]);
    }

    // Deduct redeemed points and award 1 point (= 100 FCFA value) per trip ONLY if paid with Wallet
    const pointsEarned = paymentMethod === 'wallet' ? 1 : 0;
    setPassengerPoints(prev => Math.max(0, prev - ridePointsRedeemed + pointsEarned));

    // Save history item
    const newHistoryItem: HistoryItem = {
      id: 'hist_' + Date.now(),
      date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      pickupName: pickup.name,
      destName: destination.name,
      fare: totalRideFare + tipToPay,
      tipAmount: tipToPay,
      paymentMethod,
      status: 'completed',
      vehicleClass: activeRideClass.name,
      driverName: activeDriver.name,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      destLat: destination.lat,
      destLng: destination.lng,
      pointsEarned,
      pointsRedeemed: ridePointsRedeemed
    };

    addHistoryItem(newHistoryItem);

    // Reset ride state
    setRideStatus('idle');
    setActiveDriver(null);
    setDriverLoc(null);
    setShowReceipt(false);
    setTransactionId(null);
    setShowChat(false);
    setCurrentRideWaitingTime(0);
    setCurrentRideWaitingFare(0);
    setTipAmount(0);
    setUsePoints(false);
    setRidePointsRedeemed(0);
  };

  const handleCancelBooking = () => {
    setRideStatus('idle');
    setActiveDriver(null);
    setDriverLoc(null);
    setShowChat(false);
    setTransactionId(null);
    setCurrentRideWaitingTime(0);
    setCurrentRideWaitingFare(0);
    setTipAmount(0);
  };

  // Driver Incoming Request Handlers & Dispatch Simulators
  const triggerIncomingSimulatedRequest = () => {
    if (rideStatus !== 'idle' || driverRideRequest) return;

    const passNames = slangMode ? [
      "Arnaud Ndoumbe", "Marie Ngo Nseck", "Ephraim Kamga", 
      "Willy Sango", "Ateba Onana", "Simeon Tchakounte"
    ] : [
      "Marc Ndoumbe", "Marie-Therese Ngo Nseck", "Ephraim Kamga",
      "Chantal Biya", "Willy Sango", "Ateba Onana", "Simeon Tchakounte"
    ];
    const passengerName = passNames[Math.floor(Math.random() * passNames.length)];

    let currentDriverLat = driverLoc?.lat;
    let currentDriverLng = driverLoc?.lng;
    if (!currentDriverLat || !currentDriverLng) {
      const defaultLoc = activeCityLocations[0];
      currentDriverLat = defaultLoc.lat;
      currentDriverLng = defaultLoc.lng;
      setDriverLoc({ lat: currentDriverLat, lng: currentDriverLng });
    }

    const availableLocs = activeCityLocations;
    let pickupLoc = availableLocs[Math.floor(Math.random() * availableLocs.length)];
    let destLoc = availableLocs[Math.floor(Math.random() * availableLocs.length)];
    while (destLoc.name === pickupLoc.name) {
      destLoc = availableLocs[Math.floor(Math.random() * availableLocs.length)];
    }

    const distToPickup = getDistanceKm(currentDriverLat, currentDriverLng, pickupLoc.lat, pickupLoc.lng);
    const distanceVal = getDistanceKm(pickupLoc.lat, pickupLoc.lng, destLoc.lat, destLoc.lng);

    const driverVehicleType = user?.vehicleType || 'ecoride';
    const activeClass = RIDE_CLASSES.find(c => c.id === driverVehicleType) || RIDE_CLASSES[2];
    const clsBase = systemSettings.classRates?.[activeClass.id]?.baseFare ?? activeClass.baseFare;
    const clsPerKm = systemSettings.classRates?.[activeClass.id]?.perKm ?? activeClass.perKm;
    const calculatedFare = Math.round((clsBase + (distanceVal * clsPerKm)) * systemSettings.surgeMultiplier);

    const newRequest = {
      id: `req_${Date.now()}`,
      passengerName,
      pickupName: pickupLoc.name,
      destName: destLoc.name,
      pickupLat: pickupLoc.lat,
      pickupLng: pickupLoc.lng,
      destLat: destLoc.lat,
      destLng: destLoc.lng,
      fare: calculatedFare,
      payment: (Math.random() > 0.4 ? 'wallet' : 'cash_on_delivery') as PaymentMethod
    };

    setDriverRideRequest(newRequest);
    setRequestCountdown(15);
  };

  const handleDeclineRequest = () => {
    setDriverRideRequest(null);
  };

  const handleAcceptRequest = () => {
    if (!driverRideRequest) return;

    setRideStatus('driver_found');

    setPickup({
      name: driverRideRequest.pickupName,
      lat: driverRideRequest.pickupLat,
      lng: driverRideRequest.pickupLng
    });
    setDestination({
      name: driverRideRequest.destName,
      lat: driverRideRequest.destLat,
      lng: driverRideRequest.destLng
    });

    setPaymentMethod(driverRideRequest.payment);

    const driverVehicleType = user?.vehicleType || 'ecoride';
    
    setActiveDriver({
      id: 'driver_user',
      name: user?.name || 'Moi-même Chauffeur',
      phone: user?.phone || '+237 600 00 00 00',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      vehicleModel: user?.vehicleModel || (driverVehicleType === 'okada' ? 'Nanfang Moto (Red)' : 'Toyota Yaris Yellow'),
      vehiclePlate: user?.vehiclePlate || 'LT - 999 - CH',
      vehicleType: driverVehicleType,
      approvalStatus: 'approved',
      rating: 5.0,
      lat: driverLoc?.lat || 3.8640,
      lng: driverLoc?.lng || 11.5205,
      status: 'heading_to_pickup'
    });

    setMessages([]);
    setDriverRideRequest(null);

    // Trigger greet message from passenger after 2 seconds
    setTimeout(() => {
      setMessages([
        {
          sender: 'passenger',
          text: slangMode
            ? `Bonjour chauffeur, je t'attends à ${driverRideRequest.pickupName}. S'il te plaît dépêche-toi, le soleil tape fort !`
            : `Hello driver, I am waiting for you at ${driverRideRequest.pickupName}. Please hurry up, it is very hot today!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 2000);
  };

  // 1. Automatic simulated request dispatch for drivers
  useEffect(() => {
    if (role !== 'driver' || !driverOnline || rideStatus !== 'idle' || driverRideRequest) return;

    const timeoutId = setTimeout(() => {
      triggerIncomingSimulatedRequest();
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [role, driverOnline, rideStatus, driverRideRequest, currentCity]);

  // 2. Countdown timer for incoming request
  useEffect(() => {
    if (!driverRideRequest) return;

    const timer = setInterval(() => {
      setRequestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setDriverRideRequest(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [driverRideRequest]);

  // 3. Real-time map preview renderer for incoming requests
  useEffect(() => {
    if (!driverRideRequest) {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const container = document.getElementById("driver-request-map-preview");
      if (!container || previewMapRef.current) return;

      try {
        const map = L.map(container, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 18
        }).addTo(map);

        previewMapRef.current = map;

        const currentDriverLat = driverLoc?.lat || 3.8640;
        const currentDriverLng = driverLoc?.lng || 11.5205;
        const driverLatLng: [number, number] = [currentDriverLat, currentDriverLng];
        const pickupLatLng: [number, number] = [driverRideRequest.pickupLat, driverRideRequest.pickupLng];

        const driverIcon = L.divIcon({
          className: 'custom-preview-driver-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-5 h-5 rounded-full bg-brand-gold/30 animate-ping"></div>
              <div class="relative w-5 h-5 rounded-full bg-brand-gold border border-slate-950 flex items-center justify-center text-xs z-50">
                🚗
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker(driverLatLng, { icon: driverIcon }).addTo(map);

        const pickupIcon = L.divIcon({
          className: 'custom-preview-pickup-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-5 h-5 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div class="relative w-5 h-5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-white text-[8px] font-black z-50">
                A
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker(pickupLatLng, { icon: pickupIcon }).addTo(map);

        L.polyline([driverLatLng, pickupLatLng], {
          color: '#eab308',
          weight: 2,
          opacity: 0.8,
          dashArray: '5, 5'
        }).addTo(map);

        const bounds = L.latLngBounds([driverLatLng, pickupLatLng]);
        map.fitBounds(bounds, { padding: [15, 15], maxZoom: 14 });
      } catch (err) {
        console.error("Error setting up driver request map preview:", err);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, [driverRideRequest, driverLoc]);

  // SOS Emergency activation
  const triggerSOS = () => {
    setShowSOS(true);
    setSosAlertTriggered(false);
    setSosCountdown(5);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSOS && sosAlertTriggered && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSosCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [showSOS, sosAlertTriggered, sosCountdown]);

  // Dynamic status badges
  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'momo_mtn':
        return <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-bold">MTN MoMo</span>;
      case 'orange_money':
        return <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">Orange Money</span>;
      case 'wallet':
        return <span className="bg-brand-gold text-brand-midnight px-2 py-0.5 rounded text-[9px] font-bold">Wanda Wallet</span>;
      default:
        return <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[9px] font-bold">Cash</span>;
    }
  };

  // Render independent admin page if URL has admin param or /admin route
  if (isAdminPage) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLoginModal
          onSuccess={() => setIsAdminAuthenticated(true)}
          onClose={() => {
            setIsAdminPage(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('admin');
            url.searchParams.delete('page');
            window.history.pushState({}, '', url.pathname.replace(/\/admin\/?$/i, '') || '/');
          }}
        />
      );
    }
    return (
      <AdminDashboard
        onClose={() => {
          setIsAdminPage(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('admin');
          url.searchParams.delete('page');
          window.history.pushState({}, '', url.pathname.replace(/\/admin\/?$/i, '') || '/');
        }}
        driversList={driversList}
        onApproveDriver={handleApproveDriver}
        onRejectDriver={handleRejectDriver}
        onUpdateDriversList={(updatedList) => setDriversList(updatedList)}
        systemSettings={systemSettings}
        onUpdateSettings={setSystemSettings}
        transactions={transactions}
        onApproveWithdrawal={handleApproveWithdrawal}
      />
    );
  }

  // Render independent view-only shared live tracking map
  if (shareRideData) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-brand-midnight text-white select-none overflow-hidden font-sans" id="shared-ride-tracker">
        {/* Left pane: Ride details / status */}
        <div className="w-full md:w-[380px] bg-brand-deep border-b md:border-b-0 md:border-r border-brand-card/80 flex flex-col justify-between shrink-0 h-2/5 md:h-full z-20 shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="p-4 bg-brand-midnight/40 border-b border-brand-card/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WandaLogo className="w-8 h-8 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)] animate-pulse" />
              <div>
                <h1 className="text-xs font-black text-brand-gold uppercase tracking-widest">
                  Wanda Share Track
                </h1>
                <p className="text-[9px] text-brand-text-muted font-bold italic">Suivi de trajet en direct 📡</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-black uppercase">
                {slangMode ? "EN DIRECT" : "LIVE"}
              </span>
            </div>
          </div>

          {/* Active tracking info */}
          <div className="p-4 space-y-4 flex-1">
            {/* Status notification */}
            <div className="bg-brand-card/30 border border-brand-card rounded-2xl p-3.5 space-y-1 shadow-inner">
              <span className="text-[8px] uppercase font-black text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-md inline-block animate-pulse">
                {liveStatus === 'driver_found' ? (slangMode ? "CHAUFFEUR EN ROUTE" : "DRIVER ASSIGNED") :
                 liveStatus === 'arriving' ? (slangMode ? "CHAUFFEUR ARRIVE" : "DRIVER ARRIVING") :
                 liveStatus === 'in_progress' ? (slangMode ? "TRAJET EN COURS" : "RIDE IN PROGRESS") :
                 (slangMode ? "ARRIVÉ À DESTINATION" : "ARRIVED")}
              </span>
              <h3 className="text-xs font-black text-white">
                {liveStatus === 'driver_found' && (slangMode ? "Le chauffeur s'approche du point d'embarquement" : "Driver is heading to the pickup point")}
                {liveStatus === 'arriving' && (slangMode ? "Le chauffeur est arrivé à l'embarquement" : "Driver has arrived at the pickup location")}
                {liveStatus === 'in_progress' && (slangMode ? "En route vers la destination finale" : "En route to the final destination")}
                {liveStatus === 'completed' && (slangMode ? "Le voyage s'est terminé avec succès" : "The journey has successfully concluded")}
              </h3>
              <p className="text-[10px] text-brand-text-muted font-semibold">
                {slangMode 
                  ? "Partagé en toute sécurité par votre proche." 
                  : "Shared securely by your friend/family member."}
              </p>
            </div>

            {/* Rider & Driver Cards */}
            <div className="space-y-2.5">
              <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-card border border-brand-input flex items-center justify-center text-sm font-bold text-brand-gold">
                    👤
                  </div>
                  <div>
                    <span className="text-[8px] text-brand-text-muted block font-bold uppercase">{slangMode ? "Passager" : "Passenger"}</span>
                    <h4 className="text-xs font-black text-white">{shareRideData.passengerName}</h4>
                  </div>
                </div>
              </div>

              <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-sm font-bold text-brand-gold">
                      🚗
                    </div>
                    <div>
                      <span className="text-[8px] text-brand-text-muted block font-bold uppercase">{slangMode ? "Chauffeur" : "Driver"}</span>
                      <h4 className="text-xs font-black text-white">{shareRideData.driverName}</h4>
                    </div>
                  </div>
                  <span className="text-[10px] text-brand-gold font-bold bg-brand-midnight px-2 py-0.5 rounded border border-brand-card">
                    ★ 4.9
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-brand-input/30 text-[10px] font-semibold text-brand-text-muted">
                  <div>
                    <span className="text-[8px] block uppercase text-brand-text-muted/70">{slangMode ? "Véhicule" : "Vehicle"}</span>
                    <span className="text-white font-extrabold">{shareRideData.vehicleModel}</span>
                  </div>
                  <div>
                    <span className="text-[8px] block uppercase text-brand-text-muted/70">{slangMode ? "Immatriculation" : "Plate No"}</span>
                    <span className="text-brand-gold font-extrabold font-mono bg-brand-midnight px-1.5 py-0.5 rounded border border-brand-card inline-block">{shareRideData.vehiclePlate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Itinerary details */}
            <div className="bg-brand-card/20 border border-brand-card/40 rounded-xl p-3.5 space-y-2.5 text-[11px] font-semibold">
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse"></span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] text-brand-text-muted block uppercase font-black">{slangMode ? "Départ (A)" : "Pickup (A)"}</span>
                  <p className="font-extrabold text-white truncate">{shareRideData.pickupName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] text-brand-text-muted block uppercase font-black">{slangMode ? "Arrivée (B)" : "Destination (B)"}</span>
                  <p className="font-extrabold text-white truncate">{shareRideData.destName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Call To Action */}
          <div className="p-4 bg-brand-midnight/60 border-t border-brand-card/80 space-y-2">
            <p className="text-[10px] text-brand-text-muted font-bold text-center">
              {slangMode ? "Besoin de voyager en sécurité au Cameroun ?" : "Want safe, reliable rides in Cameroon?"}
            </p>
            <button
              onClick={() => {
                // Clear query params to return to main application
                window.location.href = window.location.origin;
              }}
              className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black text-xs py-2.5 rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              🚀 {slangMode ? "Commander mon trajet sur Wanda" : "Book Your Own Wanda Ride"}
            </button>
          </div>
        </div>

        {/* Right pane: Leaflet map view */}
        <div className="flex-1 h-3/5 md:h-full relative z-10">
          <TaxiMap
            pickup={{ name: shareRideData.pickupName, lat: shareRideData.pickupLat, lng: shareRideData.pickupLng }}
            destination={{ name: shareRideData.destName, lat: shareRideData.destLat, lng: shareRideData.destLng }}
            driverLocation={liveDriverLoc}
            status={liveStatus}
            driverType={shareRideData.vehicleType}
            role="passenger"
            slangMode={slangMode}
            isTilted={isMapTilted}
            isZoomLocked={isZoomLocked}
            showMapGrid={showMapGrid}
            recentBookings={recentBookings}
          />
        </div>
      </div>
    );
  }

  // Render signup page if user has not onboarding
  if (!user) {
    return (
      <LandingPage 
        onSignupComplete={handleSignupComplete} 
        currentLanguage={language}
        onLanguageChange={changeLanguage}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-brand-midnight text-white select-none overflow-hidden" id="app-root-container">
      
      {/* Global Offline Service Worker Mode Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-brand-midnight py-1.5 px-3 font-extrabold text-[10px] sm:text-[11px] flex items-center justify-between shadow-lg z-[2000] border-b border-amber-300/40 animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff size={14} className="shrink-0 animate-pulse text-brand-midnight" />
            <span>
              {slangMode
                ? "⚡ Mode Hors Ligne Actif (Service Worker) — Historique & Solde Wallet entièrement disponibles hors connexion."
                : "⚡ Offline Mode Active (Service Worker) — Past ride history & Wallet balances served from offline cache."}
            </span>
          </div>
          <span className="bg-brand-midnight text-amber-300 text-[8px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-amber-400/30">
            SW CACHE
          </span>
        </div>
      )}

      {/* Header bar */}
      <header className="bg-brand-deep border-b border-brand-card/80 px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 z-50 flex items-center justify-between shadow-md">
        
        {/* Brand identity & Location Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <WandaLogo className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)]" />
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-xs sm:text-sm font-black tracking-widest text-brand-gold font-sans">
              WANDA
            </h1>
            {currentCity && (
              <button
                onClick={() => setSearchModalType('pickup')}
                className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-inner cursor-pointer transition-colors"
                title="Changer de ville / position"
              >
                📍 {currentCity}
              </button>
            )}
          </div>
        </div>

        {/* Global Toolbar Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Small non-interactive Mode Indicator */}
          <span className="bg-brand-card/60 border border-brand-input px-2 py-0.5 rounded-full text-[9px] font-bold text-brand-gold flex items-center gap-1">
            {role === 'passenger' ? (language === 'fr' ? '👤 Passager' : '👤 Passenger') : (language === 'fr' ? '🚖 Chauffeur' : '🚖 Driver')}
          </span>

          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotificationDrawerOpen(true)}
            className="relative p-1.5 text-brand-gold hover:text-white bg-brand-card/60 hover:bg-brand-card border border-brand-input rounded-xl transition cursor-pointer shrink-0"
            title={language === 'fr' ? "Notifications" : "Notifications"}
            id="notification-bell-btn"
          >
            <Bell size={13} />
            {appNotifications.some(n => !n.read) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-gold rounded-full animate-ping" />
            )}
            {appNotifications.some(n => !n.read) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-gold rounded-full" />
            )}
          </button>

          {/* Language Toggle Group */}
          <div className="relative shrink-0" id="language-switcher-header">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 bg-brand-card/60 hover:bg-brand-card border border-brand-input rounded-xl text-[10px] font-black cursor-pointer transition shadow-sm text-brand-gold hover:text-white select-none"
              id="language-dropdown-trigger"
              title={language === 'fr' ? "Changer de langue" : "Change language"}
            >
              <Globe size={11} className="text-brand-gold shrink-0" />
              <span>{language === 'fr' ? "🇫🇷" : "🇬🇧"}</span>
              <ChevronDown size={9} className={`text-brand-text-muted transition-transform duration-200 ${langDropdownOpen ? 'rotate-180 text-brand-gold' : ''}`} />
            </button>

            <AnimatePresence>
              {langDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setLangDropdownOpen(false)}
                  />
                  
                  <motion.div 
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 mt-1.5 w-36 bg-brand-deep border border-brand-input rounded-xl shadow-xl py-1 z-50 overflow-hidden font-sans text-[10px]"
                    id="language-dropdown-menu"
                  >
                    <button
                      onClick={() => {
                        changeLanguage('en');
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer hover:bg-brand-card ${
                        language === 'en' 
                          ? 'bg-brand-gold/15 text-brand-gold font-extrabold' 
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                      id="lang-opt-en"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🇬🇧</span>
                        <span>English</span>
                      </span>
                      {language === 'en' && <Check size={12} className="text-brand-gold shrink-0" />}
                    </button>

                    <button
                      onClick={() => {
                        changeLanguage('fr');
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-all duration-150 cursor-pointer hover:bg-brand-card ${
                        language === 'fr' 
                          ? 'bg-brand-gold/15 text-brand-gold font-extrabold' 
                          : 'text-brand-text-muted hover:text-white'
                      }`}
                      id="lang-opt-fr"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>🇫🇷</span>
                        <span>Français</span>
                      </span>
                      {language === 'fr' && <Check size={12} className="text-brand-gold shrink-0" />}
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Signout */}
          <button
            onClick={handleLogout}
            title="Log Out Profile"
            className="p-1.5 text-brand-text-muted hover:text-rose-400 bg-brand-card/30 border border-brand-input rounded-xl hover:bg-brand-input transition cursor-pointer shrink-0"
          >
            <LogOut size={12} />
          </button>
        </div>

      </header>

      {/* Main split viewport layout */}
      <div 
        className={`flex flex-1 relative overflow-hidden ${
          role === 'passenger' && activeTab === 'booking'
            ? 'flex-col-reverse md:flex-row' 
            : rideStatus !== 'idle' && rideStatus !== 'searching' 
              ? 'flex-col-reverse md:flex-row' 
              : 'flex-col-reverse md:flex-row'
        }`} 
        id="app-main-view"
      >
        
        {/* Left Side Control Panel / Sliding Bottom Sheet */}
        <aside 
          className={`bg-brand-deep/95 backdrop-blur-md border-r border-brand-card/80 flex flex-col shrink-0 z-10 overflow-y-auto text-white rounded-t-3xl md:rounded-none shadow-2xl transition-all duration-300 ${
            isMapFullscreen || (role === 'driver' && rideStatus === 'in_progress')
              ? 'hidden md:hidden w-0 h-0 border-0'
              : role === 'passenger' && activeTab === 'booking'
                ? 'w-full md:w-96 h-[50vh] md:h-full border-t md:border-t-0 border-brand-card/80'
                : rideStatus !== 'idle' && rideStatus !== 'searching'
                  ? 'w-full md:w-96 h-[45vh] md:h-full border-t md:border-t-0 border-brand-card/80'
                  : 'w-full md:w-96 h-[50vh] md:h-full'
          }`} 
          id="sidebar-controls"
        >
          {/* Mobile Sheet Drag Handle Pill */}
          <div className="w-10 h-1 bg-brand-card/80 rounded-full mx-auto mt-2 mb-1 md:hidden shrink-0" />

          {/* ========================================================================= */}
          {/* PASSENGER ROLE COMPONENT */}
          {/* ========================================================================= */}
          {role === 'passenger' && (
            <div className="flex flex-col flex-1 p-3.5 sm:p-4 space-y-3.5">
              
              {/* Tab selector */}
              {(rideStatus === 'idle' || rideStatus === 'searching') && (
                <div className="flex border-b border-brand-card/80 pb-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setActiveTab('booking')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'booking' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Course" : "Book Ride"}
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('wallet');
                      setShowTabBalance(prev => !prev);
                    }}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'wallet' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    Wallet
                    <span 
                      className="text-[9px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-full font-black cursor-pointer hover:bg-brand-gold/20 transition-colors animate-pulse"
                      title={slangMode ? "Cliquer pour afficher/masquer" : "Click to show/hide balance"}
                    >
                      {showTabBalance ? `${passengerWallet.toLocaleString('fr-FR')} XAF` : '•••• XAF'}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'history' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Historique" : "Past Rides"}
                  </button>
                </div>
              )}

              {/* BOOKING TAB */}
              {activeTab === 'booking' && (
                <>
                  {rideStatus === 'idle' && (
                    <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        
                        {/* YANGO UX PATTERN - STEP 1: PROMINENT "WHERE TO?" SEARCH BAR & QUICK DESTINATION CHIPS */}
                        {!destination ? (
                          <div className="space-y-3">
                            {/* PROMINENT LIGHT ROUNDED "WHERE TO?" SEARCH BAR (YANGO STYLE) */}
                            <button
                              type="button"
                              onClick={() => { setSearchModalType('destination'); setSearchQuery(''); }}
                              className="w-full bg-white text-slate-900 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 shadow-xl flex items-center justify-between transition-all transform hover:scale-[1.005] active:scale-[0.995] cursor-pointer group"
                              id="where-to-search-bar"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-amber-400/25 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors">
                                  <Car size={20} className="stroke-[2.5]" />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="block text-[8.5px] uppercase font-mono tracking-widest text-slate-500 font-black">
                                    {slangMode ? "DESTINATION" : "DESTINATION"}
                                  </span>
                                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight block truncate">
                                    {slangMode ? "Où allez-vous ?" : "Where to?"}
                                  </span>
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-900 transition-colors shrink-0 shadow-sm">
                                <ArrowRight size={16} className="stroke-[2.5]" />
                              </div>
                            </button>

                            {/* Single Clean Pickup Bar under "Where to?" */}
                            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                              <button
                                type="button"
                                onClick={() => { setSearchModalType('pickup'); setSearchQuery(''); }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[8.5px] uppercase font-mono tracking-wider text-brand-text-muted font-bold">
                                    {slangMode ? "POINT DE DÉPART (AUTO-DÉTECTÉ)" : "PICKUP (AUTO-DETECTED)"}
                                  </p>
                                  <p className="text-xs font-bold text-white truncate group-hover:text-brand-gold transition-colors">
                                    {pickup ? pickup.name : (slangMode ? 'Position GPS Actuelle' : 'Current GPS Location')}
                                  </p>
                                </div>
                              </button>
                              <button 
                                onClick={() => geolocateCurrentPosition()}
                                className="text-[10px] bg-brand-input hover:bg-brand-card border border-brand-card text-brand-gold font-bold px-2.5 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                                title={slangMode ? "Recentrer GPS" : "Re-center GPS"}
                              >
                                🎯 GPS
                              </button>
                            </div>

                            {/* FREQUENT & RECENT DESTINATIONS CHIPS */}
                            <div className="space-y-2 pt-1">
                              <span className="text-[9.5px] font-black uppercase text-brand-text-muted tracking-wider block">
                                📍 {slangMode ? "DESTINATIONS POPULAIRES" : "POPULAR DESTINATIONS"}
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                {activeCityLocations.slice(1, 5).map((loc) => (
                                  <button
                                    key={loc.name}
                                    onClick={() => setDestination(loc)}
                                    className="p-2.5 bg-brand-card/40 hover:bg-brand-card border border-brand-input hover:border-brand-gold/40 rounded-xl text-left transition cursor-pointer flex items-center gap-2 group"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-brand-input flex items-center justify-center text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-midnight transition-colors shrink-0">
                                      <Navigation size={13} className="rotate-45" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-white truncate">{loc.name}</p>
                                      <p className="text-[8.5px] text-brand-text-muted font-semibold truncate">{currentCity}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* SMALL DISMISSIBLE PROMO CARD */}
                            {showPromoBanner && systemSettings.topupPromoActive && (
                              <div className="bg-gradient-to-r from-brand-gold/15 via-brand-card to-brand-midnight border border-brand-gold/30 rounded-2xl p-3 flex items-center justify-between text-xs gap-2 shrink-0 shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 rounded-xl bg-brand-gold/20 text-brand-gold shrink-0">
                                    <Gift size={14} />
                                  </div>
                                  <div className="min-w-0 leading-snug">
                                    <span className="text-[9px] font-black uppercase text-brand-gold tracking-wider block">
                                      🎁 {slangMode ? "WANDA PROMO !" : "WANDA PROMO !"}
                                    </span>
                                    <span className="text-[10px] text-brand-text-muted font-medium truncate block">
                                      Paye par Wallet = <strong className="text-brand-gold">-15% sur tes courses</strong>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => setActiveTab('wallet')}
                                    className="bg-brand-gold hover:bg-white text-brand-midnight text-[9px] font-black px-2 py-1 rounded-lg transition cursor-pointer"
                                  >
                                    {slangMode ? "RECHARGER" : "TOP UP"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowPromoBanner(false);
                                      localStorage.setItem('wanda_topup_promo_dismissed', 'true');
                                    }}
                                    className="text-brand-text-muted hover:text-white p-1 cursor-pointer"
                                    title="Fermer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* YANGO UX PATTERN - STEP 2: RIDE CLASS + DUAL PRICING (WALLET VS CASH) SELECTION */
                          <div className="space-y-3 animate-fade-in">
                            
                            {/* Compact Route Summary Bar */}
                            <div className="bg-brand-card/40 border border-brand-card/80 rounded-2xl p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                <span className="font-extrabold text-white truncate">{pickup?.name.split('(')[0]}</span>
                                <span className="text-brand-text-muted font-bold">→</span>
                                <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0" />
                                <span className="font-extrabold text-brand-gold truncate">{destination?.name.split('(')[0]}</span>
                              </div>
                              <button
                                onClick={() => setDestination(null)}
                                className="text-[10px] text-brand-text-muted hover:text-white font-bold underline cursor-pointer shrink-0 ml-2"
                              >
                                {slangMode ? "Changer" : "Edit"}
                              </button>
                            </div>

                            {/* Route Distance & Duration Pill */}
                            <div className="flex items-center justify-between px-3 py-1.5 bg-brand-input/40 border border-brand-card rounded-xl text-[10px] text-brand-text-muted font-semibold">
                              <span>🏁 {rideDistance} KM</span>
                              <span>🕒 {Math.round(rideDistance * 1.5) + 3} mins</span>
                              {/* Subtle Traffic Delay Badge */}
                              <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                                🚦 {slangMode ? "Trafic normal" : "Normal traffic"}
                              </span>
                            </div>

                            {/* DUAL PRICING TOGGLE (WALLET VS CASH) */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-black uppercase text-brand-text-muted tracking-wider">
                                <span>{slangMode ? "MODE DE PAIEMENT" : "PAYMENT METHOD"}</span>
                              </div>
                              <div className="grid grid-cols-2 bg-brand-input border border-brand-card/80 p-1 rounded-xl gap-1">
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('wallet')}
                                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${paymentMethod === 'wallet' ? 'bg-brand-gold text-brand-midnight shadow' : 'text-brand-text-muted hover:text-white'}`}
                                >
                                  <span>💰 Wallet</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod('cash')}
                                  className={`py-1.5 px-2 rounded-lg font-black text-xs transition cursor-pointer flex items-center justify-center gap-1 ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white shadow' : 'text-brand-text-muted hover:text-white'}`}
                                >
                                  <span>💵 Cash</span>
                                </button>
                              </div>
                            </div>

                            {/* RIDE CLASS CARDS LIST */}
                            <div className="space-y-2 py-1">
                              {RIDE_CLASSES.map((rc) => {
                                const clsBaseFare = systemSettings.classRates?.[rc.id]?.baseFare ?? rc.baseFare;
                                const clsPerKm = systemSettings.classRates?.[rc.id]?.perKm ?? rc.perKm;
                                const rcBaseFare = Math.round((clsBaseFare + (rideDistance * clsPerKm)) * systemSettings.surgeMultiplier);
                                const rcWalletFare = Math.round(rcBaseFare * 0.85);
                                const isSelected = selectedClassId === rc.id;

                                return (
                                  <div
                                    key={rc.id}
                                    onClick={() => setSelectedClassId(rc.id)}
                                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${isSelected ? 'bg-brand-gold/10 border-brand-gold shadow-md' : 'bg-brand-card/40 border-brand-input hover:bg-brand-card/60'}`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-brand-gold text-brand-midnight' : 'bg-brand-input text-brand-text-muted'}`}>
                                        {rc.icon === 'Bike' && <Bike size={18} />}
                                        {rc.icon === 'Tricycle' && <span className="text-lg font-bold">🛺</span>}
                                        {rc.icon === 'Car' && <Car size={18} />}
                                        {rc.icon === 'Suv' && <span className="text-lg font-bold">🚘</span>}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-black text-white truncate">{rc.name}</p>
                                        <p className="text-[9.5px] text-brand-text-muted font-semibold truncate">{rc.eta} min • {rc.description}</p>
                                      </div>
                                    </div>

                                    {/* Both Actual Prices Displayed in FCFA (Wallet vs Cash) */}
                                    <div className="text-right shrink-0 flex flex-col justify-center items-end space-y-0.5">
                                      {/* Wallet Price - Emphasized & Bold */}
                                      <div className="flex items-center justify-end gap-1 font-mono">
                                        <span className="text-[9px] uppercase font-black text-brand-gold tracking-tight">Wallet:</span>
                                        <span className={`font-mono font-black ${paymentMethod === 'wallet' ? 'text-brand-gold text-xs sm:text-sm' : 'text-emerald-400 text-xs'}`}>
                                          {rcWalletFare.toLocaleString('fr-FR')} FCFA
                                        </span>
                                      </div>
                                      {/* Cash Price - Clearly Readable Actual Amount */}
                                      <div className="flex items-center justify-end gap-1 font-mono">
                                        <span className="text-[9px] uppercase font-bold text-brand-text-muted tracking-tight">Cash:</span>
                                        <span className={`font-mono font-bold ${paymentMethod === 'cash' ? 'text-white text-xs' : 'text-slate-300 text-[10.5px]'}`}>
                                          {rcBaseFare.toLocaleString('fr-FR')} FCFA
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        )}

                      </div>

                      {/* CONFIRMation & SOS BUTTONS FOOTER */}
                      <div className="pt-2 border-t border-brand-card/80 flex items-center gap-2 shrink-0">
                        <button
                          onClick={triggerSOS}
                          className="w-10 h-10 rounded-xl bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 text-rose-400 hover:text-white flex items-center justify-center cursor-pointer transition shrink-0 shadow-sm"
                          title="Sécurité SOS"
                        >
                          <span className="text-xs font-black">🚨</span>
                        </button>

                        {/* Submit Request */}
                        <button
                          onClick={handleBookRide}
                          disabled={!pickup || !destination}
                          className="flex-1 bg-gradient-to-r from-brand-gold via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-brand-gold text-brand-midnight font-black py-2.5 px-3.5 rounded-xl flex items-center justify-between cursor-pointer shadow-md shadow-brand-gold/15 hover:scale-[1.005] active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
                          id="book-ride-main-btn"
                        >
                          <span className="text-xs font-black uppercase tracking-wider">
                            {slangMode ? "Commander Wanda" : "Confirm Taxi"}
                          </span>
                          <span className="text-xs font-black font-mono bg-brand-midnight text-brand-gold px-2.5 py-0.5 rounded-lg">
                            {finalFareToPay.toLocaleString('fr-FR')} FCFA
                          </span>
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Contacting Drivers Radar Simulation */}
                  {rideStatus === 'searching' && (
                    <div className="flex flex-col items-center justify-center py-10 flex-1 space-y-6">
                      <div className="relative flex items-center justify-center w-32 h-32">
                        <div className="absolute inset-0 bg-brand-gold/15 rounded-full animate-ping"></div>
                        <div className="absolute w-24 h-24 bg-brand-gold/25 rounded-full animate-pulse"></div>
                        <div className="absolute w-16 h-16 bg-brand-gold/35 rounded-full"></div>
                        <div className="relative p-4 bg-brand-gold text-brand-midnight rounded-full z-10 shadow-lg shadow-brand-gold/30">
                          <Loader2 size={26} className="animate-spin" />
                        </div>
                      </div>
                      
                      <div className="text-center space-y-1">
                        <h3 className="text-sm font-extrabold text-white">{slangMode ? "Recherche d'un djo de confiance..." : "Contacting closest drivers..."}</h3>
                        <p className="text-[11px] text-brand-text-muted max-w-xs leading-normal font-medium">
                          {slangMode ? "On scanne les chauffeurs agréés près de toi..." : "Connecting travel path with vetted drivers..."}
                        </p>
                      </div>

                      <div className="bg-brand-card/40 border border-brand-card p-3 rounded-xl w-full text-center">
                        <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider block">Boarding Ledger Reserved</span>
                        <p className="text-[11px] text-emerald-400 font-mono font-bold mt-1">
                          {paymentMethod === 'wallet' ? `✓ Paid via Wallet (-${walletPrice.toLocaleString('fr-FR')} XAF)` : `✓ Cash Settlement Approved (${cashPrice.toLocaleString('fr-FR')} XAF)`}
                        </p>
                      </div>

                      <button
                        onClick={handleCancelBooking}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline px-4 py-2 border border-rose-950/50 bg-rose-950/20 rounded-xl cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {/* Active driver assigned */}
                  {(rideStatus === 'driver_found' || rideStatus === 'arriving' || rideStatus === 'in_progress') && activeDriver && (
                    <div className="flex flex-col flex-1 justify-between space-y-4">
                      
                      {/* Driver Assignee Card */}
                      <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                            rideStatus === 'driver_found' ? 'bg-brand-gold text-brand-midnight' :
                            rideStatus === 'arriving' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                          }`}>
                            {rideStatus === 'driver_found' && (slangMode ? 'Le djo arrive' : 'Driver Heading to You')}
                            {rideStatus === 'arriving' && (slangMode ? 'Le djo est là !' : 'Driver Arrived!')}
                            {rideStatus === 'in_progress' && (slangMode ? 'En route...' : 'Trip in Progress')}
                          </span>
                          <span className="text-[10px] text-brand-text-muted font-mono flex items-center gap-1 font-bold">
                            OTP Boarding Code: <strong className="text-emerald-400 text-xs font-bold">4810</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <img
                            src={activeDriver.avatar}
                            alt={activeDriver.name}
                            className="w-12 h-12 rounded-xl object-cover border border-brand-card"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <h4 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                              {activeDriver.name}
                              <span className="flex items-center text-[10px] text-brand-gold font-normal">
                                <Star size={10} className="fill-brand-gold text-brand-gold mr-0.5" />
                                {activeDriver.rating}
                              </span>
                            </h4>
                            {(() => {
                              const displayColor = activeDriver.vehicleColor || 
                                (activeDriver.vehicleModel.toLowerCase().includes('black') || activeDriver.vehicleModel.toLowerCase().includes('noir') ? 'Noir' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('silver') || activeDriver.vehicleModel.toLowerCase().includes('argent') ? 'Silver' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('yellow') || activeDriver.vehicleModel.toLowerCase().includes('jaune') ? 'Jaune' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('red') || activeDriver.vehicleModel.toLowerCase().includes('rouge') ? 'Rouge' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('gray') || activeDriver.vehicleModel.toLowerCase().includes('gris') ? 'Gris' : 
                                 activeDriver.vehicleModel.toLowerCase().includes('white') || activeDriver.vehicleModel.toLowerCase().includes('blanc') ? 'Blanc' : 'Jaune');
                              
                              return (
                                <div className="space-y-1.5 mt-0.5">
                                  <p className="text-[11px] text-brand-text-muted font-medium leading-tight">{activeDriver.vehicleModel}</p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono font-black text-brand-midnight bg-brand-gold px-2 py-0.5 rounded shadow-sm border border-brand-gold/60 tracking-wider">
                                      🎫 {activeDriver.vehiclePlate}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-input border border-brand-card text-[10px] font-extrabold text-white">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTailwindColorForName(displayColor) }} />
                                      {slangMode ? `Couleur: ${displayColor}` : `Color: ${displayColor}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Miniature Map view for active ride tracking - hidden because the main map is now fully visible and dominant */}
                        {/* 
                        <MiniatureMap
                          pickup={pickup}
                          destination={destination}
                          driverLoc={driverLoc}
                          rideStatus={rideStatus}
                          driverType={selectedClassId}
                          slangMode={slangMode}
                        />
                        */}

                        {/* AC / waiting stats */}
                        <div className="bg-brand-input border border-brand-card/80 p-3.5 rounded-xl space-y-2 text-xs">
                          <div className="space-y-1">
                            <p className="text-brand-text-muted font-bold tracking-wide text-[10px] uppercase">
                              {rideStatus === 'driver_found' && (slangMode ? "Arrivée estimée :" : "ETA to Pickup:")}
                              {rideStatus === 'arriving' && (slangMode ? "Le chauffeur t'attend au point de ramassage :" : "Driver is parked outside!")}
                              {rideStatus === 'in_progress' && (slangMode ? "Destination de dépôt :" : "Dropoff Destination:")}
                            </p>
                            
                            {rideStatus === 'driver_found' ? (
                              <div className="space-y-1.5 w-full">
                                <div className="flex items-center justify-between">
                                  <motion.div 
                                    key={etaMinutes} 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ 
                                      scale: [0.9, 1.05, 1],
                                      opacity: 1,
                                    }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="font-black text-white flex items-center gap-2"
                                  >
                                    <Clock size={16} className="text-brand-gold animate-pulse shrink-0" /> 
                                    <span className="text-brand-gold font-mono font-black text-xl tracking-tight">
                                      <LiveCountdownTimer
                                        driverLoc={driverLoc}
                                        targetLoc={pickup}
                                        etaMinutes={etaMinutes}
                                        slangMode={slangMode}
                                        size="lg"
                                        showLabel={false}
                                      />
                                    </span>
                                  </motion.div>

                                  {/* Pulsing indicator light */}
                                  <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                                  </span>
                                </div>

                                {/* Traffic Update Message */}
                                <AnimatePresence mode="wait">
                                  {etaStatusText && (
                                    <motion.div
                                      key={etaStatusText}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 10 }}
                                      transition={{ duration: 0.3 }}
                                      className="text-[10px] font-bold text-brand-text-muted bg-brand-card/50 border border-brand-input px-2.5 py-1 rounded-lg flex items-center gap-1.5 mt-1"
                                    >
                                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse shrink-0" />
                                      <span className="truncate">{etaStatusText}</span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <p className="font-black text-white flex items-center gap-1.5">
                                {rideStatus === 'arriving' && <><CheckCircle size={12} className="text-emerald-400 animate-bounce" /> {pickup?.name}</>}
                                {rideStatus === 'in_progress' && <><Navigation size={12} className="text-brand-gold rotate-45" /> {destination?.name}</>}
                              </p>
                            )}
                          </div>

                          {rideStatus === 'arriving' && (
                            <div className="bg-amber-500/10 border border-brand-gold/20 p-2 rounded-lg space-y-1 mt-1 text-[11px]">
                              <p className="font-extrabold text-brand-gold flex items-center gap-1.5 animate-pulse">
                                <Clock size={11} />
                                <span>{slangMode ? "Compteur d'attente actif" : "Waiting Timer Active"}</span>
                              </p>
                              <div className="flex justify-between items-center text-[10px] text-brand-text-muted font-bold">
                                <span>{slangMode ? "Temps d'attente :" : "Waiting time:"} <strong className="text-white font-mono">{String(Math.floor(waitingTime / 60)).padStart(2, '0')}:{String(waitingTime % 60).padStart(2, '0')}</strong></span>
                                <span>{slangMode ? "Frais d'attente :" : "Waiting Fee:"} <strong className="text-brand-gold font-mono">+{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA</strong></span>
                              </div>
                              <p className="text-[9px] text-brand-text-muted leading-tight">
                                {waitingTime <= 10 ? (
                                  <span className="text-emerald-400 font-semibold">{slangMode ? "Période de grâce de 10s gratuite en cours." : "10s free grace period is active."}</span>
                                ) : (
                                  <span className="text-brand-gold font-semibold">{slangMode ? "Période de grâce expirée. 100 FCFA/sec de frais d'attente s'appliquent." : "Grace period ended. 100 FCFA/sec waiting surcharge applies."}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Detailed Ride Summary when trip is in progress */}
                        {rideStatus === 'in_progress' && (() => {
                          const total = (pickup && destination) ? getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng) : 0;
                          const remaining = (driverLoc && destination) ? getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng) : 0;
                          const progress = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;

                          const radius = 34;
                          const stroke = 4.5;
                          const normalizedRadius = radius - stroke;
                          const circumference = normalizedRadius * 2 * Math.PI;
                          const strokeDashoffset = circumference - (progress / 100) * circumference;

                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.4 }}
                              className="bg-brand-card/30 border border-brand-gold/15 rounded-2xl p-3.5 space-y-3 mt-2 shadow-lg"
                              id="passenger-ride-summary-card"
                            >
                              {/* Section Title */}
                              <div className="flex items-center justify-between border-b border-brand-input pb-2">
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                                  <ShieldCheck size={11} className="text-brand-gold animate-pulse" />
                                  {slangMode ? "Résumé de la course" : "Ride Summary Details"}
                                </h5>
                                <span className="text-[9px] bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-2 py-0.5 rounded-full font-bold">
                                  {slangMode ? "En route" : "On Trip"}
                                </span>
                              </div>

                              {/* Layout side-by-side: Ride details left, Circular progress right */}
                              <div className="flex gap-3 items-stretch">
                                {/* Left Side: Details Column */}
                                <div className="flex-1 space-y-3 min-w-0 flex flex-col justify-between">
                                  {/* Dynamic Ride details Grid */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Estimated Fare & Payment Method */}
                                    <div className="bg-brand-input/60 border border-brand-input p-2 rounded-xl flex flex-col justify-between space-y-1">
                                      <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                        <DollarSign size={10} className="text-brand-gold" />
                                        {slangMode ? "Tarif estimé" : "Estimated Fare"}
                                      </span>
                                      <div className="space-y-0.5">
                                        <p className="font-mono font-black text-brand-gold text-xs sm:text-sm">
                                          {activeFareToCharge.toLocaleString('fr-FR')} FCFA
                                        </p>
                                        <span className="text-[8px] text-white font-extrabold flex items-center gap-0.5 leading-tight truncate">
                                          <CreditCard size={8} className="text-brand-text-muted shrink-0" />
                                          {paymentMethod === 'wallet' ? (slangMode ? "Wanda Wallet (-15%)" : "Wanda Wallet (-15%)") :
                                           paymentMethod === 'momo_mtn' ? "MTN MoMo" :
                                           paymentMethod === 'orange_money' ? "Orange Money" : (slangMode ? "Cash" : "Cash")}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Ride Class details */}
                                    {(() => {
                                      const rc = RIDE_CLASSES.find(c => c.id === selectedClassId) || RIDE_CLASSES[2];
                                      return (
                                        <div className="bg-brand-input/60 border border-brand-input p-2 rounded-xl flex flex-col justify-between space-y-1">
                                          <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                            <Compass size={10} className="text-brand-gold" />
                                            {slangMode ? "Catégorie" : "Service Class"}
                                          </span>
                                          <div className="space-y-0.5">
                                            <p className="font-black text-white text-[10px] truncate flex items-center gap-1">
                                              {rc.id === 'okada' ? <Bike size={10} className="text-brand-gold shrink-0" /> : <Car size={10} className="text-brand-gold shrink-0" />}
                                              {rc.name}
                                            </p>
                                            <p className="text-[8px] text-brand-text-muted leading-tight truncate" title={rc.description}>
                                              {rc.description}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Vehicle Specs specs info inside left pane */}
                                  <div className="bg-brand-midnight/40 border border-brand-input/50 rounded-xl p-2 space-y-1 text-[9px] flex-1 flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-brand-text-muted font-bold uppercase tracking-wider text-[8px]">
                                      <span>{slangMode ? "Infos du véhicule" : "Vehicle Specs"}</span>
                                      <span className="text-brand-gold font-mono">{activeDriver.vehiclePlate}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-white truncate font-extrabold mt-0.5">
                                      <span>{activeDriver.vehicleModel}</span>
                                      <span className="w-1 h-1 rounded-full bg-brand-input shrink-0" />
                                      <span className="text-brand-text-muted font-semibold text-[8px]">
                                        {activeDriver.vehicleColor || "Yellow"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Circular Progress Card */}
                                <div className="w-24 xs:w-28 bg-brand-input/60 border border-brand-input rounded-xl p-2 flex flex-col items-center justify-center space-y-2 shrink-0">
                                  <div className="relative flex items-center justify-center">
                                    {/* Simple custom SVG */}
                                    <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                                      {/* Background track circle */}
                                      <circle
                                        stroke="rgba(255, 211, 133, 0.1)"
                                        fill="transparent"
                                        strokeWidth={stroke}
                                        r={normalizedRadius}
                                        cx={radius}
                                        cy={radius}
                                      />
                                      {/* Glowing active progress circle with fluid framer-motion transition */}
                                      <motion.circle
                                        stroke="#ffd385"
                                        fill="transparent"
                                        strokeWidth={stroke}
                                        strokeLinecap="round"
                                        r={normalizedRadius}
                                        cx={radius}
                                        cy={radius}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset }}
                                        transition={{
                                          duration: 1.2,
                                          ease: [0.25, 1, 0.5, 1] // Custom fluid easeOutQuint
                                        }}
                                        style={{
                                          strokeDasharray: circumference,
                                          filter: 'drop-shadow(0 0 3px rgba(226, 193, 141, 0.6))'
                                        }}
                                      />
                                    </svg>
                                    
                                    {/* Centered progress text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                      <span className="text-xs font-black text-brand-gold font-mono">{progress}%</span>
                                      <span className="text-[7px] text-brand-text-muted font-extrabold uppercase mt-0.5">
                                        {slangMode ? "Ok" : "Done"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress summary label */}
                                  <div className="text-center space-y-0.5 border-b border-brand-input/30 pb-1.5 w-full">
                                    <span className="text-[8px] text-brand-text-muted font-bold uppercase tracking-widest block leading-none">
                                      {slangMode ? "Distance" : "Trip"}
                                    </span>
                                    <span className="text-[9px] text-white font-mono font-extrabold block leading-none">
                                      {remaining > 0 ? `${remaining.toFixed(1)} km` : "0 km"}
                                    </span>
                                    <span className="text-[7px] text-brand-gold font-semibold block leading-none">
                                      {slangMode ? "restant" : "remaining"}
                                    </span>
                                  </div>

                                  {/* Live Dynamic ETA Block */}
                                  <div className="text-center space-y-0.5 w-full">
                                    <span className="text-[8px] text-brand-gold font-bold uppercase tracking-widest block leading-none animate-pulse">
                                      {slangMode ? "ETA Estimé" : "ETA"}
                                    </span>
                                    <span className="text-[10px] text-white font-mono font-black block leading-none">
                                      <LiveCountdownTimer
                                        driverLoc={driverLoc}
                                        targetLoc={rideStatus === 'driver_found' ? pickup : destination}
                                        etaMinutes={etaMinutes}
                                        slangMode={slangMode}
                                        size="sm"
                                        showLabel={false}
                                      />
                                    </span>
                                    <span className="text-[6.5px] text-brand-text-muted font-bold block leading-none whitespace-normal px-0.5 mt-0.5">
                                      {etaStatusText || (slangMode ? "Trafic normal" : "Normal traffic")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Driver Specs */}
                              <div className="bg-brand-midnight/60 border-t border-brand-input/30 pt-2 flex justify-between items-center text-[10px] text-brand-text-muted font-semibold px-1">
                                <span>{slangMode ? "Chauffeur assigné :" : "Assigned Driver:"} <strong className="text-white font-extrabold">{activeDriver.name}</strong></span>
                                <span className="flex items-center text-brand-gold font-bold bg-brand-gold/10 px-1.5 py-0.5 rounded-md border border-brand-gold/10">
                                  <Star size={9} className="fill-brand-gold text-brand-gold mr-0.5 shrink-0" />
                                  {activeDriver.rating}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })()}

                        {/* Real-time Journey Progress Bar */}
                        {(() => {
                          if (!pickup || !driverLoc) return null;
                          
                          let label = '';
                          let remainingKm = 0;
                          let progress = 0;
                          let fromName = '';
                          let toName = '';
                          
                          if (rideStatus === 'driver_found') {
                            const initialLat = activeDriver.lat;
                            const initialLng = activeDriver.lng;
                            const total = getDistanceKm(initialLat, initialLng, pickup.lat, pickup.lng);
                            const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, pickup.lat, pickup.lng);
                            progress = total > 0 ? Math.max(0, Math.min(99, Math.round((1 - remaining / total) * 100))) : 0;
                            remainingKm = remaining;
                            label = slangMode ? "Ramassage du djo" : "Heading to Pickup";
                            fromName = slangMode ? "Chauffeur départ" : "Driver Start";
                            toName = pickup.name;
                          } else if (rideStatus === 'arriving') {
                            progress = 100;
                            remainingKm = 0;
                            label = slangMode ? "Le djo est là !" : "Driver Arrived";
                            fromName = slangMode ? "Chauffeur départ" : "Driver Start";
                            toName = pickup.name;
                          } else if (rideStatus === 'in_progress' && destination) {
                            const total = getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
                            const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng);
                            progress = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;
                            remainingKm = remaining;
                            label = slangMode ? "Course en cours" : "Journey Progress";
                            fromName = pickup.name;
                            toName = destination.name;
                          } else {
                            return null;
                          }

                          // Calculate estimated time in minutes & arrival clock time
                          const calculatedTimeMin = etaMinutes ?? (remainingKm > 0 ? Math.max(1, Math.round(remainingKm * 2.5)) : 1);
                          const now = new Date();
                          const arrivalDate = new Date(now.getTime() + Math.round(calculatedTimeMin * 60 * 1000));
                          const formattedArrivalTime = arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          const totalKm = getDistanceKm(pickup.lat, pickup.lng, destination ? destination.lat : pickup.lat, destination ? destination.lng : pickup.lng) || 1;

                          return (
                            <div className="mt-2" id="passenger-trip-progress">
                              {!isProgressExpanded ? (
                                <button
                                  type="button"
                                  onClick={() => setIsProgressExpanded(true)}
                                  className="w-full py-2.5 px-3.5 bg-brand-input/80 hover:bg-brand-input border border-brand-card/80 hover:border-brand-gold/50 rounded-2xl flex items-center justify-between text-xs text-brand-text-muted hover:text-white transition-all cursor-pointer shadow-md group active:scale-98"
                                  title={slangMode ? "Afficher les détails du trajet" : "Show detailed progress bar"}
                                >
                                  <div className="flex items-center gap-2.5 font-extrabold text-[11px] min-w-0">
                                    <div className="w-6.5 h-6.5 rounded-xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                      <Gauge size={13} className="text-brand-gold" />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-white truncate font-bold">{label}</span>
                                      <span className="font-mono text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2 py-0.5 rounded-md text-[10px] font-black shrink-0">
                                        {progress}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-brand-gold font-black bg-brand-card px-2.5 py-1 rounded-xl border border-brand-input shrink-0">
                                    <span>{calculatedTimeMin <= 0.5 ? "< 1 min" : `${calculatedTimeMin} min`}</span>
                                    <ChevronDown size={13} className="stroke-[2.5]" />
                                  </div>
                                </button>
                              ) : (
                                <div className="bg-brand-input border border-brand-card/80 p-3.5 rounded-2xl space-y-3 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
                                  <div className="flex justify-between items-center pb-2 border-b border-brand-card/60">
                                    <span className="text-brand-text-muted font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full bg-brand-gold animate-ping" />
                                      {label} ({progress}%)
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setIsProgressExpanded(false)}
                                      className="p-1 px-2 text-brand-text-muted hover:text-white bg-brand-card border border-brand-input rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                      title={slangMode ? "Masquer" : "Hide"}
                                    >
                                      <span>{slangMode ? "Masquer" : "Hide"}</span>
                                      <ChevronUp size={13} className="stroke-[2.5]" />
                                    </button>
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-brand-text-muted font-black uppercase tracking-wider text-[9px]">
                                        {slangMode ? "PROGRESSION DÉTAILLÉE" : "DETAILED METRIC"}
                                      </span>

                                      {/* Value Badge that smoothly animates between Estimated Time and Estimated Distance */}
                                      <AnimatePresence mode="wait">
                                        {summaryMetricMode === 'time' ? (
                                          <motion.div
                                            key="time-value"
                                            initial={{ opacity: 0, y: -4, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.92 }}
                                            transition={{ duration: 0.2 }}
                                            className="font-mono font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2.5 py-1 rounded-lg text-[10px] shadow-sm flex items-center gap-1.5"
                                          >
                                            <Clock size={12} className="text-brand-gold animate-pulse shrink-0" />
                                            <span>
                                              {calculatedTimeMin <= 0.5
                                                ? (slangMode ? "< 1 min (Arrivée)" : "< 1 min (Arriving)")
                                                : `${calculatedTimeMin} min ${slangMode ? "estimé" : "ETA"}`}
                                            </span>
                                            <span className="text-[9px] text-brand-text-muted font-normal border-l border-brand-gold/20 pl-1.5">
                                              ~{formattedArrivalTime}
                                            </span>
                                          </motion.div>
                                        ) : (
                                          <motion.div
                                            key="distance-value"
                                            initial={{ opacity: 0, y: -4, scale: 0.92 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.92 }}
                                            transition={{ duration: 0.2 }}
                                            className="font-mono font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2.5 py-1 rounded-lg text-[10px] shadow-sm flex items-center gap-1.5"
                                          >
                                            <Ruler size={12} className="text-brand-gold shrink-0" />
                                            <span>
                                              {remainingKm.toFixed(1)} km {slangMode ? "restant" : "remaining"}
                                            </span>
                                            <span className="text-[9px] text-brand-text-muted font-normal border-l border-brand-gold/20 pl-1.5">
                                              {(totalKm - remainingKm > 0 ? (totalKm - remainingKm).toFixed(1) : '0.0')}/{totalKm.toFixed(1)} km
                                            </span>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {/* Visual Segmented Toggle Switch for Time vs Distance */}
                                    <div className="flex items-center justify-between bg-brand-midnight/80 p-1 rounded-lg border border-brand-card/80">
                                      <span className="text-[9px] font-black uppercase text-brand-text-muted px-1.5 flex items-center gap-1 tracking-wider">
                                        {slangMode ? "AFFICHAGE :" : "SUMMARY METRIC:"}
                                      </span>
                                      <div className="flex bg-brand-deep p-0.5 rounded-md border border-brand-input/40 relative">
                                        <button
                                          type="button"
                                          onClick={() => setSummaryMetricMode('time')}
                                          className={`relative px-2 py-0.5 text-[9.5px] font-extrabold rounded flex items-center gap-1 transition-all z-10 cursor-pointer ${
                                            summaryMetricMode === 'time' ? 'text-brand-midnight font-black' : 'text-brand-text-muted hover:text-white'
                                          }`}
                                        >
                                          {summaryMetricMode === 'time' && (
                                            <motion.div
                                              layoutId="activeSummaryMetricPill"
                                              className="absolute inset-0 bg-brand-gold rounded shadow-sm -z-10"
                                              transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                            />
                                          )}
                                          <Clock size={10} className={summaryMetricMode === 'time' ? 'stroke-[2.5]' : ''} />
                                          <span>{slangMode ? "Temps Estimé" : "Est. Time"}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setSummaryMetricMode('distance')}
                                          className={`relative px-2 py-0.5 text-[9.5px] font-extrabold rounded flex items-center gap-1 transition-all z-10 cursor-pointer ${
                                            summaryMetricMode === 'distance' ? 'text-brand-midnight font-black' : 'text-brand-text-muted hover:text-white'
                                          }`}
                                        >
                                          {summaryMetricMode === 'distance' && (
                                            <motion.div
                                              layoutId="activeSummaryMetricPill"
                                              className="absolute inset-0 bg-brand-gold rounded shadow-sm -z-10"
                                              transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                            />
                                          )}
                                          <Ruler size={10} className={summaryMetricMode === 'distance' ? 'stroke-[2.5]' : ''} />
                                          <span>{slangMode ? "Distance Estimée" : "Est. Distance"}</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Progress bar track */}
                                  <div className="relative w-full h-3 bg-brand-card border border-brand-input rounded-full overflow-visible my-3">
                                    {/* Glowing ambient trail underneath */}
                                    <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-[1px]"></div>
                                    
                                    {/* Progress track background shimmer line */}
                                    <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_2s_infinite]"></div>

                                    {/* Animated active progress fill with dual-layered glowing trail effect */}
                                    <motion.div
                                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold/80 via-brand-gold to-yellow-400 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.6)] overflow-hidden"
                                      initial={{ width: '0%' }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ type: "spring", stiffness: 70, damping: 14 }}
                                    >
                                      {/* Framer Motion sweep light particle inside the progress fill */}
                                      {progress > 0 && (
                                        <motion.div
                                          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                          animate={{
                                            x: ['-100%', '300%']
                                          }}
                                          transition={{
                                            repeat: Infinity,
                                            duration: 1.8,
                                            ease: "easeInOut"
                                          }}
                                        />
                                      )}
                                    </motion.div>

                                    {/* Background glowing pulse trail radiating behind the moving taxi */}
                                    {progress > 0 && (
                                      <motion.div
                                        className="absolute top-0 h-full bg-gradient-to-r from-transparent to-brand-gold/35 blur-[2px] rounded-full"
                                        initial={{ width: '0%' }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: "spring", stiffness: 70, damping: 14 }}
                                      />
                                    )}

                                    {/* Moving taxi icon riding the bar with a pulsing trailing beacon */}
                                    <motion.div
                                      className="absolute -top-1.5 -ml-3 w-6 h-6 bg-brand-gold text-brand-midnight border-2 border-brand-midnight rounded-full flex items-center justify-center shadow-lg cursor-pointer z-10"
                                      animate={{ 
                                        left: `${progress}%`,
                                        scale: [1, 1.08, 1]
                                      }}
                                      transition={{ 
                                        left: { type: "spring", stiffness: 70, damping: 14 },
                                        scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                      }}
                                      title={slangMode ? "Position du djo" : "Driver Position"}
                                    >
                                      {/* Pulsing glow aura following the taxi */}
                                      <motion.div
                                        className="absolute -inset-1.5 bg-brand-gold/35 rounded-full -z-10 blur-[3px]"
                                        animate={{
                                          scale: [1, 1.4, 1],
                                          opacity: [0.6, 0.1, 0.6]
                                        }}
                                        transition={{
                                          repeat: Infinity,
                                          duration: 1.5,
                                          ease: "easeOut"
                                        }}
                                      />
                                      {/* Small compact taxi svg icon */}
                                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4h14v4zM7.5 14c-.83 0-1.5.67-1.5 1s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                                      </svg>
                                    </motion.div>
                                  </div>

                                  {/* Progress Track labels */}
                                  <div className="flex justify-between text-[9px] text-brand-text-muted font-bold font-mono gap-4">
                                    <span className="truncate max-w-[130px] hover:text-white transition-colors" title={fromName}>
                                      📍 {fromName}
                                    </span>
                                    <span className="font-extrabold text-brand-gold bg-brand-midnight/60 px-1.5 py-0.5 rounded border border-brand-input/30 shadow-inner shrink-0">
                                      {progress}%
                                    </span>
                                    <span className="truncate max-w-[130px] text-right hover:text-white transition-colors" title={toName}>
                                      🏁 {toName}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Message Driver CTA Button */}
                      <button
                        type="button"
                        onClick={() => setShowChat(true)}
                        className="w-full py-3 px-3.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/40 hover:border-brand-gold text-brand-gold rounded-2xl flex items-center justify-between font-black text-xs transition cursor-pointer active:scale-98 shadow-sm group"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-brand-gold group-hover:scale-110 transition-transform" />
                          <span>{slangMode ? "Tchatter avec le djo" : "Message Driver"}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] bg-brand-gold text-brand-midnight px-2.5 py-0.5 rounded-full font-black">
                          {messages.length > 0 ? `${messages.length} msgs` : (slangMode ? "Ouvrir Chat" : "Open Chat")}
                          <ChevronUp size={12} className="stroke-[3]" />
                        </span>
                      </button>

                      {/* Share My Ride CTA Banner */}
                      <div className="bg-gradient-to-r from-brand-gold/15 to-brand-gold/5 border border-brand-gold/25 rounded-2xl p-3 flex items-center justify-between shadow-sm shrink-0 animate-pulse-subtle">
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-black text-brand-gold uppercase tracking-wider flex items-center gap-1">
                            🛡️ {slangMode ? "Sécurise ton voyage" : "Secure Your Journey"}
                          </h5>
                          <p className="text-[10px] text-brand-text-muted font-bold">
                            {slangMode ? "Partage ton trajet live sur WhatsApp" : "Share live tracking link"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowShareModal(true);
                          }}
                          className="bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight text-[11px] font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Share2 size={12} />
                          <span>{slangMode ? "Partager" : "Share"}</span>
                        </button>
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleCancelBooking}
                          className="flex-1 py-3 text-xs bg-brand-card hover:bg-brand-card/80 border border-brand-input text-brand-text-muted hover:text-white font-bold rounded-xl cursor-pointer transition shadow-sm"
                        >
                          Cancel Booking
                        </button>
                        <div className="relative flex shrink-0">
                          <button
                            onClick={() => setShowCallDropdown(!showCallDropdown)}
                            className="px-3.5 py-3 bg-brand-input hover:bg-brand-input/80 text-brand-gold border border-brand-card rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer shadow gap-1.5 transition active:scale-95"
                          >
                            <span>📞 {slangMode ? "Appeler" : "Call"}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${showCallDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {showCallDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-56 bg-brand-midnight/95 backdrop-blur-md border border-brand-card/80 p-2 rounded-2xl shadow-2xl z-50 space-y-1"
                              >
                                <div className="px-2.5 py-1.5 text-[9px] text-brand-text-muted font-black uppercase tracking-wider border-b border-brand-card/40">
                                  {slangMode ? "OPTIONS D'APPEL" : "CALL OPTIONS"}
                                </div>
                                <button
                                  onClick={() => startInAppCall('passenger')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-white flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">📞</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Appeler le chauffeur" : "Call Driver"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Lancer un appel sortant" : "Start outgoing call"}</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => receiveInAppCall('driver')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-brand-gold flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">🔔</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Simuler un appel entrant" : "Simulate Incoming Call"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Recevoir l'appel du chauffeur" : "Driver calling you"}</p>
                                  </div>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                    </div>
                  )}
                </>
              )}

              {/* INTEGRATED PASSENGER WALLET CARD */}
              {activeTab === 'wallet' && (
                <WalletCard
                  balance={passengerWallet}
                  onTopUpRequested={handlePassengerTopUp}
                  transactions={transactions.filter(t => t.type === 'topup')}
                  topupPromoActive={systemSettings.topupPromoActive}
                  topupPromoRate={systemSettings.topupPromoRate}
                  slangMode={slangMode}
                  passengerPoints={passengerPoints}
                  isOffline={!isOnline}
                />
              )}

              {/* PAST RIDE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {/* Service Worker Offline History Badge */}
                  {!isOnline && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-amber-200 text-[10px] font-bold shadow-sm animate-fade-in">
                      <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                        <WifiOff size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block font-black uppercase text-[9px] text-amber-400 tracking-wider">
                          {slangMode ? "Mode Hors Ligne (Service Worker)" : "Offline Mode (Service Worker)"}
                        </span>
                        <span className="text-[9.5px] font-semibold text-amber-100/90 block leading-tight">
                          {slangMode
                            ? `Consultation disponible : Vos ${history.length} trajets passés sont enregistrés en toute sécurité.`
                            : `Offline access active: Your ${history.length} past rides are stored securely in local Service Worker cache.`}
                        </span>
                      </div>
                      <span className="bg-amber-500/20 text-amber-300 text-[8px] font-mono font-black px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                        SW CACHE
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center bg-brand-card/20 p-2 rounded-xl border border-brand-input/30">
                    <h3 className="text-[10px] font-black uppercase text-brand-text-muted tracking-wider">
                      {slangMode ? "Journal des Trajets" : "Ride Ledger Logs"}
                    </h3>
                    <div className="flex items-center gap-3">
                      {history.length > 0 && (
                        <button
                          onClick={() => setHistorySortOrder(prev => prev === 'recent' ? 'oldest' : 'recent')}
                          className="flex items-center gap-1 text-[10px] text-brand-gold hover:text-white cursor-pointer font-bold bg-brand-input/60 px-2.5 py-1 rounded-lg border border-brand-gold/20 hover:border-brand-gold/50 transition-all active:scale-95"
                          title={slangMode ? "Trier les trajets" : "Sort Rides"}
                        >
                          <ArrowUpDown size={10} />
                          <span>{historySortOrder === 'recent' ? (slangMode ? "Récent" : "Recent First") : (slangMode ? "Ancien" : "Oldest First")}</span>
                        </button>
                      )}
                      <button
                        onClick={() => setHistory([])}
                        className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-bold"
                      >
                        {slangMode ? "Effacer" : "Clear History"}
                      </button>
                    </div>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-10 text-brand-text-muted italic text-xs font-medium">
                      {slangMode ? "Aucun trajet enregistré." : "No previous completed rides."}
                    </div>
                  ) : (
                    (historySortOrder === 'recent' ? history : [...history].reverse()).map((hist) => (
                      <div key={hist.id} className="bg-brand-card/30 border border-brand-card p-3.5 rounded-2xl space-y-3.5 shadow-sm">
                        <div className="flex justify-between items-center text-[9px] text-brand-text-muted font-bold font-mono">
                          <span>{hist.date}</span>
                          {getPaymentBadge(hist.paymentMethod)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                            <p className="truncate">{hist.pickupName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-white font-semibold">
                            <span className="w-1.5 h-1.5 bg-brand-gold rounded-full shrink-0"></span>
                            <p className="truncate">{hist.destName}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-brand-input/40 pt-2 text-[11px] font-medium">
                          <span className="text-brand-text-muted">{hist.vehicleClass} • {hist.driverName}</span>
                          <span className="font-black text-brand-gold">{hist.fare.toLocaleString('fr-FR')} FCFA</span>
                        </div>

                        {/* Interactive Business Utilities */}
                        <div className="flex gap-2 pt-1 border-t border-brand-input/10">
                          <button
                            type="button"
                            onClick={() => handleRebook(hist)}
                            className="flex-1 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold hover:text-white border border-brand-gold/15 hover:border-brand-gold/45 py-1.5 px-2 rounded-xl text-[9.5px] font-extrabold flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer"
                            title="Instantly rebook this trip"
                          >
                            <RotateCcw size={11.5} />
                            <span>{slangMode ? "Re-booker" : "Re-book"}</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => downloadPDFReceipt(hist)}
                            className="flex-1 bg-slate-900/60 hover:bg-slate-900 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 py-1.5 px-2 rounded-xl text-[9.5px] font-extrabold flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer"
                            title="Generate and download PDF invoice"
                          >
                            <Download size={11.5} className="text-brand-gold" />
                            <span>{slangMode ? "Télécharger Reçu" : "PDF Receipt"}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* DRIVER TERMINAL COMPONENT */}
          {/* ========================================================================= */}
          {role === 'driver' && (
            <div className="flex flex-col flex-1 p-4 space-y-4">
              
              {/* Tab selector for driver */}
              {rideStatus === 'idle' && (
                <div className="flex border-b border-brand-card/80 pb-1.5 gap-1 text-xs">
                  <button
                    onClick={() => setDriverActiveTab('orders')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${driverActiveTab === 'orders' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Commandes" : "Incoming Orders"}
                  </button>
                  <button
                    onClick={() => setDriverActiveTab('wallet')}
                    className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1 ${driverActiveTab === 'wallet' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                  >
                    {slangMode ? "Revenus / Retrait" : "Earnings / Payout"}
                  </button>
                </div>
              )}

              {/* ORDERS PANEL */}
              {driverActiveTab === 'orders' && (
                <>
                  {rideStatus === 'idle' && (
                    <div className="bg-brand-card/40 p-4 rounded-2xl border border-brand-card/80 space-y-3.5 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-brand-gold flex items-center gap-1.5 tracking-wider uppercase">
                          <TrendingUp size={13} />
                          Wanda Chauffeur Portal
                        </span>
                        
                        {/* Driver Status Toggle */}
                        <button
                          onClick={() => setDriverOnline(!driverOnline)}
                          className={`px-3 py-1 rounded-full text-[9px] font-black transition cursor-pointer ${driverOnline ? 'bg-emerald-600 text-white' : 'bg-brand-input text-brand-text-muted'}`}
                        >
                          {driverOnline ? '● ONLINE' : '○ OFFLINE'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 text-center">
                        <div className="bg-brand-input/40 border border-brand-card p-2.5 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Earnings</span>
                          <span className="text-xs font-black text-white">{driverStats.earnings.toLocaleString('fr-FR')} XAF</span>
                        </div>
                        <div className="bg-brand-input/40 border border-brand-card p-2.5 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Trips Completed</span>
                          <span className="text-xs font-black text-white">{driverStats.trips}</span>
                        </div>
                        <div className="bg-brand-input/40 border border-brand-card p-2.5 rounded-xl">
                          <span className="text-[8px] text-brand-text-muted block uppercase font-bold">Fleet Rating</span>
                          <span className="text-xs font-black text-brand-gold flex items-center justify-center gap-0.5">★ {driverStats.rating}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!driverOnline ? (
                    <div className="text-center py-10 space-y-3 flex-1 flex flex-col justify-center">
                      <span className="text-3xl animate-bounce block">😴</span>
                      <h4 className="text-xs font-extrabold text-white">{slangMode ? "Tu es déconnecté" : "You are Offline"}</h4>
                      <p className="text-[11px] text-brand-text-muted max-w-xs mx-auto leading-relaxed font-medium">
                        {slangMode ? (
                          `Active ton statut pour recevoir les demandes de courses en temps réel à ${currentCity} !`
                        ) : (
                          `Go online to receive and coordinate passenger bookings across ${currentCity}'s dynamic grids.`
                        )}
                      </p>
                      <button
                        onClick={() => setDriverOnline(true)}
                        className="mx-auto bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2.5 px-5 rounded-xl text-xs shadow transition cursor-pointer"
                      >
                        {slangMode ? "Se connecter" : "Go Online"}
                      </button>
                    </div>
                  ) : rideStatus !== 'idle' ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {/* Active simulation details for driving mode */}
                      <div className="bg-brand-card/40 border border-brand-card p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-brand-input pb-2">
                          <span className="text-[9px] text-brand-gold font-bold uppercase tracking-wider">
                            {rideStatus === 'driver_found' && 'Driving to Pickup Carrefour'}
                            {rideStatus === 'arriving' && 'Waiting at Pickup Station'}
                            {rideStatus === 'in_progress' && 'Transporting Dropoff'}
                          </span>
                          {getPaymentBadge(paymentMethod)}
                        </div>

                        <div className="space-y-2.5 text-xs font-semibold">
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse"></span>
                            <div>
                              <span className="text-[8px] text-brand-text-muted block uppercase">RAMASSAGE (A)</span>
                              <p className="font-extrabold text-white truncate">{pickup?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
                            <div>
                              <span className="text-[8px] text-brand-text-muted block uppercase">DÉPÔT (B)</span>
                              <p className="font-extrabold text-white truncate">{destination?.name}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-brand-input/40 pt-2.5 flex justify-between items-center text-xs">
                          <span className="text-brand-text-muted font-medium">Estimated Gross Payout:</span>
                          <strong className="text-brand-gold text-xs font-black">{activeFareToCharge.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                      </div>

                      {rideStatus === 'arriving' && (
                        <div className="bg-amber-500/10 border-2 border-brand-gold/60 p-4 rounded-2xl space-y-3 shadow-xl animate-pulse-subtle">
                          <div className="flex items-center justify-between border-b border-brand-gold/20 pb-2">
                            <span className="text-[10px] text-brand-gold font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                              {slangMode ? "COMPTEUR D'ATTENTE" : "WAITING TIME METER"}
                            </span>
                            <span className="text-[10px] bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full font-black">
                              {slangMode ? "Facture Supplémentaire" : "Potential Adjustment"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] text-brand-text-muted uppercase font-bold">{slangMode ? "Temps Écoulé" : "Elapsed Duration"}</p>
                              <p className="text-2xl font-black text-white font-mono tracking-wider">
                                {String(Math.floor(waitingTime / 60)).padStart(2, '0')}:
                                {String(waitingTime % 60).padStart(2, '0')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-brand-text-muted uppercase font-bold">{slangMode ? "Frais d'Attente" : "Extra Fare Accrued"}</p>
                              <p className="text-xl font-black text-brand-gold font-mono">
                                +{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                          </div>

                          {/* Grace period status bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold">
                              {waitingTime <= 10 ? (
                                <>
                                  <span className="text-emerald-400">{slangMode ? "Période de grâce gratuite" : "Free Grace Period"}</span>
                                  <span className="text-emerald-400 font-mono">{10 - waitingTime}s restant</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-brand-gold">{slangMode ? "Heures supplémentaires payantes" : "Billable Overtime"}</span>
                                  <span className="text-brand-gold font-mono">100 FCFA / sec</span>
                                </>
                              )}
                            </div>
                            <div className="h-2 bg-brand-input rounded-full overflow-hidden border border-brand-card">
                              <div 
                                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${waitingTime <= 10 ? 'bg-emerald-500' : 'bg-brand-gold'}`}
                                style={{ width: `${Math.min(100, (waitingTime / 10) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Button to start trip manually */}
                          <button
                            onClick={() => setRideStatus('in_progress')}
                            className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-2.5 rounded-xl text-xs tracking-wide shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          >
                            <Play size={13} className="fill-brand-midnight" />
                            {slangMode ? "Démarrer la course (Client à bord)" : "Start Trip (Passenger Onboard)"}
                          </button>
                        </div>
                      )}

                      {/* Message Passenger Trigger Button */}
                      <button
                        type="button"
                        onClick={() => setShowChat(true)}
                        className="w-full py-3 px-3.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/40 hover:border-brand-gold text-brand-gold rounded-2xl flex items-center justify-between font-black text-xs transition cursor-pointer active:scale-98 shadow-sm group"
                      >
                        <span className="flex items-center gap-2">
                          <MessageSquare size={16} className="text-brand-gold group-hover:scale-110 transition-transform" />
                          <span>{slangMode ? "Tchatter avec le client" : "Chat with Passenger"}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] bg-brand-gold text-brand-midnight px-2.5 py-0.5 rounded-full font-black">
                          {messages.length > 0 ? `${messages.length} msgs` : (slangMode ? "Ouvrir Chat" : "Open Chat")}
                          <ChevronUp size={12} className="stroke-[3]" />
                        </span>
                      </button>

                      {/* Control buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleCancelBooking}
                          className="flex-1 bg-brand-card hover:bg-brand-card/80 border border-brand-input text-rose-400 text-xs py-3 rounded-xl font-bold cursor-pointer transition shadow-sm animate-pulse"
                        >
                          Cancel Active Order
                        </button>
                        <div className="relative flex shrink-0">
                          <button
                            onClick={() => setShowCallDropdown(!showCallDropdown)}
                            className="px-3.5 py-3 bg-brand-input hover:bg-brand-input/80 text-brand-gold border border-brand-card rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer shadow gap-1.5 transition active:scale-95"
                          >
                            <span>📞 {slangMode ? "Appeler" : "Call"}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${showCallDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {showCallDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-2 w-56 bg-brand-midnight/95 backdrop-blur-md border border-brand-card/80 p-2 rounded-2xl shadow-2xl z-50 space-y-1"
                              >
                                <div className="px-2.5 py-1.5 text-[9px] text-brand-text-muted font-black uppercase tracking-wider border-b border-brand-card/40">
                                  {slangMode ? "OPTIONS D'APPEL" : "CALL OPTIONS"}
                                </div>
                                <button
                                  onClick={() => startInAppCall('driver')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-white flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">📞</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Appeler le client" : "Call Passenger"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Lancer un appel sortant" : "Start outgoing call"}</p>
                                  </div>
                                </button>
                                <button
                                  onClick={() => receiveInAppCall('passenger')}
                                  className="w-full text-left px-2.5 py-2 hover:bg-brand-card rounded-xl text-xs font-black text-brand-gold flex items-center gap-2 transition cursor-pointer group"
                                >
                                  <span className="text-base group-hover:scale-110 transition">🔔</span>
                                  <div>
                                    <p className="font-extrabold">{slangMode ? "Simuler un appel entrant" : "Simulate Incoming Call"}</p>
                                    <p className="text-[9px] text-brand-text-muted font-semibold">{slangMode ? "Recevoir l'appel du client" : "Passenger calling you"}</p>
                                  </div>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ) : driverRideRequest ? (
                    /* Elegant Incoming Ride Request UI Panel */
                    <div className="bg-gradient-to-br from-brand-midnight to-brand-card/90 border-2 border-brand-gold p-4 rounded-2xl space-y-3.5 shadow-2xl relative animate-pulse-subtle">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] bg-brand-gold text-brand-midnight px-2 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                          ⚡ DEMANDE ENTRANTE
                        </span>
                        <span className="font-mono text-xs text-brand-gold font-black bg-brand-midnight border border-brand-gold/30 px-2 py-0.5 rounded-lg">
                          ⏱️ {requestCountdown}s
                        </span>
                      </div>

                      {/* Passenger Profile */}
                      <div className="flex items-center gap-2.5 border-b border-brand-input/40 pb-2.5">
                        <div className="w-9 h-9 rounded-full bg-brand-input border border-brand-card flex items-center justify-center text-lg shadow-inner font-bold">
                          👤
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            {driverRideRequest.passengerName}
                            <span className="text-[9px] text-brand-gold font-black">★ 4.9</span>
                          </h4>
                          <p className="text-[9px] text-brand-text-muted font-bold">
                            {slangMode ? "Passager vérifié" : "Verified Rider"}
                          </p>
                        </div>
                      </div>

                      {/* Travel Details */}
                      <div className="space-y-2 text-[11px] font-semibold">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1 animate-pulse"></span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-brand-text-muted block uppercase">
                              {language === 'fr' ? "Départ (A)" : "Pickup (A)"}
                            </span>
                            <p className="font-extrabold text-white truncate">{driverRideRequest.pickupName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-brand-text-muted block uppercase">
                              {language === 'fr' ? "Dépôt (B)" : "Dropoff (B)"}
                            </span>
                            <p className="font-extrabold text-white truncate">{driverRideRequest.destName}</p>
                          </div>
                        </div>
                      </div>

                      {/* REAL-TIME MAP PREVIEW CONTAINER */}
                      <div className="space-y-1">
                        <span className="text-[8.5px] text-brand-text-muted block uppercase font-bold tracking-wider">
                          {slangMode ? "APERCU CARTE GPS (RAMASSAGE RELATIF)" : "MAP PREVIEW (GPS TO PICKUP)"}
                        </span>
                        <div 
                          id="driver-request-map-preview" 
                          className="w-full h-36 rounded-xl overflow-hidden border border-brand-card bg-brand-input/40 relative z-10"
                        />
                      </div>

                      {/* Payout & Payment Method */}
                      <div className="flex justify-between items-center bg-brand-input/40 border border-brand-card p-2 rounded-xl text-xs">
                        <div>
                          <p className="text-[9px] text-brand-text-muted font-bold uppercase">{slangMode ? "Paiement" : "Payment"}</p>
                          {getPaymentBadge(driverRideRequest.payment)}
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-brand-text-muted font-bold uppercase">{slangMode ? "Gains" : "Fare"}</p>
                          <strong className="text-brand-gold text-xs font-black">{driverRideRequest.fare.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleDeclineRequest}
                          className="bg-brand-input hover:bg-brand-card border border-brand-card text-brand-text-muted hover:text-white py-2.5 rounded-xl text-[11px] font-bold cursor-pointer transition"
                        >
                          {slangMode ? "Décliner" : "Decline"}
                        </button>
                        <button
                          onClick={handleAcceptRequest}
                          className="bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight py-2.5 rounded-xl text-[11px] font-black cursor-pointer shadow transition active:scale-95"
                        >
                          {slangMode ? "Accepter" : "Accept"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-between overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
                      
                      {/* Radar Scanning Header Card */}
                      <div className="bg-gradient-to-r from-brand-card to-brand-midnight border border-brand-card/60 p-4 rounded-2xl relative overflow-hidden shadow-lg">
                        {/* Radar pulse background animation */}
                        <div className="absolute right-3 top-3 w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border border-emerald-500/40 animate-ping absolute"></div>
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 animate-pulse absolute"></div>
                          <span className="text-emerald-400 text-xs font-black select-none z-10">📡</span>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            {slangMode ? "Heatmap Active" : "Heatmap Active"}
                          </span>
                          <h4 className="text-xs font-black text-white">
                            {slangMode ? "Radar de Demande en Temps Réel" : "Real-Time Demand Radar"}
                          </h4>
                          <p className="text-[10px] text-brand-text-muted leading-relaxed font-medium max-w-[80%]">
                            {slangMode ? (
                              `Les zones de forte affluence à ${currentCity} s'affichent en surbrillance sur votre carte.`
                            ) : (
                              `High-traffic passenger zones across ${currentCity} are highlighted as glowing overlays on your map.`
                            )}
                          </p>
                        </div>
                        
                        {/* Instant Simulation button */}
                        <div className="pt-3 border-t border-brand-input/30 mt-3 flex items-center justify-between gap-2">
                          <button
                            onClick={triggerIncomingSimulatedRequest}
                            className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide cursor-pointer transition flex items-center gap-1.5"
                          >
                            ⚡ {slangMode ? "Simuler un Appel" : "Simulate Ride"}
                          </button>
                          
                          {driverLoc && (
                            <button
                              onClick={() => setCenterCoords({ lat: driverLoc.lat, lng: driverLoc.lng })}
                              className="bg-brand-input hover:bg-brand-card text-brand-text-muted hover:text-white border border-brand-card px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition"
                            >
                              📍 {slangMode ? "Ma Position" : "Center Map"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* HIGH TRAFFIC ZONES LIST (HEATMAP DATA SOURCE) */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
                          <Flame size={12} className="text-orange-500 animate-pulse" />
                          <span>{slangMode ? "ZONES DE FORTE DEMANDE (CLIQUEZ POUR VOIR)" : "HIGH-TRAFFIC HOTSPOTS (CLICK TO RE-CENTER)"}</span>
                        </span>
                        
                        <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                          {[
                            { name: 'Bastos Embassy District', lat: 3.8910, lng: 11.5130, city: 'Yaoundé', multiplier: '1.5x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Marché Central (Central Market)', lat: 3.8655, lng: 11.5190, city: 'Yaoundé', multiplier: '1.8x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Poste Centrale & Blvd 20 Mai', lat: 3.8640, lng: 11.5205, city: 'Yaoundé', multiplier: '1.9x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Ngoa-Ekelle University Area', lat: 3.8490, lng: 11.5030, city: 'Yaoundé', multiplier: '1.2x', level: 'Medium', color: 'text-amber-400 bg-amber-400/10' },
                            { name: 'Mvan Bus Terminal (Gare)', lat: 3.8290, lng: 11.5180, city: 'Yaoundé', multiplier: '1.6x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Mokolo Market (Marché Mokolo)', lat: 3.8710, lng: 11.4980, city: 'Yaoundé', multiplier: '1.7x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            
                            { name: 'Akwa Palace & Blvd de la Liberté', lat: 4.0485, lng: 9.6974, city: 'Douala', multiplier: '1.9x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Bonanjo Administrative Center', lat: 4.0435, lng: 9.6895, city: 'Douala', multiplier: '1.4x', level: 'High', color: 'text-orange-400 bg-orange-400/10' },
                            { name: 'Deido Roundabout (Rond-point)', lat: 4.0620, lng: 9.7090, city: 'Douala', multiplier: '1.7x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Ndokoti Junction (Carrefour)', lat: 4.0415, lng: 9.7420, city: 'Douala', multiplier: '2.1x', level: 'Critical', color: 'text-rose-400 bg-rose-400/10' },
                            { name: 'Bonamoussadi Market (Marché)', lat: 4.0825, lng: 9.7405, city: 'Douala', multiplier: '1.2x', level: 'Medium', color: 'text-amber-400 bg-amber-400/10' },
                            { name: 'Douala Grand Mall & Airport Zone', lat: 4.0152, lng: 9.7360, city: 'Douala', multiplier: '1.5x', level: 'High', color: 'text-orange-400 bg-orange-400/10' }
                          ]
                            .filter(zone => zone.city === currentCity)
                            .map((zone, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCenterCoords({ lat: zone.lat, lng: zone.lng })}
                                className="w-full text-left bg-brand-card/40 hover:bg-brand-card border border-brand-card hover:border-brand-input p-2.5 rounded-xl flex items-center justify-between transition group active:scale-98"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-base group-hover:scale-110 transition shrink-0">🔥</span>
                                  <div className="min-w-0">
                                    <h5 className="text-[11px] font-black text-white truncate group-hover:text-brand-gold transition">
                                      {zone.name}
                                    </h5>
                                    <p className="text-[9px] text-brand-text-muted font-bold">
                                      {slangMode ? "Zone à forte affluence" : "High-density calling zone"}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider ${zone.color}`}>
                                    {zone.level}
                                  </span>
                                  <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-1.5 py-0.5 rounded-lg">
                                    {zone.multiplier}
                                  </span>
                                </div>
                              </button>
                            ))
                          }
                        </div>
                      </div>

                      {/* LIVE BOOKINGS ACTIVITY FEED */}
                      <div className="space-y-2">
                        <span className="text-[9px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-gold"></span>
                          </span>
                          <span>{slangMode ? "FLUX D'ACTIVITÉ RÉCENT (RÉSERVATIONS)" : "RECENT BOOKING EVENTS FEED"}</span>
                        </span>
                        
                        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                          {recentBookings
                            .filter(booking => booking.city === currentCity)
                            .map((booking) => (
                              <div 
                                key={booking.id} 
                                className="bg-brand-input/30 border border-brand-card/50 p-2.5 rounded-xl flex items-center justify-between text-[11px] relative overflow-hidden"
                              >
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-brand-card/60 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-inner">
                                    {booking.rideClass.includes('VIP') ? '⭐' : booking.rideClass.includes('Moto') || booking.rideClass.includes('Okada') ? '🏍️' : '🚗'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-white truncate max-w-[130px]">
                                        {booking.zoneName.split('(')[0].trim()}
                                      </span>
                                      <span className="text-[8px] text-brand-text-muted font-black">• {booking.timeAgo}</span>
                                    </div>
                                    <p className="text-[9.5px] text-brand-text-muted font-bold">
                                      {booking.rideClass} • <span className="text-brand-gold">{booking.fare.toLocaleString('fr-FR')} FCFA</span>
                                    </p>
                                  </div>
                                </div>
                                
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                  booking.status === 'completed' 
                                    ? 'bg-emerald-500/15 text-emerald-400' 
                                    : booking.status === 'active' 
                                      ? 'bg-brand-gold/15 text-brand-gold animate-pulse' 
                                      : 'bg-rose-500/15 text-rose-400'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                      <div className="text-[10px] text-brand-text-muted text-center leading-normal font-semibold border-t border-brand-card/40 pt-3">
                        💡 **Wanda Pro Tip:** Maintain a high rating above 4.7 to receive higher volume VIP class bookings!
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* DRIVER WALLET / CASHOUT PANEL */}
              {driverActiveTab === 'wallet' && (
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 scrollbar-thin">
                  <DriverWallet
                    balance={driverWallet}
                    onWithdrawRequested={handleDriverWithdraw}
                    transactions={transactions.filter(t => t.type === 'withdrawal')}
                    minimumWithdrawal={systemSettings.minimumWithdrawal}
                    driverPhone={user?.phone}
                    rideHistory={history}
                    slangMode={slangMode}
                    isOffline={!isOnline}
                  />

                  {/* Waiting logs ledger */}
                  <div className="bg-brand-card/40 border border-brand-card rounded-2xl p-4 space-y-3.5 shadow-md text-white font-sans">
                    <span className="text-[10px] text-brand-text-muted font-black tracking-wider uppercase flex items-center gap-1.5 border-b border-brand-input pb-2">
                      <Clock size={12} className="text-brand-gold" />
                      <span>{slangMode ? "JOURNAL DES TEMPS D'ATTENTE" : "WAITING TIME LOGS"}</span>
                    </span>

                    {waitingLogs.length === 0 ? (
                      <p className="text-xs text-brand-text-muted/60 italic text-center py-6 font-medium">
                        {slangMode ? "Aucun frais d'attente enregistré." : "No waiting times logged yet."}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {waitingLogs.map((log) => {
                          const isFree = log.extraFare === 0;
                          return (
                            <div key={log.id} className="bg-brand-input/40 p-3 rounded-xl border border-brand-card space-y-1.5 relative overflow-hidden">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-white truncate max-w-[150px]">{log.pickupName}</span>
                                <span className="font-mono text-[9px] text-brand-text-muted">{log.timestamp}</span>
                              </div>
                              <div className="flex justify-between items-end text-[10px] text-brand-text-muted">
                                <div className="space-y-0.5">
                                  <span>{slangMode ? "Durée :" : "Duration :"} <strong className="text-white font-mono">{Math.floor(log.durationSeconds / 60)}m {log.durationSeconds % 60}s</strong></span>
                                  <span className="block text-[9px]">ID: {log.id}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-bold text-brand-text-muted">{slangMode ? "Ajustement Tarif :" : "Fare Adjustment :"}</p>
                                  <strong className={`font-black text-xs ${isFree ? 'text-emerald-400' : 'text-brand-gold'}`}>
                                    {isFree ? (slangMode ? "GRATUIT" : "FREE (Grace)") : `+${log.extraFare.toLocaleString('fr-FR')} FCFA`}
                                  </strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </aside>

        {/* Right Side Map Viewport */}
        <section 
          className={`relative transition-all duration-300 ${
            isMapFullscreen || (role === 'driver' && rideStatus === 'in_progress')
              ? 'fixed inset-0 z-[9999] w-screen h-screen'
              : rideStatus !== 'idle' && rideStatus !== 'searching'
                ? 'flex-1 h-[60vh] md:h-full w-full'
                : 'flex-1 h-full w-full'
          }`} 
          id="map-viewport"
        >
          {/* Developer / Driver Map Controls */}
          {role !== 'passenger' && (
            <>
              {/* Fullscreen Toggle Button */}
              <button
                onClick={() => setIsMapFullscreen(prev => !prev)}
                className="absolute top-[72px] right-[10px] z-[1000] flex items-center justify-center w-[34px] h-[34px] bg-brand-midnight border border-brand-input/60 hover:border-brand-gold/80 rounded-lg text-brand-gold hover:text-white shadow-md hover:shadow-brand-gold/20 transition-all duration-200 active:scale-95 cursor-pointer group"
                title={isMapFullscreen ? (slangMode ? "Quitter le plein écran" : "Exit Fullscreen") : (slangMode ? "Plein écran" : "Fullscreen")}
                id="map-fullscreen-toggle"
              >
                {isMapFullscreen ? <Minimize2 size={16} className="group-hover:scale-110 transition-transform" /> : <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />}
              </button>

              {/* Tactical Coordinate Grid Toggle Button */}
              <button
                onClick={() => setShowMapGrid(prev => !prev)}
                className={`absolute top-[114px] right-[10px] z-[1000] flex items-center justify-center w-[34px] h-[34px] border rounded-lg shadow-md transition-all duration-200 active:scale-95 cursor-pointer group ${
                  showMapGrid
                    ? 'bg-brand-gold/15 border-brand-gold text-brand-gold shadow-[0_0_8px_rgba(255,211,67,0.35)]'
                    : 'bg-brand-midnight border border-brand-input/60 hover:border-brand-gold/80 text-brand-gold hover:text-white'
                }`}
                title={showMapGrid 
                  ? (slangMode ? "Masquer la grille tactique" : "Hide Tactical Grid") 
                  : (slangMode ? "Afficher la grille tactique" : "Show Tactical Grid")
                }
                id="map-grid-toggle"
              >
                <Grid size={16} className={`transition-transform duration-300 ${showMapGrid ? 'rotate-90 text-brand-gold' : 'group-hover:scale-110'}`} />
              </button>

              {/* Small Circular 3D Tilt Control Button */}
              <button
                onClick={() => {
                  setIsMapTilted(prev => {
                    if (prev === true || prev === 'tilted' || prev === 'isometric') {
                      return false;
                    }
                    return 'tilted';
                  });
                  if (isAutoPitchEnabled) {
                    setIsAutoPitchEnabled(false);
                  }
                }}
                className={`absolute top-[156px] right-[10px] z-[1000] flex flex-col items-center justify-center w-[34px] h-[34px] rounded-full border shadow-lg transition-all duration-200 active:scale-95 cursor-pointer group ${
                  (isMapTilted === true || isMapTilted === 'tilted' || isMapTilted === 'isometric')
                    ? 'bg-gradient-to-br from-amber-400 via-brand-gold to-yellow-500 border-amber-300 text-brand-midnight shadow-[0_0_12px_rgba(255,211,67,0.7)] ring-2 ring-brand-gold/50'
                    : 'bg-brand-midnight/95 border-brand-input/60 hover:border-brand-gold/80 text-brand-gold hover:text-white'
                }`}
                title={
                  isMapTilted
                    ? (slangMode ? "Désactiver Inclinaison 3D (Retour Vue 2D)" : "Switch to 2D Flat View")
                    : (slangMode ? "Inclinaison 3D + Transparence Bâtiments (Translucide à Ndokoti & Bastos)" : "3D Tilt & Translucent Building Footprints (See-through in Ndokoti & Bastos)")
                }
                id="map-3d-tilt-toggle"
              >
                <Box size={15} className={`transition-transform duration-300 ${(isMapTilted === true || isMapTilted === 'tilted' || isMapTilted === 'isometric') ? 'rotate-12 scale-110 text-brand-midnight' : 'group-hover:scale-110'}`} />
                <span className="sr-only">
                  {(isMapTilted === true || isMapTilted === 'tilted') ? '54°' : isMapTilted === 'isometric' ? '45°' : '2D'}
                </span>
              </button>

              {/* Small Secondary Preset View Button (0° <-> 45° Isometric) */}
              <button
                onClick={() => {
                  setIsMapTilted(prev => prev === 'isometric' ? false : 'isometric');
                  if (isAutoPitchEnabled) {
                    setIsAutoPitchEnabled(false);
                  }
                }}
                className={`absolute top-[159px] right-[52px] z-[1000] flex flex-col items-center justify-center w-[28px] h-[28px] rounded-full border transition-all duration-200 active:scale-95 cursor-pointer group ${
                  isMapTilted === 'isometric'
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-[0_0_8px_rgba(255,211,67,0.3)]'
                    : 'bg-brand-midnight/95 border-brand-input/60 hover:border-brand-gold/80 text-brand-text-muted hover:text-white shadow-md'
                }`}
                title={slangMode ? "Vue Standard 45° (Isométrique)" : "Preset View (45° Isometric)"}
                id="map-pitch-preset"
              >
                <Eye size={10} className={`transition-transform duration-300 ${isMapTilted === 'isometric' ? 'scale-110 text-brand-gold' : 'group-hover:scale-110 text-brand-text-muted'}`} />
                <span className="text-[5.5px] font-bold font-mono tracking-tighter leading-none mt-0.5">
                  45°
                </span>
              </button>

              {/* Floating Map Auto-Pitch Lock Control Button */}
              <button
                onClick={() => setIsAutoPitchEnabled(prev => !prev)}
                className={`absolute top-[210px] right-[10px] z-[1000] flex flex-col items-center justify-center w-[40px] h-[40px] rounded-full border transition-all duration-200 active:scale-95 cursor-pointer group ${
                  isAutoPitchEnabled
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-[0_0_10px_rgba(255,211,67,0.4)]'
                    : 'bg-brand-midnight/95 border-brand-input/60 hover:border-brand-gold/80 text-brand-text-muted hover:text-brand-gold'
                }`}
                title={slangMode ? "Verrouillage automatique de l'inclinaison (3D en transit rapide, 2D en ramassage)" : "Auto-Pitch Lock (3D during transit, 2D in pickup/dropoff zones)"}
                id="map-auto-pitch-control"
              >
                <div className="relative">
                  <Gauge size={14} className={`transition-transform duration-300 ${isAutoPitchEnabled ? 'animate-pulse scale-105' : 'group-hover:scale-110'}`} />
                  {isAutoPitchEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_4px_#10b981]" />
                  )}
                </div>
                <span className="text-[6px] font-black tracking-widest mt-0.5 leading-none uppercase">
                  Auto
                </span>
              </button>

              {/* Floating Map Zoom Lock Control Button */}
              <button
                onClick={() => setIsZoomLocked(prev => !prev)}
                className={`absolute top-[256px] right-[10px] z-[1000] flex flex-col items-center justify-center w-[40px] h-[40px] rounded-full border transition-all duration-200 active:scale-95 cursor-pointer group ${
                  isZoomLocked
                    ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-[0_0_10px_rgba(255,211,67,0.4)]'
                    : 'bg-brand-midnight/95 border-brand-input/60 hover:border-brand-gold/80 text-brand-text-muted hover:text-brand-gold'
                }`}
                title={slangMode ? "Verrouiller le zoom de la carte (Empêche l'auto-ajustement)" : "Keep Zoom Locked (Prevents map auto-adjusting zoom)"}
                id="map-zoom-lock-control"
              >
                <div className="relative">
                  {isZoomLocked ? (
                    <Lock size={14} className="transition-transform duration-300 scale-105" />
                  ) : (
                    <Unlock size={14} className="transition-transform duration-300 group-hover:scale-110" />
                  )}
                  {isZoomLocked && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_4px_#10b981]" />
                  )}
                </div>
                <span className="text-[5.5px] font-black tracking-widest mt-0.5 leading-none uppercase font-mono">
                  {isZoomLocked ? "Lock" : "Free"}
                </span>
              </button>
            </>
          )}

          {/* Compass Backdrop to capture click outside and collapse */}
          <AnimatePresence>
            {isCompassExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCompassExpanded(false)}
                className="absolute inset-0 bg-transparent z-[998]"
              />
            )}
          </AnimatePresence>

          {/* Compass Orientation Control */}
          <AnimatePresence mode="wait">
            {!isCompassExpanded ? (
              /* Collapsed view (small pilot gauge boussole button) */
              <motion.button
                key="collapsed-compass"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={handleCompassToggle}
                className="absolute top-[114px] right-[10px] z-[999] flex items-center justify-center w-[40px] h-[40px] bg-brand-midnight/95 backdrop-blur-md border border-brand-input/60 hover:border-brand-gold/80 rounded-full text-brand-gold hover:text-white shadow-lg cursor-pointer transition-all duration-200 active:scale-95 group"
                title={slangMode ? "Boussole (Cliquez pour agrandir)" : "Compass (Click to expand)"}
                id="map-compass-control-collapsed"
              >
                {/* Mini Rotating Dial */}
                <div 
                  className="w-7 h-7 rounded-full border border-brand-gold/30 group-hover:border-brand-gold/60 relative flex items-center justify-center transition-transform duration-300 ease-out"
                  style={{ transform: `rotate(${-continuousHeading}deg)` }}
                >
                  {/* Small North indicator (N) */}
                  <span className="absolute top-0 text-[6px] font-black text-rose-500 leading-none select-none">N</span>
                  <span className="absolute bottom-0 text-[5px] font-black text-brand-text-muted/60 leading-none select-none">S</span>
                  
                  {/* Small physical needle */}
                  <div className="w-1 h-5 relative flex items-center justify-center">
                    {/* Red needle tip pointing north */}
                    <div className="absolute top-0 w-0 h-0 border-l-[1.5px] border-l-transparent border-r-[1.5px] border-r-transparent border-b-[8px] border-b-rose-500" />
                    {/* Gray needle tip pointing south */}
                    <div className="absolute bottom-0 w-0 h-0 border-l-[1.5px] border-l-transparent border-r-[1.5px] border-r-transparent border-t-[8px] border-t-brand-text-muted/60" />
                    {/* Pin pivot */}
                    <div className="w-1 h-1 rounded-full bg-brand-midnight border border-brand-gold/80 z-10" />
                  </div>
                </div>
              </motion.button>
            ) : (
              /* Expanded view */
              <motion.div
                key="expanded-compass"
                initial={{ scale: 0.9, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: -10 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompassInteraction();
                }}
                className="absolute top-[114px] right-[10px] z-[999] flex flex-col items-center bg-brand-midnight/95 backdrop-blur-md border border-brand-input/60 p-2.5 rounded-2xl shadow-2xl w-32"
                id="map-compass-control"
              >
                {/* Compass Heading Indicator with Collapse Button */}
                <div className="font-mono text-[9px] font-black text-brand-gold leading-none pb-1.5 flex items-center gap-0.5 select-none justify-between w-full">
                  <span className="flex items-center gap-0.5">
                    {compassLockMode === 'magnetic' && <Magnet size={9} className="text-brand-gold animate-pulse" />}
                    <span>{compassHeading}°</span>
                    <span className="text-white bg-brand-deep px-1 rounded-sm text-[8px] ml-1">{(() => {
                      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                      const index = Math.round(((compassHeading % 360) / 45)) % 8;
                      return directions[index];
                    })()}</span>
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCompassExpanded(false);
                    }}
                    className="text-brand-text-muted hover:text-white transition-colors cursor-pointer p-0.5"
                    title={slangMode ? "Réduire" : "Collapse"}
                  >
                    <Minimize2 size={10} />
                  </button>
                </div>

                {/* Rotating Dial */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setCompassLockMode('north');
                    setCompassHeading(0);
                    handleCompassInteraction();
                  }}
                  className="w-12 h-12 rounded-full border border-brand-gold/40 hover:border-brand-gold bg-brand-deep/80 relative flex items-center justify-center shadow-inner cursor-pointer active:scale-95 transition-all duration-200 group"
                  title={slangMode ? "Cliquez pour réorienter vers le Nord" : "Click to reset map orientation to North"}
                >
                  {/* Spinning Ring */}
                  <div 
                    className="absolute inset-0 rounded-full border border-dashed border-brand-gold/20 group-hover:animate-[spin_10s_linear_infinite]"
                  />

                  {/* Cardinal letters inside the rotating dial */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                    style={{ transform: `rotate(${-continuousHeading}deg)` }}
                  >
                    <span className="absolute top-1 text-[8px] font-black text-rose-500 leading-none">N</span>
                    <span className="absolute right-1 text-[8px] font-black text-brand-text-muted/80 leading-none">E</span>
                    <span className="absolute bottom-1 text-[8px] font-black text-brand-text-muted/80 leading-none">S</span>
                    <span className="absolute left-1 text-[8px] font-black text-brand-text-muted/80 leading-none">W</span>
                    
                    {/* Visual graduation marks on the edge */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-[1px] border-l border-brand-gold/10" />
                    <div className="absolute left-0 right-0 top-1/2 h-[1px] border-t border-brand-gold/10" />

                    {/* Central stylized physical needle */}
                    <div className="w-1.5 h-8 relative flex items-center justify-center">
                      {/* Top half: Red North needle */}
                      <div className="absolute top-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[16px] border-b-rose-500" />
                      {/* Bottom half: Grey/Gold South needle */}
                      <div className="absolute bottom-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[16px] border-t-brand-text-muted/60" />
                      {/* Pivot pin */}
                      <div className="w-2 h-2 rounded-full bg-brand-deep border border-brand-gold z-10 shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Mode selection indicators */}
                <div className="flex gap-1 mt-2 border-t border-brand-card/40 pt-1.5 justify-center w-full">
                  {/* North lock mode */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompassLockMode('north');
                      setCompassHeading(0);
                      handleCompassInteraction();
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black transition-all cursor-pointer ${
                      compassLockMode === 'north'
                        ? 'bg-brand-gold text-brand-midnight shadow-[0_0_8px_rgba(255,211,67,0.4)]'
                        : 'bg-brand-deep/60 text-brand-text-muted hover:text-white hover:bg-brand-card/80'
                    }`}
                    title={slangMode ? "Verrouiller au Nord" : "Lock to True North"}
                  >
                    N
                  </button>

                  {/* Trajectory / Travel alignment mode */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (rideStatus === 'in_progress') {
                        setCompassLockMode('bearing');
                      }
                      handleCompassInteraction();
                    }}
                    disabled={rideStatus !== 'in_progress'}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      rideStatus !== 'in_progress'
                        ? 'opacity-30 cursor-not-allowed text-brand-text-muted/40 bg-brand-deep/20'
                        : compassLockMode === 'bearing'
                          ? 'bg-brand-gold text-brand-midnight shadow-[0_0_8px_rgba(255,211,67,0.4)]'
                          : 'bg-brand-deep/60 text-brand-text-muted hover:text-white hover:bg-brand-card/80'
                    }`}
                    title={slangMode ? "Suivre l'itinéraire" : "Track Travel Direction"}
                  >
                    <Navigation size={9} className={compassLockMode === 'bearing' ? 'fill-brand-midnight' : 'fill-brand-text-muted'} />
                  </button>

                  {/* Device gyro orientation mode */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompassLockMode('device');
                      requestDeviceOrientationPermission();
                      handleCompassInteraction();
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer relative ${
                      compassLockMode === 'device'
                        ? 'bg-brand-gold text-brand-midnight shadow-[0_0_8px_rgba(255,211,67,0.4)]'
                        : 'bg-brand-deep/60 text-brand-text-muted hover:text-white hover:bg-brand-card/80'
                    }`}
                    title={slangMode ? "Capteur de l'appareil" : "Use Gyro/Device Compass"}
                  >
                    <Smartphone size={9} />
                    {isUsingDeviceOrientation && (
                      <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
                    )}
                  </button>

                  {/* Magnetic Sensor Mode */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompassLockMode('magnetic');
                      handleCompassInteraction();
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer relative ${
                      compassLockMode === 'magnetic'
                        ? 'bg-brand-gold text-brand-midnight shadow-[0_0_8px_rgba(255,211,67,0.4)]'
                        : 'bg-brand-deep/60 text-brand-text-muted hover:text-white hover:bg-brand-card/80'
                    }`}
                    title={slangMode ? "Capteur Magnétique (Magnetometer)" : "Use Magnetic Sensor"}
                  >
                    <Magnet size={9} />
                    {isMagnetometerCalibrated && (
                      <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-emerald-400 rounded-full" />
                    )}
                  </button>
                </div>

                {/* Magnetic Mode Calibration and Details */}
                {compassLockMode === 'magnetic' && (
                  <div className="flex flex-col items-center gap-1.5 mt-2 border-t border-brand-card/40 pt-1.5 w-full">
                    {/* Accuracy & Calibration status */}
                    <div className="flex items-center justify-between w-full px-0.5">
                      <span className="text-[7px] font-black uppercase text-brand-text-muted">Sensor</span>
                      <span className={`text-[6px] font-black uppercase px-1 rounded-sm leading-none py-0.5 ${
                        magnetometerAccuracy === 'high' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : magnetometerAccuracy === 'medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400 animate-pulse'
                      }`}>
                        {magnetometerAccuracy === 'high' ? 'Calibrated' : `Acc: ${magnetometerAccuracy}`}
                      </span>
                    </div>

                    {/* Calibrate action button */}
                    {!isCalibrating ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMagnetometerCalibration();
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded bg-brand-deep border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-card/50 text-[7px] font-black uppercase tracking-wider text-brand-gold transition-all duration-200 cursor-pointer active:scale-95"
                        title={slangMode ? "Lancer la calibration en 8" : "Calibrate with Figure-8 Motion"}
                      >
                        <Magnet size={8} className="animate-pulse text-brand-gold" />
                        <span>{isMagnetometerCalibrated ? (slangMode ? "Ré-étalonner" : "Recalibrate") : (slangMode ? "Étalonner" : "Calibrate")}</span>
                      </button>
                    ) : (
                      <div className="w-full bg-brand-deep border border-brand-gold/30 p-1 rounded flex flex-col gap-1 items-center justify-center">
                        <span className="text-[6px] text-brand-gold font-bold uppercase animate-pulse text-center leading-tight">Wave phone in Figure-8</span>
                        <div className="w-full bg-brand-card/50 h-1 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand-gold h-full transition-all duration-300" 
                            style={{ width: `${calibrationProgress}%` }}
                          />
                        </div>
                        <span className="text-[6px] text-brand-text-muted font-mono">{calibrationProgress}%</span>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Magnetometer Calibration Fullscreen Figure-8 Visual Guide Overlay */}
          <AnimatePresence>
            {isCalibrating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-brand-midnight/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="max-w-xs w-full bg-brand-deep/80 border border-brand-gold/40 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 relative overflow-hidden">
                  {/* Glowing background shapes */}
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-gold/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl" />

                  {/* Icon & Title */}
                  <div className="flex items-center gap-2 text-brand-gold">
                    <Magnet className="animate-bounce" size={20} />
                    <h3 className="text-sm font-black tracking-wider uppercase">
                      {slangMode ? "Étalonner Boussole" : "Compass Calibration"}
                    </h3>
                  </div>

                  {/* Figure-8 Animation Container */}
                  <div className="w-full h-28 flex items-center justify-center relative">
                    <svg viewBox="0 0 100 60" className="w-40 h-24 drop-shadow-[0_0_8px_rgba(255,211,67,0.3)]">
                      <style>{`
                        @keyframes dash {
                          to {
                            stroke-dashoffset: -180;
                          }
                        }
                      `}</style>
                      
                      {/* Grid background lines for high-tech aesthetic */}
                      <line x1="10" y1="30" x2="90" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="1 3" />
                      <line x1="50" y1="10" x2="50" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="1 3" />

                      {/* Infinite Path */}
                      <path 
                        id="inf-path"
                        d="M 50 30 C 35 12, 15 20, 15 30 C 15 40, 35 48, 50 30 C 65 12, 85 20, 85 30 C 85 40, 65 48, 50 30 Z" 
                        fill="none" 
                        stroke="rgba(255,211,67,0.15)" 
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      
                      {/* Active highlighted trace of path */}
                      <path 
                        d="M 50 30 C 35 12, 15 20, 15 30 C 15 40, 35 48, 50 30 C 65 12, 85 20, 85 30 C 85 40, 65 48, 50 30 Z" 
                        fill="none" 
                        stroke="url(#grad-neon)" 
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="30 150"
                        className="animate-[dash_3s_linear_infinite]"
                      />

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="grad-neon" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#ffd343" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>

                      {/* Glowing dot traveling the infinity path */}
                      <circle r="4" fill="#ffd343" className="shadow-lg">
                        <animateMotion 
                          dur="3s" 
                          repeatCount="indefinite" 
                          path="M 50 30 C 35 12, 15 20, 15 30 C 15 40, 35 48, 50 30 C 65 12, 85 20, 85 30 C 85 40, 65 48, 50 30 Z" 
                        />
                      </circle>
                    </svg>

                    {/* Miniature physical phone gesture illustration overlay */}
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      animate={{
                        rotate: [0, 15, -15, 15, -15, 0],
                        x: [0, -25, 25, 25, -25, 0],
                        y: [0, -10, 10, -10, 10, 0]
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="w-5 h-9 rounded bg-white/20 border border-white/50 flex flex-col items-center justify-between p-1 shadow-md backdrop-blur-sm opacity-60">
                        <div className="w-2.5 h-0.5 bg-white/60 rounded-full" />
                        <Compass size={10} className="text-brand-gold animate-spin" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Calibration Instruction */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white uppercase tracking-wide">
                      {slangMode ? "Déplacez l'appareil en 8" : "Wave device in a figure-8"}
                    </p>
                    <p className="text-[9px] text-brand-text-muted leading-relaxed">
                      {slangMode 
                        ? "Faites pivoter votre téléphone en dessinant un huit dans l'air pour recalibrer le magnétomètre."
                        : "Smoothly tilt and rotate your phone along the loop to calibrate magnetic orientation accuracy."}
                    </p>
                  </div>

                  {/* Progress bar and percentage */}
                  <div className="w-full space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[8px] font-mono font-bold text-brand-text-muted">
                      <span>{slangMode ? "ALIGNEMENT..." : "CALIBRATING..."}</span>
                      <span className="text-brand-gold">{calibrationProgress}%</span>
                    </div>
                    <div className="w-full bg-brand-midnight h-2 rounded-full overflow-hidden p-0.5 border border-brand-input/40">
                      <motion.div 
                        className="bg-gradient-to-r from-rose-500 via-brand-gold to-emerald-400 h-full rounded-full"
                        style={{ width: `${calibrationProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Cancel Button */}
                  <button
                    onClick={handleCancelCalibration}
                    className="mt-1 w-full bg-rose-500/15 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-300 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition"
                  >
                    {slangMode ? "Annuler" : "Cancel"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <TaxiMap
            pickup={pickup}
            destination={destination}
            driverLocation={driverLoc}
            status={rideStatus}
            driverType={selectedClassId}
            onMapClick={handleMapTap}
            role={role}
            slangMode={slangMode}
            onSetPickup={setPickup}
            onSetDestination={setDestination}
            onSetDriverLoc={setDriverLoc}
            etaMinutes={etaMinutes}
            isTilted={isMapTilted}
            isZoomLocked={isZoomLocked}
            onZoomChange={setMapZoom}
            showMapGrid={showMapGrid}
            centerCoords={centerCoords}
            recentBookings={recentBookings}
            summaryMetricMode={summaryMetricMode}
            onToggleSummaryMetricMode={setSummaryMetricMode}
            onSelectZoneTarget={(zone) => {
              if (role === 'driver') {
                setDriverLoc({ lat: zone.center[0], lng: zone.center[1] });
              } else {
                setPickup({ name: zone.name, lat: zone.center[0], lng: zone.center[1] });
              }
            }}
          />

          {/* Floating Dynamic Distance Ruler */}
          {rideStatus === 'in_progress' && pickup && destination && driverLoc && (() => {
            const remaining = getDistanceKm(driverLoc.lat, driverLoc.lng, destination.lat, destination.lng);
            const isUrgent = remaining < 1;
            const total = getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng);
            const progress = total > 0 ? Math.max(0, Math.min(100, (1 - remaining / total) * 100)) : 0;
            const progressPct = total > 0 ? Math.max(0, Math.min(100, Math.round((1 - remaining / total) * 100))) : 0;
            
            let colorClass = "text-emerald-400";
            if (isUrgent) {
              colorClass = "text-orange-500 animate-pulse";
            } else if (remaining < 5) {
              colorClass = "text-amber-400";
            }
            const displayValue = isUrgent ? `${Math.round(remaining * 1000)} m` : `${remaining.toFixed(2)} km`;
            
            return (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="absolute top-4 left-4 right-4 md:right-auto md:w-80 bg-brand-midnight/90 backdrop-blur-md border border-brand-gold/30 p-4 rounded-2xl shadow-2xl z-[1000] text-white flex flex-col gap-3"
                id="floating-distance-ruler"
              >
                {/* Ruler Header */}
                <div className="flex items-center justify-between border-b border-brand-card/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Ruler size={14} className="text-brand-gold animate-[pulse_2s_infinite]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-gold">
                      {slangMode ? "Réglette de Distance" : "Distance Ruler"}
                    </span>
                    {isUrgent && (
                      <span className="flex items-center gap-1 bg-rose-500/20 text-rose-400 border border-rose-500/40 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide animate-[pulse_1s_infinite] shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                        <AlertTriangle size={8} className="text-rose-400 fill-rose-400/20" />
                        <span>{slangMode ? "Proche!" : "Urgent!"}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <span className={`text-xs font-black transition-all duration-300 ${colorClass}`}>
                      {displayValue}
                    </span>
                    <span className="text-[9px] text-brand-text-muted ml-1">
                      {slangMode ? "restant" : "left"}
                    </span>
                  </div>
                </div>

                {/* Ruler graduation tick marks scale */}
                <div className="relative pt-1">
                  {/* Ruler ticks background */}
                  <div className="relative h-6 bg-brand-deep/80 border border-brand-input/40 rounded-lg overflow-hidden flex items-end justify-between px-2 pb-1">
                    {/* Loop to draw ruler subdivisions (21 ticks) */}
                    {Array.from({ length: 21 }).map((_, i) => {
                      const isMajor = i % 5 === 0;
                      return (
                        <div
                          key={i}
                          className={`transition-colors duration-300 rounded-full ${
                            isMajor 
                              ? 'h-3 w-[1.5px] bg-brand-gold/60' 
                              : 'h-1.5 w-[1px] bg-brand-text-muted/40'
                          }`}
                        />
                      );
                    })}

                    {/* Dynamic sliding indicator point (the taxi pointer on the ruler) */}
                    <motion.div
                      className="absolute top-0 bottom-0 flex flex-col items-center justify-between pointer-events-none"
                      style={{ left: `calc(${progress}% - 8px)` }}
                      animate={{ left: `calc(${progress}% - 8px)` }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                    >
                      {/* Upper guide marker line */}
                      <div className="h-full w-[2px] bg-brand-gold shadow-[0_0_8px_rgba(255,211,67,0.8)]" />
                      
                      {/* Pointer tip bubble */}
                      <div className="absolute -top-1 w-4.5 h-4.5 rounded-full bg-brand-gold border border-white flex items-center justify-center shadow-lg -translate-x-[1.25px]">
                        <Car size={8} className="text-brand-midnight fill-brand-midnight" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Ruler Labels under the graduations */}
                  <div className="flex justify-between items-center text-[8px] font-black uppercase text-brand-text-muted px-1 mt-1.5 leading-none">
                    <span className="truncate max-w-[80px]" title={pickup.name}>
                      {slangMode ? "Départ" : "Pickup"}
                    </span>
                    <span className="font-mono text-brand-gold">
                      {progressPct}%
                    </span>
                    <span className="truncate max-w-[80px] text-right" title={destination.name}>
                      {slangMode ? "Dépôt" : "Dropoff"}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* Smooth Journey Progress Bar Animation */}
          {rideStatus === 'in_progress' && (
            <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-4 md:w-80 bg-brand-midnight/95 backdrop-blur border border-brand-card/80 p-3 rounded-xl shadow-xl z-[1000] text-white">
              <div className="space-y-2">
                {/* Header info */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-brand-gold uppercase tracking-wider text-[9px] flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold"></span>
                    {slangMode ? "Course en cours..." : "Active Ride Status"}
                  </span>
                  <span className="font-mono text-brand-gold font-extrabold text-xs">
                    {getTripProgressPercentage()}%
                  </span>
                </div>

                {/* Progress track & Bar */}
                <div className="relative h-1.5 bg-brand-input/60 rounded-full overflow-visible border border-brand-card/40">
                  {/* Moving animated line */}
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold/60 to-brand-gold rounded-full shadow-[0_0_8px_rgba(255,211,67,0.5)]"
                    animate={{ width: `${getTripProgressPercentage()}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />

                  {/* Little car icon that floats with the percentage progress! */}
                  <motion.div
                    className="absolute -top-1.5 -ml-2 z-10 text-brand-midnight"
                    animate={{ left: `${getTripProgressPercentage()}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  >
                    <div className="w-4.5 h-4.5 rounded-full bg-brand-gold border border-white flex items-center justify-center shadow-md">
                      <Car size={9} className="text-brand-midnight animate-bounce" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          )}


        </section>

      </div>

      {/* ========================================================================= */}
      {/* WALLET DEPOSIT PAYMENT GATEWAY MODAL */}
      {/* ========================================================================= */}
      <PaymentGateway
        isOpen={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setPendingTopUpAmount(0); }}
        amount={pendingTopUpAmount}
        paymentMethod={pendingTopUpMethod}
        onPaymentSuccess={handleTopUpSuccess}
      />

      {/* ========================================================================= */}
      {/* COMPLETED RIDE RECEIPT & RATING MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showReceipt && pickup && destination && activeDriver && (
          <div className="fixed inset-0 bg-brand-midnight/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4" id="receipt-modal">
            <ParticleExplosion particleCount={75} />
            <motion.div
              initial={{ scale: 0.65, opacity: 0, y: 50, rotateX: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="bg-brand-deep border border-brand-gold/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white font-sans relative z-[2001]"
            >
              <div className="p-5 text-center border-b border-brand-input/40 bg-gradient-to-b from-brand-gold/15 via-emerald-500/10 to-transparent space-y-2 relative overflow-hidden">
                <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0.2, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-brand-gold/30 blur-md"
                  />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.15 }}
                    className="w-12 h-12 bg-gradient-to-tr from-brand-gold via-amber-400 to-yellow-300 text-brand-midnight rounded-full flex items-center justify-center shadow-xl shadow-brand-gold/40 relative z-10"
                  >
                    <Check size={26} className="stroke-[3.5] text-brand-midnight" />
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                >
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-1 tracking-wider shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{slangMode ? "🎉 Trajet Réussi & Terminé !" : "🎉 Trip Completed Successfully!"}</span>
                  </div>
                  <h3 className="text-base font-black tracking-wide text-white">{slangMode ? "Reçu Officiel Wanda" : "Official Wanda Receipt"}</h3>
                  <p className="text-[10px] text-brand-gold font-mono font-bold uppercase tracking-wider">
                    {transactionId}
                  </p>
                </motion.div>
              </div>

              {/* Receipt Body */}
              <div className="p-5 space-y-4">
                <div className="space-y-2 border-b border-brand-input pb-3.5 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Ramassage (A) :</span>
                    <strong className="text-white text-right max-w-[170px] truncate">{pickup.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Dépôt (B) :</span>
                    <strong className="text-white text-right max-w-[170px] truncate">{destination.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Distance :</span>
                    <strong className="text-white">{rideDistance} KM</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Tarif de base :</span>
                    <strong className="text-white">{activeFareToCharge.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                  {currentRideWaitingTime > 0 && (
                    <div className="flex justify-between text-brand-gold bg-brand-gold/5 p-1 rounded border border-brand-gold/15">
                      <span>{slangMode ? "Frais d'attente :" : "Waiting Fee :"} ({Math.floor(currentRideWaitingTime / 60)}m {currentRideWaitingTime % 60}s)</span>
                      <strong>+{currentRideWaitingFare.toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  )}
                  {ridePointsRedeemed > 0 && (
                    <div className="flex justify-between text-indigo-400 bg-indigo-500/5 p-1 rounded border border-indigo-500/15">
                      <span>{slangMode ? "Réduction Wanda Points :" : "Wanda Points Discount :"} ({ridePointsRedeemed} pts)</span>
                      <strong>-{(ridePointsRedeemed * 100).toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  )}
                  {paymentMethod === 'wallet' && tipAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 bg-emerald-500/5 p-1 rounded border border-emerald-500/15">
                      <span>{slangMode ? "Pourboire (Chauffeur) :" : "Driver Tip :"}</span>
                      <strong>+{tipAmount.toLocaleString('fr-FR')} FCFA</strong>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Payement :</span>
                    {getPaymentBadge(paymentMethod)}
                  </div>
                  
                  {/* Highlighted Wanda Points Earned Banner */}
                  {(() => {
                    const pointsEarned = paymentMethod === 'wallet' ? 1 : 0;
                    return pointsEarned > 0 ? (
                      <div className="mt-1.5 flex justify-between items-center text-[10.5px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1.5 rounded-xl border border-indigo-500/20 font-bold">
                        <span>⭐ {slangMode ? "Points Wanda gagnés (Payement Wallet) :" : "Wanda Points Earned (Wallet Pay) :"}</span>
                        <span>+1 pt (≈ 100 FCFA)</span>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex justify-between items-center text-[10.5px] text-brand-text-muted bg-brand-input/20 px-2.5 py-1.5 rounded-xl border border-brand-input/30 font-medium">
                        <span>⭐ {slangMode ? "Points Wanda (Payement Cash) :" : "Wanda Points (Cash Pay) :"}</span>
                        <span>0 pt ({slangMode ? "Payez par Wallet pour gagner +1 pt" : "Wallet Payment Required"})</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Tipping Selector Section - Wallet Only */}
                {paymentMethod === 'wallet' && (
                  <div className="bg-brand-input/40 border border-brand-card/85 p-3 rounded-2xl space-y-2.5 text-center">
                    <p className="text-[10px] font-extrabold text-brand-text-muted uppercase tracking-wider flex items-center justify-center gap-1.5">
                      <span>💸</span> {slangMode ? "Laisser un pourboire au djo" : "Add a Tip for Driver"}
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[0, 500, 1000, 2000].map((amt) => {
                        const isSelected = tipAmount === amt;
                        return (
                          <button
                            key={amt}
                            onClick={() => setTipAmount(amt)}
                            type="button"
                            className={`py-2 px-1 rounded-xl text-[10px] font-extrabold tracking-tight transition duration-200 cursor-pointer flex flex-col items-center justify-center border ${
                              isSelected
                                ? 'bg-brand-gold text-brand-midnight border-brand-gold shadow-md'
                                : 'bg-brand-card/50 text-brand-text-muted border-brand-input hover:text-white hover:border-brand-text-muted/45'
                            }`}
                          >
                            <span>{amt === 0 ? (slangMode ? "Aucun" : "No Tip") : `+${amt}`}</span>
                            {amt > 0 && <span className="text-[8px] opacity-80">FCFA</span>}
                          </button>
                        );
                      })}
                    </div>
                    {tipAmount > 0 && (
                      <p className="text-[9px] text-emerald-400 font-semibold leading-tight">
                        {slangMode 
                          ? `Le djo recevra 100% de tes ${tipAmount.toLocaleString('fr-FR')} FCFA de bonus.`
                          : `Driver receives 100% of your ${tipAmount.toLocaleString('fr-FR')} FCFA bonus.`}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center text-sm font-bold border-b border-brand-input pb-3.5">
                  <span className="text-brand-text-muted">{language === 'fr' ? "Montant Total :" : "Total Amount :"}</span>
                  <span className="text-base font-black text-brand-gold">{(Math.max(0, activeFareToCharge - (ridePointsRedeemed * 100)) + currentRideWaitingFare + (paymentMethod === 'wallet' ? tipAmount : 0)).toLocaleString('fr-FR')} FCFA</span>
                </div>

                {/* Rating component */}
                <div className="text-center space-y-2.5">
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">
                    {language === 'fr' ? "Note ton Chauffeur" : "Rate your Driver"}
                  </p>
                  
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        className="text-xl cursor-pointer hover:scale-110 transition focus:outline-none"
                      >
                        <Star
                          size={20}
                          className={star <= userRating ? 'fill-brand-gold text-brand-gold' : 'text-brand-input'}
                        />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={userPraise}
                    onChange={(e) => setUserPraise(e.target.value)}
                    placeholder={slangMode ? "Ex: Chauffeur poli, rapide, clim nickel..." : "Feedback..."}
                    className="w-full bg-brand-input border border-brand-card rounded-xl px-3 py-2 text-[11px] text-white text-center focus:outline-none"
                    id="rating-comment-input"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (pickup && destination && activeDriver) {
                        const finalFareToCharge = Math.max(0, activeFareToCharge - (ridePointsRedeemed * 100)) + currentRideWaitingFare + (paymentMethod === 'wallet' ? tipAmount : 0);
                        const currentHist: HistoryItem = {
                          id: transactionId || `hist_${Date.now()}`,
                          date: new Date().toLocaleString(),
                          pickupName: pickup.name,
                          destName: destination.name,
                          fare: finalFareToCharge,
                          driverName: activeDriver.name,
                          vehicleClass: activeDriver.vehicleType ? activeDriver.vehicleType.toUpperCase() : 'COMFORT VIP',
                          paymentMethod: paymentMethod,
                          tipAmount: tipAmount,
                          status: 'completed'
                        };
                        downloadPDFReceipt(currentHist);
                      }
                    }}
                    className="w-full bg-slate-900/90 hover:bg-slate-800 text-brand-gold font-extrabold py-2.5 rounded-2xl text-xs border border-brand-gold/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 shadow-md"
                    id="download-receipt-modal-btn"
                  >
                    <Download size={14} className="text-brand-gold" />
                    <span>{slangMode ? "Télécharger Reçu PDF Officiel" : "Download Official PDF Invoice"}</span>
                  </button>

                  <button
                    onClick={handleSubmitRating}
                    className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-3 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-brand-gold/25"
                    id="submit-rating-btn"
                  >
                    Confirm & Close Receipt
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* SMART KEYBOARD-SAFE AUTOCOMPLETE SEARCH MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {searchModalType && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4">
            {/* Blur backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-md cursor-pointer"
              onClick={() => setSearchModalType(null)}
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              className="relative w-full max-w-lg bg-brand-card border-2 border-brand-gold/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col mt-4 md:mt-[8%] max-h-[85vh] md:max-h-[65vh]"
              id="smart-search-overlay"
            >
              {/* Header */}
              <div className="p-4 border-b border-brand-input bg-brand-midnight/80 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase text-brand-gold tracking-widest flex items-center gap-1.5">
                    🔍 {searchModalType === 'pickup' 
                      ? (slangMode ? "POINT DE RAMASSAGE" : "PICKUP LOCATION") 
                      : (slangMode ? "LIEU DE DESTINATION" : "DESTINATION POINT")
                    }
                  </h3>
                  <p className="text-[10px] text-brand-text-muted font-bold">
                    {slangMode ? "Saisis un nom, carrefour, quartier ou station" : "Enter street, neighborhood, market or brand"}
                  </p>
                </div>
                <button 
                  onClick={() => setSearchModalType(null)}
                  className="w-7 h-7 bg-brand-input hover:bg-brand-gold/15 border border-brand-input text-brand-text-muted hover:text-white rounded-lg flex items-center justify-center text-xs font-black cursor-pointer transition"
                >
                  ✕
                </button>
              </div>

              {/* Input bar */}
              <div className="p-3 bg-brand-deep border-b border-brand-input relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchModalType === 'pickup'
                    ? (slangMode ? "Saisis un lieu (ex: Bastos, Melen, Total...)" : "Type pickup station...")
                    : (slangMode ? "Saisis un lieu (ex: Ndokoti, Akwa, Biyem Assi...)" : "Type destination...")
                  }
                  className="w-full bg-brand-input border-2 border-brand-card focus:border-brand-gold/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none transition shadow-inner font-semibold"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] bg-brand-card hover:bg-brand-input text-brand-text-muted px-2 py-1 rounded cursor-pointer font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Proposals list */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[45vh] md:max-h-[35vh]">
                {(() => {
                  const proposals = searchQuery 
                    ? getSmartProposals(searchQuery, currentCity) 
                    : activeCityLocations;

                  if (proposals.length === 0) {
                    return (
                      <div className="p-6 text-center space-y-2">
                        <p className="text-xs text-brand-text-muted font-bold">Aucune proposition trouvée</p>
                        <p className="text-[10px] text-brand-text-muted/70">Continuez à saisir pour créer une station personnalisée</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* Live GPS standing position detector row */}
                      <button
                        type="button"
                        onClick={() => {
                          geolocateCurrentPosition(() => {
                            setSearchModalType(null);
                          });
                        }}
                        disabled={isGeolocating}
                        className="w-full text-left px-3.5 py-3 rounded-xl text-xs bg-brand-gold/10 hover:bg-brand-gold/20 border-2 border-dashed border-brand-gold/30 hover:border-brand-gold flex items-center justify-between gap-3 cursor-pointer transition font-bold group mb-3 text-brand-gold"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-5 h-5 rounded bg-brand-gold/20 flex items-center justify-center shrink-0 animate-pulse text-[11px]">
                            🎯
                          </div>
                          <div className="truncate">
                            <p className="font-extrabold text-[12px] text-brand-gold group-hover:text-white leading-tight">
                              {isGeolocating 
                                ? (slangMode ? "Détection GPS debout en cours..." : "Retrieving GPS standing position...")
                                : (slangMode ? "Géolocaliser ma position debout (GPS)" : "Geolocate My Standing Position (GPS)")
                              }
                            </p>
                            <p className="text-[9.5px] text-brand-text-muted group-hover:text-slate-300 font-medium truncate">
                              {slangMode 
                                ? "Mets à jour ton point de départ avec ton GPS live exact" 
                                : "Set your exact live coordinate as the pickup point"
                              }
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-brand-gold group-hover:text-white font-black pr-1 shrink-0">
                          {slangMode ? "GPS live ➔" : "Acquire GPS ➔"}
                        </span>
                      </button>

                      <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase text-brand-gold/70 tracking-widest flex items-center justify-between">
                        <span>{searchQuery ? "Propositions Intelligentes" : "Stations Populaires"}</span>
                        <span className="text-[8px] px-1 bg-brand-gold/10 text-brand-gold rounded border border-brand-gold/10 font-black">
                          {currentCity.toUpperCase()}
                        </span>
                      </div>

                      {proposals.map((loc, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (searchModalType === 'pickup') {
                              setPickup(loc);
                            } else {
                              setDestination(loc);
                            }
                            setSearchModalType(null);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-brand-text-muted hover:bg-brand-gold/10 hover:text-white border border-transparent hover:border-brand-gold/30 flex items-center justify-between gap-3 cursor-pointer transition font-medium group"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {searchModalType === 'pickup' ? (
                              <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <MapPin size={11} className="text-emerald-400" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                                <Navigation size={11} className="text-brand-gold rotate-45" />
                              </div>
                            )}
                            <div className="truncate">
                              <p className="font-extrabold text-white text-[12px] group-hover:text-brand-gold truncate leading-tight">
                                {loc.name}
                              </p>
                              <p className="text-[9px] text-brand-text-muted group-hover:text-slate-300 font-mono">
                                Lat: {loc.lat.toFixed(4)}, Lng: {loc.lng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-brand-gold opacity-0 group-hover:opacity-100 transition font-black pr-1 shrink-0">
                            Sélectionner ➔
                          </span>
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
              
              {/* Quick Suggestions presets shortcuts bar */}
              <div className="p-3 border-t border-brand-input bg-brand-midnight/90 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold shrink-0">
                <span className="text-brand-text-muted shrink-0 text-[9px] uppercase font-black">Raccourcis:</span>
                {(currentCity.toLowerCase().includes('douala') 
                  ? ['Akwa', 'Ndokoti', 'Deido', 'Bonamoussadi', 'Total', 'Mall'] 
                  : ['Bastos', 'Melen', 'Mendong', 'Obili', 'Total', 'Mokolo']
                ).map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSearchQuery(preset)}
                    className="px-2 py-1 bg-brand-input hover:bg-brand-gold border border-brand-card hover:text-brand-midnight rounded-lg text-white font-black cursor-pointer transition text-[10.5px] shrink-0"
                  >
                    #{preset}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* POWERFUL ADMIN CONSOLE & LOGIN OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAdminLoginModal && (
          <AdminLoginModal
            onSuccess={() => {
              setIsAdminAuthenticated(true);
              setShowAdminLoginModal(false);
              setIsAdminOpen(true);
            }}
            onClose={() => setShowAdminLoginModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminOpen && (
          <AdminDashboard
            onClose={() => setIsAdminOpen(false)}
            driversList={driversList}
            onApproveDriver={handleApproveDriver}
            onRejectDriver={handleRejectDriver}
            onUpdateDriversList={(updatedList) => setDriversList(updatedList)}
            systemSettings={systemSettings}
            onUpdateSettings={setSystemSettings}
            transactions={transactions}
            onApproveWithdrawal={handleApproveWithdrawal}
          />
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* NO DRIVER AVAILABLE POPUP MODAL */}
      {/* ========================================================================= */}
      <NoDriverModal
        isOpen={showNoDriverModal}
        onClose={() => setShowNoDriverModal(false)}
        requestedClassId={noDriverRequestedClassId}
        onSelectAlternativeClass={(newClassId) => {
          setShowNoDriverModal(false);
          startSearchingDriver(newClassId);
        }}
        slangMode={slangMode}
        language={language}
        rideDistance={rideDistance}
        surgeMultiplier={systemSettings.surgeMultiplier}
        classRates={systemSettings.classRates}
      />

      {/* ========================================================================= */}
      {/* SHARE MY RIDE DIALOG MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-sm z-[2500] flex items-center justify-center p-4 text-white font-sans" id="share-ride-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-deep border-2 border-brand-gold/60 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => { setShowShareModal(false); setCopied(false); }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-white p-1.5 rounded-full hover:bg-brand-input cursor-pointer z-50 transition"
              >
                <X size={18} />
              </button>

              <div className="p-5 bg-brand-gold/10 border-b border-brand-gold/20 text-center space-y-2">
                <span className="w-12 h-12 bg-brand-gold/15 rounded-full flex items-center justify-center mx-auto text-xl shadow-inner animate-pulse">
                  📡
                </span>
                <h3 className="text-sm font-black text-brand-gold tracking-wider uppercase">
                  {slangMode ? "Partager Mon Trajet" : "Share My Ride"}
                </h3>
                <p className="text-[11px] text-brand-text-muted font-semibold leading-relaxed">
                  {slangMode 
                    ? "Génère un lien de suivi en direct sécurisé pour tes proches." 
                    : "Generate an active live-tracking link to share with family or friends."}
                </p>
              </div>

              <div className="p-5 space-y-4">
                {/* Trip Preview details */}
                <div className="bg-brand-card/40 border border-brand-input rounded-xl p-3 space-y-2 text-[10px] font-semibold text-brand-text-muted">
                  <div className="flex justify-between border-b border-brand-input/30 pb-1.5">
                    <span>{slangMode ? "Passager" : "Rider"}: <strong className="text-white">{user?.name}</strong></span>
                    <span>{slangMode ? "Chauffeur" : "Driver"}: <strong className="text-white">{activeDriver?.name}</strong></span>
                  </div>
                  <div className="space-y-1">
                    <p className="truncate">📍 <span className="text-white font-bold">{pickup?.name}</span></p>
                    <p className="truncate">🏁 <span className="text-white font-bold">{destination?.name}</span></p>
                  </div>
                </div>

                {/* Shared link display box */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">
                    {slangMode ? "Lien de suivi unique" : "Unique Tracking Link"}
                  </span>
                  <div className="flex bg-brand-card border border-brand-input rounded-xl p-1 items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-transparent border-0 text-[10px] font-semibold font-mono text-brand-gold select-all focus:outline-none px-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!shareUrl) return;
                        navigator.clipboard.writeText(shareUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="bg-brand-input hover:bg-brand-card hover:text-white text-brand-gold border border-brand-card p-1.5 rounded-lg transition active:scale-90 cursor-pointer shrink-0"
                      title={slangMode ? "Copier le lien" : "Copy Link"}
                    >
                      {copied ? (
                        <span className="text-[9px] font-black text-emerald-400 px-1">✓ Copied</span>
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Share Channels */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">
                    {slangMode ? "Canaux de partage direct" : "Direct Share Channels"}
                  </span>
                  <a
                    href={shareUrl ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
                      slangMode 
                        ? `Suis mon trajet Wanda 🚕 en direct : ${shareUrl}`
                        : `Track my Wanda ride 🚕 live : ${shareUrl}`
                    )}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.114-2.875-6.973C16.588 1.91 14.12 1.15 11.517 1.15 6.08 1.15 1.657 5.57 1.653 11.01c0 1.685.443 3.328 1.283 4.766L1.926 21.9l6.23-1.632zM17.47 14.39c-.32-.16-1.89-.93-2.18-1.04-.3-.11-.51-.17-.72.15-.22.3-.83 1.04-1.02 1.25-.19.22-.38.25-.7.09-.32-.16-1.34-.49-2.56-1.58-.95-.84-1.59-1.89-1.78-2.21-.19-.32-.02-.49.14-.65.15-.14.32-.38.49-.57.16-.19.22-.32.32-.54.1-.22.05-.41-.02-.57-.08-.16-.72-1.73-.99-2.37-.26-.63-.52-.54-.72-.55-.19-.01-.41-.01-.63-.01-.22 0-.57.08-.88.41-.31.33-1.2 1.17-1.2 2.85 0 1.68 1.22 3.3 1.39 3.53.17.22 2.4 3.66 5.8 5.13.81.35 1.44.56 1.93.72.82.26 1.56.22 2.15.14.65-.1 1.89-.77 2.16-1.48.27-.71.27-1.31.19-1.44-.08-.13-.3-.21-.62-.37z"/>
                    </svg>
                    <span>{slangMode ? "Partager sur WhatsApp" : "Share on WhatsApp"}</span>
                  </a>
                </div>

                <div className="bg-brand-card/60 p-3 rounded-xl flex gap-2 text-[10px] leading-relaxed text-brand-text-muted font-medium border border-brand-input">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    {slangMode 
                      ? "Le lien s'actualise toutes les 2 secondes pour montrer ton trajet précis." 
                      : "The link refreshes automatically to reflect your real-time coordinates."}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* LOCAL SÉCURITÉ SOS DIALOG DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSOS && (
          <div className="fixed inset-0 bg-brand-midnight/90 backdrop-blur-sm z-[2500] flex items-center justify-center p-4 text-white font-sans" id="sos-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-deep border-2 border-rose-600 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => { setShowSOS(false); setSosAlertTriggered(false); }}
                className="absolute top-3.5 right-3.5 text-brand-text-muted hover:text-white p-1.5 rounded-full hover:bg-brand-input cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="p-6 bg-rose-950/20 border-b border-rose-950/40 text-center space-y-2">
                <span className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center mx-auto text-xl shadow-lg shadow-rose-600/35 animate-pulse">
                  🚨
                </span>
                <h3 className="text-base font-black text-rose-500 tracking-wider">SECURE EMERGENCY SOS</h3>
                <p className="text-[11px] text-brand-text-muted font-semibold leading-relaxed">
                  {slangMode ? "Si tu es en danger, déclenche l'alerte pour avertir le centre de Gendarmerie le plus proche à Douala." : "Instantly signal Gendarmerie and dispatch hubs in case of physical threat."}
                </p>
              </div>

              <div className="p-6 space-y-4">
                
                {/* Emergency speed dials */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-brand-text-muted block">Direct Emergency Speed Dials</span>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="tel:113"
                      className="p-3 bg-rose-600 hover:bg-rose-500 rounded-xl text-center font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition"
                    >
                      <span>📞 Dial 113</span>
                      <span className="text-[9px] font-normal uppercase opacity-90">Gendarmerie</span>
                    </a>
                    <a
                      href="tel:117"
                      className="p-3 bg-brand-input hover:bg-brand-card rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-1 border border-rose-950/50 transition"
                    >
                      <span>📞 Dial 117</span>
                      <span className="text-[9px] font-normal uppercase opacity-75">National Police</span>
                    </a>
                  </div>
                </div>

                {/* Threat dispatch trigger */}
                {!sosAlertTriggered ? (
                  <button
                    onClick={() => setSosAlertTriggered(true)}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3.5 rounded-2xl text-xs shadow-lg shadow-rose-600/25 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚠️ Broadcast Gendarmerie Threat Alert</span>
                  </button>
                ) : (
                  <div className="bg-rose-950/30 border border-rose-900 rounded-xl p-4 text-center space-y-2 animate-pulse">
                    <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-wide block">Broadcasting Live Coordinates...</span>
                    {sosCountdown > 0 ? (
                      <p className="text-white text-xs font-semibold">
                        Locking coordinate handshake in <strong className="text-rose-500 text-sm font-black font-mono">{sosCountdown}s</strong>...
                      </p>
                    ) : (
                      <p className="text-emerald-400 text-xs font-black">
                        ✓ SECURE SOS SHIFT BROADCAST SENT SUCCESSFULLY TO CENTRAL CLOUD SYSTEM.
                      </p>
                    )}
                    <button
                      onClick={() => setSosAlertTriggered(false)}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer font-bold block mx-auto mt-2"
                    >
                      Cancel Dispatch
                    </button>
                  </div>
                )}

                <div className="bg-brand-card/60 p-3 rounded-xl flex gap-2 text-[10px] leading-relaxed text-brand-text-muted font-medium border border-brand-input">
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Your live GPS coordinates **({pickup?.lat.toFixed(4)}, {pickup?.lng.toFixed(4)})** and ride details are secure.
                  </span>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Progressive Web App prompt */}
      <InstallPrompt language={language} />

      {/* IN-APP CALL OVERLAY */}
      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-brand-midnight/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-brand-card/90 border border-brand-gold/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between min-h-[480px] text-white relative overflow-hidden"
            >
              {/* Elegant ambient glow background */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Header Status */}
              <div className="text-center w-full">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
                  Wanda In-App Call
                </span>
                <p className="text-xs text-brand-text-muted mt-3 font-semibold">
                  {callState === 'outgoing' && 'Appel en cours / Ringing...'}
                  {callState === 'incoming' && 'Appel entrant / Incoming...'}
                  {callState === 'active' && 'Appel actif / Active Call'}
                </p>
              </div>

              {/* Calling Avatar/Logo Pulsing animation */}
              <div className="flex flex-col items-center gap-4 my-auto">
                <div className="relative">
                  {/* Multiple pulsing rings */}
                  {(callState === 'outgoing' || callState === 'incoming') && (
                    <>
                      <div className="absolute inset-0 bg-brand-gold/30 rounded-full animate-ping scale-125"></div>
                      <div className="absolute inset-0 bg-brand-gold/15 rounded-full animate-ping scale-150"></div>
                    </>
                  )}
                  {callState === 'active' && (
                    <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse scale-110"></div>
                  )}

                  <div className="relative w-24 h-24 rounded-full bg-brand-deep border-4 border-brand-gold p-1 flex items-center justify-center shadow-2xl shadow-brand-gold/20">
                    <img
                      src={
                        role === 'passenger'
                          ? (activeDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
                          : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                      }
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">
                    {role === 'passenger'
                      ? (activeDriver?.name || (language === 'fr' ? 'Chauffeur Wanda' : 'Wanda Driver'))
                      : (driverRideRequest?.passengerName || user?.name || 'Passenger Client')}
                  </h4>
                  <p className="text-xs text-brand-text-muted font-bold mt-1">
                    {role === 'passenger'
                      ? `${language === 'fr' ? 'Chauffeur' : 'Driver'} (${(activeDriver?.vehicleType || activeDriver?.vehicleModel || 'TAXI').toUpperCase()})`
                      : (slangMode ? 'Client Passager' : 'Passenger Client')}
                  </p>
                </div>

                {/* Duration indicator or Ringing Waveform */}
                {callState === 'active' ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="font-mono text-xl font-black text-brand-gold">
                      {Math.floor(callDuration / 60).toString().padStart(2, '0')}:
                      {(callDuration % 60).toString().padStart(2, '0')}
                    </span>
                    {/* Animated sound waves */}
                    <div className="flex items-center gap-1 h-4 mt-1">
                      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((val, idx) => (
                        <motion.span
                          key={idx}
                          animate={{ height: ['4px', `${val * 4}px`, '4px'] }}
                          transition={{ duration: 0.8 + idx * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                          className="w-1 bg-brand-gold rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-brand-text-muted animate-pulse font-medium">
                    Securing encrypted connection...
                  </p>
                )}
              </div>

              {/* Calling Controls */}
              <div className="w-full space-y-6">
                {/* Speaker & Mute Buttons */}
                {callState === 'active' && (
                  <div className="flex justify-center gap-8">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isMuted 
                          ? 'bg-brand-gold text-brand-midnight border-brand-gold' 
                          : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'
                      }`}
                    >
                      <MicOff size={20} />
                    </button>
                    <button
                      onClick={() => setIsSpeaker(!isSpeaker)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isSpeaker 
                          ? 'bg-brand-gold text-brand-midnight border-brand-gold' 
                          : 'bg-brand-input border-brand-card text-brand-text-muted hover:text-white'
                      }`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                )}

                {/* Decline, Accept, End Buttons */}
                <div className="flex justify-center items-center gap-6">
                  {callState === 'incoming' ? (
                    <>
                      {/* Decline Call */}
                      <button
                        onClick={declineInAppCall}
                        className="w-16 h-16 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-600/25 transition cursor-pointer"
                      >
                        <PhoneOff size={24} className="stroke-[2.5]" />
                      </button>

                      {/* Answer Call */}
                      <button
                        onClick={answerInAppCall}
                        className="w-16 h-16 bg-emerald-500 hover:bg-emerald-400 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 transition cursor-pointer animate-bounce"
                      >
                        <Phone size={24} className="stroke-[2.5]" />
                      </button>
                    </>
                  ) : (
                    /* End Call (for outgoing & active states) */
                    <button
                      onClick={endInAppCall}
                      className="w-16 h-16 bg-rose-600 hover:bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-rose-600/25 transition cursor-pointer"
                    >
                      <PhoneOff size={24} className="stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Background permissions info note */}
                <p className="text-[9px] text-brand-text-muted/80 text-center px-2 italic font-medium">
                  ℹ️ {language === 'fr' 
                    ? "Sonneries & vibrations Web Audio. Pour la sonnerie en arrière-plan écran éteint, autorisez les notifications Push."
                    : "In-app ringtone & vibration active via Web Audio. Background ringing when app closed requires push permissions."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Half-Screen Sliding Chat Panel Overlay */}
      <AnimatePresence>
        {showChat && (
          <>
            {/* Semi-transparent Backdrop overlay covering map & trip status above */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[1400] cursor-pointer"
            />

            {/* Bottom Sheet Sliding Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-[1500] w-full max-w-lg mx-auto bg-brand-midnight border-t-2 border-brand-gold/50 rounded-t-3xl shadow-[0_-12px_48px_rgba(0,0,0,0.85)] flex flex-col h-[55vh] min-h-[380px] max-h-[550px] overflow-hidden"
              id="half-screen-chat-panel"
            >
              {/* Swipe/Drag top handle */}
              <div 
                onClick={() => setShowChat(false)}
                className="w-full py-2 flex justify-center items-center cursor-pointer hover:bg-brand-card/30 transition shrink-0 group"
                title={slangMode ? "Fermer le tchat" : "Dismiss chat"}
              >
                <div className="w-12 h-1.5 bg-brand-input group-hover:bg-brand-gold rounded-full transition-colors" />
              </div>

              {/* Panel Header */}
              <div className="px-4 py-2.5 bg-brand-card border-b border-brand-input flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        role === 'passenger'
                          ? (activeDriver?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
                          : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
                      }
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-brand-gold"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-brand-card rounded-full animate-pulse" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-white truncate">
                      {role === 'passenger'
                        ? (activeDriver?.name || (slangMode ? "Chauffeur Wanda" : "Wanda Driver"))
                        : (driverRideRequest?.passengerName || user?.name || "Passenger Client")}
                    </h4>
                    <p className="text-[10px] text-brand-gold font-bold">
                      {role === 'passenger' 
                        ? (activeDriver?.vehicleModel || "Taxi") 
                        : (slangMode ? "Client Wanda" : "Active Passenger")}
                    </p>
                  </div>
                </div>

                {/* Header Action Buttons: Direct Call & Close */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startInAppCall(role === 'passenger' ? 'passenger' : 'driver')}
                    className="py-1.5 px-3 bg-brand-gold hover:bg-amber-400 text-brand-midnight font-black text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md shadow-brand-gold/20"
                    title={slangMode ? "Lancer un appel direct" : "Call directly"}
                  >
                    <Phone size={13} className="stroke-[2.5]" />
                    <span>{slangMode ? "Appeler" : "Call"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowChat(false)}
                    className="p-1.5 text-brand-text-muted hover:text-white bg-brand-input hover:bg-brand-card border border-brand-card rounded-xl transition cursor-pointer"
                    title={slangMode ? "Fermer" : "Close"}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs bg-brand-deep/30">
                {messages.length === 0 ? (
                  <div className="text-center py-8 px-4 space-y-2">
                    <p className="text-brand-gold text-xl">💬</p>
                    <p className="text-brand-text-muted italic font-medium text-xs">
                      {role === 'passenger'
                        ? (slangMode ? "Envoie un message au djo !" : "Send a message to your driver!")
                        : (slangMode ? "Envoie un message au client !" : "Send a message to your passenger!")}
                    </p>
                  </div>
                ) : (
                  messages.map((m, index) => {
                    const isMe = (role === 'passenger' && m.sender === 'passenger') || (role === 'driver' && m.sender === 'driver');
                    return (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[82%] rounded-2xl p-3 shadow-sm ${
                          isMe
                            ? 'bg-brand-gold text-brand-midnight self-end ml-auto font-bold rounded-br-none'
                            : 'bg-brand-card border border-brand-input text-white self-start mr-auto font-medium rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed text-xs">{m.text}</p>
                        <span className={`text-[8px] text-right mt-1 font-mono ${isMe ? 'text-brand-midnight/70' : 'text-brand-text-muted'}`}>
                          {m.timestamp}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Preset Replies */}
              <div className="px-3 py-2 bg-brand-midnight border-t border-brand-input/40 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                {(role === 'passenger' ? [
                  slangMode ? "Je suis déjà là djo !" : "I am outside!",
                  slangMode ? "Tu es où ?" : "Where are you?",
                  slangMode ? "J'arrive, attends moi stp" : "On my way, please wait!",
                  slangMode ? "Je suis au carrefour" : "I am at the carrefour"
                ] : [
                  slangMode ? "Je suis arrivé mon frère !" : "I have arrived!",
                  slangMode ? "Embouteillage sur la route" : "Heavy traffic, arriving soon!",
                  slangMode ? "Je suis garé au repère" : "Parked at pickup landmark",
                  slangMode ? "D'accord, bien reçu !" : "Okay, copy that!"
                ]).map((presetText) => (
                  <button
                    key={presetText}
                    type="button"
                    onClick={() => {
                      const mySender = role === 'passenger' ? 'passenger' : 'driver';
                      const otherSender = role === 'passenger' ? 'driver' : 'passenger';
                      const newMsg: Message = {
                        sender: mySender,
                        text: presetText,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      };
                      setMessages(prev => [...prev, newMsg]);
                      setTimeout(() => {
                        const randomPidgin = CHAT_PIDGIN_RESPONSES[Math.floor(Math.random() * CHAT_PIDGIN_RESPONSES.length)];
                        setMessages(prev => [
                          ...prev,
                          {
                            sender: otherSender,
                            text: randomPidgin,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        ]);
                      }, 1400);
                    }}
                    className="text-[10px] font-bold bg-brand-input hover:bg-brand-card text-brand-gold border border-brand-card rounded-full px-3 py-1 whitespace-nowrap cursor-pointer transition shrink-0 active:scale-95"
                  >
                    {presetText}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendChat} className="p-2.5 border-t border-brand-input bg-brand-card flex gap-2 shadow-md shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={slangMode ? "Tchatter en Pidgin / Franglais..." : "Type your message..."}
                  className="flex-1 bg-brand-input border border-brand-card rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input"
                  id="driver-chat-input"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black rounded-xl cursor-pointer flex items-center justify-center transition active:scale-95 shadow-md"
                >
                  <Send size={14} className="stroke-[2.5]" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Push Notification Banner Overlay */}
      <NotificationPushBanner
        notification={pushBannerNotif}
        onClose={() => setPushBannerNotif(null)}
        onOpenDrawer={() => {
          setPushBannerNotif(null);
          setIsNotificationDrawerOpen(true);
        }}
      />

      {/* Notification Drawer Panel */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={appNotifications}
        role={role}
      />

    </div>
  );
}
