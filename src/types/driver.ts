import { PaymentMethod } from './wallet';

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

// A ride request as seen from the driver's side of the app.
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
