import { apiRequest } from '../lib/api';
import { HistoryItem } from '../types';

type Unsubscribe = () => void;

interface HistoryBackend {
  id: string;
  user_id: string;
  ride_id: string | null;
  pickup_name: string;
  dest_name: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  fare: number;
  tip_amount: number;
  payment_method: string;
  status: string;
  vehicle_class: string;
  driver_name: string | null;
  points_earned: number;
  points_redeemed: number;
  created_at: string;
}

function formatTxDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function mapHistoryItem(h: HistoryBackend): HistoryItem {
  return {
    id: h.id,
    date: formatTxDate(h.created_at),
    pickupName: h.pickup_name,
    destName: h.dest_name,
    fare: h.fare,
    tipAmount: h.tip_amount || undefined,
    paymentMethod: (h.payment_method as HistoryItem['paymentMethod']) || 'wallet',
    status: h.status === 'completed' ? 'completed' : 'cancelled',
    vehicleClass: h.vehicle_class,
    driverName: h.driver_name || 'Chauffeur Wanda',
    pickupLat: h.pickup_lat || undefined,
    pickupLng: h.pickup_lng || undefined,
    destLat: h.dest_lat || undefined,
    destLng: h.dest_lng || undefined,
    pointsEarned: h.points_earned,
    pointsRedeemed: h.points_redeemed,
    userId: h.user_id,
  };
}

// L'historique est écrit côté backend à la fin de course (GET /rides/history).
export const saveHistoryToFirestore = async (_item?: unknown, _userId?: string): Promise<void> => {
  // no-op : le backend est la source de vérité pour l'historique.
};

// Historique du user connecté, pollé toutes les 6s.
export const subscribeToHistory = (
  _userId: string,
  onUpdate: (items: HistoryItem[]) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const items = await apiRequest<HistoryBackend[]>('/rides/history');
      if (!cancelled) onUpdate(items.map(mapHistoryItem));
    } catch (err) {
      console.warn('subscribeToHistory poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 6000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
