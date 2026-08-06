import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { HistoryItem, RideRequest } from '../types';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'passenger' | 'driver';
  avatar?: string;
  walletBalance?: number;
  points?: number;
  createdAt?: string;
}

// User Profile persistence
export const saveUserToFirestore = async (user: UserProfileData) => {
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      ...user,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
  }
};

export const subscribeToUser = (userId: string, onUpdate: (data: any) => void) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data());
    }
  }, (err) => {
    console.warn('Firestore subscribeToUser offline or connection notice:', err?.message || err);
  });
};

// Ride requests persistence & real-time synchronization
export const createRideInFirestore = async (ride: Partial<RideRequest> & { userId?: string }) => {
  try {
    const ridesCol = collection(db, 'rides');
    const docRef = await addDoc(ridesCol, {
      ...ride,
      createdAt: new Date().toISOString(),
      serverTime: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.warn('Error creating ride in Firestore (offline mode active):', err);
    return null;
  }
};

export const updateRideStatusInFirestore = async (rideId: string, updates: Partial<RideRequest>) => {
  try {
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error updating ride status in Firestore:', err);
  }
};

export const subscribeToActiveRides = (onUpdate: (rides: any[]) => void) => {
  const ridesCol = collection(db, 'rides');
  const q = query(ridesCol, orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const rides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    onUpdate(rides);
  }, (err) => {
    console.warn('Firestore subscribeToActiveRides offline or connection notice:', err?.message || err);
  });
};

// History persistence
export const saveHistoryToFirestore = async (item: HistoryItem, userId: string) => {
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

export const subscribeToHistory = (userId: string, onUpdate: (items: HistoryItem[]) => void) => {
  const historyCol = collection(db, 'history');
  const q = query(historyCol, orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as HistoryItem & { userId?: string }))
      .filter(item => !item.userId || item.userId === userId);
    onUpdate(items);
  }, (err) => {
    console.warn('Firestore subscribeToHistory offline or connection notice:', err?.message || err);
  });
};

// Transaction log persistence
export const saveTransactionToFirestore = async (transaction: any) => {
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

// System Settings & Real-time Pricing Persistence
export const saveSettingsToFirestore = async (settings: any) => {
  try {
    const settingsRef = doc(db, 'settings', 'pricing');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
    throw err;
  }
};

export const subscribeToSettings = (onUpdate: (data: any) => void) => {
  const settingsRef = doc(db, 'settings', 'pricing');
  return onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data());
    }
  }, (err) => {
    console.warn('Firestore subscribeToSettings notice:', err?.message || err);
  });
};
