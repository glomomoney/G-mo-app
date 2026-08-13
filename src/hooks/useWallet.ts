import { useState, useEffect } from 'react';
import { Transaction, PaymentMethod } from '../types';
import {
  syncWalletToOfflineCache,
  getCachedWalletData
} from '../utils/offlineCache';

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-102931',
    type: 'topup',
    amount: 5000,
    phone: '677123456',
    carrier: 'momo_mtn',
    status: 'success',
    date: '2026-07-11 10:24'
  },
  {
    id: 'TX-102932',
    type: 'topup',
    amount: 10000,
    phone: '699345678',
    carrier: 'orange_money',
    status: 'success',
    date: '2026-07-12 04:12'
  }
];

function loadInitialTransactions(): Transaction[] {
  const saved = localStorage.getItem('wanda_transactions');
  return saved ? JSON.parse(saved) : SEED_TRANSACTIONS;
}

function loadInitialPassengerWallet(): number {
  const saved = localStorage.getItem('wanda_passenger_wallet');
  if (saved) {
    const parsed = parseInt(saved);
    if (!isNaN(parsed)) return parsed < 0 ? Math.abs(parsed) : parsed;
  }
  return 12000; // Credited with 12,000 XAF for testing
}

function loadInitialDriverWallet(): number {
  const saved = localStorage.getItem('wanda_driver_wallet');
  if (saved) {
    const parsed = parseInt(saved);
    if (!isNaN(parsed)) return parsed < 0 ? Math.abs(parsed) : parsed;
  }
  return 18500; // Credited with 18,500 XAF for testing
}

function loadInitialPassengerPoints(): number {
  const saved = localStorage.getItem('wanda_passenger_points');
  if (saved) {
    const parsed = parseInt(saved);
    if (!isNaN(parsed)) return parsed;
  }
  return 350; // Credited with 350 Wanda Points initially for testing
}

const formatTxDate = () =>
  new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Dual passenger/driver wallet balances, points, and the shared transaction
 * ledger. Persists to localStorage + the offline Cache API; ride-completion
 * payout orchestration (which also touches history) is composed in App.tsx
 * using the primitives exposed here.
 */
export function useWallet() {
  const [passengerWallet, setPassengerWallet] = useState<number>(loadInitialPassengerWallet);
  const [driverWallet, setDriverWallet] = useState<number>(loadInitialDriverWallet);
  const [passengerPoints, setPassengerPoints] = useState<number>(loadInitialPassengerPoints);
  const [transactions, setTransactions] = useState<Transaction[]>(loadInitialTransactions);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    getCachedWalletData().then(cachedWallet => {
      if (cachedWallet && !localStorage.getItem('wanda_passenger_wallet')) {
        setPassengerWallet(cachedWallet.passengerWallet);
        setDriverWallet(cachedWallet.driverWallet);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    syncWalletToOfflineCache(passengerWallet, driverWallet);
  }, [passengerWallet, driverWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_passenger_wallet', passengerWallet.toString());
  }, [passengerWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_passenger_points', passengerPoints.toString());
  }, [passengerPoints]);

  useEffect(() => {
    localStorage.setItem('wanda_driver_wallet', driverWallet.toString());
  }, [driverWallet]);

  useEffect(() => {
    localStorage.setItem('wanda_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
  };

  // Passenger wallet top-up (with optional promo bonus), returns the total credited.
  const topUp = (params: {
    txId: string;
    amount: number;
    method: PaymentMethod;
    phone: string;
    promoActive: boolean;
    promoRate: number;
    slangMode: boolean;
  }) => {
    const { txId, amount, method, phone, promoActive, promoRate, slangMode } = params;
    const bonusRate = promoActive ? (promoRate ?? 0) : 0;
    const bonusAmount = Math.round(amount * bonusRate / 100);
    const totalCredited = amount + bonusAmount;

    setPassengerWallet(prev => prev + totalCredited);

    addTransaction({
      id: txId,
      type: 'topup',
      amount,
      bonusAmount,
      phone,
      carrier: method,
      status: 'success',
      date: formatTxDate()
    });

    if (bonusAmount > 0) {
      alert(slangMode
        ? `Félicitations! Votre recharge de ${amount.toLocaleString('fr-FR')} FCFA via ${method === 'momo_mtn' ? 'MTN MoMo' : 'Orange Money'} a réussi. Bonus de +${bonusAmount.toLocaleString('fr-FR')} FCFA crédité (Total: ${totalCredited.toLocaleString('fr-FR')} FCFA) !`
        : `Success! Added ${amount.toLocaleString('fr-FR')} FCFA. A promo bonus of +${bonusAmount.toLocaleString('fr-FR')} FCFA was credited (Total: ${totalCredited.toLocaleString('fr-FR')} FCFA)!`
      );
    } else {
      alert(slangMode
        ? `Félicitations! Votre recharge de ${amount.toLocaleString('fr-FR')} FCFA via ${method === 'momo_mtn' ? 'MTN MoMo' : 'Orange Money'} a réussi.`
        : `Success! Added ${amount.toLocaleString('fr-FR')} FCFA to your wallet balance.`
      );
    }

    return totalCredited;
  };

  // Driver requests a withdrawal — registered as pending, admin approves in the Admin Console.
  const requestWithdrawal = (amount: number, method: 'momo_mtn' | 'orange_money', phoneNumber: string) => {
    addTransaction({
      id: `WITHDRAW-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'withdrawal',
      amount,
      phone: phoneNumber,
      carrier: method,
      status: 'pending',
      date: formatTxDate()
    });
  };

  // Admin approves a pending driver cashout
  const approveWithdrawal = (id: string) => {
    const txIndex = transactions.findIndex(t => t.id === id);
    if (txIndex === -1) return;

    const tx = transactions[txIndex];
    if (tx.status !== 'pending') return;

    if (driverWallet < tx.amount) {
      alert("Error: Driver has insufficient funds to clear this withdrawal!");
      return;
    }

    setDriverWallet(prev => prev - tx.amount);

    const updated = [...transactions];
    updated[txIndex] = { ...tx, status: 'success' };
    setTransactions(updated);
  };

  return {
    passengerWallet,
    setPassengerWallet,
    driverWallet,
    setDriverWallet,
    passengerPoints,
    setPassengerPoints,
    transactions,
    setTransactions,
    addTransaction,
    topUp,
    requestWithdrawal,
    approveWithdrawal,
    isOnline
  };
}
