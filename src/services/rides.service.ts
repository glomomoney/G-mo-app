import { apiRequest } from '../lib/api';
import { RideRequest } from '../types';

type Unsubscribe = () => void;

interface RideBackend {
  id: string;
  passenger_id: string;
  driver_id: string | null;
  passenger_name: string | null;
  passenger_phone: string | null;
  pickup: { name?: string; lat?: number; lng?: number } | null;
  destination: { name?: string; lat?: number; lng?: number } | null;
  ride_class_id: string;
  fare: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const FALLBACK_POINT = { name: '', lat: 0, lng: 0 };

function mapRide(r: RideBackend): RideRequest & { id: string } {
  const pickup = r.pickup || FALLBACK_POINT;
  const destination = r.destination || FALLBACK_POINT;
  return {
    id: r.id,
    passengerId: r.passenger_id,
    driverId: r.driver_id || undefined,
    passengerName: r.passenger_name || '',
    passengerPhone: r.passenger_phone || '',
    pickup: { name: pickup.name || '', lat: pickup.lat || 0, lng: pickup.lng || 0 },
    destination: { name: destination.name || '', lat: destination.lat || 0, lng: destination.lng || 0 },
    fare: r.fare,
    paymentMethod: (r.payment_method as RideRequest['paymentMethod']) || 'wallet',
    rideClassId: r.ride_class_id,
    status: (r.status as RideRequest['status']) || 'searching',
    createdAt: r.created_at,
  };
}

// Crée la course côté backend (tarification, solde wallet, dispatch) et
// renvoie l'id de la course backend.
export const createRideInFirestore = async (
  ride: Partial<RideRequest> & { userId?: string; pointsRedeemed?: number }
): Promise<string | null> => {
  if (!ride.pickup || !ride.destination) return null;
  try {
    const data = await apiRequest<RideBackend>('/rides', {
      method: 'POST',
      body: {
        pickup: {
          name: ride.pickup.name,
          lat: ride.pickup.lat,
          lng: ride.pickup.lng,
        },
        destination: {
          name: ride.destination.name,
          lat: ride.destination.lat,
          lng: ride.destination.lng,
        },
        ride_class_id: ride.rideClassId || 'ecoride',
        payment_method: ride.paymentMethod || 'wallet',
        points_redeemed: ride.pointsRedeemed || 0,
      },
    });
    return data ? data.id : null;
  } catch (err) {
    console.warn('Error creating ride:', err?.message || err);
    return null;
  }
};

// Transitions de statut :
//  - 'cancelled'  -> POST /rides/{id}/cancel (remboursement wallet le cas échéant)
//  - autre statut participant -> POST /rides/{id}/status?status=...
//  - 'searching' / 'idle' / 'driver_found' sont gérés côté backend (create/
//    dispatch) et ne sont pas renvoyés ici pour éviter les conflits.
export const updateRideStatusInFirestore = async (
  rideId: string,
  updates: Partial<RideRequest>
): Promise<void> => {
  const status = updates?.status;
  if (!status) return;

  try {
    if (status === 'cancelled') {
      await apiRequest(`/rides/${rideId}/cancel`, {
        method: 'POST',
        body: { reason: (updates as any).cancelReason || "Annulé par l'utilisateur" },
      });
      return;
    }

    const allowed = ['arriving', 'in_progress', 'completed'];
    if (!allowed.includes(status)) return;

    await apiRequest(`/rides/${rideId}/status?status=${status}`, { method: 'POST' });
  } catch (err) {
    console.warn('Error updating ride status:', err?.message || err);
  }
};

// Note post-course : POST /rides/{id}/rate.
export const rateRide = async (
  rideId: string,
  rating: number,
  praise?: string
): Promise<void> => {
  await apiRequest(`/rides/${rideId}/rate`, {
    method: 'POST',
    body: { passenger_rating: rating, passenger_praise: praise || null },
  });
};

// Acceptation chauffeur : POST /rides/{id}/accept.
// Le backend accepte aussi les courses déjà assignées par le dispatch
// (statut 'driver_found') — simple confirmation.
export const acceptRide = async (rideId: string): Promise<void> => {
  await apiRequest(`/rides/${rideId}/accept`, { method: 'POST' });
};

// Déclin / annulation : POST /rides/{id}/cancel (remboursement wallet côté serveur).
export const cancelRide = async (rideId: string, reason?: string): Promise<void> => {
  await apiRequest(`/rides/${rideId}/cancel`, {
    method: 'POST',
    body: { reason: reason || 'Décliné par le chauffeur' },
  });
};

// Courses du user connecté (GET /rides), pollées toutes les 6s.
export const subscribeToActiveRides = (
  onUpdate: (rides: (RideRequest & { id: string })[]) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const rides = await apiRequest<RideBackend[]>('/rides');
      if (!cancelled) onUpdate(rides.map(mapRide));
    } catch (err) {
      console.warn('subscribeToActiveRides poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 6000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
