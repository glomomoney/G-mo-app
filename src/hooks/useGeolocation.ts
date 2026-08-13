import { useState } from 'react';
import { Location } from '../types';
import { getDistanceKm } from '../data';

type City = 'Yaoundé' | 'Douala';

/**
 * Wraps the browser Geolocation API with the app's high-accuracy -> low-accuracy
 * fallback and reverse-geocoding (Google Maps, then OSM Nominatim, then
 * nearest-city distance) used to resolve the passenger's live standing position.
 *
 * `onLocated` is called every time a position is successfully resolved, so the
 * caller can update its own pickup/city state; `locate`'s own callback is only
 * for one-off follow-up actions (e.g. closing a search modal).
 */
export function useGeolocation(
  slangMode: boolean,
  onLocated: (location: Location, city: City | null) => void
) {
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const locate = (onDone?: (location: Location) => void) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const errMsg = slangMode
        ? "Désolé, ton appareil ne supporte pas la géolocalisation GPS."
        : "Sorry, your device does not support GPS geolocation.";
      setGeolocationError(errMsg);
      alert(errMsg);
      return;
    }

    setIsGeolocating(true);
    setGeolocationError(null);

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    const handleSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      const newLoc: Location = {
        name: slangMode ? "📍 Position GPS Actuelle" : "📍 Current GPS Location",
        lat: latitude,
        lng: longitude
      };

      setIsGeolocating(false);
      console.log("Standing position successfully geolocated to:", latitude, longitude);

      // Resolve city name
      let detectedCity = '';
      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY || (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY || '';
      if (apiKey) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            for (const result of data.results) {
              const locality = result.address_components?.find((comp: any) =>
                comp.types?.includes('locality')
              );
              if (locality) {
                detectedCity = locality.long_name;
                break;
              }
              const adminArea1 = result.address_components?.find((comp: any) =>
                comp.types?.includes('administrative_area_level_1')
              );
              if (adminArea1) {
                detectedCity = adminArea1.long_name;
                break;
              }
            }
          }
        } catch (err) {
          console.warn("Google Maps Geocoding failed:", err);
        }
      }

      if (!detectedCity) {
        try {
          const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'WandaTaxiApplet/1.0'
            }
          });
          const fallbackData = await fallbackRes.json();
          detectedCity = fallbackData.address?.city || fallbackData.address?.town || fallbackData.address?.village || fallbackData.address?.county || '';
        } catch (err) {
          console.warn("OSM Nominatim reverse geocode failed:", err);
        }
      }

      if (!detectedCity) {
        const distToDouala = getDistanceKm(latitude, longitude, 4.05, 9.7);
        const distToYaounde = getDistanceKm(latitude, longitude, 3.86, 11.52);
        detectedCity = distToYaounde < distToDouala ? 'Yaoundé' : 'Douala';
      }

      let cleanCity: City | null = null;
      if (detectedCity) {
        cleanCity = detectedCity.toLowerCase().includes('douala') ? 'Douala' : 'Yaoundé';
      }

      onLocated(newLoc, cleanCity);
      if (onDone) onDone(newLoc);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("High-accuracy standing geolocation failed, attempting robust low-accuracy fallback...", error);

      // Fallback with enableHighAccuracy = false and longer timeout
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        () => {
          setIsGeolocating(false);
          const errMsg = slangMode
            ? "Massa! Impossible d'obtenir ton GPS. S'il te plaît, autorise l'accès à la localisation dans ton navigateur."
            : "Massa! Could not retrieve your current standing position. Please allow location access in your browser settings.";
          setGeolocationError(errMsg);
          alert(errMsg);
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
      );
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
  };

  return { isGeolocating, geolocationError, locate };
}
