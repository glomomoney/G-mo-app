import { useState, useEffect } from 'react';
import { subscribeToNotifications, markNotificationAsReadInFirestore } from '../services/notifications.service';
import { AppNotification, UserRole } from '../types';

/**
 * Live Firestore notifications feed, filtered to the current role, plus the
 * push-banner / drawer UI state that surfaces new ones.
 * Le polling ne démarre que si l'utilisateur est connecté (authUid présent).
 */
export function useNotifications(role: UserRole, enabled: boolean) {
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [pushBannerNotif, setPushBannerNotif] = useState<AppNotification | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAppNotifications([]);
      return;
    }

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
  }, [role, enabled]);

  // Marque la notif comme vue, sinon le poll suivant (6s) la considère à
  // nouveau "nouvelle" (lastSeen jamais mis à jour) et refait réapparaître
  // la bannière juste après sa disparition.
  const dismissPushBanner = () => {
    if (pushBannerNotif) {
      localStorage.setItem('wanda_last_seen_notif_id', pushBannerNotif.id);
    }
    setPushBannerNotif(null);
  };

  const openDrawerFromBanner = () => {
    if (pushBannerNotif) {
      localStorage.setItem('wanda_last_seen_notif_id', pushBannerNotif.id);
    }
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
