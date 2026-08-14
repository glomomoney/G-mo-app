import { useEffect, useState } from 'react';
import {
  doc, getDoc, onSnapshot, setDoc, runTransaction, addDoc,
  collection, query, where, orderBy, limit
} from 'firebase/firestore';
import { db, adminDb } from '../lib/firebase';
import { Transaction, PaymentMethod } from '../types';
import { saveTransactionToFirestore } from '../services/transactions.service';
import { getCachedWalletData, syncWalletToOfflineCache } from '../utils/offlineCache';

const formatTxDate = () =>
  new Date().toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

interface WalletDoc {
  passengerBalance: number;
  driverBalance: number;
  points: number;
  updatedAt: string;
}

/**
 * Dual passenger/driver wallet balances, points, and the shared transaction
 * ledger — backed by Firestore (`wallets/{uid}` + the `transactions`
 * collection) instead of localStorage, so balances are real, server-side,
 * and synced across devices/sessions for the same signed-in phone number.
 * `uid` comes from useAuth's real Firebase Phone Auth uid; while it's null
 * (not yet signed in / verifying), balances read as 0 and mutations no-op.
 */
export function useWallet(uid: string | null) {
  const [passengerWallet, setPassengerWalletState] = useState<number>(0);
  const [driverWallet, setDriverWalletState] = useState<number>(0);
  const [passengerPoints, setPassengerPointsState] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

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

  // Subscribe to (and lazily seed) this user's wallet doc.
  useEffect(() => {
    if (!uid) {
      setPassengerWalletState(0);
      setDriverWalletState(0);
      setPassengerPointsState(0);
      return;
    }

    const walletRef = doc(db, 'wallets', uid);
    let seeded = false;

    const unsub = onSnapshot(walletRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data() as WalletDoc;
        setPassengerWalletState(data.passengerBalance ?? 0);
        setDriverWalletState(data.driverBalance ?? 0);
        setPassengerPointsState(data.points ?? 0);
      } else if (!seeded) {
        seeded = true;
        // First time this uid gets a wallet doc: migrate any existing
        // localStorage demo balance so current testers don't lose it,
        // otherwise start fresh at 0.
        const cached = await getCachedWalletData();
        await setDoc(walletRef, {
          passengerBalance: cached?.passengerWallet ?? 0,
          driverBalance: cached?.driverWallet ?? 0,
          points: 0,
          updatedAt: new Date().toISOString()
        } satisfies WalletDoc);
      }
    }, (err) => {
      console.warn('Firestore wallet subscription error:', err);
    });

    return () => unsub();
  }, [uid]);

  // Subscribe to this user's transaction ledger. Requires a composite index
  // on transactions (userId ASC, createdAt DESC) — Firestore will log a
  // console link to auto-create it the first time this query runs.
  useEffect(() => {
    if (!uid) {
      setTransactions([]);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (err) => {
      console.warn('Firestore transactions subscription error:', err);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    syncWalletToOfflineCache(passengerWallet, driverWallet);
  }, [passengerWallet, driverWallet]);

  // Atomically adjusts one field of this user's wallet doc by `delta`
  // (positive to credit, negative to debit), clamped so a balance/points
  // total never goes below 0 — mirrors the old local `setX(prev => Math.max(0, prev + delta))` setters.
  const adjustWalletField = async (field: 'passengerBalance' | 'driverBalance' | 'points', delta: number) => {
    if (!uid) return;
    const walletRef = doc(db, 'wallets', uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(walletRef);
      const current = snap.exists() ? ((snap.data() as WalletDoc)[field] ?? 0) : 0;
      tx.set(walletRef, { [field]: Math.max(0, current + delta), updatedAt: new Date().toISOString() }, { merge: true });
    });
  };

  const creditWallet = (field: 'passengerBalance' | 'driverBalance', delta: number) => adjustWalletField(field, delta);
  const adjustPassengerWallet = (delta: number) => adjustWalletField('passengerBalance', delta);
  const adjustDriverWallet = (delta: number) => adjustWalletField('driverBalance', delta);
  const adjustPassengerPoints = (delta: number) => adjustWalletField('points', delta);

  const addTransaction = async (tx: Omit<Transaction, 'userId'>) => {
    if (!uid) return;
    await saveTransactionToFirestore({ ...tx, userId: uid });
  };

  // Passenger wallet top-up. Called AFTER PaymentGateway has already
  // confirmed a real Fapshi mobile-money charge succeeded — this just
  // commits the confirmed amount (+ optional promo bonus) to Firestore.
  const topUp = async (params: {
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

    await creditWallet('passengerBalance', totalCredited);
    await addTransaction({
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

  // Driver requests a withdrawal — registered as pending, admin approves in
  // the Admin Console. No Fapshi call: Fapshi only does collections/charges,
  // not payouts — actually sending the driver their money stays a manual
  // step for the admin outside the app for now.
  const requestWithdrawal = async (amount: number, method: 'momo_mtn' | 'orange_money', phoneNumber: string) => {
    await addTransaction({
      id: `WITHDRAW-${Math.floor(100000 + Math.random() * 900000)}`,
      type: 'withdrawal',
      amount,
      phone: phoneNumber,
      carrier: method,
      status: 'pending',
      date: formatTxDate()
    });
  };

  // Admin approves a pending driver cashout. `tx` is passed in from the
  // admin-scoped transactions feed (see services/transactions.service.ts's
  // subscribeToAllTransactions) rather than this hook's own `transactions`
  // (which is only ever the CURRENT signed-in user's own ledger, not the
  // driver being approved's). Writes go through `adminDb` so
  // firestore.rules' isAdmin() branch authorizes them.
  const approveWithdrawal = async (tx: Transaction) => {
    if (tx.status !== 'pending' || !tx.userId) return;

    const walletRef = doc(adminDb, 'wallets', tx.userId);
    const walletSnap = await getDoc(walletRef);
    const driverBalance = walletSnap.exists() ? ((walletSnap.data() as WalletDoc).driverBalance ?? 0) : 0;

    if (driverBalance < tx.amount) {
      alert("Error: Driver has insufficient funds to clear this withdrawal!");
      return;
    }

    await runTransaction(adminDb, async (dbTx) => {
      const snap = await dbTx.get(walletRef);
      const current = snap.exists() ? ((snap.data() as WalletDoc).driverBalance ?? 0) : 0;
      dbTx.set(walletRef, { driverBalance: current - tx.amount, updatedAt: new Date().toISOString() }, { merge: true });
    });

    // The `transactions` collection is append-only by firestore.rules
    // (allow update, delete: if false) — status flips happen by writing a
    // fresh ledger entry (attributed to the driver, not the approving
    // admin) rather than mutating the original doc.
    await addDoc(collection(adminDb, 'transactions'), {
      id: `${tx.id}-CLEARED`,
      type: 'withdrawal',
      amount: tx.amount,
      phone: tx.phone,
      carrier: tx.carrier,
      status: 'success',
      date: formatTxDate(),
      userId: tx.userId,
      createdAt: new Date().toISOString()
    });
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
    isOnline
  };
}
