import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { Transaction, PaymentMethod } from '../types';
import { mapWalletTransaction } from '../services/transactions.service';

/**
 * Wallet piloté par le backend Wanda (GET /wallet, GET /wallet/transactions,
 * POST /wallet/withdraw, POST /admin/withdrawals/{id}/approve). Le solde et le
 * grand livre sont la source de vérité serveur ; les mutations locales ne sont
 * plus possibles (un seul wallet backend, utilisé côté passager ET chauffeur).
 */
export function useWallet(uid: string | null) {
  const [passengerWallet, setPassengerWalletState] = useState<number>(0);
  const [driverWallet, setDriverWalletState] = useState<number>(0);
  const [passengerPoints, setPassengerPointsState] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Poll solde + points (les deux écrans lisent le même wallet backend).
  useEffect(() => {
    if (!uid) {
      setPassengerWalletState(0);
      setDriverWalletState(0);
      setPassengerPointsState(0);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const wallet = await apiRequest<{ balance: number; points: number }>('/wallet');
        if (cancelled) return;
        setPassengerWalletState(wallet.balance);
        setDriverWalletState(wallet.balance);
        setPassengerPointsState(wallet.points);
      } catch (err) {
        console.warn('Wallet poll error:', err?.message || err);
      }
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [uid]);

  // Poll du grand livre (topups, courses, retraits).
  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const list = await apiRequest<any[]>('/wallet/transactions');
        if (!cancelled) setTransactions(list.map(mapWalletTransaction));
      } catch (err) {
        console.warn('Transactions poll error:', err?.message || err);
      }
    };

    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [uid]);

  // Rafraîchit le solde en mémoire (utile après topup/retrait/course).
  const refreshWallet = async () => {
    if (!uid) return;
    try {
      const wallet = await apiRequest<{ balance: number; points: number }>('/wallet');
      setPassengerWalletState(wallet.balance);
      setDriverWalletState(wallet.balance);
      setPassengerPointsState(wallet.points);
    } catch (err) {
      console.warn('refreshWallet error:', err?.message || err);
    }
  };

  // No-ops conservés pour compat : le backend est l'autorité (crédit/débit).
  const adjustWalletField = async (): Promise<void> => {};
  const creditWallet = async (): Promise<void> => {};
  const adjustPassengerWallet = async (): Promise<void> => {};
  const adjustDriverWallet = async (): Promise<void> => {};
  const adjustPassengerPoints = async (): Promise<void> => {};
  const addTransaction = async (): Promise<void> => {};

  // Topup : le crédit (+ bonus) a déjà été effectué par le backend au moment
  // de la confirmation ; on rafraîchit le solde et on confirme à l'utilisateur.
  const topUp = async (params: {
    txId: string;
    amount: number;
    method: PaymentMethod;
    phone: string;
    promoActive: boolean;
    promoRate: number;
    slangMode: boolean;
  }) => {
    const { amount, method, promoActive, promoRate, slangMode } = params;
    const bonusRate = promoActive ? (promoRate ?? 0) : 0;
    const bonusAmount = Math.round((amount * bonusRate) / 100);
    const totalCredited = amount + bonusAmount;

    await refreshWallet();

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

  // Retrait chauffeur : enregistré côté backend comme pending (approbation
  // admin ensuite). Le solde est débité par le backend.
  const requestWithdrawal = async (
    amount: number,
    _method: 'momo_mtn' | 'orange_money',
    phoneNumber: string
  ) => {
    await apiRequest('/wallet/withdraw', {
      method: 'POST',
      body: { amount, phone: phoneNumber },
    });
    await refreshWallet();
  };

  // Approbation admin d'un retrait : POST /admin/withdrawals/{tx_id}/approve
  // (le backend crédite le chauffeur et passe la transaction en success).
  const approveWithdrawal = async (tx: Transaction) => {
    if (tx.status !== 'pending' || !tx.id) return;
    try {
      await apiRequest(`/admin/withdrawals/${tx.id}/approve`, { method: 'POST', admin: true });
      await refreshWallet();
    } catch (err) {
      console.warn('approveWithdrawal error:', err?.message || err);
    }
  };

  return {
    passengerWallet,
    driverWallet,
    passengerPoints,
    transactions,
    addTransaction,
    adjustPassengerWallet,
    adjustDriverWallet,
    adjustPassengerPoints,
    topUp,
    requestWithdrawal,
    approveWithdrawal,
    refreshWallet,
    isOnline,
  };
}
