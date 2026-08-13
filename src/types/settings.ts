export interface SystemSettings {
  commissionRate: number;
  surgeMultiplier: number;
  minimumWithdrawal: number;
  topupPromoActive: boolean;
  topupPromoRate: number;
  classRates: Record<string, { baseFare: number; perKm: number }>;
}

export interface NotificationScheduleConfig {
  enabled: boolean;
  timesPerDay: number; // e.g. 3
  timesList: string[]; // e.g. ["08:00", "12:30", "18:00"]
  language: 'fr' | 'en';
  passengerTemplates: {
    title: string;
    message: string;
    includeRouteFare?: boolean;
    routeFrom?: string;
    routeTo?: string;
  }[];
  driverTemplates: {
    title: string;
    message: string;
  }[];
}
