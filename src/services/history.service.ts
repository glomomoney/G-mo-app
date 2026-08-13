import { collection, addDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HistoryItem } from '../types';

export const saveHistoryToFirestore = async (item: HistoryItem, userId: string): Promise<void> => {
  try {
    const historyCol = collection(db, 'history');
    await addDoc(historyCol, {
      ...item,
      userId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error saving history item to Firestore:', err);
  }
};

export const subscribeToHistory = (
  userId: string,
  onUpdate: (items: HistoryItem[]) => void
): Unsubscribe => {
  const historyCol = collection(db, 'history');
  const q = query(historyCol, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as HistoryItem & { userId?: string }))
      .filter(item => !item.userId || item.userId === userId);
    onUpdate(items);
  }, (err) => {
    console.warn('Firestore subscribeToHistory offline or connection notice:', err?.message || err);
  });
};
