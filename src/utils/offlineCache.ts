import { HistoryItem } from '../types';

export const USER_DATA_CACHE_NAME = 'wanda-user-data-cache-v1';

export interface WalletCacheData {
  passengerWallet: number;
  driverWallet: number;
  updatedAt: string;
  offlineCached: boolean;
}

export interface HistoryCacheData {
  history: HistoryItem[];
  totalRides: number;
  updatedAt: string;
  offlineCached: boolean;
}

/**
 * Sends a message to the active Service Worker to store wallet balance
 */
export function sendWalletToServiceWorker(passengerWallet: number, driverWallet: number) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_WALLET_BALANCE',
      payload: { passengerWallet, driverWallet }
    });
  }
}

/**
 * Sends a message to the active Service Worker to store ride history
 */
export function sendHistoryToServiceWorker(history: HistoryItem[]) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_RIDE_HISTORY',
      payload: { history }
    });
  }
}

/**
 * Synchronize wallet balances to Cache API and localStorage
 */
export async function syncWalletToOfflineCache(passengerWallet: number, driverWallet: number): Promise<void> {
  // Always update localStorage
  localStorage.setItem('wanda_passenger_wallet', passengerWallet.toString());
  localStorage.setItem('wanda_driver_wallet', driverWallet.toString());

  // Notify Service Worker via Message Channel
  sendWalletToServiceWorker(passengerWallet, driverWallet);

  // Directly update Cache Storage API if supported
  if ('caches' in window) {
    try {
      const cache = await caches.open(USER_DATA_CACHE_NAME);
      const data: WalletCacheData = {
        passengerWallet,
        driverWallet,
        updatedAt: new Date().toISOString(),
        offlineCached: true
      };
      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Wanda-Offline-Source': 'client-offline-cache'
        }
      });
      await cache.put('/api/wallet', response);
    } catch (err) {
      console.warn('Failed to write wallet to Cache Storage API:', err);
    }
  }
}

/**
 * Synchronize ride history to Cache API and localStorage
 */
export async function syncHistoryToOfflineCache(history: HistoryItem[]): Promise<void> {
  // Always update localStorage
  localStorage.setItem('wanda_ride_history', JSON.stringify(history));

  // Notify Service Worker via Message Channel
  sendHistoryToServiceWorker(history);

  // Directly update Cache Storage API if supported
  if ('caches' in window) {
    try {
      const cache = await caches.open(USER_DATA_CACHE_NAME);
      const data: HistoryCacheData = {
        history,
        totalRides: history.length,
        updatedAt: new Date().toISOString(),
        offlineCached: true
      };
      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Wanda-Offline-Source': 'client-offline-cache'
        }
      });
      await cache.put('/api/history', response);
    } catch (err) {
      console.warn('Failed to write history to Cache Storage API:', err);
    }
  }
}

/**
 * Retrieve cached wallet data from Service Worker Cache API or fallback to localStorage
 */
export async function getCachedWalletData(): Promise<WalletCacheData | null> {
  if ('caches' in window) {
    try {
      const response = await caches.match('/api/wallet');
      if (response) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn('Error reading wallet from Cache Storage:', err);
    }
  }

  // Fallback to localStorage
  const savedPassenger = localStorage.getItem('wanda_passenger_wallet');
  const savedDriver = localStorage.getItem('wanda_driver_wallet');

  if (savedPassenger !== null || savedDriver !== null) {
    return {
      passengerWallet: savedPassenger ? parseFloat(savedPassenger) : 15000,
      driverWallet: savedDriver ? parseFloat(savedDriver) : 28500,
      updatedAt: new Date().toISOString(),
      offlineCached: true
    };
  }

  return null;
}

/**
 * Retrieve cached ride history from Service Worker Cache API or fallback to localStorage
 */
export async function getCachedRideHistory(): Promise<HistoryCacheData | null> {
  if ('caches' in window) {
    try {
      const response = await caches.match('/api/history');
      if (response) {
        const json = await response.json();
        return json;
      }
    } catch (err) {
      console.warn('Error reading history from Cache Storage:', err);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('wanda_ride_history');
  if (saved) {
    try {
      const history = JSON.parse(saved);
      return {
        history,
        totalRides: history.length,
        updatedAt: new Date().toISOString(),
        offlineCached: true
      };
    } catch {
      return null;
    }
  }

  return null;
}
