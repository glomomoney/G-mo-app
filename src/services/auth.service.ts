import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Unsubscribe
} from 'firebase/auth';
import { auth, adminAuth } from '../lib/firebase';

export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

let recaptchaVerifier: RecaptchaVerifier | null = null;

// Lazily creates (and caches) the invisible reCAPTCHA verifier required by
// Firebase Phone Auth. `containerId` must be a DOM node already mounted
// (e.g. a hidden <div id="recaptcha-container" />) when this first runs.
export const getRecaptchaVerifier = (containerId: string): RecaptchaVerifier => {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  }
  return recaptchaVerifier;
};

// Sends a real SMS OTP to `e164Phone` (e.g. "+237670000000") via Firebase
// Phone Auth. Resolve the returned ConfirmationResult's `.confirm(code)` to
// complete sign-in with a real, stable `auth.uid` tied to that phone number.
export const sendPhoneOtp = (e164Phone: string, containerId: string): Promise<ConfirmationResult> =>
  signInWithPhoneNumber(auth, e164Phone, getRecaptchaVerifier(containerId));

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
