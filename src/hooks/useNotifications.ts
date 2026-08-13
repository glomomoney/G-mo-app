import { useState, useEffect } from 'react';
import { subscribeToNotifications, markNotificationAsReadInFirestore } from '../services/notifications.service';
import { AppNotification, UserRole } from '../types';

/**
 * Live Firestore notifications feed, filtered to the current role, plus the
 * push-banner / drawer UI state that surfaces new ones.
 */
export function useNotifications(role: UserRole) {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [pushBannerNotif, setPushBannerNotif] = useState<AppNotification | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((rawNotifs) => {
      const filtered = rawNotifs.filter(n => n.target === 'all' || n.target === role);
      setAppNotifications(filtered);

      if (filtered.length > 0) {
        const newest = filtered[0];
        const lastSeen = localStorage.getItem('wanda_last_seen_notif_id');
        if (lastSeen !== newest.id) {
          setPushBannerNotif(newest);
        }
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [role]);

  const dismissPushBanner = () => setPushBannerNotif(null);

  const openDrawerFromBanner = () => {
    setPushBannerNotif(null);
    setIsNotificationDrawerOpen(true);
  };

  const markAsRead = (notificationId: string, userId: string) =>
    markNotificationAsReadInFirestore(notificationId, userId);

  return {
    appNotifications,
    isNotificationDrawerOpen,
    setIsNotificationDrawerOpen,
    pushBannerNotif,
    dismissPushBanner,
    openDrawerFromBanner,
    markAsRead
  };
}
