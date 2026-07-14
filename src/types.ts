export type UserRole = 'passenger' | 'driver';

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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  rating: number;
  vehicleType: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor?: string;
  lat: number;
  lng: number;
  status: 'idle' | 'heading_to_pickup' | 'arrived_pickup' | 'driving_to_destination';
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

export type PaymentMethod = 'momo_mtn' | 'orange_money' | 'cash' | 'wallet';

export interface RideRequest {
  id: string;
  passengerName: string;
  passengerPhone: string;
  pickup: Location;
  destination: Location;
  fare: number;
  paymentMethod: PaymentMethod;
  rideClassId: string;
  status: RideStatus;
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
}
