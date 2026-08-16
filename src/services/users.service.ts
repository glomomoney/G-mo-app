import { apiRequest, getAdminAccessToken } from '../lib/api';
import { fetchCurrentUser, updateCurrentUser } from './auth.service';
import { UserProfileData, KycDocumentEntry } from '../types';

type Unsubscribe = () => void;

function toUserProfileData(u: any): UserProfileData {
  return {
    id: u.id,
    name: u.name || '',
    email: u.email || '',
    phone: u.phone,
    role: u.role === 'driver' ? 'driver' : 'passenger',
    avatar: u.avatar_url || undefined,
    createdAt: u.created_at,
  };
}

// One-shot lookup du profil du user connecté (équivalent GET /auth/me).
export const getUserFromFirestore = async (): Promise<UserProfileData | null> => {
  try {
    const user = await fetchCurrentUser();
    return toUserProfileData(user);
  } catch (err) {
    console.warn('getUserFromFirestore error:', err);
    return null;
  }
};

// Persiste le profil : champs user -> PATCH /auth/me ; champs chauffeur +
// documents KYC -> PATCH /drivers/me.
export const saveUserToFirestore = async (
  user: Partial<UserProfileData> & { id: string }
): Promise<void> => {
  const userPatch: Record<string, unknown> = {};
  if (user.name !== undefined) userPatch.name = user.name;
  if (user.email !== undefined) userPatch.email = user.email;
  if (user.role !== undefined) userPatch.role = user.role;
  if (user.avatar !== undefined) userPatch.avatar_url = user.avatar;
  if (Object.keys(userPatch).length > 0) {
    try {
      await updateCurrentUser(userPatch);
    } catch (err) {
      console.warn('Error saving user profile:', err);
    }
  }

  const driverPatch: Record<string, unknown> = {};
  if (user.vehicleType !== undefined) driverPatch.vehicle_type = user.vehicleType;
  if (user.vehicleModel !== undefined) driverPatch.vehicle_model = user.vehicleModel;
  if (user.vehicleColor !== undefined) driverPatch.vehicle_color = user.vehicleColor;
  if (user.vehiclePlate !== undefined) driverPatch.vehicle_plate = user.vehiclePlate;
  if (user.kycDocuments !== undefined) driverPatch.kyc_documents = user.kycDocuments;
  if (Object.keys(driverPatch).length > 0) {
    try {
      await apiRequest('/drivers/me', { method: 'PATCH', body: driverPatch });
    } catch (err) {
      console.warn('Error saving driver profile:', err);
    }
  }
};

// Suivi du profil courant (polling GET /auth/me).
export const subscribeToUser = (
  _userId: string,
  onUpdate: (data: Partial<UserProfileData>) => void
): Unsubscribe => {
  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const user = await fetchCurrentUser();
      if (!cancelled) onUpdate(toUserProfileData(user));
    } catch (err) {
      console.warn('subscribeToUser poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 8000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};

// Roster admin des chauffeurs (GET /admin/drivers, paginé -> data.items).
export const subscribeToDrivers = (onUpdate: (drivers: UserProfileData[]) => void): Unsubscribe => {
  // Hors page admin (pas de token admin), on n'interroge pas le backend.
  if (!getAdminAccessToken()) {
    onUpdate([]);
    return () => {};
  }

  let cancelled = false;
  let timer: ReturnType<typeof setInterval>;

  const poll = async () => {
    try {
      const data = await apiRequest<{ items: any[] }>('/admin/drivers?per_page=100', {
        admin: true,
      });
      if (cancelled) return;
      const drivers = (data?.items || []).map((d: any) => ({
        id: d.user_id || d.id,
        name: d.name || d.user_name || '',
        phone: d.phone || d.user_phone || '',
        role: 'driver' as const,
        email: '',
        vehicleType: d.vehicle_type,
        vehicleModel: d.vehicle_model,
        vehiclePlate: d.vehicle_plate,
        vehicleColor: d.vehicle_color,
        approvalStatus: d.approval_status,
        kycStatus: d.kyc_status,
        rejectionReason: d.rejection_reason,
        rating: d.rating,
        status: d.status,
        kycDocuments: d.kyc_documents as Record<string, KycDocumentEntry> | undefined,
        cnicNumber: d.cnic_number,
        licenseNumber: d.license_number,
        forensicNotes: d.forensic_notes,
      }));
      onUpdate(drivers);
    } catch (err) {
      console.warn('subscribeToDrivers poll error:', err?.message || err);
    }
  };

  poll();
  timer = setInterval(poll, 10000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
};

// Correction directe du compte par un admin — PATCH /admin/drivers/{id}
// (identité, véhicule, documents KYC, notes d'audit forensic).
export const updateDriverAccountAsAdmin = async (
  driverId: string,
  updates: Record<string, unknown>
): Promise<UserProfileData> => {
  const data = await apiRequest<any>(`/admin/drivers/${driverId}`, {
    method: 'PATCH',
    admin: true,
    body: updates,
  });
  return {
    id: data.user_id,
    name: data.user_name || '',
    phone: data.user_phone || '',
    role: 'driver',
    email: '',
    vehicleType: data.vehicle_type,
    vehicleModel: data.vehicle_model,
    vehiclePlate: data.vehicle_plate,
    vehicleColor: data.vehicle_color,
    approvalStatus: data.approval_status,
    kycStatus: data.kyc_status,
    rejectionReason: data.rejection_reason,
    rating: data.rating,
    status: data.status,
    kycDocuments: data.kyc_documents,
    cnicNumber: data.cnic_number,
    licenseNumber: data.license_number,
    forensicNotes: data.forensic_notes,
  } as UserProfileData;
};

// Approbation / rejet admin : approval -> POST /admin/drivers/{id}/approval,
// statut KYC -> POST /admin/drivers/{id}/kyc.
export const updateDriverStatusInFirestore = async (
  driverId: string,
  updates: Partial<Pick<UserProfileData, 'approvalStatus' | 'kycStatus' | 'rejectionReason'>>
): Promise<void> => {
  try {
    if (updates.approvalStatus !== undefined) {
      await apiRequest(`/admin/drivers/${driverId}/approval`, {
        method: 'POST',
        admin: true,
        body: {
          approval_status: updates.approvalStatus,
          rejection_reason: updates.rejectionReason ?? null,
        },
      });
    }
    if (updates.kycStatus !== undefined) {
      await apiRequest(`/admin/drivers/${driverId}/kyc`, {
        method: 'POST',
        admin: true,
        body: { kyc_status: updates.kycStatus },
      });
    }
  } catch (err) {
    console.warn('Error updating driver status:', err?.message || err);
  }
};
