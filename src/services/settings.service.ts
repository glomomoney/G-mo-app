import { apiRequest } from '../lib/api';
import { SystemSettings, NotificationScheduleConfig } from '../types';

type Unsubscribe = () => void;

interface SettingsBackend {
  commission_rate: number;
  surge_multiplier: number;
  minimum_withdrawal: number;
  topup_promo_active: boolean;
  topup_promo_rate: number;
  class_rates: Record<string, { baseFare: number; perKm: number }> | null;
}

function toFrontSettings(s: SettingsBackend): Partial<SystemSettings> {
  return {
    commissionRate: s.commission_rate,
    surgeMultiplier: s.surge_multiplier,
    minimumWithdrawal: s.minimum_withdrawal,
    topupPromoActive: s.topup_promo_active,
    topupPromoRate: s.topup_promo_rate,
    classRates: s.class_rates || undefined,
  };
}

function toBackSettings(s: SystemSettings): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    commission_rate: s.commissionRate,
    surge_multiplier: s.surgeMultiplier,
    minimum_withdrawal: s.minimumWithdrawal,
    topup_promo_active: s.topupPromoActive,
    topup_promo_rate: s.topupPromoRate,
  };
  if (s.classRates) payload.class_rates = s.classRates;
  return payload;
}

export const saveSettingsToFirestore = async (settings: SystemSettings): Promise<boolean> => {
  try {
    await apiRequest('/admin/settings', { method: 'PATCH', admin: true, body: toBackSettings(settings) });
    return true;
  } catch (err) {
    console.error('Error saving settings:', err?.message || err);
    throw err;
  }
};

// Réglages publics (tarifs/commission) — GET /settings, pollé toutes les 8s.
export const subscribeToSettings = (
  onUpdate: (data: Partial<SystemSettings>) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const data = await apiRequest<SettingsBackend>('/settings');
      if (!cancelled) onUpdate(toFrontSettings(data));
    } catch (err) {
      console.warn('subscribeToSettings poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 8000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};

interface ScheduleBackend {
  enabled: boolean;
  times_per_day: number;
  times_list: string[] | null;
  language: string;
  templates: Record<string, any> | null;
}

function toFrontSchedule(s: ScheduleBackend): Partial<NotificationScheduleConfig> {
  return {
    enabled: s.enabled,
    timesPerDay: s.times_per_day,
    timesList: s.times_list || [],
    language: (s.language as 'fr' | 'en') || 'fr',
    passengerTemplates: s.templates?.passengerTemplates || [],
    driverTemplates: s.templates?.driverTemplates || [],
  };
}

function toBackSchedule(s: NotificationScheduleConfig): Record<string, unknown> {
  return {
    enabled: s.enabled,
    times_per_day: s.timesPerDay,
    times_list: s.timesList,
    language: s.language,
    templates: {
      passengerTemplates: s.passengerTemplates,
      driverTemplates: s.driverTemplates,
    },
  };
}

export const saveNotificationScheduleToFirestore = async (
  schedule: NotificationScheduleConfig
): Promise<boolean> => {
  try {
    await apiRequest('/admin/notification-schedule', {
      method: 'PATCH',
      admin: true,
      body: toBackSchedule(schedule),
    });
    return true;
  } catch (err) {
    console.error('Error saving notification schedule:', err?.message || err);
    throw err;
  }
};

export const subscribeToNotificationSchedule = (
  onUpdate: (data: Partial<NotificationScheduleConfig>) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const data = await apiRequest<ScheduleBackend>('/admin/notification-schedule', {
        admin: true,
      });
      if (!cancelled) onUpdate(toFrontSchedule(data));
    } catch (err) {
      console.warn('subscribeToNotificationSchedule poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 10000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};
