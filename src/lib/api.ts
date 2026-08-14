// Transport + session backend. Remplaçant de Firebase (auth + firestore) :
// le front parle désormais directement à l'API Wanda (FastAPI, localhost:8001).

const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8001/api/v1';

export const AUTH_STORAGE_KEYS = {
  access: 'wanda_access_token',
  refresh: 'wanda_refresh_token',
  adminAccess: 'wanda_admin_access_token',
  adminRefresh: 'wanda_admin_refresh_token',
  adminUser: 'wanda_admin_user',
};

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.access);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
}

export function getAdminAccessToken(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEYS.adminAccess);
}

export function setSession(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AUTH_STORAGE_KEYS.access, accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.refresh, refreshToken);
}

export function setAdminSession(
  accessToken: string,
  refreshToken: string,
  adminUser: unknown
): void {
  localStorage.setItem(AUTH_STORAGE_KEYS.adminAccess, accessToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.adminRefresh, refreshToken);
  localStorage.setItem(AUTH_STORAGE_KEYS.adminUser, JSON.stringify(adminUser));
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEYS.access);
  localStorage.removeItem(AUTH_STORAGE_KEYS.refresh);
}

export function clearAdminSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEYS.adminAccess);
  localStorage.removeItem(AUTH_STORAGE_KEYS.adminRefresh);
  localStorage.removeItem(AUTH_STORAGE_KEYS.adminUser);
}

// Tiny event bus — les hooks useAuth/useAdminAuth s'y abonnent pour réagir
// aux changements de session (login/logout/expiration), à la place de
// Firebase onAuthStateChanged.
type Listener = () => void;

class AuthEvents {
  private userListeners = new Set<Listener>();
  private adminListeners = new Set<Listener>();

  onChangeUser(cb: Listener): () => void {
    this.userListeners.add(cb);
    return () => this.userListeners.delete(cb);
  }

  onChangeAdmin(cb: Listener): () => void {
    this.adminListeners.add(cb);
    return () => this.adminListeners.delete(cb);
  }

  emitUser(): void {
    this.userListeners.forEach((cb) => cb());
  }

  emitAdmin(): void {
    this.adminListeners.forEach((cb) => cb());
  }
}

export const authEvents = new AuthEvents();

// Un seul refresh à la fois pour éviter les races quand plusieurs appels
// 401 partent en parallèle.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem(AUTH_STORAGE_KEYS.refresh);
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const access: string | undefined = body?.data?.access_token;
    if (!access) return null;
    localStorage.setItem(AUTH_STORAGE_KEYS.access, access);
    localStorage.setItem(
      AUTH_STORAGE_KEYS.refresh,
      body.data.refresh_token ?? refresh
    );
    return access;
  } catch {
    return null;
  }
}

export function errorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (typeof err === 'string') return err;
  const message = (err as any)?.message;
  return typeof message === 'string' && message ? message : fallback;
}

export interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  admin?: boolean;
  skipAuth?: boolean;
  signal?: AbortSignal;
}

/**
 * Enveloppe fetch : attache le Bearer token, dévéloppe l'enveloppe
 * {success, message, data} du backend et lève un Error lisible sur échec.
 * Tente un refresh automatique en cas de 401 (session passager/driver).
 */
export async function apiRequest<T = any>(
  path: string,
  opts: ApiRequestOptions = {}
): Promise<T> {
  const tokenKey = opts.admin ? AUTH_STORAGE_KEYS.adminAccess : AUTH_STORAGE_KEYS.access;
  const token = localStorage.getItem(tokenKey);
  const headers: Record<string, string> = {};
  if (opts.body !== undefined && !(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const doFetch = (authToken: string | null = token): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      method: opts.method || 'GET',
      headers: authToken ? { ...headers, Authorization: `Bearer ${authToken}` } : headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });

  let res = await doFetch();

  if (res.status === 401 && !opts.admin && !opts.skipAuth) {
    refreshPromise = refreshPromise || tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const newAccess = await refreshPromise;
    if (newAccess) {
      res = await doFetch(newAccess);
    } else {
      clearSession();
      authEvents.emitUser();
    }
  }

  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { detail: text };
  }

  if (!res.ok) {
    const detail = body?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: any) => d?.msg).filter(Boolean).join(' ; ')
          : body?.message || `Erreur serveur (${res.status})`;
    const err: any = new Error(message);
    err.status = res.status;
    throw err;
  }

  return (body?.data !== undefined ? body.data : body) as T;
}
