export type UserRole = 'passenger' | 'driver';

// One uploaded KYC document (national ID, license, insurance, ...). Matches
// the shape AdminDashboard's KYC viewer already expects.
export interface KycDocumentEntry {
  title: string;
  url: string;
  updatedByAdmin: boolean;
  updatedAt: string;
  status: 'uploaded' | 'admin_replaced';
}

// Local app-state shape used while a user is signed in (App.tsx session state).
export interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  slangMode: boolean;
  walletBalance?: number;
  points?: number;
  createdAt?: string;
}

// Firestore-persisted shape for the `users` collection. Vehicle/approval
// fields are only set when role === 'driver' (written at driver signup,
// updated by the admin approve/reject flow).
export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  walletBalance?: number;
  points?: number;
  createdAt?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleColor?: string;
  approvalStatus?: 'pending' | 'approved' | 'suspended';
  kycStatus?: 'verified' | 'rejected';
  rejectionReason?: string;
  rating?: number;
  status?: string;
  kycDocuments?: Record<string, KycDocumentEntry>;
}
