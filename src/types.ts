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
  passengerId?: string;
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
  pointsEarned?: number;
  pointsRedeemed?: number;
}

export interface AppNotification {
  id: string;
  target: 'all' | 'passenger' | 'driver';
  title: string;
  message: string;
  type: 'promo' | 'info' | 'alert' | 'route_fare';
  timestamp: string;
  language?: 'fr' | 'en';
  readBy?: string[];
  routeData?: {
    fromName: string;
    toName: string;
    distanceKm: number;
    estimatedFare: number;
    vehicleClass: string;
  };
}

export interface NotificationScheduleConfig {
  enabled: boolean;
  timesPerDay: number; // e.g. 3
  timesList: string[]; // e.g. ["08:00", "12:30", "18:00"]
  language: 'fr' | 'en';
  passengerTemplates: {
    title: string;
    message: string;
    includeRouteFare?: boolean;
    routeFrom?: string;
    routeTo?: string;
  }[];
  driverTemplates: {
    title: string;
    message: string;
  }[];
}

export interface UserProfile {
  name: string;
  phone: string;
  role: 'passenger' | 'driver';
  slangMode: boolean;
}

export interface DriverRideRequest {
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
}

export interface SystemSettings {
  commissionRate: number;
  surgeMultiplier: number;
  minimumWithdrawal: number;
  topupPromoActive: boolean;
  topupPromoRate: number;
  classRates: Record<string, { baseFare: number; perKm: number }>;
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

