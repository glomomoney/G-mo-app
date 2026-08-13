import { collection, doc, addDoc, updateDoc, getDoc, onSnapshot, query, orderBy, limit, Unsubscribe } from 'firebase/firestore';
import { db, adminDb } from '../lib/firebase';
import { AppNotification } from '../types';

// Broadcasting/composing a notification is an admin-only action — uses
// `adminDb` so the write is authenticated as the real signed-in admin
// (firestore.rules requires an `admins/{uid}` doc to `create` here).
export const sendNotificationToFirestore = async (
  notification: Omit<AppNotification, 'id'>
): Promise<string> => {
  try {
    const notifCol = collection(adminDb, 'notifications');
    const docRef = await addDoc(notifCol, {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
      readBy: notification.readBy || []
    });
    return docRef.id;
  } catch (err) {
    console.error('Error sending notification to Firestore:', err);
    throw err;
  }
};

export const subscribeToNotifications = (
  onUpdate: (notifications: AppNotification[]) => void
): Unsubscribe => {
  const notifCol = collection(db, 'notifications');
  const q = query(notifCol, orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
    onUpdate(notifications);
  }, (err) => {
    console.warn('Firestore subscribeToNotifications notice:', err?.message || err);
  });
};

export const markNotificationAsReadInFirestore = async (
  notificationId: string,
  userId: string
): Promise<void> => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    const snap = await getDoc(notifRef);
    if (snap.exists()) {
      const data = snap.data() as AppNotification;
      const readBy = data.readBy || [];
      if (!readBy.includes(userId)) {
        await updateDoc(notifRef, {
          readBy: [...readBy, userId]
        });
      }
    }
  } catch (err) {
    console.warn('Error marking notification as read in Firestore:', err);
  }
};
