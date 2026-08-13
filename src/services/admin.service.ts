import { doc, getDoc } from 'firebase/firestore';
import { adminDb } from '../lib/firebase';
import { AdminAccount } from '../types';

// Reads via `adminDb` (bound to the secondary admin Firebase App) so the
// request is authenticated as the signed-in admin — required by
// firestore.rules' `admins/{adminId}` self-read-only rule.
export const fetchAdminAccount = async (uid: string): Promise<AdminAccount | null> => {
  try {
    const snap = await getDoc(doc(adminDb, 'admins', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as AdminAccount;
  } catch (err) {
    console.warn('Error fetching admin account:', err);
    return null;
  }
};
