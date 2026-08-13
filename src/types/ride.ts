import { PaymentMethod } from './wallet';

export type RideStatus =
  | 'idle'
  | 'searching'
  | 'driver_found'
  | 'arriving'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export interface RideClass {
  id: string;
  name: string;
  icon: string;
  description: string;
  baseFare: number; // in XAF (FCFA)
  perKm: number;
  eta: number; // in minutes
}

export interface RideRequest {
  id: string;
  passengerId?: string;
  driverId?: string;
  passengerName: string;
  passengerPhone: string;
  pickup: Location;
  destination: Location;
  fare: number;
  paymentMethod: PaymentMethod;
  rideClassId: string;
  status: RideStatus;
  createdAt?: string;
}

export interface Message {
  sender: 'driver' | 'passenger';
  text: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  pickupName: string;
  destName: string;
  fare: number;
  tipAmount?: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'cancelled';
  vehicleClass: string;
  driverName: string;
  pickupLat?: number;
  pickupLng?: number;
  destLat?: number;
  destLng?: number;
  pointsEarned?: number;
  pointsRedeemed?: number;
  userId?: string;
}

export interface RecentBooking {
  id: string;
  zoneName: string;
  rideClass: string;
  timeAgo: string;
  status: 'completed' | 'active' | 'cancelled';
  fare: number;
  city: 'Yaoundé' | 'Douala';
}
