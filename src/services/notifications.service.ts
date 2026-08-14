import { apiRequest } from '../lib/api';
import { AppNotification } from '../types';

type Unsubscribe = () => void;

interface NotificationBackend {
  id: string;
  target: string;
  title: string;
  message: string;
  type: string;
  language: string;
  route_data: Record<string, any> | null;
  read_by: string[] | null;
  created_at: string;
}

function mapNotification(n: NotificationBackend): AppNotification {
  return {
    id: n.id,
    target: (n.target as AppNotification['target']) || 'all',
    title: n.title,
    message: n.message,
    type: (n.type as AppNotification['type']) || 'info',
    timestamp: n.created_at,
    language: (n.language as 'fr' | 'en') || 'fr',
    readBy: n.read_by || [],
    routeData: n.route_data as AppNotification['routeData'],
  };
}

// Diffusion admin : POST /admin/notifications.
export const sendNotificationToFirestore = async (
  notification: Omit<AppNotification, 'id'>
): Promise<string> => {
  const data = await apiRequest<NotificationBackend>('/admin/notifications', {
    method: 'POST',
    admin: true,
    body: {
      target: notification.target || 'all',
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      language: notification.language || 'fr',
      route_data: notification.routeData || undefined,
    },
  });
  return data.id;
};

// Notifications du user connecté (GET /notifications), pollées toutes les 6s.
export const subscribeToNotifications = (
  onUpdate: (notifications: AppNotification[]) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const list = await apiRequest<NotificationBackend[]>('/notifications');
      if (!cancelled) onUpdate(list.map(mapNotification));
    } catch (err) {
      console.warn('subscribeToNotifications poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 6000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};

export const markNotificationAsReadInFirestore = async (
  notificationId: string,
  _userId: string
): Promise<void> => {
  try {
    await apiRequest(`/notifications/${notificationId}/read`, { method: 'POST' });
  } catch (err) {
    console.warn('Error marking notification as read:', err?.message || err);
  }
};
