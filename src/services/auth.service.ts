import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe
} from 'firebase/auth';
import { auth, adminAuth } from '../lib/firebase';

/**
 * The app's sign-up flow is phone+name only (no password) — Firebase Auth is
 * used anonymously purely to give each session a stable, real `auth.uid` that
 * firestore.rules can key ownership checks off (users/{uid}, rides.passengerId,
 * history.userId, transactions.userId).
 */
export const ensureAnonymousSession = async (): Promise<User> => {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
};

// Ends the current anonymous session so the next sign-up starts a fresh
// identity, instead of overwriting the previous person's Firestore profile.
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const onAuthStateChange = (onChange: (user: User | null) => void): Unsubscribe =>
  onAuthStateChanged(auth, onChange);

// Admin console sign-in — deliberately on the *secondary* `adminAuth`
// instance (see src/lib/firebase.ts) so it never touches the passenger/
// driver anonymous session.
export const signInAdmin = (email: string, password: string): Promise<User> =>
  signInWithEmailAndPassword(adminAuth, email, password).then(cred => cred.user);

export const signOutAdmin = (): Promise<void> => firebaseSignOut(adminAuth);

export const onAdminAuthStateChange = (onChange: (user: User | null) => void): Unsubscribe =>
  onAuthStateChanged(adminAuth, onChange);
