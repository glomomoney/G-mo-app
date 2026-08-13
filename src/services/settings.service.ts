import { doc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, adminDb } from '../lib/firebase';
import { SystemSettings, NotificationScheduleConfig } from '../types';

// System/pricing settings — stored at settings/pricing. Admin-only write,
// uses `adminDb` so it's authenticated as the real signed-in admin.
export const saveSettingsToFirestore = async (settings: SystemSettings): Promise<boolean> => {
  try {
    const settingsRef = doc(adminDb, 'settings', 'pricing');
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

export const subscribeToSettings = (
  onUpdate: (data: Partial<SystemSettings>) => void
): Unsubscribe => {
  const settingsRef = doc(db, 'settings', 'pricing');
  return onSnapshot(settingsRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as Partial<SystemSettings>);
    }
  }, (err) => {
    console.warn('Firestore subscribeToSettings notice:', err?.message || err);
  });
};

// Notification schedule config — stored at settings/notification_schedule.
// Admin-only write, uses `adminDb` for the same reason as above.
export const saveNotificationScheduleToFirestore = async (
  schedule: NotificationScheduleConfig
): Promise<boolean> => {
  try {
    const scheduleRef = doc(adminDb, 'settings', 'notification_schedule');
    await setDoc(scheduleRef, {
      ...schedule,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving notification schedule to Firestore:', err);
    throw err;
  }
};

export const subscribeToNotificationSchedule = (
  onUpdate: (data: Partial<NotificationScheduleConfig>) => void
): Unsubscribe => {
  const scheduleRef = doc(db, 'settings', 'notification_schedule');
  return onSnapshot(scheduleRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate(docSnap.data() as Partial<NotificationScheduleConfig>);
    }
  }, (err) => {
    console.warn('Firestore subscribeToNotificationSchedule notice:', err?.message || err);
  });
};
