import { Location, RideClass } from './types';

export const LAGOS_LOCATIONS: Location[] = [
  { name: 'Douala Grand Mall, Aéroport', lat: 4.0152, lng: 9.7360 },
  { name: 'Douala International Airport (DLA)', lat: 4.0053, lng: 9.7194 },
  { name: 'Akwa Palace Hotel, Boulevard de la Liberté', lat: 4.0485, lng: 9.6974 },
  { name: 'Bonanjo Administrative District', lat: 4.0435, lng: 9.6895 },
  { name: 'Deido Roundabout (Rond-point Deido)', lat: 4.0620, lng: 9.7090 },
  { name: 'Ndokoti Junction (Carrefour Ndokoti)', lat: 4.0415, lng: 9.7420 },
  { name: 'Bonamoussadi Market (Marché)', lat: 4.0825, lng: 9.7405 },
  { name: 'Japoma Omnisports Stadium', lat: 4.0150, lng: 9.8250 },
  { name: 'Kribi Deep Seaport Highway Junction', lat: 3.9910, lng: 9.7550 },
  { name: 'Logbessou University Campus', lat: 4.0780, lng: 9.7710 },
  { name: 'Carrefour Pleyel (Douala Nord)', lat: 4.0950, lng: 9.7200 },
  { name: 'Carrefour Montesson (Douala Ouest)', lat: 4.0310, lng: 9.6600 },
  { name: 'Total Akwa Station', lat: 4.0510, lng: 9.6990 },
  { name: 'Total Ndokoti Station', lat: 4.0425, lng: 9.7450 },
  { name: 'Carrefour Bonamoussadi', lat: 4.0840, lng: 9.7420 }
];

export const YAOUNDE_LOCATIONS: Location[] = [
  { name: 'Bastos Administrative & Embassy District', lat: 3.8910, lng: 11.5130 },
  { name: 'Yaoundé Nsimalen International Airport (NSI)', lat: 3.7225, lng: 11.5532 },
  { name: 'Yaoundé Central Market (Marché Central)', lat: 3.8655, lng: 11.5190 },
  { name: 'Boulevard du 20 Mai (Place de l\'An2000)', lat: 3.8612, lng: 11.5175 },
  { name: 'Poste Centrale Yaoundé (Rond-point)', lat: 3.8640, lng: 11.5205 },
  { name: 'Ngoa-Ekelle University Campus', lat: 3.8490, lng: 11.5030 },
  { name: 'Mvan Bus Terminal (Gare routière)', lat: 3.8290, lng: 11.5180 },
  { name: 'Omnisports Stadium (Stade Ahmadou Ahidjo)', lat: 3.8855, lng: 11.5395 },
  { name: 'Santa Lucia Supermarket (Melen)', lat: 3.8560, lng: 11.4920 },
  { name: 'Mokolo Market (Marché Mokolo)', lat: 3.8710, lng: 11.4980 },
  { name: 'Carrefour Bastos', lat: 3.8935, lng: 11.5150 },
  { name: 'Total Bastos Station', lat: 3.8950, lng: 11.5165 },
  { name: 'Carrefour Mendong', lat: 3.8320, lng: 11.4880 },
  { name: 'Total Mendong Station', lat: 3.8305, lng: 11.4895 },
  { name: 'Carrefour Pleyel (Centre)', lat: 3.8750, lng: 11.5250 },
  { name: 'Carrefour Montesson (Mvan Link)', lat: 3.8210, lng: 11.5110 },
  { name: 'Total Melen Station', lat: 3.8580, lng: 11.4940 },
  { name: 'Carrefour Obili', lat: 3.8515, lng: 11.4860 },
  { name: 'Carrefour Melen', lat: 3.8595, lng: 11.4915 }
];

export const RIDE_CLASSES: RideClass[] = [
  {
    id: 'okada',
    name: 'Bike',
    icon: 'Bike',
    description: 'Avoid Douala traffic jams on a bike',
    baseFare: 250,
    perKm: 80,
    eta: 2
  },
  {
    id: 'keke',
    name: 'Yellow Taxi',
    icon: 'Tricycle',
    description: 'Shared city taxi experience',
    baseFare: 300,
    perKm: 100,
    eta: 4
  },
  {
    id: 'ecoride',
    name: 'EcoRide',
    icon: 'Car',
    description: 'Private air-conditioned ride',
    baseFare: 1500,
    perKm: 250,
    eta: 5
  },
  {
    id: 'comfort',
    name: 'VIP Ride',
    icon: 'Suv',
    description: 'Premium ride with top-notch comfort',
    baseFare: 3000,
    perKm: 400,
    eta: 6
  }
];

export const CHAT_PIDGIN_RESPONSES = [
  "Mon frère, I dey come, traffic tight for Ndokoti junction. No vex, I dey on my way.",
  "I don reach for gate. I dey wait you.",
  "On s'en sort, chef! Please confirm your door or building number so I can pull up directly.",
  "The AC is freezing, don't worry! I'm parked right outside.",
  "Massa, hold on a bit. High hold-up at Carrefour Deido, but I am breaking out now."
];

// Calculate distance in km between two lat/lng coordinates (Haversine formula)
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(1));
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
