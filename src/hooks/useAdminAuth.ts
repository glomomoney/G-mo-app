import { useState, useEffect } from 'react';
import { adminLogin, signOutAdmin, onAdminAuthStateChange } from '../services/auth.service';
import { fetchAdminAccount } from '../services/admin.service';
import { AdminAccount } from '../types';

function loadStoredAdmin(): AdminAccount | null {
  try {
    if (!localStorage.getItem('wanda_admin_access_token')) return null;
    const raw = localStorage.getItem('wanda_admin_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return {
      uid: u.id || u.email || '',
      email: u.email || '',
      name: u.name || undefined,
      role: (u.admin_role as AdminAccount['role']) || 'accounting',
    } as AdminAccount;
  } catch {
    return null;
  }
}

/**
 * Session admin via le backend Wanda (POST /auth/admin/login). Le compte
 * admin doit être provisionné dans la table backend (super_admin/admin_role) —
 * pas de self-signup. La session est persistée en localStorage.
 */
export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminAccount | null>(loadStoredAdmin);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange(async () => {
      const account = await fetchAdminAccount();
      if (!account) {
        setAdminUser(null);
      } else {
        setAdminUser(account);
      }
      setIsCheckingAdminSession(false);
    });
    return unsubscribe;
  }, []);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    setAdminLoginError('');
    try {
      const data = await adminLogin(email, password);
      const account: AdminAccount = {
        uid: data.user.id,
        email: data.user.email || email,
        name: data.user.name || undefined,
        role: (data.user.admin_role as AdminAccount['role']) || 'accounting',
      };
      setAdminUser(account);
      setIsCheckingAdminSession(false);
      return true;
    } catch (err: any) {
      const message = err?.message || '';
      setAdminLoginError(
        message.toLowerCase().includes('identifiants') ||
        message.toLowerCase().includes('invalid') ||
        message.toLowerCase().includes('incorrect')
          ? 'Identifiants incorrects.'
          : message.toLowerCase().includes('trop de tentatives')
          ? 'Trop de tentatives. Réessayez plus tard.'
          : message || 'Erreur de connexion. Réessayez.'
      );
      return false;
    }
  };

  const logoutAdmin = () => {
    signOutAdmin();
    setAdminUser(null);
  };

  return {
    adminUser,
    isAdminAuthenticated: !!adminUser,
    isCheckingAdminSession,
    adminLoginError,
    loginAdmin,
    logoutAdmin,
  };
}
