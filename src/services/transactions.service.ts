import { collection, addDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db, adminDb } from '../lib/firebase';
import { Transaction } from '../types';

export const saveTransactionToFirestore = async (transaction: Transaction): Promise<void> => {
  try {
    const txCol = collection(db, 'transactions');
    await addDoc(txCol, {
      ...transaction,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error saving transaction to Firestore:', err);
  }
};

// Admin-only: the full cross-user transaction ledger (needed for the
// pending-withdrawals queue), authenticated via the secondary adminDb so
// firestore.rules' isAdmin() check resolves against the admin's own uid.
export const subscribeToAllTransactions = (
  onUpdate: (items: Transaction[]) => void
): Unsubscribe => {
  const q = query(collection(adminDb, 'transactions'), orderBy('createdAt', 'desc'), limit(200));
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
  }, (err) => {
    console.warn('Firestore subscribeToAllTransactions offline or connection notice:', err?.message || err);
  });
};
