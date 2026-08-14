import { apiRequest } from '../lib/api';

// Chauffeur disponible (approuvé + en ligne + position) affiché sur la carte.
export interface OnlineDriver {
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

interface OnlineDriverBackend {
  user_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  rating: number;
  lat: number | null;
  lng: number | null;
}

const CITY_LAT_BOUNDARY = 3.95; // Yaoundé ≈ 3.86, Douala ≈ 4.04

// Chauffeurs en ligne — GET /drivers/online (public, sans token).
export const getOnlineDrivers = async (): Promise<OnlineDriver[]> => {
  try {
    const data = await apiRequest<OnlineDriverBackend[]>('/drivers/online', {
      skipAuth: true,
    });
    if (!Array.isArray(data)) return [];
    return data
      .filter((d) => d.lat !== null && d.lng !== null)
      .map((d) => ({
        id: d.user_id,
        name: d.name,
        vehicleType: d.vehicle_type,
        rating: d.rating,
        lat: d.lat as number,
        lng: d.lng as number,
        city: (d.lat as number) >= CITY_LAT_BOUNDARY ? 'Douala' : 'Yaoundé',
        vehicleModel: d.vehicle_model || '',
        vehiclePlate: d.vehicle_plate || '',
      }));
  } catch (err) {
    console.warn('Error fetching online drivers:', (err as any)?.message || err);
    return [];
  }
};
