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
