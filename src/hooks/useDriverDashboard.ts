import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { RIDE_CLASSES, getDistanceKm } from '../data';
import {
  UserRole,
  UserProfile,
  RideStatus,
  Location,
  Driver,
  PaymentMethod,
  Message,
  DriverRideRequest,
  SystemSettings
} from '../types';

export interface UseDriverDashboardParams {
  role: UserRole;
  user: UserProfile | null;
  slangMode: boolean;
  systemSettings: SystemSettings;
  currentCity: string;
  /** From useRideBooking — city-scoped preset pickup/destination points used to fabricate a request. */
  activeCityLocations: Location[];
  /** From useRideBooking — the driver's own current position; also written here on first dispatch. */
  driverLoc: { lat: number; lng: number } | null;
  setDriverLoc: Dispatch<SetStateAction<{ lat: number; lng: number } | null>>;
  /** From useRideBooking — accepting a request switches the driver into the same "active ride" state slots the passenger side uses. */
  rideStatus: RideStatus;
  setRideStatus: Dispatch<SetStateAction<RideStatus>>;
  setPickup: Dispatch<SetStateAction<Location | null>>;
  setDestination: Dispatch<SetStateAction<Location | null>>;
  setActiveDriver: Dispatch<SetStateAction<Driver | null>>;
  setPaymentMethod: Dispatch<SetStateAction<PaymentMethod>>;
  /** From useChat — accepting a request seeds the driver's chat thread with a greeting. */
  setMessages: Dispatch<SetStateAction<Message[]>>;
}

/**
 * Driver-mode dashboard: online/offline status, headline stats, and the
 * incoming-ride-request simulator (auto-dispatch, countdown, accept/decline).
 * Accepting a request populates the same ride-in-progress state that the
 * passenger side owns (useRideBooking) — those setters are accepted as
 * parameters rather than duplicated here.
 */
export function useDriverDashboard(params: UseDriverDashboardParams) {
  const {
    role,
    user,
    slangMode,
    systemSettings,
    currentCity,
    activeCityLocations,
    driverLoc,
    setDriverLoc,
    rideStatus,
    setRideStatus,
    setPickup,
    setDestination,
    setActiveDriver,
    setPaymentMethod,
    setMessages
  } = params;

  // ---- Driver mode specific states ----
  const [driverOnline, setDriverOnline] = useState(false);
  const [driverStats, setDriverStats] = useState({
    earnings: 28000,
    trips: 18,
    rating: 4.8
  });
  const [driverRideRequest, setDriverRideRequest] = useState<DriverRideRequest | null>(null);
  const [requestCountdown, setRequestCountdown] = useState(15);

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

    const distanceVal = getDistanceKm(pickupLoc.lat, pickupLoc.lng, destLoc.lat, destLoc.lng);

    const driverVehicleType = (user as any)?.vehicleType || 'ecoride';
    const activeClass = RIDE_CLASSES.find(c => c.id === driverVehicleType) || RIDE_CLASSES[2];
    const clsBase = systemSettings.classRates?.[activeClass.id]?.baseFare ?? activeClass.baseFare;
    const clsPerKm = systemSettings.classRates?.[activeClass.id]?.perKm ?? activeClass.perKm;
    const calculatedFare = Math.round((clsBase + (distanceVal * clsPerKm)) * systemSettings.surgeMultiplier);

    const newRequest: DriverRideRequest = {
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

    const driverVehicleType = (user as any)?.vehicleType || 'ecoride';

    setActiveDriver({
      id: 'driver_user',
      name: user?.name || 'Moi-même Chauffeur',
      phone: user?.phone || '+237 600 00 00 00',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      vehicleModel: (user as any)?.vehicleModel || (driverVehicleType === 'okada' ? 'Nanfang Moto (Red)' : 'Toyota Yaris Yellow'),
      vehiclePlate: (user as any)?.vehiclePlate || 'LT - 999 - CH',
      vehicleType: driverVehicleType,
      approvalStatus: 'approved',
      rating: 5.0,
      lat: driverLoc?.lat || 3.8640,
      lng: driverLoc?.lng || 11.5205,
      status: 'heading_to_pickup'
    } as Driver);

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

  // 2. Countdown timer for incoming request (auto-declines at zero)
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

  return {
    driverOnline, setDriverOnline,
    driverStats, setDriverStats,
    driverRideRequest, setDriverRideRequest,
    requestCountdown, setRequestCountdown,
    triggerIncomingSimulatedRequest,
    handleDeclineRequest,
    handleAcceptRequest
  };
}
