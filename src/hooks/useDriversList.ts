import { useState, useEffect } from 'react';
import { sendNotificationToFirestore } from '../services/notifications.service';
import { subscribeToDrivers, updateDriverStatusInFirestore } from '../services/users.service';
import { UserProfileData } from '../types';

// The admin-facing driver roster (KYC approval queue + approved fleet).
// Distinct from the `Driver` type, which is the shape of a driver actively
// matched to a ride.
export interface AdminDriverEntry {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor?: string;
  vehicleType: string;
  approvalStatus: 'pending' | 'approved' | 'suspended';
  kycStatus?: 'verified' | 'rejected';
  rejectionReason?: string;
  rating: number;
  status?: string;
}

function loadCachedDrivers(): AdminDriverEntry[] {
  const saved = localStorage.getItem('wanda_drivers_list');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Fallback to empty below
    }
  }
  return [];
}

function mapToAdminDriverEntry(driver: UserProfileData): AdminDriverEntry {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    avatar: driver.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    vehicleModel: driver.vehicleModel || '',
    vehiclePlate: driver.vehiclePlate || '',
    vehicleColor: driver.vehicleColor,
    vehicleType: driver.vehicleType || 'ecoride',
    approvalStatus: driver.approvalStatus || 'pending',
    kycStatus: driver.kycStatus,
    rejectionReason: driver.rejectionReason,
    rating: driver.rating ?? 5.0,
    status: driver.status
  };
}

/**
 * Admin driver roster, backed by real Firestore `users` docs (role ===
 * 'driver'). New drivers appear automatically as they sign up (useAuth
 * writes their doc); approve/reject persist the KYC/approval fields back
 * to Firestore. Display fields the (out-of-scope) AdminDashboard edits
 * locally (city, cnicNumber, kycDocuments, ...) are intentionally left
 * alone by the Firestore merge below so those edits aren't clobbered on
 * the next snapshot. localStorage is a best-effort offline cache only.
 */
export function useDriversList() {
  const [driversList, setDriversList] = useState<AdminDriverEntry[]>(loadCachedDrivers);

  useEffect(() => {
    localStorage.setItem('wanda_drivers_list', JSON.stringify(driversList));
  }, [driversList]);

  useEffect(() => {
    const unsubscribe = subscribeToDrivers((firestoreDrivers) => {
      setDriversList(prev => {
        const prevIds = new Set(prev.map(d => d.id));

        // Existing local entries: only sync the approval/KYC fields Firestore
        // owns, so out-of-scope local-only edits (AdminDashboard's account
        // detail editor) aren't stomped on the next snapshot.
        const synced = prev.map(d => {
          const fd = firestoreDrivers.find(x => x.id === d.id);
          if (!fd) return d;
          return {
            ...d,
            approvalStatus: fd.approvalStatus || d.approvalStatus,
            kycStatus: fd.kycStatus,
            rejectionReason: fd.rejectionReason
          };
        });

        const newEntries = firestoreDrivers
          .filter(fd => !prevIds.has(fd.id))
          .map(mapToAdminDriverEntry);

        return [...newEntries, ...synced];
      });
    });

    return unsubscribe;
  }, []);

  const approveDriver = async (id: string, customMsg?: string) => {
    const targetDriver = driversList.find(d => d.id === id);
    const driverName = targetDriver?.name || 'Chauffeur';

    setDriversList(prev => prev.map(d => d.id === id ? {
      ...d,
      approvalStatus: 'approved',
      kycStatus: 'verified',
      rejectionReason: undefined
    } : d));

    await updateDriverStatusInFirestore(id, {
      approvalStatus: 'approved',
      kycStatus: 'verified',
      rejectionReason: undefined
    });

    try {
      await sendNotificationToFirestore({
        target: 'driver',
        title: '🎉 Compte Validé avec Succès !',
        message: customMsg || `Félicitations ${driverName}, votre compte chauffeur Wanda a été validé ! Vous pouvez maintenant recevoir des courses et générer des revenus.`,
        type: 'info',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  };

  const rejectDriver = async (id: string, reason?: string) => {
    const targetDriver = driversList.find(d => d.id === id);
    const driverName = targetDriver?.name || 'Chauffeur';
    const rejectText = reason || 'Documents fournis non conformes ou illisibles.';

    setDriversList(prev => prev.map(d => d.id === id ? {
      ...d,
      approvalStatus: 'suspended',
      kycStatus: 'rejected',
      rejectionReason: rejectText
    } : d));

    await updateDriverStatusInFirestore(id, {
      approvalStatus: 'suspended',
      kycStatus: 'rejected',
      rejectionReason: rejectText
    });

    try {
      await sendNotificationToFirestore({
        target: 'driver',
        title: '⚠️ Rejet de Validation KYC',
        message: `Bonjour ${driverName}, votre compte chauffeur n'a pas pu être validé. Raison : ${rejectText}. Veuillez mettre à jour vos documents dans l'application.`,
        type: 'alert',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Notification error:', err);
    }
  };

  return {
    driversList,
    setDriversList,
    approveDriver,
    rejectDriver
  };
}
