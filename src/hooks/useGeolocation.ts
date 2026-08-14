import { useState } from 'react';
import { Location } from '../types';
import { reverseGeocodeCity } from '../services/geocoding.service';

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

      const cleanCity = await reverseGeocodeCity(latitude, longitude);

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
