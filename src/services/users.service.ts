import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, Unsubscribe } from 'firebase/firestore';
import { db, adminDb } from '../lib/firebase';
import { UserProfileData } from '../types';

export const saveUserToFirestore = async (user: Partial<UserProfileData> & { id: string }): Promise<void> => {
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

export const subscribeToUser = (
  userId: string,
  onUpdate: (data: Partial<UserProfileData>) => void
): Unsubscribe => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as Partial<UserProfileData>);
    }
  }, (err) => {
    console.warn('Firestore subscribeToUser offline or connection notice:', err?.message || err);
  });
};

// Real-time admin driver roster: every `users` doc with role === 'driver'.
export const subscribeToDrivers = (
  onUpdate: (drivers: UserProfileData[]) => void
): Unsubscribe => {
  const usersCol = collection(db, 'users');
  const q = query(usersCol, where('role', '==', 'driver'));
  return onSnapshot(q, (snapshot) => {
    const drivers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfileData));
    onUpdate(drivers);
  }, (err) => {
    console.warn('Firestore subscribeToDrivers offline or connection notice:', err?.message || err);
  });
};

// Admin approve/reject: writes only the KYC/approval fields on a driver's
// doc. Uses `adminDb` (secondary admin Firebase App) so the write is
// authenticated as the real signed-in admin — required by firestore.rules'
// non-owner update allowance.
export const updateDriverStatusInFirestore = async (
  driverId: string,
  updates: Partial<Pick<UserProfileData, 'approvalStatus' | 'kycStatus' | 'rejectionReason'>>
): Promise<void> => {
  try {
    const userRef = doc(adminDb, 'users', driverId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error updating driver status in Firestore:', err);
  }
};
