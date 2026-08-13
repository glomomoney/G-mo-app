import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  Car,
  Compass,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Ruler,
  Maximize2,
  Minimize2,
  Magnet
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
import NotificationDrawer from './components/NotificationDrawer';
import NotificationPushBanner from './components/NotificationPushBanner';
import { callRingtonePlayer } from './utils/callAudio';
import WandaLogo from './components/WandaLogo';
import { ParticleExplosion } from './components/ParticleExplosion';
import ShareRideTracker from './components/ShareRideTracker';
import AppHeader from './components/AppHeader';
import ReceiptModal from './components/ReceiptModal';
import DriverEarningsModal from './components/DriverEarningsModal';
import PassengerBookingScreen from './screens/PassengerBookingScreen';
import { DriverMainDashboard, DriverFloatingNavBar, DriverIncomingRequestModal } from './screens/DriverDashboardScreen';
import LocationSearchModal from './components/LocationSearchModal';
import ShareRideModal from './components/ShareRideModal';
import SOSDrawer from './components/SOSDrawer';
import CallOverlay from './components/CallOverlay';
import ChatPanel from './components/ChatPanel';
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

// Hooks (extracted state/effects/handlers, composed together below)
import { useAuth } from './hooks/useAuth';
import { useWallet } from './hooks/useWallet';
import { useDriversList } from './hooks/useDriversList';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useNotifications } from './hooks/useNotifications';
import { useChat } from './hooks/useChat';
import { useCallState } from './hooks/useCallState';
import { useCompass } from './hooks/useCompass';
import { useGeolocation } from './hooks/useGeolocation';
import { useRideBooking } from './hooks/useRideBooking';
import { useDriverDashboard } from './hooks/useDriverDashboard';
import { useAdminAuth } from './hooks/useAdminAuth';

// Data and helpers
import {
  LAGOS_LOCATIONS,
  YAOUNDE_LOCATIONS,
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

export default function App() {
  // ==================== Hook composition (wiring step) ====================
  const wallet = useWallet();
  const [systemSettings, setSystemSettings] = useSystemSettings();
  const driversListHook = useDriversList();
  const {
    driversList, setDriversList,
    approveDriver: handleApproveDriver,
    rejectDriver: handleRejectDriver
  } = driversListHook;
  const auth = useAuth({
    passengerWallet: wallet.passengerWallet,
    driverWallet: wallet.driverWallet,
    passengerPoints: wallet.passengerPoints
  });
  const chat = useChat(auth.role);
  const notifications = useNotifications(auth.role);
  const callHook = useCallState();
  const adminAuth = useAdminAuth();

  const {
    user, setUser, role, setRole, slangMode, setSlangMode, language, setLanguage,
    changeLanguage, langDropdownOpen, setLangDropdownOpen, authUid, handleLogout
  } = auth;

  const {
    passengerWallet, setPassengerWallet, driverWallet, setDriverWallet,
    passengerPoints, setPassengerPoints, transactions, setTransactions,
    isOnline
  } = wallet;

  const {
    messages, setMessages, chatInput, setChatInput, driverChatInput, setDriverChatInput,
    showChat, setShowChat, handleSendChat, handleSendDriverChat
  } = chat;

  const {
    appNotifications, isNotificationDrawerOpen, setIsNotificationDrawerOpen,
    pushBannerNotif, dismissPushBanner, openDrawerFromBanner
  } = notifications;

  const {
    callState, callSender, callDuration, showCallDropdown, setShowCallDropdown,
    isMuted, setIsMuted, isSpeaker, setIsSpeaker,
    startInAppCall, receiveInAppCall, answerInAppCall, declineInAppCall, endInAppCall
  } = callHook;

  const { requestWithdrawal: handleDriverWithdraw, approveWithdrawal: handleApproveWithdrawal } = wallet;

  const [activeTab, setActiveTab] = useState<'booking' | 'wallet' | 'history'>('booking');
  const [showTabBalance, setShowTabBalance] = useState<boolean>(false);

  // Adjust active tab of driver
  const [driverActiveTab, setDriverActiveTab] = useState<'orders' | 'wallet'>('orders');

  const rideBooking = useRideBooking({
    user,
    authUid,
    slangMode,
    systemSettings,
    passengerPoints,
    passengerWallet,
    driversList,
    setMessages,
    setShowChat,
    setActiveTab
  });

  const driverDashboard = useDriverDashboard({
    role,
    user,
    slangMode,
    systemSettings,
    currentCity: rideBooking.currentCity,
    activeCityLocations: rideBooking.activeCityLocations,
    driverLoc: rideBooking.driverLoc,
    setDriverLoc: rideBooking.setDriverLoc,
    rideStatus: rideBooking.rideStatus,
    setRideStatus: rideBooking.setRideStatus,
    setPickup: rideBooking.setPickup,
    setDestination: rideBooking.setDestination,
    setActiveDriver: rideBooking.setActiveDriver,
    setPaymentMethod: rideBooking.setPaymentMethod,
    setMessages
  });

  const compass = useCompass(
    (rideBooking.rideStatus === 'in_progress' && rideBooking.driverLoc && rideBooking.destination)
      ? { from: rideBooking.driverLoc, to: rideBooking.destination }
      : null
  );

  const geolocation = useGeolocation(slangMode, (loc, city) => {
    rideBooking.setPickup(loc);
    if (city) rideBooking.setCurrentCity(city);
  });

  const {
    compassHeading, continuousHeading, isUsingDeviceOrientation, compassLockMode, setCompassLockMode,
    isCompassExpanded, requestDeviceOrientationPermission, handleCompassToggle, handleCompassInteraction,
    isMagnetometerSupported, magnetometerAccuracy, magHeading, isCalibrating, calibrationProgress,
    isMagnetometerCalibrated, handleMagnetometerCalibration, handleCancelCalibration
  } = compass;

  const { isGeolocating, geolocationError, locate: geolocateCurrentPosition } = geolocation;

  const {
    pickup, setPickup, destination, setDestination, searchModalType, setSearchModalType,
    searchQuery, setSearchQuery, selectedClassId, setSelectedClassId,
    isSettingLocationType, setIsSettingLocationType, currentCity, setCurrentCity,
    centerCoords, setCenterCoords, recentBookings, activeCityLocations,
    rideStatus, setRideStatus, activeDriver, setActiveDriver, driverLoc, setDriverLoc,
    etaMinutes, setEtaMinutes, etaStatusText, setEtaStatusText,
    summaryMetricMode, setSummaryMetricMode, isProgressExpanded, setIsProgressExpanded,
    isDriverDetailsExpanded, setIsDriverDetailsExpanded, paymentMethod, setPaymentMethod,
    isPaymentModalOpen, setIsPaymentModalOpen, transactionId, setTransactionId,
    pendingTopUpAmount, setPendingTopUpAmount, pendingTopUpMethod, setPendingTopUpMethod,
    showReceipt, setShowReceipt, userRating, setUserRating, userPraise, setUserPraise,
    tipAmount, setTipAmount, isRulerExpanded, setIsRulerExpanded,
    waitingTime, setWaitingTime, currentRideWaitingTime, setCurrentRideWaitingTime,
    currentRideWaitingFare, setCurrentRideWaitingFare, waitingLogs, setWaitingLogs,
    showSOS, setShowSOS, sosAlertTriggered, setSosAlertTriggered, sosCountdown, setSosCountdown,
    triggerSOS, showNoDriverModal, setShowNoDriverModal, noDriverRequestedClassId, setNoDriverRequestedClassId,
    showShareModal, setShowShareModal, showPromoBanner, setShowPromoBanner,
    shareRideData, setShareRideData, copied, setCopied, shareUrl,
    liveDriverLoc, setLiveDriverLoc, liveStatus, setLiveStatus,
    usePoints, setUsePoints, ridePointsRedeemed, setRidePointsRedeemed,
    history, setHistory, historySortOrder, setHistorySortOrder, addHistoryItem,
    rideDistance, activeRideClass, activeBaseFare, activePerKm, baseSurgeFare,
    walletPrice, cashPrice, activeFareToCharge, maxPointsRedeemable, pointsDiscount,
    finalFareToPay, activeDiscountAmount, getTrafficDetails,
    handleMapTap, handleBookRide, startSearchingDriver, handleCancelBooking, getTripProgressPercentage
  } = rideBooking;

  const {
    driverOnline, setDriverOnline, driverStats, setDriverStats,
    driverRideRequest, setDriverRideRequest, requestCountdown, setRequestCountdown,
    triggerIncomingSimulatedRequest, handleDeclineRequest, handleAcceptRequest
  } = driverDashboard;

  // 9. Modals triggers
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [isAdminPage, setIsAdminPage] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      return params.get('page') === 'admin' || params.get('admin') === 'true' || path.endsWith('/admin') || path.includes('/admin');
    }
    return false;
  });
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

  // Auto-geolocate on mount to align with the user's physical live location (e.g., Yaounde/Douala)
  useEffect(() => {
    // Attempt automatic background geolocation of current standing position
    if (typeof window !== 'undefined' && navigator.geolocation) {
      geolocateCurrentPosition();
    }
  }, []);

  const previewMapRef = useRef<L.Map | null>(null);

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

  // Passenger requests a wallet topup
  const handlePassengerTopUp = (amount: number, method: 'momo_mtn' | 'orange_money') => {
    setPendingTopUpAmount(amount);
    setPendingTopUpMethod(method);
    setIsPaymentModalOpen(true);
  };

  const handleTopUpSuccess = (txId: string) => {
    wallet.topUp({
      txId,
      amount: pendingTopUpAmount,
      method: pendingTopUpMethod,
      phone: user?.phone || '677123456',
      promoActive: systemSettings.topupPromoActive,
      promoRate: systemSettings.topupPromoRate,
      slangMode
    });
    setIsPaymentModalOpen(false);
    setPendingTopUpAmount(0);
  };

  // Complete ride and calculate payouts/commissions (cross-domain: wallet + points + history)
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
      wallet.addTransaction({
        id: `RIDE-${Date.now()}`,
        type: 'ride_payout',
        amount: finalFareToCharge + currentRideWaitingFare + tipToPay,
        tipAmount: tipToPay,
        phone: user?.phone || '677123456',
        carrier: 'wallet_debit',
        status: 'success',
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
    } else {
      // Cash Pay: passenger paid driver cash on hand. We deduct the commission from driver wallet!
      setDriverWallet(prev => Math.max(0, prev - platformCommission));

      wallet.addTransaction({
        id: `COMM-${Date.now()}`,
        type: 'commission_debit',
        amount: platformCommission,
        phone: activeDriver.phone,
        carrier: 'cash_commission',
        status: 'success',
        date: new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
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
    if (adminAuth.isCheckingAdminSession) {
      return null;
    }
    if (!adminAuth.isAdminAuthenticated) {
      return (
        <AdminLoginModal
          onLogin={adminAuth.loginAdmin}
          error={adminAuth.adminLoginError}
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
        onLogout={adminAuth.logoutAdmin}
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
      <ShareRideTracker
        shareRideData={shareRideData}
        slangMode={slangMode}
        liveStatus={liveStatus}
        liveDriverLoc={liveDriverLoc}
        isMapTilted={isMapTilted}
        isZoomLocked={isZoomLocked}
        showMapGrid={showMapGrid}
        recentBookings={recentBookings}
      />
    );
  }

  // Render signup page if user has not onboarding
  if (!user) {
    return (
      <LandingPage 
        onSignupComplete={auth.handleSignupComplete}
        currentLanguage={language}
        onLanguageChange={changeLanguage}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-brand-midnight text-white select-none overflow-hidden" id="app-root-container">
      
      <AppHeader
        isOnline={isOnline}
        slangMode={slangMode}
        currentCity={currentCity}
        role={role}
        language={language}
        appNotifications={appNotifications}
        langDropdownOpen={langDropdownOpen}
        setSearchModalType={setSearchModalType}
        setIsNotificationDrawerOpen={setIsNotificationDrawerOpen}
        setLangDropdownOpen={setLangDropdownOpen}
        changeLanguage={changeLanguage}
        handleLogout={handleLogout}
      />

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
            isMapFullscreen || (role === 'driver' && rideStatus !== 'idle')
              ? 'hidden md:hidden w-0 h-0 border-0 pointer-events-none'
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
            <PassengerBookingScreen
              slangMode={slangMode}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              showTabBalance={showTabBalance}
              setShowTabBalance={setShowTabBalance}
              passengerWallet={passengerWallet}
              pickup={pickup}
              destination={destination}
              setDestination={setDestination}
              setSearchModalType={setSearchModalType}
              setSearchQuery={setSearchQuery}
              geolocateCurrentPosition={geolocateCurrentPosition}
              activeCityLocations={activeCityLocations}
              currentCity={currentCity}
              showPromoBanner={showPromoBanner}
              setShowPromoBanner={setShowPromoBanner}
              systemSettings={systemSettings}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              rideDistance={rideDistance}
              finalFareToPay={finalFareToPay}
              triggerSOS={triggerSOS}
              handleBookRide={handleBookRide}
              rideStatus={rideStatus}
              walletPrice={walletPrice}
              cashPrice={cashPrice}
              handleCancelBooking={handleCancelBooking}
              activeDriver={activeDriver}
              driverLoc={driverLoc}
              etaMinutes={etaMinutes}
              etaStatusText={etaStatusText}
              waitingTime={waitingTime}
              currentRideWaitingFare={currentRideWaitingFare}
              activeFareToCharge={activeFareToCharge}
              isProgressExpanded={isProgressExpanded}
              setIsProgressExpanded={setIsProgressExpanded}
              summaryMetricMode={summaryMetricMode}
              setSummaryMetricMode={setSummaryMetricMode}
              setShowChat={setShowChat}
              messages={messages}
              setShowShareModal={setShowShareModal}
              showCallDropdown={showCallDropdown}
              setShowCallDropdown={setShowCallDropdown}
              startInAppCall={startInAppCall}
              receiveInAppCall={receiveInAppCall}
              transactions={transactions}
              handlePassengerTopUp={handlePassengerTopUp}
              passengerPoints={passengerPoints}
              isOnline={isOnline}
              history={history}
              setHistory={setHistory}
              historySortOrder={historySortOrder}
              setHistorySortOrder={setHistorySortOrder}
              getPaymentBadge={getPaymentBadge}
              handleRebook={handleRebook}
              downloadPDFReceipt={downloadPDFReceipt}
            />
          )}

          {/* ========================================================================= */}
          {/* DRIVER TERMINAL COMPONENT */}
          {/* ========================================================================= */}
          <DriverMainDashboard
            role={role}
            slangMode={slangMode}
            rideStatus={rideStatus}
            driverActiveTab={driverActiveTab}
            setDriverActiveTab={setDriverActiveTab}
            driverOnline={driverOnline}
            setDriverOnline={setDriverOnline}
            driverStats={driverStats}
            getPaymentBadge={getPaymentBadge}
            paymentMethod={paymentMethod}
            pickup={pickup}
            destination={destination}
            activeFareToCharge={activeFareToCharge}
            waitingTime={waitingTime}
            currentRideWaitingFare={currentRideWaitingFare}
            setRideStatus={setRideStatus}
            setShowChat={setShowChat}
            messages={messages}
            handleCancelBooking={handleCancelBooking}
            showCallDropdown={showCallDropdown}
            setShowCallDropdown={setShowCallDropdown}
            startInAppCall={startInAppCall}
            receiveInAppCall={receiveInAppCall}
            currentCity={currentCity}
            triggerIncomingSimulatedRequest={triggerIncomingSimulatedRequest}
            driverLoc={driverLoc}
            setCenterCoords={setCenterCoords}
            recentBookings={recentBookings}
            driverWallet={driverWallet}
            handleDriverWithdraw={handleDriverWithdraw}
            transactions={transactions}
            systemSettings={systemSettings}
            user={user}
            history={history}
            isOnline={isOnline}
            waitingLogs={waitingLogs}
          />

        </aside>

        {/* Right Side Map Viewport */}
        <section 
          className={`relative transition-all duration-300 ${
            isMapFullscreen || (role === 'driver' && rideStatus !== 'idle')
              ? 'fixed inset-0 z-[100] w-screen h-screen'
              : rideStatus !== 'idle' && rideStatus !== 'searching'
                ? 'flex-1 h-[60vh] md:h-full w-full'
                : 'flex-1 h-full w-full'
          }`} 
          id="map-viewport"
        >
          {/* Clean Map Viewport Controls (Fullscreen toggle only) */}
          <button
            onClick={() => setIsMapFullscreen(prev => !prev)}
            className="absolute top-4 right-4 z-[1000] flex items-center justify-center w-[34px] h-[34px] bg-brand-midnight/90 backdrop-blur-md border border-brand-input/60 hover:border-brand-gold/80 rounded-xl text-brand-gold hover:text-white shadow-lg transition-all duration-200 active:scale-95 cursor-pointer group"
            title={isMapFullscreen ? (slangMode ? "Quitter le plein écran" : "Exit Fullscreen") : (slangMode ? "Plein écran" : "Fullscreen")}
            id="map-fullscreen-toggle"
          >
            {isMapFullscreen ? <Minimize2 size={16} className="group-hover:scale-110 transition-transform" /> : <Maximize2 size={16} className="group-hover:scale-110 transition-transform" />}
          </button>


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

          {/* FLOATING DRIVER ACTIVE NAVIGATION CONTROL BAR */}
          <DriverFloatingNavBar
            role={role}
            rideStatus={rideStatus}
            slangMode={slangMode}
            isDriverDetailsExpanded={isDriverDetailsExpanded}
            setIsDriverDetailsExpanded={setIsDriverDetailsExpanded}
            destination={destination}
            pickup={pickup}
            activeFareToCharge={activeFareToCharge}
            startInAppCall={startInAppCall}
            setShowChat={setShowChat}
            getPaymentBadge={getPaymentBadge}
            paymentMethod={paymentMethod}
            waitingTime={waitingTime}
            setRideStatus={setRideStatus}
            handleCancelBooking={handleCancelBooking}
            messages={messages}
          />

          {/* Floating Dynamic Distance Ruler (Collapsible) */}
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
            
            if (!isRulerExpanded) {
              return (
                <button
                  type="button"
                  onClick={() => setIsRulerExpanded(true)}
                  className="absolute top-4 left-4 z-[1000] bg-brand-midnight/95 backdrop-blur-md border border-brand-gold/40 hover:border-brand-gold px-3 py-1.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-2xl hover:scale-105 transition active:scale-95 cursor-pointer"
                  title={slangMode ? "Afficher la réglette de distance" : "Show Distance Ruler"}
                  id="toggle-distance-ruler-btn"
                >
                  <Ruler size={13} className="text-brand-gold" />
                  <span className="font-mono text-brand-gold font-black">{progressPct}%</span>
                  <ChevronDown size={13} className="text-brand-text-muted" />
                </button>
              );
            }

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
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`text-xs font-black transition-all duration-300 ${colorClass}`}>
                      {displayValue}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRulerExpanded(false)}
                      className="p-1 text-brand-text-muted hover:text-white bg-brand-card border border-brand-input rounded-lg transition cursor-pointer"
                      title={slangMode ? "Réduire" : "Collapse"}
                    >
                      <ChevronUp size={12} />
                    </button>
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

          {/* Smooth Journey Progress Bar Animation (Passenger side only) */}
          {rideStatus === 'in_progress' && role === 'passenger' && (
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
      {/* COMPLETED RIDE RECEIPT & RATING MODAL (Passenger Side Only) */}
      {/* ========================================================================= */}
      <ReceiptModal
        showReceipt={showReceipt}
        role={role}
        pickup={pickup}
        destination={destination}
        activeDriver={activeDriver}
        slangMode={slangMode}
        transactionId={transactionId}
        currentRideWaitingTime={currentRideWaitingTime}
        currentRideWaitingFare={currentRideWaitingFare}
        ridePointsRedeemed={ridePointsRedeemed}
        paymentMethod={paymentMethod}
        tipAmount={tipAmount}
        userRating={userRating}
        userPraise={userPraise}
        language={language}
        rideDistance={rideDistance}
        activeFareToCharge={activeFareToCharge}
        setTipAmount={setTipAmount}
        setUserRating={setUserRating}
        setUserPraise={setUserPraise}
        getPaymentBadge={getPaymentBadge}
        downloadPDFReceipt={downloadPDFReceipt}
        handleSubmitRating={handleSubmitRating}
      />

      {/* ========================================================================= */}
      {/* DRIVER END-OF-TRIP EARNINGS SUMMARY MODAL */}
      {/* ========================================================================= */}
      <DriverEarningsModal
        role={role}
        rideStatus={rideStatus}
        pickup={pickup}
        destination={destination}
        driverRideRequest={driverRideRequest}
        paymentMethod={paymentMethod}
        slangMode={slangMode}
        activeFareToCharge={activeFareToCharge}
        getPaymentBadge={getPaymentBadge}
        setRideStatus={setRideStatus}
        setDriverRideRequest={setDriverRideRequest}
        setDriverLoc={setDriverLoc}
        setShowChat={setShowChat}
        setCurrentRideWaitingTime={setCurrentRideWaitingTime}
        setCurrentRideWaitingFare={setCurrentRideWaitingFare}
      />

      {/* ========================================================================= */}
      {/* SMART KEYBOARD-SAFE AUTOCOMPLETE SEARCH MODAL */}
      {/* ========================================================================= */}
      <LocationSearchModal
        searchModalType={searchModalType}
        setSearchModalType={setSearchModalType}
        slangMode={slangMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentCity={currentCity}
        activeCityLocations={activeCityLocations}
        geolocateCurrentPosition={geolocateCurrentPosition}
        isGeolocating={isGeolocating}
        setPickup={setPickup}
        setDestination={setDestination}
      />

      {/* ========================================================================= */}
      {/* POWERFUL ADMIN CONSOLE & LOGIN OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAdminLoginModal && !adminAuth.isAdminAuthenticated && (
          <AdminLoginModal
            onLogin={async (email, password) => {
              const success = await adminAuth.loginAdmin(email, password);
              if (success) {
                setShowAdminLoginModal(false);
                setIsAdminOpen(true);
              }
              return success;
            }}
            error={adminAuth.adminLoginError}
            onClose={() => setShowAdminLoginModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdminOpen && adminAuth.isAdminAuthenticated && (
          <AdminDashboard
            onClose={() => setIsAdminOpen(false)}
            onLogout={() => {
              adminAuth.logoutAdmin();
              setIsAdminOpen(false);
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
      <ShareRideModal
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        setCopied={setCopied}
        copied={copied}
        slangMode={slangMode}
        user={user}
        activeDriver={activeDriver}
        pickup={pickup}
        destination={destination}
        shareUrl={shareUrl}
      />

      {/* ========================================================================= */}
      {/* LOCAL SÉCURITÉ SOS DIALOG DRAWER */}
      {/* ========================================================================= */}
      <SOSDrawer
        showSOS={showSOS}
        setShowSOS={setShowSOS}
        setSosAlertTriggered={setSosAlertTriggered}
        slangMode={slangMode}
        sosAlertTriggered={sosAlertTriggered}
        sosCountdown={sosCountdown}
        pickup={pickup}
      />

      {/* Progressive Web App prompt */}
      <InstallPrompt language={language} />

      {/* IN-APP CALL OVERLAY */}
      <CallOverlay
        callState={callState}
        slangMode={slangMode}
        role={role}
        activeDriver={activeDriver}
        language={language}
        driverRideRequest={driverRideRequest}
        user={user}
        callDuration={callDuration}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        isSpeaker={isSpeaker}
        setIsSpeaker={setIsSpeaker}
        declineInAppCall={declineInAppCall}
        answerInAppCall={answerInAppCall}
        endInAppCall={endInAppCall}
      />

      {/* FULL-SCREEN TAKEOVER MODAL FOR INCOMING RIDE REQUEST */}
      <DriverIncomingRequestModal
        role={role}
        slangMode={slangMode}
        language={language}
        driverRideRequest={driverRideRequest}
        requestCountdown={requestCountdown}
        getPaymentBadge={getPaymentBadge}
        handleDeclineRequest={handleDeclineRequest}
        handleAcceptRequest={handleAcceptRequest}
      />

      {/* Half-Screen Sliding Chat Panel Overlay */}
      <ChatPanel
        showChat={showChat}
        setShowChat={setShowChat}
        slangMode={slangMode}
        role={role}
        activeDriver={activeDriver}
        driverRideRequest={driverRideRequest}
        user={user}
        startInAppCall={startInAppCall}
        messages={messages}
        setMessages={setMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChat={handleSendChat}
      />

      {/* Push Notification Banner Overlay */}
      <NotificationPushBanner
        notification={pushBannerNotif}
        onClose={dismissPushBanner}
        onOpenDrawer={openDrawerFromBanner}
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
