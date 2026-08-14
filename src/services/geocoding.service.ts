import { Location } from '../types';
import { getDistanceKm } from '../data';

/**
 * Forward search: real place lookup via OSM Nominatim (free, no API key),
 * replacing the fabricated placeholder results the app used to invent for
 * any unmatched query. Biased toward Cameroon/the given city by including
 * it in the query string (Nominatim has no strict bounding-box param here).
 */
export async function searchPlaces(query: string, city: 'Yaoundé' | 'Douala'): Promise<Location[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(`${trimmed}, ${city}, Cameroon`)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .map((r: any) => ({
        name: r.display_name as string,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon)
      }))
      .filter((loc: Location) => !Number.isNaN(loc.lat) && !Number.isNaN(loc.lng));
  } catch (err) {
    console.warn('Nominatim place search failed:', err);
    return [];
  }
}

/**
 * Reverse geocode: Google Maps Geocoding (if a key is configured) -> OSM
 * Nominatim -> nearest-known-city fallback. Extracted from useGeolocation.ts
 * (which used this chain only for the "current GPS position" button) so
 * map-tap pickup/destination selection can reuse the exact same logic.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';
  if (apiKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        return data.results[0].formatted_address as string;
      }
    } catch (err) {
      console.warn('Google Maps reverse geocode failed:', err);
    }
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'WandaTaxiApplet/1.0'
      }
    });
    const data = await res.json();
    if (data.display_name) return data.display_name as string;
  } catch (err) {
    console.warn('OSM Nominatim reverse geocode failed:', err);
  }

  const distToDouala = getDistanceKm(lat, lng, 4.05, 9.7);
  const distToYaounde = getDistanceKm(lat, lng, 3.86, 11.52);
  const nearestCity = distToYaounde < distToDouala ? 'Yaoundé' : 'Douala';
  return `Point personnalisé (près de ${nearestCity})`;
}

/**
 * Just the detected-city part of reverseGeocode's chain, used by
 * useGeolocation.ts to resolve which of the app's two cities the user is
 * currently standing in.
 */
export async function reverseGeocodeCity(lat: number, lng: number): Promise<'Yaoundé' | 'Douala' | null> {
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';
  let detectedCity = '';

  if (apiKey) {
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        for (const result of data.results) {
          const locality = result.address_components?.find((comp: any) => comp.types?.includes('locality'));
          if (locality) { detectedCity = locality.long_name; break; }
          const adminArea1 = result.address_components?.find((comp: any) => comp.types?.includes('administrative_area_level_1'));
          if (adminArea1) { detectedCity = adminArea1.long_name; break; }
        }
      }
    } catch (err) {
      console.warn('Google Maps Geocoding failed:', err);
    }
  }

  if (!detectedCity) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'WandaTaxiApplet/1.0' }
      });
      const data = await res.json();
      detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
    } catch (err) {
      console.warn('OSM Nominatim reverse geocode failed:', err);
    }
  }

  if (!detectedCity) {
    const distToDouala = getDistanceKm(lat, lng, 4.05, 9.7);
    const distToYaounde = getDistanceKm(lat, lng, 3.86, 11.52);
    return distToYaounde < distToDouala ? 'Yaoundé' : 'Douala';
  }

  return detectedCity.toLowerCase().includes('douala') ? 'Douala' : 'Yaoundé';
}
