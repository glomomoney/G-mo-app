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
  ShieldCheck,
  AlertTriangle,
  Bell,
  Sliders,
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
  FileText
} from 'lucide-react';

// Subcomponents
import TaxiMap from './components/TaxiMap';
import MiniatureMap from './components/MiniatureMap';
import PaymentGateway from './components/PaymentGateway';
import InstallPrompt from './components/InstallPrompt';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import WalletCard from './components/WalletCard';
import DriverWallet from './components/DriverWallet';
import WandaLogo from './components/WandaLogo';
import { getSmartProposals } from './utils/autocomplete';

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
  HistoryItem 
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
  const [activeTab, setActiveTab] = useState<'booking' | 'wallet' | 'history'>('booking');

  // Adjust active tab of driver
  const [driverActiveTab, setDriverActiveTab] = useState<'orders' | 'wallet'>('orders');

  // 3. Dual Wallet Balances & Shared Transactions (Persistent in Local Storage)
  const [passengerWallet, setPassengerWallet] = useState<number>(() => {
    const saved = localStorage.getItem('wanda_passenger_wallet');
    return saved ? parseInt(saved) : 12000; // Credited with 12,000 XAF for testing
  });

  const [driverWallet, setDriverWallet] = useState<number>(() => {
    const saved = localStorage.getItem('wanda_driver_wallet');
    return saved ? parseInt(saved) : 18500; // Credited with 18,500 XAF for testing
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
      topupPromoRate: 15 // 15% bonus by default
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
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
  const [destination, setDestination] = useState<Location | null>(YAOUNDE_LOCATIONS[2]);
  // Keyboard-safe smart autocomplete state
  const [searchModalType, setSearchModalType] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ecoride');
  const [isSettingLocationType, setIsSettingLocationType] = useState<'pickup' | 'destination' | null>(null);

  const [currentCity, setCurrentCity] = useState<string>('Yaoundé');

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

  // 7. Booking Status and Simulation Engines
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(3);
  const [etaStatusText, setEtaStatusText] = useState<string>('');
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
  const [isAdminPage, setIsAdminPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('page') === 'admin' || params.get('admin') === 'true';
    }
    return false;
  });
  const [showSOS, setShowSOS] = useState(false);
  const [sosAlertTriggered, setSosAlertTriggered] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);

  // Share My Ride States
  const [showShareModal, setShowShareModal] = useState(false);
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

      // Offset destination by ~1.5km so there is a nice visible route on map
      setDestination({
        name: slangMode ? "🏁 Destination GPS" : "🏁 GPS Destination",
        lat: latitude + 0.012,
        lng: longitude + 0.012
      });

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
    localStorage.setItem('wanda_driver_wallet', driverWallet.toString());
  }, [driverWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('wanda_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem('wanda_waiting_logs', JSON.stringify(waitingLogs));
  }, [waitingLogs]);

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
  };

  const answerInAppCall = () => {
    setCallState('active');
  };

  const declineInAppCall = () => {
    setCallState('idle');
  };

  const endInAppCall = () => {
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

  // Professional PDF receipt generator for business passengers
  const downloadPDFReceipt = (hist: HistoryItem) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const getPaymentLabel = (method: string) => {
      switch (method) {
        case 'momo_mtn': return 'MTN Mobile Money';
        case 'orange_money': return 'Orange Money';
        case 'wallet': return 'Wanda Wallet';
        default: return 'Cash Payment';
      }
    };

    // Brand and theme colors
    const brandMidnight = [11, 15, 25]; // #0B0F19
    const brandGold = [234, 179, 8];   // #EAB308
    const darkGray = [30, 41, 59];     // #1E293B
    const lightGray = [100, 116, 139]; // #64748B
    const bgHeader = [241, 245, 249];  // #F1F5F9

    // Page decoration - Header bar
    doc.setFillColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
    doc.rect(0, 0, 210, 45, 'F');

    // Gold separator accent line
    doc.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.rect(0, 45, 210, 2.5, 'F');

    // Corporate branding
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('WANDA TAXI', 15, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 187, 202);
    doc.text('Premium Smart Urban Mobility Platform', 15, 24);
    doc.text('Web: ai.studio/build/wanda | Support: +237 677 00 00 00', 15, 29);
    doc.text('RC/DLA/2026/B/1452 | Cameroon Taxpayer ID / NIU: M0726145290A', 15, 34);

    // Receipt header details (right side of header)
    doc.setFontSize(16);
    doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('BUSINESS RECEIPT', 130, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Invoice ID: WND-${hist.id.replace('hist_', '')}`, 130, 25);
    doc.text(`Date of Service: ${hist.date}`, 130, 31);
    doc.text('Status: SETTLED & COMPLETED', 130, 37);

    // Section 1: Customer Details vs Service Details
    doc.setFontSize(10.5);
    doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('PASSENGER DETAILS', 15, 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(`Name: ${user?.name || 'Wanda Passenger'}`, 15, 66);
    doc.text(`Phone Contact: ${user?.phone || 'Not available'}`, 15, 72);
    doc.text('Corporate Class: Business Expense Account', 15, 78);

    // Service Details
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE REPRESENTATIVE', 115, 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Driver Partner: ${hist.driverName}`, 115, 66);
    doc.text(`Transit Tier: ${hist.vehicleClass}`, 115, 72);
    doc.text('Regulator Status: Verified & Licensed', 115, 78);

    // Gray Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 85, 195, 85);

    // Section 2: Journey Logistics
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ROUTE LOGISTICS & DISPATCH', 15, 93);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    // Draw green starting pin circle
    doc.setFillColor(16, 185, 129); // emerald 500
    doc.circle(18, 100, 1.5, 'F');
    doc.text(`Pickup Station: ${hist.pickupName}`, 23, 101);

    // Draw gold dropoff pin circle
    doc.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.circle(18, 108, 1.5, 'F');
    doc.text(`Destination: ${hist.destName}`, 23, 109);

    // Divider Line
    doc.line(15, 117, 195, 117);

    // Section 3: Financial Breakdown Table
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL SUMMARY', 15, 125);

    // Table Header Background
    doc.setFillColor(bgHeader[0], bgHeader[1], bgHeader[2]);
    doc.rect(15, 130, 180, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('Description of Charges', 18, 135.5);
    doc.text('Billing Method', 105, 135.5);
    doc.text('Subtotal (FCFA)', 162, 135.5);

    // Items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    const tip = hist.tipAmount || 0;
    const baseRideFare = hist.fare - tip;

    // Row 1
    doc.text(`Base Transport Fare (${hist.vehicleClass})`, 18, 144);
    doc.text(getPaymentLabel(hist.paymentMethod), 105, 144);
    doc.text(`${baseRideFare.toLocaleString('fr-FR')} FCFA`, 162, 144);

    // Row 2
    doc.text('Driver Tip Accrued', 18, 151);
    doc.text(getPaymentLabel(hist.paymentMethod), 105, 151);
    doc.text(`${tip.toLocaleString('fr-FR')} FCFA`, 162, 151);

    // Row 3
    doc.text('State Road Regulatory Tax (VAT / TS)', 18, 158);
    doc.text('Exempt / Pre-paid', 105, 158);
    doc.text('0 FCFA', 162, 158);

    // Line under table
    doc.line(15, 163, 195, 163);

    // Totals Box
    doc.setFillColor(248, 250, 252);
    doc.rect(115, 167, 80, 25, 'F');

    doc.setFont('helvetica', 'normal');
    doc.text('Net Subtotal:', 118, 173);
    doc.text(`${baseRideFare.toLocaleString('fr-FR')} FCFA`, 165, 173);

    doc.text('Tips and Extras:', 118, 179);
    doc.text(`${tip.toLocaleString('fr-FR')} FCFA`, 165, 179);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.text('TOTAL CHARGED:', 118, 187);
    doc.text(`${hist.fare.toLocaleString('fr-FR')} FCFA`, 165, 187);

    // Reset Color
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

    // Footer Regulatory notice
    doc.line(15, 205, 195, 205);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Cameroonian Transit Compliance Notice', 15, 211);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('Wanda Taxi is a certified municipal transport aggregator. This receipt represents an official document confirming urban transport', 15, 216);
    doc.text('delivery, generated under state-approved pricing frameworks. For accounting and audits, use the authorized signature block below.', 15, 220);

    // QR Code / Barcode simulation
    doc.setDrawColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
    doc.setLineWidth(0.4);
    for (let i = 0; i < 45; i += 1.8) {
      // Draw procedural lines
      const height = 9 + (Math.sin(i) * 2);
      doc.line(135 + i, 230, 135 + i, 230 + height);
    }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`WND-VERIFY-${hist.id.toUpperCase()}`, 135, 245);

    // Thank you text
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(brandMidnight[0], brandMidnight[1], brandMidnight[2]);
    doc.text('Thank you for choosing Wanda Taxi!', 15, 236);
    doc.text('Have a safe and premium journey next time.', 15, 241);

    doc.save(`Wanda_Receipt_${hist.id}.pdf`);
  };

  // Distance calculations
  const rideDistance = (pickup && destination) 
    ? getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 0;

  // Active pricing calculations
  const activeRideClass = RIDE_CLASSES.find(c => c.id === selectedClassId) || RIDE_CLASSES[2];

  // Two distinct prices calculated based on surge:
  const baseSurgeFare = (pickup && destination) 
    ? Math.round((activeRideClass.baseFare + (rideDistance * activeRideClass.perKm)) * systemSettings.surgeMultiplier)
    : 0;

  // Wallet pay offers an automated 10% cash discount in Cameroon style!
  const walletPrice = Math.round(baseSurgeFare * 0.9);
  const cashPrice = baseSurgeFare;

  // Selected payment rate depending on checkout choice
  const activeFareToCharge = paymentMethod === 'wallet' ? walletPrice : cashPrice;

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

    if (paymentMethod === 'wallet') {
      // Wallet check
      if (passengerWallet < walletPrice) {
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

  // Admin approves pending drivers
  const handleApproveDriver = (id: string) => {
    setDriversList(prev => prev.map(d => d.id === id ? { ...d, approvalStatus: 'approved' } : d));
  };

  const handleRejectDriver = (id: string) => {
    setDriversList(prev => prev.map(d => d.id === id ? { ...d, approvalStatus: 'suspended' } : d));
  };

  // Driver simulation triggers
  const startSearchingDriver = () => {
    setRideStatus('searching');
    setMessages([]);

    setTimeout(() => {
      // Find an approved driver for this ride class
      const suitableDriver = driversList.find(d => d.vehicleType === selectedClassId && d.approvalStatus === 'approved') || driversList.find(d => d.approvalStatus === 'approved');
      
      const startLat = pickup!.lat + (Math.random() - 0.5) * 0.015;
      const startLng = pickup!.lng + (Math.random() - 0.5) * 0.015;

      setActiveDriver({
        ...suitableDriver,
        lat: startLat,
        lng: startLng,
        status: 'heading_to_pickup'
      });
      setDriverLoc({ lat: startLat, lng: startLng });
      
      const baseEta = RIDE_CLASSES.find(c => c.id === selectedClassId)?.eta || 3;
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

    }, 3000);
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

      intervalId = setInterval(() => {
        currentStep++;
        const ratio = currentStep / steps;

        const nextLat = startLat + (targetLat - startLat) * ratio;
        const nextLng = startLng + (targetLng - startLng) * ratio;

        setDriverLoc({ lat: nextLat, lng: nextLng });

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

  // Passenger live chat response generator
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: Message = {
      sender: 'passenger',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    setTimeout(() => {
      const randomPidgin = CHAT_PIDGIN_RESPONSES[Math.floor(Math.random() * CHAT_PIDGIN_RESPONSES.length)];
      setMessages(prev => [
        ...prev,
        {
          sender: 'driver',
          text: randomPidgin,
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
    // Standard payout math including waiting time extra fare adjustments (commission not applied to tip)
    const totalRideFare = activeFareToCharge + currentRideWaitingFare;
    const platformCommission = Math.round(totalRideFare * systemSettings.commissionRate / 100);
    const driverNetEarnings = (totalRideFare - platformCommission) + tipToPay;

    // Staging updates depending on cash vs wallet payment
    if (paymentMethod === 'wallet') {
      // Wallet Pay: deduct total (including waiting fee and tip) from passenger, credit driver's balance
      setPassengerWallet(prev => prev - (walletPrice + currentRideWaitingFare + tipToPay));
      setDriverWallet(prev => prev + driverNetEarnings);

      // Log wallet payout transactions
      const pTx = {
        id: `RIDE-${Date.now()}`,
        type: 'ride_payout',
        amount: walletPrice + currentRideWaitingFare + tipToPay,
        tipAmount: tipToPay,
        phone: user?.phone || '677123456',
        carrier: 'wallet_debit',
        status: 'success',
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      };
      setTransactions(prev => [pTx, ...prev]);
    } else {
      // Cash Pay: passenger paid driver cash on hand. We deduct the commission from driver wallet!
      setDriverWallet(prev => prev - platformCommission);
      
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
      destLng: destination.lng
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
    const calculatedFare = Math.round((activeClass.baseFare + (distanceVal * activeClass.perKm)) * systemSettings.surgeMultiplier);

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

  // Render independent admin page if URL has admin param, bypassing signup requirements
  if (isAdminPage) {
    return (
      <AdminDashboard
        onClose={() => {
          // Exit independent dashboard redirects back to main application
          window.location.href = window.location.origin;
        }}
        driversList={driversList}
        onApproveDriver={handleApproveDriver}
        onRejectDriver={handleRejectDriver}
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
          />
        </div>
      </div>
    );
  }

  // Render signup page if user has not onboarding
  if (!user) {
    return <LandingPage onSignupComplete={handleSignupComplete} />;
  }

  return (
    <div className="flex flex-col h-screen bg-brand-midnight text-white select-none overflow-hidden" id="app-root-container">
      
      {/* Header bar */}
      <header className="bg-brand-deep border-b border-brand-card/80 px-4 py-3 shrink-0 z-50 flex items-center justify-between shadow-md">
        
        {/* Brand identity */}
        <div className="flex items-center gap-2.5">
          <WandaLogo className="w-9 h-9 drop-shadow-[0_0_8px_rgba(226,193,141,0.25)]" />
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-widest text-brand-gold font-sans">
                WANDA
              </h1>
              {currentCity && (
                <span className="bg-brand-gold/15 text-brand-gold border border-brand-gold/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 shadow-inner">
                  📍 {currentCity}
                </span>
              )}
            </div>
            <p className="text-[9px] text-brand-text-muted italic font-bold">tu Wanda on tes transporte.</p>
          </div>
        </div>

        {/* Global Toolbar and Dashboard controllers */}
        <div className="flex items-center gap-3">
          
          {/* Admin Switch (Independent URL Link) */}
          <button
            onClick={() => setIsAdminOpen(true)}
            className="bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/20 hover:border-brand-gold/40 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wide flex items-center gap-1.5 cursor-pointer transition shadow-sm"
            id="admin-console-trigger"
          >
            🔧 Admin Portal ↗
          </button>

          {/* Dual Role Selector: Passenger vs Driver */}
          <div className="flex bg-brand-card/60 p-0.5 rounded-xl border border-brand-input text-[11px]">
            <button
              onClick={() => { setRole('passenger'); handleCancelBooking(); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${role === 'passenger' ? 'bg-brand-gold text-brand-midnight shadow font-black' : 'text-brand-text-muted hover:text-white'}`}
              id="role-passenger-btn"
            >
              Passager
            </button>
            <button
              onClick={() => { setRole('driver'); handleCancelBooking(); }}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${role === 'driver' ? 'bg-brand-input text-brand-gold shadow font-black' : 'text-brand-text-muted hover:text-white'}`}
              id="role-driver-btn"
            >
              Driver
              {driverOnline && (
                <span className="w-1 h-1 bg-brand-gold rounded-full animate-ping"></span>
              )}
            </button>
          </div>

          {/* User Signout */}
          <button
            onClick={handleLogout}
            title="Log Out Profile"
            className="p-1.5 text-brand-text-muted hover:text-rose-400 bg-brand-card/30 border border-brand-input rounded-xl hover:bg-brand-input transition cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>

      </header>

      {/* Main split viewport layout */}
      <div className="flex flex-1 relative overflow-hidden" id="app-main-view">
        
        {/* Left Side Control Panel */}
        <aside className="w-full md:w-96 bg-brand-deep border-r border-brand-card/80 flex flex-col shrink-0 z-10 overflow-y-auto text-white" id="sidebar-controls">
          
          {/* PROMINENT PASSENGER & CHAUFFEUR SWITCH PANEL */}
          <div className="p-4 border-b border-brand-card bg-brand-midnight/45 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] tracking-wide">
              <span className="font-extrabold uppercase text-brand-gold">🔄 MODE D'APPLICATION</span>
              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                🟢 Actif
              </span>
            </div>
            
            <div className="grid grid-cols-2 bg-brand-input border border-brand-card/60 p-1 rounded-2xl relative shadow-inner">
              <button
                onClick={() => { setRole('passenger'); handleCancelBooking(); }}
                className={`py-2 px-3 rounded-xl font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'passenger' 
                    ? 'bg-brand-gold text-brand-midnight shadow-lg transform scale-102 font-extrabold' 
                    : 'text-brand-text-muted hover:text-white font-bold'
                }`}
                id="sidebar-role-passenger"
              >
                👤 Passager
              </button>
              <button
                onClick={() => { setRole('driver'); handleCancelBooking(); }}
                className={`py-2 px-3 rounded-xl font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  role === 'driver' 
                    ? 'bg-brand-gold text-brand-midnight shadow-lg transform scale-102 font-extrabold' 
                    : 'text-brand-text-muted hover:text-white font-bold'
                }`}
                id="sidebar-role-driver"
              >
                🚖 Chauffeur
              </button>
            </div>
            
            <p className="text-[9.5px] text-brand-text-muted text-center font-semibold italic leading-snug">
              {role === 'passenger' 
                ? "Vous êtes en mode Passager : Commandez une moto, un petit taxi ou un VIP."
                : "Vous êtes en mode Chauffeur : Activez votre statut en ligne pour recevoir des courses."
              }
            </p>
          </div>

          {/* ========================================================================= */}
          {/* PASSENGER ROLE COMPONENT */}
          {/* ========================================================================= */}
          {role === 'passenger' && (
            <div className="flex flex-col flex-1 p-4 space-y-4">
              
              {/* Tab selector */}
              <div className="flex border-b border-brand-card/80 pb-1.5 gap-1 text-xs">
                <button
                  onClick={() => setActiveTab('booking')}
                  className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'booking' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                >
                  {slangMode ? "Course" : "Book Ride"}
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1 ${activeTab === 'wallet' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                >
                  {slangMode ? "Mon Wallet" : "My Wallet"}
                  <span className="text-[9px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-full font-black">
                    {passengerWallet.toLocaleString('fr-FR')} XAF
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 pb-1.5 font-extrabold text-center border-b-2 transition cursor-pointer ${activeTab === 'history' ? 'border-brand-gold text-brand-gold' : 'border-transparent text-brand-text-muted hover:text-white'}`}
                >
                  {slangMode ? "Historique" : "Past Rides"}
                </button>
              </div>

              {/* BOOKING TAB */}
              {activeTab === 'booking' && (
                <>
                  {rideStatus === 'idle' && (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        
                        {/* Route Selection */}
                        <div className="bg-brand-card/40 p-4 rounded-2xl border border-brand-card/80 space-y-3 shadow-inner">
                          <h3 className="text-[10px] font-black uppercase text-brand-gold tracking-wider flex items-center gap-1.5">
                            <Compass size={13} className="animate-pulse" />
                            <span>{slangMode ? "Trouve ton carrefour" : "Select Travel Route"}</span>
                          </h3>

                          {/* Pickup Block */}
                          <div className="relative">
                            <label className="text-[9px] text-brand-text-muted font-black tracking-wider block mb-1">
                              {slangMode ? "LIEU DE RAMASSAGE (A)" : "PICKUP LOCATION (A)"}
                            </label>
                            <div className="relative">
                              <button
                                onClick={() => { setSearchModalType('pickup'); setSearchQuery(''); }}
                                className="w-full bg-brand-input hover:bg-brand-input/80 border border-brand-card text-left rounded-xl p-3 text-xs font-semibold flex items-center justify-between text-white transition cursor-pointer pr-16"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <MapPin size={14} className="text-emerald-400 shrink-0" />
                                  <span className="truncate">{pickup ? pickup.name : 'Select station...'}</span>
                                </div>
                                <Search size={12} className="text-brand-text-muted" />
                              </button>

                              {/* Map Picker flag */}
                              <button
                                onClick={() => setIsSettingLocationType(isSettingLocationType === 'pickup' ? null : 'pickup')}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-xs font-bold transition cursor-pointer ${isSettingLocationType === 'pickup' ? 'bg-brand-gold text-brand-midnight rounded-lg' : 'text-brand-text-muted hover:text-brand-gold'}`}
                                title="Pinpoint pickup"
                              >
                                📍
                              </button>
                            </div>

                            {/* Active geolocator status or button */}
                            <div className="flex items-center justify-between mt-1 px-1.5">
                              <span className="text-[8.5px] text-brand-text-muted/80">
                                {isGeolocating ? (
                                  <span className="flex items-center gap-1 text-brand-gold animate-pulse font-bold">
                                    🌀 {slangMode ? "GPS debout en cours..." : "Acquiring standing GPS..."}
                                  </span>
                                ) : (
                                  slangMode ? "GPS debout actuel" : "Standing GPS position"
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => geolocateCurrentPosition()}
                                disabled={isGeolocating}
                                className="text-[10px] text-brand-gold hover:text-white font-extrabold flex items-center gap-1 transition active:scale-95 cursor-pointer disabled:opacity-50"
                              >
                                🎯 {slangMode ? "Détecter mon GPS" : "Detect Standing GPS"}
                              </button>
                            </div>
                          </div>

                          {/* Destination Block */}
                          <div className="relative">
                            <label className="text-[9px] text-brand-text-muted font-black tracking-wider block mb-1">
                              {slangMode ? "LIEU DE DÉPÔT (B)" : "DROP STATION (B)"}
                            </label>
                            <div className="relative">
                              <button
                                onClick={() => { setSearchModalType('destination'); setSearchQuery(''); }}
                                className="w-full bg-brand-input hover:bg-brand-input/80 border border-brand-card text-left rounded-xl p-3 text-xs font-semibold flex items-center justify-between text-white transition cursor-pointer pr-16"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Navigation size={14} className="text-brand-gold shrink-0 rotate-45" />
                                  <span className="truncate">{destination ? destination.name : 'Select destination...'}</span>
                                </div>
                                <Search size={12} className="text-brand-text-muted" />
                              </button>

                              {/* Map Picker flag */}
                              <button
                                onClick={() => setIsSettingLocationType(isSettingLocationType === 'destination' ? null : 'destination')}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-xs font-bold transition cursor-pointer ${isSettingLocationType === 'destination' ? 'bg-brand-gold text-brand-midnight rounded-lg' : 'text-brand-text-muted hover:text-brand-gold'}`}
                                title="Pinpoint destination"
                              >
                                📍
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Route distances */}
                        {pickup && destination && (
                          <div className="flex items-center justify-between px-3 py-2 bg-brand-card/30 border border-brand-card/80 rounded-xl text-[11px] text-brand-text-muted shadow-sm font-medium">
                            <span>🏁 Distance: <strong className="text-brand-gold font-bold">{rideDistance} KM</strong></span>
                            <span>🕒 {slangMode ? "Est. Durée:" : "Duration:"} <strong className="text-brand-gold font-bold">{Math.round(rideDistance * 1.5) + 3} mins</strong></span>
                          </div>
                        )}

                        {isSettingLocationType && (
                          <div className="bg-brand-gold/10 border border-brand-gold/30 text-brand-gold p-2.5 rounded-xl text-[10px] text-center animate-pulse font-bold uppercase tracking-wider">
                            Tap map to set <strong>{isSettingLocationType}</strong> coordinate
                          </div>
                        )}

                        {/* Choose vehicle and display DUAL PRICING (WALLET vs CASH) */}
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-black uppercase text-brand-text-muted tracking-wider">
                            {slangMode ? "Choisis ta catégorie" : "Choose Ride Class"}
                          </h4>
                          
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {RIDE_CLASSES.map((rc) => {
                              // Price formulas
                              const rcBaseFare = Math.round((rc.baseFare + (rideDistance * rc.perKm)) * systemSettings.surgeMultiplier);
                              const rcWalletFare = Math.round(rcBaseFare * 0.9); // 10% discount on wallets
                              const rcCashFare = rcBaseFare;
                              const isSelected = selectedClassId === rc.id;

                              return (
                                <div
                                  key={rc.id}
                                  onClick={() => setSelectedClassId(rc.id)}
                                  className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col gap-2 ${isSelected ? 'bg-brand-gold/10 border-brand-gold' : 'bg-brand-card/40 border-brand-input hover:bg-brand-card/60'}`}
                                >
                                  {/* Top line category descriptions */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-gold text-brand-midnight' : 'bg-brand-input text-brand-text-muted'}`}>
                                        {rc.icon === 'Bike' && <Bike size={16} />}
                                        {rc.icon === 'Tricycle' && <span className="text-base font-bold">🛺</span>}
                                        {rc.icon === 'Car' && <Car size={16} />}
                                        {rc.icon === 'Suv' && <span className="text-base font-bold">🚘</span>}
                                      </div>
                                      <div>
                                        <p className="text-xs font-extrabold text-white">{rc.name}</p>
                                        <p className="text-[10px] text-brand-text-muted leading-tight line-clamp-1">{rc.description}</p>
                                      </div>
                                    </div>
                                    <span className="text-[9px] text-brand-text-muted font-semibold">{rc.eta} mins away</span>
                                  </div>

                                  {/* DUAL PRICING SELECTION SYSTEM - NYANGO STYLE */}
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    {/* Wallet Price selection */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClassId(rc.id);
                                        setPaymentMethod('wallet');
                                      }}
                                      className={`py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${isSelected && paymentMethod === 'wallet' ? 'bg-brand-gold border-brand-gold text-brand-midnight shadow' : 'bg-brand-input/40 border-brand-card text-brand-text-muted hover:text-white hover:border-brand-input'}`}
                                    >
                                      <span className="text-[8px] font-black uppercase tracking-wider block">Wallet Pay (10% Off)</span>
                                      <span className="text-xs font-black tracking-tight">{rcWalletFare.toLocaleString('fr-FR')} XAF</span>
                                    </button>

                                    {/* Cash Price selection */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedClassId(rc.id);
                                        setPaymentMethod('cash');
                                      }}
                                      className={`py-2 px-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition cursor-pointer ${isSelected && paymentMethod === 'cash' ? 'bg-emerald-600 border-emerald-500 text-white shadow' : 'bg-brand-input/40 border-brand-card text-brand-text-muted hover:text-white hover:border-brand-input'}`}
                                    >
                                      <span className="text-[8px] font-black uppercase tracking-wider block">Cash Pay (Standard)</span>
                                      <span className="text-xs font-black tracking-tight">{rcCashFare.toLocaleString('fr-FR')} XAF</span>
                                    </button>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* SOS Button triggers */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={triggerSOS}
                          className="bg-rose-950/40 border border-rose-900 text-rose-400 p-3 rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs hover:bg-rose-900 hover:text-white cursor-pointer transition flex-1"
                        >
                          <span>🚨 Sécurité SOS</span>
                        </button>

                        {/* Submit Request */}
                        <button
                          onClick={handleBookRide}
                          disabled={!pickup || !destination}
                          className="bg-brand-gold hover:bg-brand-gold/90 disabled:opacity-50 disabled:pointer-events-none text-brand-midnight font-black py-3 px-5 rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-brand-gold/25 hover:scale-[1.01] active:scale-[0.99] transition flex-[2]"
                          id="book-ride-main-btn"
                        >
                          <span>{slangMode ? "Lancer la course" : "Confirm Taxi"} • {activeFareToCharge.toLocaleString('fr-FR')} FCFA</span>
                          <ChevronRight size={16} />
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

                        {/* Miniature Map view for active ride tracking */}
                        <MiniatureMap
                          pickup={pickup}
                          destination={destination}
                          driverLoc={driverLoc}
                          rideStatus={rideStatus}
                          driverType={selectedClassId}
                          slangMode={slangMode}
                        />

                        {/* AC / waiting stats */}
                        <div className="bg-brand-input border border-brand-card/80 p-3 rounded-xl space-y-2 text-xs">
                          <div className="space-y-1">
                            <p className="text-brand-text-muted font-semibold">
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
                                    className="font-black text-white flex items-center gap-1.5 text-xs"
                                  >
                                    <Clock size={12} className="text-brand-gold animate-pulse" /> 
                                    <span className="text-brand-gold font-mono font-black text-sm">
                                      {etaMinutes === 0.5 ? (slangMode ? "< 1 min" : "< 1 min") : `${etaMinutes} min${etaMinutes > 1 ? 's' : ''}`}
                                    </span>
                                    <span className="text-white text-[10px] font-semibold">
                                      {slangMode ? "restant" : "remaining"}
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
                        {rideStatus === 'in_progress' && (
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

                            {/* Dynamic Ride details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {/* Estimated Fare & Payment Method */}
                              <div className="bg-brand-input/60 border border-brand-input p-2.5 rounded-xl flex flex-col justify-between space-y-1">
                                <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                  <DollarSign size={10} className="text-brand-gold" />
                                  {slangMode ? "Tarif estimé" : "Estimated Fare"}
                                </span>
                                <div className="space-y-0.5">
                                  <p className="font-mono font-black text-brand-gold text-sm">
                                    {activeFareToCharge.toLocaleString('fr-FR')} FCFA
                                  </p>
                                  <span className="text-[9px] text-white font-extrabold flex items-center gap-1">
                                    <CreditCard size={9} className="text-brand-text-muted" />
                                    {paymentMethod === 'wallet' ? (slangMode ? "Wanda Wallet (-10%)" : "Wanda Wallet (-10%)") :
                                     paymentMethod === 'momo_mtn' ? "MTN Mobile Money" :
                                     paymentMethod === 'orange_money' ? "Orange Money" : (slangMode ? "Payement Cash" : "Cash Payment")}
                                  </span>
                                </div>
                              </div>

                              {/* Ride Class details */}
                              {(() => {
                                const rc = RIDE_CLASSES.find(c => c.id === selectedClassId) || RIDE_CLASSES[2];
                                return (
                                  <div className="bg-brand-input/60 border border-brand-input p-2.5 rounded-xl flex flex-col justify-between space-y-1">
                                    <span className="text-[9px] text-brand-text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                                      <Compass size={10} className="text-brand-gold" />
                                      {slangMode ? "Catégorie" : "Service Class"}
                                    </span>
                                    <div className="space-y-0.5">
                                      <p className="font-black text-white text-[11px] truncate flex items-center gap-1">
                                        {rc.id === 'okada' ? <Bike size={11} className="text-brand-gold shrink-0" /> : <Car size={11} className="text-brand-gold shrink-0" />}
                                        {rc.name}
                                      </p>
                                      <p className="text-[9px] text-brand-text-muted leading-tight truncate" title={rc.description}>
                                        {rc.description}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Vehicle and Driver details footer */}
                            <div className="bg-brand-midnight/40 border border-brand-input/50 rounded-xl p-2.5 space-y-1.5 text-[10px]">
                              <div className="flex justify-between items-center text-brand-text-muted font-bold uppercase tracking-wider text-[9px]">
                                <span>{slangMode ? "Infos du véhicule" : "Vehicle Specs"}</span>
                                <span className="text-brand-gold font-mono">{activeDriver.vehiclePlate}</span>
                              </div>
                              <div className="flex flex-col gap-1 text-white">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold">{activeDriver.vehicleModel}</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-input" />
                                  <span className="text-brand-text-muted font-semibold flex items-center gap-1">
                                    {slangMode ? `Couleur: ${activeDriver.vehicleColor || "Jaune"}` : `Color: ${activeDriver.vehicleColor || "Yellow"}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-brand-text-muted mt-0.5 border-t border-brand-input/20 pt-1.5">
                                  <span>{slangMode ? "Chauffeur assigné :" : "Assigned Driver:"} <strong className="text-white font-extrabold">{activeDriver.name}</strong></span>
                                  <span className="flex items-center text-brand-gold font-bold">
                                    <Star size={9} className="fill-brand-gold text-brand-gold mr-0.5 shrink-0" />
                                    {activeDriver.rating}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}

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

                          return (
                            <div className="bg-brand-input border border-brand-card/80 p-3.5 rounded-xl space-y-2.5 mt-2" id="passenger-trip-progress">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-brand-text-muted font-black uppercase tracking-wider flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-gold animate-ping" />
                                  {label}
                                </span>
                                <span className="font-mono font-black text-brand-gold bg-brand-gold/10 border border-brand-gold/20 px-2 py-0.5 rounded-md text-[10px] shadow-sm">
                                  {remainingKm.toFixed(1)} km {slangMode ? "restant" : "remaining"}
                                </span>
                              </div>

                              {/* Progress bar track */}
                              <div className="relative w-full h-3 bg-brand-card border border-brand-input rounded-full overflow-visible my-3">
                                {/* Glowing ambient trail underneath */}
                                <div className="absolute inset-0 bg-brand-gold/5 rounded-full blur-[1px]"></div>
                                
                                {/* Progress track background shimmer line */}
                                <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_2s_infinite]"></div>

                                {/* Animated active progress fill */}
                                <motion.div
                                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold/80 via-brand-gold to-yellow-400 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.4)]"
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ type: "spring", stiffness: 70, damping: 14 }}
                                />

                                {/* Moving taxi icon riding the bar */}
                                <motion.div
                                  className="absolute -top-1.5 -ml-3 w-6 h-6 bg-brand-gold text-brand-midnight border-2 border-brand-midnight rounded-full flex items-center justify-center shadow-lg cursor-pointer"
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
                          );
                        })()}
                      </div>

                      {/* Live Chat drawer */}
                      <div className="flex-1 flex flex-col min-h-48 max-h-64 bg-brand-card/20 border border-brand-card rounded-2xl overflow-hidden shadow-inner">
                        <div className="bg-brand-card px-3 py-2 border-b border-brand-input flex items-center justify-between text-[11px] font-black shadow-sm">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} className="text-brand-gold" />
                            {slangMode ? "Tchatter avec le djo" : "Message Driver"}
                          </span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 text-[11px]">
                          {messages.length === 0 ? (
                            <p className="text-brand-text-muted text-center py-6 italic font-medium">Say hello to the chauffeur! (Franglais or Pidgin accepted!)</p>
                          ) : (
                            messages.map((m, index) => (
                              <div
                                key={index}
                                className={`flex flex-col max-w-[80%] rounded-xl p-2.5 shadow-sm ${m.sender === 'passenger' ? 'bg-brand-gold text-brand-midnight self-end ml-auto font-bold' : 'bg-brand-input border border-brand-card text-white self-start mr-auto font-medium'}`}
                              >
                                <p className="leading-relaxed">{m.text}</p>
                                <span className={`text-[8px] text-right mt-1 ${m.sender === 'passenger' ? 'text-brand-midnight/70' : 'text-brand-text-muted'}`}>{m.timestamp}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Preset Quick replies for simple one-tap messaging */}
                        <div className="px-2 py-1.5 bg-brand-deep/30 border-t border-brand-input/40 flex gap-1 overflow-x-auto scrollbar-none shrink-0">
                          {[
                            slangMode ? "Je suis déjà là djo !" : "I am outside!",
                            slangMode ? "Tu es où ?" : "Where are you?",
                            slangMode ? "J'arrive, attends moi stp" : "On my way, please wait!",
                            slangMode ? "Je suis au carrefour" : "I am at the carrefour"
                          ].map((presetText) => (
                            <button
                              key={presetText}
                              type="button"
                              onClick={() => {
                                const newMsg: Message = {
                                  sender: 'passenger',
                                  text: presetText,
                                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                };
                                setMessages(prev => [...prev, newMsg]);
                                setTimeout(() => {
                                  const randomPidgin = CHAT_PIDGIN_RESPONSES[Math.floor(Math.random() * CHAT_PIDGIN_RESPONSES.length)];
                                  setMessages(prev => [
                                    ...prev,
                                    {
                                      sender: 'driver',
                                      text: randomPidgin,
                                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    }
                                  ]);
                                }, 1500);
                              }}
                              className="text-[9px] font-bold bg-brand-input hover:bg-brand-card text-brand-gold border border-brand-card rounded-full px-2.5 py-1 whitespace-nowrap cursor-pointer transition shrink-0"
                            >
                              {presetText}
                            </button>
                          ))}
                        </div>

                        {/* Input form */}
                        <form onSubmit={handleSendChat} className="p-1.5 border-t border-brand-input bg-brand-card flex gap-1.5 shadow-md">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder={slangMode ? "Tchatter en Pidgin / Franglais..." : "Type a message..."}
                            className="flex-1 bg-brand-input border border-brand-card rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold focus:bg-brand-input"
                            id="driver-chat-input"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight rounded-xl cursor-pointer"
                          >
                            <Send size={12} className="stroke-[2.5]" />
                          </button>
                        </form>
                      </div>

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
                        <button
                          onClick={() => startInAppCall('passenger')}
                          className="px-4 bg-brand-input hover:bg-brand-input/80 text-brand-gold border border-brand-card rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer shadow gap-1"
                        >
                          📞 In-App Call
                        </button>
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
                />
              )}

              {/* PAST RIDE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase text-brand-text-muted tracking-wider">Ride Ledger Logs</h3>
                    <button
                      onClick={() => setHistory([])}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer font-bold"
                    >
                      Clear History
                    </button>
                  </div>

                  {history.length === 0 ? (
                    <div className="text-center py-10 text-brand-text-muted italic text-xs font-medium">
                      No previous completed rides.
                    </div>
                  ) : (
                    history.map((hist) => (
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
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-black">
                    {driverWallet.toLocaleString('fr-FR')} XAF
                  </span>
                </button>
              </div>

              {/* ORDERS PANEL */}
              {driverActiveTab === 'orders' && (
                <>
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

                      {/* Driver chat container */}
                      <div className="flex-1 bg-brand-card/20 border border-brand-card rounded-2xl flex flex-col justify-between overflow-hidden min-h-[220px]">
                        <div className="bg-brand-card px-3 py-2 border-b border-brand-input text-[11px] font-black text-white flex justify-between items-center">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} className="text-brand-gold" />
                            {slangMode ? "Tchatter avec le client" : "Chat with Passenger"}
                          </span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        </div>
                        
                        {/* Messages List */}
                        <div className="p-3 text-[11px] flex-1 space-y-2 overflow-y-auto max-h-[160px]">
                          {messages.length === 0 ? (
                            <p className="text-brand-text-muted text-center py-4 italic font-medium">No messages yet. Greet your passenger!</p>
                          ) : (
                            messages.map((m, index) => (
                              <div
                                key={index}
                                className={`flex flex-col max-w-[80%] rounded-xl p-2 shadow-sm ${m.sender === 'driver' ? 'bg-brand-gold text-brand-midnight self-end ml-auto font-bold' : 'bg-brand-input border border-brand-card text-white self-start mr-auto font-medium'}`}
                              >
                                <p className="leading-relaxed">{m.text}</p>
                                <span className={`text-[8px] text-right mt-1 ${m.sender === 'driver' ? 'text-brand-midnight/70' : 'text-brand-text-muted'}`}>{m.timestamp}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Preset Quick replies for simple one-tap messaging */}
                        <div className="px-2 py-1.5 bg-brand-deep/30 border-t border-brand-input/40 flex gap-1 overflow-x-auto scrollbar-none shrink-0">
                          {[
                            slangMode ? "Je suis déjà en route !" : "I'm on my way!",
                            slangMode ? "Tu es où exactement ?" : "Where exactly are you?",
                            slangMode ? "Je suis arrivé au carrefour" : "I have arrived at the carrefour",
                            slangMode ? "Attends moi 2 min stp" : "Please wait 2 mins"
                          ].map((presetText) => (
                            <button
                              key={presetText}
                              type="button"
                              onClick={() => handleSendDriverChat(presetText)}
                              className="text-[9px] font-bold bg-brand-input hover:bg-brand-card text-brand-gold border border-brand-card rounded-full px-2.5 py-1 whitespace-nowrap cursor-pointer transition shrink-0"
                            >
                              {presetText}
                            </button>
                          ))}
                        </div>

                        {/* Input form */}
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSendDriverChat(driverChatInput);
                          }} 
                          className="p-1.5 border-t border-brand-input bg-brand-card flex gap-1.5 shadow-md shrink-0"
                        >
                          <input
                            type="text"
                            value={driverChatInput}
                            onChange={(e) => setDriverChatInput(e.target.value)}
                            placeholder={slangMode ? "Écrire un message..." : "Type a message..."}
                            className="flex-1 bg-brand-input border border-brand-card rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold"
                          />
                          <button
                            type="submit"
                            className="p-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight rounded-xl cursor-pointer"
                          >
                            <Send size={12} className="stroke-[2.5]" />
                          </button>
                        </form>
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleCancelBooking}
                          className="flex-1 bg-brand-card hover:bg-brand-card/80 border border-brand-input text-rose-400 text-xs py-3 rounded-xl font-bold cursor-pointer transition shadow-sm animate-pulse"
                        >
                          Cancel Active Order
                        </button>
                        <button
                          onClick={() => startInAppCall('driver')}
                          className="px-4 bg-brand-input hover:bg-brand-input/80 text-brand-gold border border-brand-card rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer shadow gap-1"
                        >
                          📞 In-App Call
                        </button>
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
                            <span className="text-[8px] text-brand-text-muted block uppercase">Départ (A)</span>
                            <p className="font-extrabold text-white truncate">{driverRideRequest.pickupName}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand-gold shrink-0 mt-1"></span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-brand-text-muted block uppercase">Dépôt (B)</span>
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
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      
                      <div className="text-center py-6 space-y-2 border border-dashed border-brand-input rounded-2xl bg-brand-card/30">
                        <span className="text-2xl animate-pulse block">📡</span>
                        <h5 className="text-xs font-extrabold text-white">Monitoring Central Dispatch Hub</h5>
                        <p className="text-[11px] text-brand-text-muted max-w-xs mx-auto leading-relaxed font-medium px-2">
                          {slangMode ? (
                            `En attente. Les demandes d'appels à ${currentCity} vont s'afficher ici.`
                          ) : (
                            `Standing by. Simulated passenger dispatches across ${currentCity} will trigger automatically.`
                          )}
                        </p>
                        
                        {/* Instant Simulation button */}
                        <div className="pt-2">
                          <button
                            onClick={triggerIncomingSimulatedRequest}
                            className="bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide cursor-pointer transition animate-pulse"
                          >
                            ⚡ {slangMode ? "Simuler un Appel Client" : "Simulate Incoming Ride"}
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] text-brand-text-muted text-center leading-normal font-semibold">
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
        <section className="flex-1 h-full relative" id="map-viewport">
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
          />

          {/* Smooth Journey Progress Bar Animation */}
          {rideStatus === 'in_progress' && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-brand-midnight/95 backdrop-blur border border-brand-card/80 p-4 rounded-2xl shadow-2xl z-[1000] text-white">
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-brand-gold uppercase tracking-wider text-[10px] flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                    {slangMode ? "Course en cours..." : "Active Ride Status"}
                  </span>
                  <span className="font-mono text-brand-gold font-extrabold text-[13px]">
                    {getTripProgressPercentage()}%
                  </span>
                </div>

                {/* From / To locations snippet */}
                <div className="flex items-center justify-between gap-4 text-[10px] font-semibold text-brand-text-muted">
                  <span className="truncate max-w-[120px] text-left">
                    {pickup?.name || (slangMode ? "Départ" : "Pickup")}
                  </span>
                  <div className="flex-1 border-t border-dashed border-brand-card/60 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-midnight px-1 text-[9px] text-brand-gold font-bold">
                      {slangMode ? "En route" : "Transit"}
                    </div>
                  </div>
                  <span className="truncate max-w-[120px] text-right">
                    {destination?.name || (slangMode ? "Dépôt" : "Dropoff")}
                  </span>
                </div>

                {/* Progress track & Bar */}
                <div className="relative h-2 bg-brand-input/60 rounded-full overflow-visible border border-brand-card/40">
                  {/* Moving animated line */}
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-gold/60 to-brand-gold rounded-full shadow-[0_0_8px_rgba(255,211,67,0.5)]"
                    animate={{ width: `${getTripProgressPercentage()}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />

                  {/* Little car icon that floats with the percentage progress! */}
                  <motion.div
                    className="absolute -top-1.5 -ml-2.5 z-10 text-brand-midnight"
                    animate={{ left: `${getTripProgressPercentage()}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  >
                    <div className="w-5 h-5 rounded-full bg-brand-gold border border-white flex items-center justify-center shadow-md">
                      <Car size={10} className="text-brand-midnight animate-bounce" />
                    </div>
                  </motion.div>
                </div>

                {/* Additional descriptive meta indicator */}
                <div className="flex items-center justify-between text-[9px] text-brand-text-muted pt-0.5 font-medium leading-none">
                  <span>{slangMode ? "Regardez le chauffeur avancer en direct" : "Watch driver advance live"}</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    {slangMode ? "Calculé par GPS" : "GPS Computed"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Map instructions floating banner */}
          {rideStatus === 'idle' && (
            <div className="absolute top-4 left-4 right-4 md:left-auto md:w-80 bg-brand-deep/95 backdrop-blur border border-brand-card/80 p-3.5 rounded-2xl shadow-xl z-[1000] text-xs space-y-1 pointer-events-none text-white">
              <p className="font-extrabold text-brand-gold flex items-center gap-1">
                <span>📍</span> Map Coordinates Selector
              </p>
              <p className="text-brand-text-muted leading-relaxed text-[11px] font-semibold">
                Saisissez vos stations de départ et de dépôt dans la barre latérale, ou **tapez directement sur la carte de Douala** pour placer vos repères de voyage !
              </p>
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
          <div className="fixed inset-0 bg-brand-midnight/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" id="receipt-modal">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-brand-deep border border-brand-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-white font-sans"
            >
              <div className="p-5 text-center border-b border-brand-input/40 bg-brand-gold/5 space-y-2">
                <div className="w-11 h-11 bg-brand-gold text-brand-midnight rounded-full flex items-center justify-center mx-auto shadow-lg shadow-brand-gold/25">
                  <Check size={22} className="stroke-[3]" />
                </div>
                <h3 className="text-base font-black tracking-wide">{slangMode ? "Course Terminée !" : "Ride Complete!"}</h3>
                <p className="text-[10px] text-brand-gold font-mono font-bold uppercase">
                  {transactionId}
                </p>
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
                  <span className="text-brand-text-muted">Montant Total :</span>
                  <span className="text-base font-black text-brand-gold">{(activeFareToCharge + currentRideWaitingFare + (paymentMethod === 'wallet' ? tipAmount : 0)).toLocaleString('fr-FR')} FCFA</span>
                </div>

                {/* Rating component */}
                <div className="text-center space-y-2.5">
                  <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-wider">Note ton Chauffeur</p>
                  
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

                <button
                  onClick={handleSubmitRating}
                  className="w-full bg-brand-gold hover:bg-brand-gold/90 text-brand-midnight font-black py-3 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-brand-gold/25"
                  id="submit-rating-btn"
                >
                  Confirm & Close Receipt
                </button>
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
      {/* POWERFUL ADMIN CONSOLE OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAdminOpen && (
          <AdminDashboard
            onClose={() => setIsAdminOpen(false)}
            driversList={driversList}
            onApproveDriver={handleApproveDriver}
            onRejectDriver={handleRejectDriver}
            systemSettings={systemSettings}
            onUpdateSettings={setSystemSettings}
            transactions={transactions}
            onApproveWithdrawal={handleApproveWithdrawal}
          />
        )}
      </AnimatePresence>

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
      <InstallPrompt />

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
                      src="/wanda_logo.jpg"
                      alt="Wanda Mobile"
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-lg font-black text-white uppercase tracking-tight">
                    {callSender === 'passenger' 
                      ? (role === 'passenger' ? (activeDriver ? activeDriver.name : 'Chauffeur Wanda') : 'Passenger Client')
                      : (role === 'driver' ? 'Passenger Client' : (activeDriver ? activeDriver.name : 'Chauffeur Wanda'))}
                  </h4>
                  <p className="text-xs text-brand-text-muted font-bold mt-1">
                    {callSender === 'passenger'
                      ? (role === 'passenger' ? `Chauffeur (${activeDriver ? activeDriver.vehicleClass.toUpperCase() : 'TAXI'})` : 'Client')
                      : (role === 'driver' ? 'Client' : `Chauffeur (${activeDriver ? activeDriver.vehicleClass.toUpperCase() : 'TAXI'})`)}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
