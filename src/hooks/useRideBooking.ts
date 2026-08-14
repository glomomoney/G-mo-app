import { useState, useEffect, useMemo, Dispatch, SetStateAction } from 'react';
import {
  YAOUNDE_LOCATIONS,
  LAGOS_LOCATIONS,
  RIDE_CLASSES,
  getDistanceKm
} from '../data';
import {
  Location,
  RideStatus,
  Driver,
  PaymentMethod,
  Message,
  HistoryItem,
  RecentBooking,
  RideRequest,
  UserProfile,
  SystemSettings
} from '../types';
import { AdminDriverEntry } from './useDriversList';
import { createRideInFirestore, updateRideStatusInFirestore, subscribeToActiveRides } from '../services/rides.service';
import { saveHistoryToFirestore, subscribeToHistory } from '../services/history.service';
import { syncHistoryToOfflineCache, getCachedRideHistory } from '../utils/offlineCache';
import { reverseGeocode } from '../services/geocoding.service';

// Friendly local alias to represent Cameroonian locations cleanly
const DOUALA_LOCATIONS = LAGOS_LOCATIONS;

type City = 'Yaoundé' | 'Douala';

export interface ShareRideData {
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
}

function loadInitialHistory(): HistoryItem[] {
  const saved = localStorage.getItem('wanda_ride_history');
  return saved ? JSON.parse(saved) : [];
}

type RideRequestWithId = RideRequest & { id: string };

// Recent-bookings feed helpers — derive the public "demand feed" display from
// real `rides` Firestore docs instead of a fabricated array.
function formatTimeAgo(isoTimestamp?: string): string {
  if (!isoTimestamp) return 'Just now';
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

function mapRideStatusToBookingStatus(status: RideStatus): 'completed' | 'active' | 'cancelled' {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

function detectCityFromLocation(loc?: Location): City {
  if (loc) {
    const inDouala = LAGOS_LOCATIONS.some(l => Math.abs(l.lat - loc.lat) < 0.05 && Math.abs(l.lng - loc.lng) < 0.05);
    if (inDouala) return 'Douala';
  }
  return 'Yaoundé';
}

function loadInitialWaitingLogs(): any[] {
  const saved = localStorage.getItem('wanda_waiting_logs');
  return saved ? JSON.parse(saved) : [];
}

export interface UseRideBookingParams {
  user: UserProfile | null;
  /** Firebase anonymous-auth uid from useAuth — used to key Firestore ride/history ownership (firestore.rules). */
  authUid: string | null;
  slangMode: boolean;
  systemSettings: SystemSettings;
  passengerPoints: number;
  passengerWallet: number;
  /** Admin driver roster from useDriversList — read-only, used to match an approved driver on dispatch. */
  driversList: AdminDriverEntry[];
  /** In-ride chat thread setter from useChat — startSearchingDriver seeds/clears it on dispatch. */
  setMessages: Dispatch<SetStateAction<Message[]>>;
  /** useChat's showChat panel toggle — handleCancelBooking closes it when a ride is cancelled/reset. */
  setShowChat: Dispatch<SetStateAction<boolean>>;
  // TODO(wiring): `activeTab` is plain top-level UI-tab state owned by App.tsx (never
  // extracted into its own hook) — App.tsx should pass its own setActiveTab setter here.
  setActiveTab: (tab: 'booking' | 'wallet' | 'history') => void;
}

/**
 * Passenger ride-booking + in-progress-ride lifecycle: pickup/destination
 * selection, fare calculation, driver dispatch simulation, live GPS
 * simulation engine, waiting-time tracking, SOS, share-my-ride, and ride
 * history. Ride-completion payout (wallet debit/credit, points, history
 * write) is NOT here — that's cross-domain orchestration composed in
 * App.tsx (see handleSubmitRating around original App.tsx lines 2190-2277).
 */
export function useRideBooking(params: UseRideBookingParams) {
  const { user, authUid, slangMode, systemSettings, passengerPoints, passengerWallet, driversList, setMessages, setShowChat, setActiveTab } = params;

  // ---- Travel coordinates and booking ----
  const [pickup, setPickup] = useState<Location | null>(YAOUNDE_LOCATIONS[0]);
  const [destination, setDestination] = useState<Location | null>(null);
  // Keyboard-safe smart autocomplete state
  const [searchModalType, setSearchModalType] = useState<'pickup' | 'destination' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ecoride');
  const [isSettingLocationType, setIsSettingLocationType] = useState<'pickup' | 'destination' | null>(null);

  const [currentCity, setCurrentCity] = useState<string>('Yaoundé');
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Real-time feed of ride activity (`rides` collection is readable by any
  // authenticated user — see firestore.rules — so it's the source for the
  // public-facing "recent bookings" heatmap overlay).
  const [activeRidesSnapshot, setActiveRidesSnapshot] = useState<(RideRequestWithId)[]>([]);
  // Ticks periodically just to force `timeAgo` strings to re-render without
  // needing a new Firestore snapshot.
  const [recentBookingsTick, setRecentBookingsTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRecentBookingsTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const recentBookings: RecentBooking[] = useMemo(() => {
    return activeRidesSnapshot
      .filter(ride => ride.status && ride.status !== 'idle')
      .slice(0, 12)
      .map(ride => ({
        id: ride.id,
        zoneName: ride.pickup?.name || (slangMode ? 'Zone inconnue' : 'Unknown zone'),
        rideClass: RIDE_CLASSES.find(c => c.id === ride.rideClassId)?.name || 'EcoRide',
        timeAgo: formatTimeAgo(ride.createdAt),
        status: mapRideStatusToBookingStatus(ride.status),
        fare: ride.fare,
        city: detectCityFromLocation(ride.pickup)
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRidesSnapshot, recentBookingsTick]);

  // Dynamic city presets based on currentCity rather than crude distance calculation
  const activeCityLocations = useMemo(() => {
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

  // ---- Booking status and simulation engines ----
  const [rideStatus, setRideStatus] = useState<RideStatus>('idle');
  // Firestore doc id of the current ride, once `createRideInFirestore`
  // resolves — used to persist status transitions (see the watcher effect
  // near `startSearchingDriver`) so `rides` docs reflect real ride state.
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [activeDriver, setActiveDriver] = useState<Driver | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(3);
  const [etaStatusText, setEtaStatusText] = useState<string>('');
  const [summaryMetricMode, setSummaryMetricMode] = useState<'time' | 'distance'>('time');
  const [isProgressExpanded, setIsProgressExpanded] = useState<boolean>(false);
  const [isDriverDetailsExpanded, setIsDriverDetailsExpanded] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet'); // defaults to wallet as requested!
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [pendingTopUpAmount, setPendingTopUpAmount] = useState<number>(0);
  const [pendingTopUpMethod, setPendingTopUpMethod] = useState<'momo_mtn' | 'orange_money'>('momo_mtn');

  // ---- Receipts / rating ----
  const [showReceipt, setShowReceipt] = useState(false);
  const [userRating, setUserRating] = useState<number>(5);
  const [userPraise, setUserPraise] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [isRulerExpanded, setIsRulerExpanded] = useState<boolean>(false);

  // ---- Waiting time tracking ----
  const [waitingTime, setWaitingTime] = useState<number>(0);
  const [currentRideWaitingTime, setCurrentRideWaitingTime] = useState<number>(0);
  const [currentRideWaitingFare, setCurrentRideWaitingFare] = useState<number>(0);
  const [waitingLogs, setWaitingLogs] = useState<any[]>(loadInitialWaitingLogs);

  useEffect(() => {
    localStorage.setItem('wanda_waiting_logs', JSON.stringify(waitingLogs));
  }, [waitingLogs]);

  // Tracks how long the driver waits at the pickup point (rideStatus === 'arriving')
  // and bills any time past the grace period.
  useEffect(() => {
    if (rideStatus !== 'arriving') {
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

        setCurrentRideWaitingTime(newTime);
        setCurrentRideWaitingFare(extraFare);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [rideStatus, pickup, activeDriver]);

  // ---- SOS ----
  const [showSOS, setShowSOS] = useState(false);
  const [sosAlertTriggered, setSosAlertTriggered] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(5);

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

  // ---- No Driver Available modal ----
  const [showNoDriverModal, setShowNoDriverModal] = useState(false);
  const [noDriverRequestedClassId, setNoDriverRequestedClassId] = useState<string>('okada');

  // ---- Share My Ride ----
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPromoBanner, setShowPromoBanner] = useState<boolean>(true); // Always display publicity
  const [shareRideData, setShareRideData] = useState<ShareRideData | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate unique live-tracking share link securely
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !pickup || !destination) return '';
    const urlParams = new URLSearchParams();
    urlParams.set('shareRide', `ride_${Date.now()}`);
    urlParams.set('passengerName', user?.name || 'Rider');

    if (activeDriver) {
      urlParams.set('driverName', activeDriver.name);
      urlParams.set('vehiclePlate', activeDriver.vehiclePlate);
      urlParams.set('vehicleModel', activeDriver.vehicleModel);
      urlParams.set('vehicleType', activeDriver.vehicleType);
    } else {
      urlParams.set('driverName', slangMode ? 'Recherche d\'un djo...' : 'Finding a driver...');
      urlParams.set('vehiclePlate', 'WANDA-VIP');
      urlParams.set('vehicleModel', 'Toyota Camry');
      urlParams.set('vehicleType', 'ecoride');
    }

    urlParams.set('pickupName', pickup.name);
    urlParams.set('pickupLat', pickup.lat.toString());
    urlParams.set('pickupLng', pickup.lng.toString());
    urlParams.set('destName', destination.name);
    urlParams.set('destLat', destination.lat.toString());
    urlParams.set('destLng', destination.lng.toString());

    const dLoc = driverLoc || pickup;
    urlParams.set('driverLat', dLoc.lat.toString());
    urlParams.set('driverLng', dLoc.lng.toString());
    urlParams.set('status', rideStatus);

    return `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
  }, [pickup, destination, user, activeDriver, driverLoc, rideStatus, slangMode]);

  // ---- Public live-tracking view (query-param driven) ----
  const [liveDriverLoc, setLiveDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [liveStatus, setLiveStatus] = useState<RideStatus>('idle');

  // Query Param Check on Load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shareRide = urlParams.get('shareRide');
      if (shareRide) {
        const pLat = parseFloat(urlParams.get('pickupLat') || '3.8640');
        const pLng = parseFloat(urlParams.get('pickupLng') || '11.5205');
        const dLat = parseFloat(urlParams.get('destLat') || '3.8640');
        const dLng = parseFloat(urlParams.get('destLng') || '11.5205');
        const drLat = parseFloat(urlParams.get('driverLat') || '3.8640');
        const drLng = parseFloat(urlParams.get('driverLng') || '11.5205');
        const sStatus = (urlParams.get('status') || 'in_progress') as RideStatus;

        setShareRideData({
          shareRideId: shareRide,
          passengerName: urlParams.get('passengerName') || 'Passenger',
          driverName: urlParams.get('driverName') || 'Driver',
          pickupName: urlParams.get('pickupName') || 'Pickup Point',
          destName: urlParams.get('destName') || 'Destination',
          pickupLat: pLat,
          pickupLng: pLng,
          destLat: dLat,
          destLng: dLng,
          driverLat: drLat,
          driverLng: drLng,
          vehiclePlate: urlParams.get('vehiclePlate') || 'LT - 000 - XX',
          vehicleModel: urlParams.get('vehicleModel') || 'Toyota Sedan',
          vehicleType: urlParams.get('vehicleType') || 'ecoride',
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

  // ---- Wanda Points redeemed for the *current* ride (distinct from the wallet's points balance in useWallet) ----
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [ridePointsRedeemed, setRidePointsRedeemed] = useState<number>(0);

  // ---- Ride history ----
  const [history, setHistory] = useState<HistoryItem[]>(loadInitialHistory);
  const [historySortOrder, setHistorySortOrder] = useState<'recent' | 'oldest'>('recent');

  // Initial offline-cache bootstrap restore for history (the wallet half of this
  // original effect already lives in useWallet — this is only the history half)
  useEffect(() => {
    getCachedRideHistory().then(cachedHist => {
      if (cachedHist && cachedHist.history?.length > 0 && !localStorage.getItem('wanda_ride_history')) {
        setHistory(cachedHist.history);
      }
    });
  }, []);

  // Synchronize history to Service Worker offline cache
  useEffect(() => {
    syncHistoryToOfflineCache(history);
  }, [history]);

  // Real-time Firestore live synchronization, keyed on the Firebase auth uid
  // (rather than a sanitized phone number) so it lines up with firestore.rules
  // ownership checks (history.userId == request.auth.uid).
  useEffect(() => {
    if (!authUid) return;

    const unsubscribeHistory = subscribeToHistory(authUid, (firestoreHistory) => {
      if (firestoreHistory && firestoreHistory.length > 0) {
        setHistory(prev => {
          const ids = new Set(prev.map(h => h.id));
          const newItems = firestoreHistory.filter(h => !ids.has(h.id));
          return [...newItems, ...prev];
        });
      }
    });

    const unsubscribeRides = subscribeToActiveRides((activeRides) => {
      setActiveRidesSnapshot(activeRides);
    });

    return () => {
      unsubscribeHistory();
      unsubscribeRides();
    };
  }, [authUid]);

  // Add history helper
  const addHistoryItem = (item: HistoryItem) => {
    const updated = [item, ...history];
    setHistory(updated);
    localStorage.setItem('wanda_ride_history', JSON.stringify(updated));

    // Persist to Firestore real backend database
    const userId = authUid || 'guest_user';
    saveHistoryToFirestore(item, userId);
  };

  // ---- Distance + fare calculations (recomputed every render, matching original) ----
  const rideDistance = (pickup && destination)
    ? getDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng)
    : 0;

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

  // Handle Map Tap Directly. Drops the pin immediately with a placeholder
  // label (instant feedback), then swaps in the real reverse-geocoded
  // address once it resolves — only if that exact point wasn't superseded
  // by a newer tap/selection in the meantime.
  const handleMapTap = (lat: number, lng: number) => {
    const defaultName = `Point personnalisé (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    const newLoc: Location = { name: defaultName, lat, lng };

    const target: 'pickup' | 'destination' =
      isSettingLocationType === 'pickup' ? 'pickup'
      : isSettingLocationType === 'destination' ? 'destination'
      : !pickup ? 'pickup'
      : 'destination';

    const setTarget = target === 'pickup' ? setPickup : setDestination;
    setTarget(newLoc);
    if (isSettingLocationType) setIsSettingLocationType(null);

    reverseGeocode(lat, lng).then(address => {
      setTarget(prev => (prev && prev.lat === lat && prev.lng === lng ? { ...prev, name: address } : prev));
    }).catch(() => {});
  };

  // Driver simulation triggers
  const startSearchingDriver = (classOverride?: string) => {
    const targetClassId = classOverride || selectedClassId;
    if (classOverride) {
      setSelectedClassId(classOverride);
    }

    setRideStatus('searching');
    setMessages([]);
    setActiveRideId(null);

    // Persist active ride request to Firestore real backend database.
    // `createdRideId` is a plain closure variable (not state) so the
    // setTimeout below can read whatever value is available by the time it
    // fires, regardless of which resolves first.
    let createdRideId: string | null = null;
    if (pickup && destination && user) {
      const selectedClass = RIDE_CLASSES.find(c => c.id === targetClassId) || RIDE_CLASSES[2];
      const clsBaseFare = systemSettings.classRates?.[selectedClass.id]?.baseFare ?? selectedClass.baseFare;
      const clsPerKm = systemSettings.classRates?.[selectedClass.id]?.perKm ?? selectedClass.perKm;
      const calculatedBaseSurge = Math.round((clsBaseFare + (rideDistance * clsPerKm)) * systemSettings.surgeMultiplier);
      const fare = paymentMethod === 'wallet' ? Math.round(calculatedBaseSurge * 0.85) : calculatedBaseSurge;
      createRideInFirestore({
        // Matches firestore.rules `request.resource.data.passengerId == request.auth.uid`.
        passengerId: authUid || undefined,
        passengerName: user.name,
        passengerPhone: user.phone,
        pickup,
        destination,
        fare,
        paymentMethod,
        rideClassId: targetClassId,
        status: 'searching'
      }).then(id => {
        createdRideId = id;
        setActiveRideId(id);
      });
    }

    setTimeout(() => {
      // Find an approved, active driver specifically matching this vehicle class
      const suitableDriver = driversList.find(
        d => d.vehicleType === targetClassId && d.approvalStatus === 'approved' && d.status !== 'offline'
      );

      if (!suitableDriver) {
        // No driver available for this specific vehicle class!
        if (createdRideId) {
          updateRideStatusInFirestore(createdRideId, { status: 'cancelled' });
        }
        setRideStatus(null as any); // matches original App.tsx behavior (resets to a falsy ride status)
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

  // Persist every ride-status transition (driver_found, arriving, in_progress,
  // completed) to the Firestore `rides` doc, so the recent-bookings feed and
  // any other client watching `subscribeToActiveRides` see real state.
  useEffect(() => {
    if (!activeRideId || !rideStatus) return;
    updateRideStatusInFirestore(activeRideId, { status: rideStatus });
  }, [rideStatus, activeRideId]);

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

  // Cancel-ride / reset-to-idle handler
  const handleCancelBooking = () => {
    if (activeRideId) {
      updateRideStatusInFirestore(activeRideId, { status: 'cancelled' });
    }
    setActiveRideId(null);
    setRideStatus('idle');
    setActiveDriver(null);
    setDriverLoc(null);
    setShowChat(false);
    setTransactionId(null);
    setCurrentRideWaitingTime(0);
    setCurrentRideWaitingFare(0);
    setTipAmount(0);
  };

  return {
    // Travel coordinates and booking
    pickup, setPickup,
    destination, setDestination,
    searchModalType, setSearchModalType,
    searchQuery, setSearchQuery,
    selectedClassId, setSelectedClassId,
    isSettingLocationType, setIsSettingLocationType,
    currentCity, setCurrentCity,
    centerCoords, setCenterCoords,
    recentBookings,
    activeCityLocations,

    // Booking status and simulation engines
    rideStatus, setRideStatus,
    activeDriver, setActiveDriver,
    driverLoc, setDriverLoc,
    etaMinutes, setEtaMinutes,
    etaStatusText, setEtaStatusText,
    summaryMetricMode, setSummaryMetricMode,
    isProgressExpanded, setIsProgressExpanded,
    isDriverDetailsExpanded, setIsDriverDetailsExpanded,
    paymentMethod, setPaymentMethod,
    isPaymentModalOpen, setIsPaymentModalOpen,
    transactionId, setTransactionId,
    pendingTopUpAmount, setPendingTopUpAmount,
    pendingTopUpMethod, setPendingTopUpMethod,

    // Receipts / rating
    showReceipt, setShowReceipt,
    userRating, setUserRating,
    userPraise, setUserPraise,
    tipAmount, setTipAmount,
    isRulerExpanded, setIsRulerExpanded,

    // Waiting time tracking
    waitingTime, setWaitingTime,
    currentRideWaitingTime, setCurrentRideWaitingTime,
    currentRideWaitingFare, setCurrentRideWaitingFare,
    waitingLogs, setWaitingLogs,

    // SOS
    showSOS, setShowSOS,
    sosAlertTriggered, setSosAlertTriggered,
    sosCountdown, setSosCountdown,
    triggerSOS,

    // No Driver Available modal
    showNoDriverModal, setShowNoDriverModal,
    noDriverRequestedClassId, setNoDriverRequestedClassId,

    // Share My Ride
    showShareModal, setShowShareModal,
    showPromoBanner, setShowPromoBanner,
    shareRideData, setShareRideData,
    copied, setCopied,
    shareUrl,

    // Public live-tracking view
    liveDriverLoc, setLiveDriverLoc,
    liveStatus, setLiveStatus,

    // Wanda Points redeemed for the current ride
    usePoints, setUsePoints,
    ridePointsRedeemed, setRidePointsRedeemed,

    // Ride history
    history, setHistory,
    historySortOrder, setHistorySortOrder,
    addHistoryItem,

    // Fare calculation
    rideDistance,
    activeRideClass,
    activeBaseFare,
    activePerKm,
    baseSurgeFare,
    walletPrice,
    cashPrice,
    activeFareToCharge,
    maxPointsRedeemable,
    pointsDiscount,
    finalFareToPay,
    activeDiscountAmount,
    getTrafficDetails,

    // Handlers
    handleMapTap,
    handleBookRide,
    startSearchingDriver,
    handleCancelBooking,
    getTripProgressPercentage
  };
}
