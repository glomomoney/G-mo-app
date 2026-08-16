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
  cnicNumber?: string;
  licenseNumber?: string;
  forensicNotes?: string;
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
    status: driver.status,
    cnicNumber: driver.cnicNumber,
    licenseNumber: driver.licenseNumber,
    forensicNotes: driver.forensicNotes
  };
}

/**
 * Admin driver roster, backed by the real backend (GET /admin/drivers).
 * New drivers appear automatically as they sign up; approve/reject persist
 * the KYC/approval fields back to the backend. The backend response is the
 * source of truth for *which* drivers exist — a driver removed/absent from
 * it is dropped locally too, so stale cached entries never linger. Local-only
 * fields the (out-of-scope) AdminDashboard editor adds (city, cnicNumber,
 * kycDocuments overrides, ...) are preserved on drivers that still match.
 * localStorage is a best-effort offline cache only.
 */
export function useDriversList() {
  const [driversList, setDriversList] = useState<AdminDriverEntry[]>(loadCachedDrivers);

  useEffect(() => {
    localStorage.setItem('wanda_drivers_list', JSON.stringify(driversList));
  }, [driversList]);

  useEffect(() => {
    const unsubscribe = subscribeToDrivers((backendDrivers) => {
      setDriversList(prev => {
        const prevById = new Map<string, AdminDriverEntry>(prev.map(d => [d.id, d]));
        return backendDrivers.map(bd => {
          const mapped = mapToAdminDriverEntry(bd);
          const local = prevById.get(mapped.id);
          return local ? { ...local, ...mapped } : mapped;
        });
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
