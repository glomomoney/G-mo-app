import {
  apiRequest,
  authEvents,
  clearAdminSession,
  clearSession,
  getRefreshToken,
  setAdminSession,
  setSession,
} from '../lib/api';
import type { UserProfile } from '../types';

// ── Types backend (UserRead / TokenResponse) ─────────────────────────────────

export interface BackendUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
  city: string | null;
  slang_mode: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  is_admin: boolean;
  admin_role: string | null;
  created_at: string;
}

export interface TokenResult {
  access_token: string;
  refresh_token: string;
  is_new_user: boolean;
  user: BackendUser;
}

export function toUserProfile(u: BackendUser): UserProfile {
  return {
    id: u.id,
    name: u.name || '',
    email: u.email || undefined,
    phone: u.phone,
    role: u.role === 'driver' ? 'driver' : 'passenger',
    avatar: u.avatar_url || undefined,
    slangMode: u.slang_mode,
    createdAt: u.created_at,
  };
}

// ── OTP (passager / chauffeur) ────────────────────────────────────────────────

export const sendOtp = (phone: string): Promise<unknown> =>
  apiRequest('/auth/send-otp', { method: 'POST', body: { phone } });

export const verifyOtp = async (phone: string, code: string): Promise<TokenResult> => {
  const data = await apiRequest<TokenResult>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code },
  });
  setSession(data.access_token, data.refresh_token);
  authEvents.emitUser();
  return data;
};

// ── Admin login ───────────────────────────────────────────────────────────────

export const adminLogin = async (email: string, password: string): Promise<TokenResult> => {
  const data = await apiRequest<TokenResult>('/auth/admin/login', {
    method: 'POST',
    admin: true,
    body: { email, password },
  });
  setAdminSession(data.access_token, data.refresh_token, data.user);
  authEvents.emitAdmin();
  return data;
};

// ── Profil courant ────────────────────────────────────────────────────────────

export const fetchCurrentUser = (): Promise<BackendUser> => apiRequest('/auth/me');

export const updateCurrentUser = (patch: Record<string, unknown>): Promise<BackendUser> =>
  apiRequest('/auth/me', { method: 'PATCH', body: patch });

// ── Session ───────────────────────────────────────────────────────────────────

export const signOut = async (): Promise<void> => {
  const refresh = getRefreshToken();
  if (refresh) {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refresh_token: refresh },
      skipAuth: true,
    }).catch(() => {});
  }
  clearSession();
  authEvents.emitUser();
};

export const signInAdmin = async (email: string, password: string): Promise<BackendUser> => {
  const data = await adminLogin(email, password);
  return data.user;
};

export const signOutAdmin = async (): Promise<void> => {
  clearAdminSession();
  authEvents.emitAdmin();
};

export const onAuthStateChange = (cb: () => void): (() => void) => authEvents.onChangeUser(cb);

export const onAdminAuthStateChange = (cb: () => void): (() => void) =>
  authEvents.onChangeAdmin(cb);
