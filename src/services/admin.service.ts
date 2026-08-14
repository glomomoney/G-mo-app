import { getAdminAccessToken } from '../lib/api';
import { AdminAccount } from '../types';

// Lit le compte admin de la session backend (persisté dans localStorage par
// adminLogin — équivalent du doc Firestore `admins/{uid}`).
export const fetchAdminAccount = async (_uid?: string): Promise<AdminAccount | null> => {
  try {
    if (!getAdminAccessToken()) return null;
    const raw = localStorage.getItem('wanda_admin_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return {
      uid: user.id || user.email || '',
      email: user.email || '',
      name: user.name || undefined,
      role: (user.admin_role as AdminAccount['role']) || 'accounting',
    } as AdminAccount;
  } catch (err) {
    console.warn('Error fetching admin account:', err);
    return null;
  }
};
