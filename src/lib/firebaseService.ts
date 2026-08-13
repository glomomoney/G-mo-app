// Backward-compatible barrel. The actual implementations now live in
// src/services/*.service.ts, split by domain. Kept so existing imports
// from './lib/firebaseService' (or '../lib/firebaseService') keep working
// without touching every consumer.
export * from '../services/users.service';
export * from '../services/rides.service';
export * from '../services/history.service';
export * from '../services/transactions.service';
export * from '../services/settings.service';
export * from '../services/notifications.service';

export type { UserProfileData } from '../types';
