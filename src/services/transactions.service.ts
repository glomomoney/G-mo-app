import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
