import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { subscribeToActiveRides, acceptRide, cancelRide } from '../services/rides.service';
import {
  UserRole,
  UserProfile,
  RideStatus,
  Location,
  Driver,
  PaymentMethod,
  Message,
  DriverRideRequest
} from '../types';

export interface UseDriverDashboardParams {
  role: UserRole;
  user: UserProfile | null;
  slangMode: boolean;
  /** From useRideBooking — the driver's own current position. */
  driverLoc: { lat: number; lng: number } | null;
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
 * incoming-ride-request feed. Les demandes réelles sont celles assignées à ce
 * chauffeur par le dispatch backend (POST /rides → statut 'driver_found'),
 * pollées via GET /rides. Accepter une demande switch le chauffeur dans le
 * même état "course en cours" que côté passager (useRideBooking).
 */
export function useDriverDashboard(params: UseDriverDashboardParams) {
  const {
    role,
    user,
    slangMode,
    driverLoc,
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

  // Id de la dernière demande affichée — évite de re-surfacer une demande déjà
  // refusée ou en cours tant qu'elle reste assignée au chauffeur.
  const lastRequestIdRef = useRef<string | null>(null);

  // ---- Real incoming requests (dispatched rides) ----
  useEffect(() => {
    if (role !== 'driver' || !user?.id) return;
    let cancelled = false;

    const unsub = subscribeToActiveRides((rides) => {
      if (cancelled) return;

      if (rideStatus !== 'idle') {
        setDriverRideRequest(null);
        return;
      }

      const myRequest = rides.find(
        (r) => r.status === 'driver_found' && r.driverId === user.id
      );
      if (!myRequest) {
        lastRequestIdRef.current = null;
        setDriverRideRequest(null);
        return;
      }
      if (lastRequestIdRef.current === myRequest.id) return;

      lastRequestIdRef.current = myRequest.id;
      const rawPayment = myRequest.paymentMethod;
      setDriverRideRequest({
        id: myRequest.id,
        passengerName: myRequest.passengerName || 'Passager',
        pickupName: myRequest.pickup.name || 'Point de départ',
        destName: myRequest.destination.name || 'Destination',
        pickupLat: myRequest.pickup.lat,
        pickupLng: myRequest.pickup.lng,
        destLat: myRequest.destination.lat,
        destLng: myRequest.destination.lng,
        fare: myRequest.fare,
        payment: rawPayment === 'wallet' || rawPayment === 'cash' ? rawPayment : 'wallet'
      });
      setRequestCountdown(15);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [role, user?.id, rideStatus]);

  const handleDeclineRequest = () => {
    const req = driverRideRequest;
    setDriverRideRequest(null);
    if (req) {
      cancelRide(req.id).catch((err) =>
        console.warn('Decline cancel failed:', err?.message || err)
      );
    }
  };

  const handleAcceptRequest = () => {
    if (!driverRideRequest) return;
    const req = driverRideRequest;

    acceptRide(req.id).catch((err) =>
      console.warn('Accept failed:', err?.message || err)
    );

    setRideStatus('driver_found');

    setPickup({
      name: req.pickupName,
      lat: req.pickupLat,
      lng: req.pickupLng
    });
    setDestination({
      name: req.destName,
      lat: req.destLat,
      lng: req.destLng
    });

    setPaymentMethod(req.payment);

    const driverVehicleType = (user as any)?.vehicleType || 'ecoride';

    setActiveDriver({
      id: user?.id || 'driver_user',
      name: user?.name || 'Moi-même Chauffeur',
      phone: user?.phone || '+237 600 00 00 00',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      vehicleModel: (user as any)?.vehicleModel || (driverVehicleType === 'okada' ? 'Nanfang Moto (Red)' : 'Toyota Yaris Yellow'),
      vehiclePlate: (user as any)?.vehiclePlate || 'LT - 999 - CH',
      vehicleType: driverVehicleType,
      rating: 5.0,
      lat: driverLoc?.lat || req.pickupLat,
      lng: driverLoc?.lng || req.pickupLng,
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
            ? `Bonjour chauffeur, je t'attends à ${req.pickupName}. S'il te plaît dépêche-toi, le soleil tape fort !`
            : `Hello driver, I am waiting for you at ${req.pickupName}. Please hurry up, it is very hot today!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 2000);
  };

  // Countdown timer for incoming request (auto-declines at zero)
  useEffect(() => {
    if (!driverRideRequest) return;

    const timer = setInterval(() => {
      setRequestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleDeclineRequest();
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
    handleDeclineRequest,
    handleAcceptRequest
  };
}
