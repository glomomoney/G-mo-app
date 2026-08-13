import { useState, useEffect } from 'react';
import { signInAdmin, signOutAdmin, onAdminAuthStateChange } from '../services/auth.service';
import { fetchAdminAccount } from '../services/admin.service';
import { AdminAccount } from '../types';

/**
 * Real Firebase Auth email/password session for the admin console, on the
 * secondary `adminAuth` instance (isolated from the passenger/driver
 * anonymous session — see src/lib/firebase.ts). Being able to sign in isn't
 * enough to be an admin: the uid must also have a doc in the `admins`
 * Firestore collection (provisioned manually via the Firebase console —
 * there is no self-signup path), which is where the admin's role comes
 * from. A Firebase Auth account without a matching `admins` doc is
 * immediately signed back out.
 */
export function useAdminAuth() {
  const [adminUser, setAdminUser] = useState<AdminAccount | null>(null);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState(true);
  const [adminLoginError, setAdminLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAdminAuthStateChange(async (user) => {
      if (!user) {
        setAdminUser(null);
        setIsCheckingAdminSession(false);
        return;
      }

      const account = await fetchAdminAccount(user.uid);
      if (!account) {
        console.warn('Signed-in Firebase account has no matching admins/ doc — denying admin access.');
        await signOutAdmin();
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
      await signInAdmin(email, password);
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      setAdminLoginError(
        code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
          ? 'Identifiants incorrects.'
          : code.includes('too-many-requests')
          ? 'Trop de tentatives. Réessayez plus tard.'
          : 'Erreur de connexion. Réessayez.'
      );
      return false;
    }
  };

  const logoutAdmin = () => signOutAdmin();

  return {
    adminUser,
    isAdminAuthenticated: !!adminUser,
    isCheckingAdminSession,
    adminLoginError,
    loginAdmin,
    logoutAdmin
  };
}
