import { useEffect, useRef, useState } from 'react';
import { KycDocumentEntry, UserProfile, UserRole } from '../types';
import { authEvents, getAccessToken } from '../lib/api';
import {
  sendOtp,
  verifyOtp,
  signOut as authSignOut,
  BackendUser,
} from '../services/auth.service';
import { getUserFromFirestore, saveUserToFirestore } from '../services/users.service';
import { uploadDriverDocument } from '../services/storage.service';

function loadInitialUser(): UserProfile | null {
  const saved = localStorage.getItem('wanda_user');
  return saved ? JSON.parse(saved) : null;
}

const KYC_DOC_TITLES: Record<string, string> = {
  nationalIdFront: "Carte Nationale d'Identité (CNI) - Recto",
  nationalIdBack: "Carte Nationale d'Identité (CNI) - Verso",
  driverLicense: 'Permis de Conduire (Catégorie B)',
  vehicleInsurance: "Attestation d'Assurance Véhicule (NSIA / Chanas)",
  vehicleGreyCard: "Carte Grise / Certificat d'Immatriculation"
};

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
 * Connexion OTP via le backend Wanda (send-otp / verify-otp). Une fois le
 * code validé, la session (tokens) est stockée côté localStorage et le profil
 * complet vient de l'API (user backend). Un nouveau numéro passe par l'étape
 * de complétion du profil.
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
  const [authUid, setAuthUid] = useState<string | null>(user?.id || null);

  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [pendingPhone, setPendingPhone] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const pendingE164Ref = useRef<string | null>(null);

  // Session expirée (refresh impossible) -> on remet l'UI de login.
  useEffect(() => {
    return authEvents.onChangeUser(() => {
      if (!getAccessToken()) {
        setUser(null);
        setAuthUid(null);
        setAuthStep('phone');
        setPendingPhone('');
        localStorage.removeItem('wanda_user');
      }
    });
  }, []);

  const applyBackendUser = (backendUser: BackendUser) => {
    const profile: UserProfile = {
      id: backendUser.id,
      name: backendUser.name || '',
      email: backendUser.email || undefined,
      phone: backendUser.phone,
      role: backendUser.role === 'driver' ? 'driver' : 'passenger',
      slangMode,
      createdAt: backendUser.created_at,
    };
    setUser(profile);
    setRole(profile.role);
    setAuthUid(backendUser.id);
    localStorage.setItem('wanda_user', JSON.stringify(profile));
  };

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

  const startPhoneVerification = async (phone: string, _recaptchaContainerId?: string) => {
    setOtpError(null);
    setOtpSending(true);
    try {
      const e164 = toE164Cameroon(phone);
      await sendOtp(e164);
      pendingE164Ref.current = e164;
      setPendingPhone(phone);
      setAuthStep('otp');
    } catch (err: any) {
      console.warn('Error sending phone OTP:', err);
      setOtpError(err?.message || "Impossible d'envoyer le code. Réessayez.");
    } finally {
      setOtpSending(false);
    }
  };

  const confirmOtp = async (code: string) => {
    if (!pendingE164Ref.current) {
      setOtpError("Numéro non initialisé, renvoyez un code.");
      return;
    }
    setOtpError(null);
    try {
      const result = await verifyOtp(pendingE164Ref.current, code);
      if (result.is_new_user) {
        pendingE164Ref.current = null;
        setAuthStep('profile');
        return;
      }
      applyBackendUser(result.user);
    } catch (err: any) {
      console.warn('Error confirming OTP:', err);
      setOtpError(err?.message || "Vérification échouée. Réessayez.");
    }
  };

  const handleSignupComplete = async (userData: SignupInput) => {
    const localProfile: UserProfile = {
      name: userData.name,
      phone: userData.phone,
      role: userData.role,
      slangMode: userData.slangMode,
    };
    setUser(localProfile);
    setRole(userData.role);
    setSlangMode(userData.slangMode);

    const backendUser = await getUserFromFirestore();
    if (backendUser?.id) {
      setAuthUid(backendUser.id);
      localProfile.id = backendUser.id;
    }
    localStorage.setItem('wanda_user', JSON.stringify(localProfile));

    const uid = localProfile.id;
    if (!uid) {
      console.warn('handleSignupComplete called without a verified user id');
      return;
    }

    await saveUserToFirestore({
      id: uid,
      name: userData.name,
      email: userData.phone.replace(/[^0-9]/g, '') + '@wanda.cm',
      phone: userData.phone,
      role: userData.role,
      ...(userData.role === 'driver' ? {
        vehicleType: userData.vehicleType || 'ecoride',
        vehicleModel: userData.vehicleColor ? `${userData.vehicleModel} (${userData.vehicleColor})` : userData.vehicleModel,
        vehiclePlate: userData.vehiclePlate,
        vehicleColor: userData.vehicleColor,
      } : {}),
    });

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
              status: 'uploaded',
            };
            return [docKey, entry] as const;
          } catch (err) {
            console.warn(`Error uploading KYC document "${docKey}":`, err);
            return null;
          }
        })
      );

      const kycDocuments = Object.fromEntries(
        entries.filter((e): e is [string, KycDocumentEntry] => e !== null)
      );
      if (Object.keys(kycDocuments).length > 0) {
        await saveUserToFirestore({ id: uid, kycDocuments });
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAuthUid(null);
    setAuthStep('phone');
    setPendingPhone('');
    setOtpError(null);
    pendingE164Ref.current = null;
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
    handleLogout,
  };
}
