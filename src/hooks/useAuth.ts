import { useState, useEffect } from 'react';
import { KycDocumentEntry, UserProfile, UserRole } from '../types';
import { ensureAnonymousSession, signOut as authSignOut } from '../services/auth.service';
import { saveUserToFirestore } from '../services/users.service';
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

interface WalletSnapshot {
  passengerWallet: number;
  driverWallet: number;
  passengerPoints: number;
}

/**
 * Session/profile state (local, phone+name based signup — no password) plus
 * a Firebase anonymous auth session, kept only so `auth.uid` is available for
 * firestore.rules ownership checks (users/{uid}, rides.passengerId, etc.).
 */
export function useAuth(wallet: WalletSnapshot) {
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

  useEffect(() => {
    ensureAnonymousSession()
      .then(u => setAuthUid(u.uid))
      .catch(err => console.warn('Anonymous Firebase auth failed:', err));
  }, []);

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

  const handleSignupComplete = (userData: SignupInput) => {
    setUser(userData);
    setRole(userData.role);
    setSlangMode(userData.slangMode);
    localStorage.setItem('wanda_user', JSON.stringify(userData));

    // Ensure the anonymous session is ready (covers the case where signup
    // happens before the background sign-in on mount has resolved yet).
    ensureAnonymousSession()
      .then(async ({ uid }) => {
        setAuthUid(uid);
        await saveUserToFirestore({
          id: uid,
          name: userData.name,
          email: `${userData.phone.replace(/[^0-9]/g, '') || 'user'}@wanda.cm`,
          phone: userData.phone,
          role: userData.role,
          walletBalance: userData.role === 'driver' ? wallet.driverWallet : wallet.passengerWallet,
          points: wallet.passengerPoints,
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
        });

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

  // Log out / switch profile: clears local session and starts a fresh
  // anonymous identity so the next sign-up doesn't overwrite this profile's
  // Firestore document.
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wanda_user');
    authSignOut()
      .then(() => ensureAnonymousSession())
      .then(u => setAuthUid(u.uid))
      .catch(err => console.warn('Error rotating anonymous session on logout:', err));
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
    handleSignupComplete,
    handleLogout
  };
}
