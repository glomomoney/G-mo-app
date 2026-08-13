import { collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, limit, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RideRequest } from '../types';

export const createRideInFirestore = async (
  ride: Partial<RideRequest> & { userId?: string }
): Promise<string | null> => {
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

export const updateRideStatusInFirestore = async (
  rideId: string,
  updates: Partial<RideRequest>
): Promise<void> => {
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

export const subscribeToActiveRides = (
  onUpdate: (rides: (RideRequest & { id: string })[]) => void
): Unsubscribe => {
  const ridesCol = collection(db, 'rides');
  const q = query(ridesCol, orderBy('createdAt', 'desc'), limit(25));
  return onSnapshot(q, (snapshot) => {
    const rides = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RideRequest & { id: string }));
    onUpdate(rides);
  }, (err) => {
    console.warn('Firestore subscribeToActiveRides offline or connection notice:', err?.message || err);
  });
};
