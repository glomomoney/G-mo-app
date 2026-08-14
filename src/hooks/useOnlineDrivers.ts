import { useState, useEffect } from 'react';
import { getOnlineDrivers, OnlineDriver } from '../services/drivers.service';

// Chauffeurs en ligne (approuvés + position), pollés pour la carte passager.
export function useOnlineDrivers(pollMs = 10000): OnlineDriver[] {
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const list = await getOnlineDrivers();
      if (!cancelled) setOnlineDrivers(list);
    };

    load();
    const timer = setInterval(load, pollMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pollMs]);

  return onlineDrivers;
}
