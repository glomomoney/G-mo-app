import { useRef, useState } from 'react';
import { ConfirmationResult } from 'firebase/auth';
import { KycDocumentEntry, UserProfile, UserRole } from '../types';
import { sendPhoneOtp, signOut as authSignOut } from '../services/auth.service';
import { getUserFromFirestore, saveUserToFirestore } from '../services/users.service';
import { uploadDriverDocument } from '../services/storage.service';

function loadInitialUser(): UserProfile | null {
  const saved = localStorage.getItem('wanda_user');
  return saved ? JSON.parse(saved) : null;
}

// Matches AdminDashboard's KYC viewer titles (getDriverKYCDocuments fallback).
const KYC_DOC_TITLES: Record<string, string> = {
  nationalIdFront: "Carte Nationale d'Identité (CNI) - Recto",
  nationalIdBack: "Carte Nationale d'Identité (CNI) - Verso",
  driverLicense: 'Permis de Conduire (Catégorie B)',
  vehicleInsurance: "Attestation d'Assurance Véhicule (NSIA / Chanas)",
  vehicleGreyCard: 'Carte Grise / Certificat d\'Immatriculation'
};

// Normalizes a Cameroon local number ("6XX XXX XXX") or an already-prefixed
// one into E.164 ("+2376XXXXXXXX") for Firebase Phone Auth.
function toE164Cameroon(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  const local = digits.startsWith('237') ? digits.slice(3) : digits;
  return `+237${local}`;
}

export interface SignupInput {
  name: string;
  phone: string;
  role: UserRole;
  slangMode: boolean;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
  kycFiles?: Record<string, File>;
}

export type AuthStep = 'phone' | 'otp' | 'profile';

/**
 * Real phone-number sign-in: Firebase Phone Auth sends and verifies the SMS
 * OTP itself (see services/auth.service.ts's sendPhoneOtp/RecaptchaVerifier).
 * Once a code is confirmed, `auth.uid` is a real, stable identity tied to
 * that phone number (unlike the old anonymous-session placeholder) — a
 * returning phone number resumes its existing Firestore profile, a new one
 * proceeds to the profile-completion step. Wallet balance/points are NOT
 * mirrored here — `useWallet(authUid)` owns that under `wallets/{uid}`.
 */
export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(loadInitialUser);
  const [role, setRole] = useState<UserRole>(user?.role || 'passenger');
  const [slangMode, setSlangMode] = useState<boolean>(user?.slangMode ?? true);
  const [language, setLanguage] = useState<'en' | 'fr'>(() => {
    const saved = localStorage.getItem('wanda_language');
    if (saved === 'en' || saved === 'fr') return saved;
    return (user?.slangMode ?? true) ? 'fr' : 'en';
  });
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [authUid, setAuthUid] = useState<string | null>(null);

  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [pendingPhone, setPendingPhone] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const changeLanguage = (lang: 'en' | 'fr') => {
    setLanguage(lang);
    const isFr = lang === 'fr';
    setSlangMode(isFr);
    localStorage.setItem('wanda_language', lang);
    if (user) {
      const updatedUser = { ...user, slangMode: isFr };
      setUser(updatedUser);
      localStorage.setItem('wanda_user', JSON.stringify(updatedUser));
    }
  };

  // Step 1: send a real SMS OTP to `phone` via Firebase Phone Auth.
  const startPhoneVerification = async (phone: string, recaptchaContainerId: string) => {
    setOtpError(null);
    setOtpSending(true);
    try {
      const e164 = toE164Cameroon(phone);
      confirmationResultRef.current = await sendPhoneOtp(e164, recaptchaContainerId);
      setPendingPhone(phone);
      setAuthStep('otp');
    } catch (err: any) {
      console.warn('Error sending phone OTP:', err);
      setOtpError(
        err?.code === 'auth/invalid-phone-number'
          ? "Numéro de téléphone invalide."
          : "Impossible d'envoyer le code. Réessayez."
      );
    } finally {
      setOtpSending(false);
    }
  };

  // Step 2: confirm the 6-digit code. Resolves to a real, stable auth.uid.
  // Returning phone number -> hydrate `user` from Firestore and finish.
  // New phone number -> advance to the profile-completion step.
  const confirmOtp = async (code: string) => {
    if (!confirmationResultRef.current) return;
    setOtpError(null);
    try {
      const credential = await confirmationResultRef.current.confirm(code);
      const uid = credential.user.uid;
      setAuthUid(uid);

      const existing = await getUserFromFirestore(uid);
      if (existing) {
        const resumedUser: UserProfile = {
          id: existing.id,
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
          role: existing.role,
          slangMode,
          createdAt: existing.createdAt
        };
        setUser(resumedUser);
        setRole(existing.role);
        localStorage.setItem('wanda_user', JSON.stringify(resumedUser));
      } else {
        setAuthStep('profile');
      }
    } catch (err: any) {
      console.warn('Error confirming phone OTP:', err);
      setOtpError(
        err?.code === 'auth/invalid-verification-code'
          ? "Code incorrect. Réessayez."
          : err?.code === 'auth/code-expired'
          ? "Le code a expiré, demandez-en un nouveau."
          : "Vérification échouée. Réessayez."
      );
    }
  };

  // Step 3 (new phone numbers only): complete the profile now that the
  // phone number itself is already verified and `authUid` is a real uid.
  const handleSignupComplete = (userData: SignupInput) => {
    setUser(userData);
    setRole(userData.role);
    setSlangMode(userData.slangMode);
    localStorage.setItem('wanda_user', JSON.stringify(userData));

    if (!authUid) {
      console.warn('handleSignupComplete called without a verified auth.uid');
      return;
    }
    const uid = authUid;

    saveUserToFirestore({
      id: uid,
      name: userData.name,
      email: `${userData.phone.replace(/[^0-9]/g, '') || 'user'}@wanda.cm`,
      phone: userData.phone,
      role: userData.role,
      // Driver-only fields. Real KYC documents (if provided) gate a real
      // admin review — the account starts 'pending', not auto-approved.
      ...(userData.role === 'driver' ? {
        vehicleType: userData.vehicleType || 'ecoride',
        vehicleModel: userData.vehicleColor ? `${userData.vehicleModel} (${userData.vehicleColor})` : userData.vehicleModel,
        vehiclePlate: userData.vehiclePlate,
        vehicleColor: userData.vehicleColor,
        approvalStatus: 'pending' as const,
        rating: 5.0
      } : {})
    })
      .then(async () => {
        // Upload any KYC documents in the background (best-effort — a slow
        // or failed upload shouldn't block the signup itself) and merge the
        // resulting URLs onto the same user doc once they're all done.
        if (userData.role === 'driver' && userData.kycFiles && Object.keys(userData.kycFiles).length > 0) {
          const uploadedAt = new Date().toISOString();
          const entries = await Promise.all(
            Object.entries(userData.kycFiles).map(async ([docKey, file]) => {
              try {
                const url = await uploadDriverDocument(uid, docKey, file);
                const entry: KycDocumentEntry = {
                  title: KYC_DOC_TITLES[docKey] || docKey,
                  url,
                  updatedByAdmin: false,
                  updatedAt: uploadedAt,
                  status: 'uploaded'
                };
                return [docKey, entry] as const;
              } catch (err) {
                console.warn(`Error uploading KYC document "${docKey}":`, err);
                return null;
              }
            })
          );

          const kycDocuments = Object.fromEntries(entries.filter((e): e is [string, KycDocumentEntry] => e !== null));
          if (Object.keys(kycDocuments).length > 0) {
            await saveUserToFirestore({ id: uid, kycDocuments });
          }
        }
      })
      .catch(err => console.warn('Error syncing signup to Firestore:', err));
  };

  // Log out: clears local session. The next login re-verifies the phone
  // number via OTP — no anonymous-session rotation needed anymore, since
  // `auth.uid` is now a real, stable identity tied to the phone number.
  const handleLogout = () => {
    setUser(null);
    setAuthUid(null);
    setAuthStep('phone');
    setPendingPhone('');
    setOtpError(null);
    confirmationResultRef.current = null;
    localStorage.removeItem('wanda_user');
    authSignOut().catch(err => console.warn('Error signing out:', err));
  };

  return {
    user,
    setUser,
    role,
    setRole,
    slangMode,
    setSlangMode,
    language,
    setLanguage,
    changeLanguage,
    langDropdownOpen,
    setLangDropdownOpen,
    authUid,
    authStep,
    pendingPhone,
    otpSending,
    otpError,
    startPhoneVerification,
    confirmOtp,
    handleSignupComplete,
    handleLogout
  };
}
