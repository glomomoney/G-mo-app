import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { subscribeToSettings } from '../services/settings.service';
import { SystemSettings } from '../types';

const DEFAULT_SETTINGS: SystemSettings = {
  commissionRate: 15, // 15% standard commission
  surgeMultiplier: 1.0, // multiplier based on weather/traffic
  minimumWithdrawal: 2000, // minimum amount driver can withdraw
  topupPromoActive: true, // Wallet top-up promo is active by default
  topupPromoRate: 20, // 20% bonus increase when uploading wallet balance as requested
  classRates: {
    okada: { baseFare: 250, perKm: 80 },
    keke: { baseFare: 300, perKm: 100 },
    ecoride: { baseFare: 1500, perKm: 250 },
    comfort: { baseFare: 3000, perKm: 400 },
  }
};

function loadInitialSettings(): SystemSettings {
  const saved = localStorage.getItem('wanda_system_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        classRates: { ...DEFAULT_SETTINGS.classRates, ...(parsed.classRates || {}) }
      };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

/**
 * Pricing/commission system settings: local default -> localStorage cache ->
 * live Firestore subscription (settings/pricing). Admin writes go through
 * AdminDashboard's own saveSettingsToFirestore call; this hook only tracks
 * the current value and keeps it in sync.
 */
export function useSystemSettings(): [SystemSettings, Dispatch<SetStateAction<SystemSettings>>] {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(loadInitialSettings);

  useEffect(() => {
    localStorage.setItem('wanda_system_settings', JSON.stringify(systemSettings));
  }, [systemSettings]);

  useEffect(() => {
    const unsubscribe = subscribeToSettings((firestoreData) => {
      if (firestoreData) {
        setSystemSettings(prev => ({
          ...prev,
          ...firestoreData,
          classRates: {
            ...prev.classRates,
            ...(firestoreData.classRates || {})
          }
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  return [systemSettings, setSystemSettings];
}
