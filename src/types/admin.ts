export type AdminRole = 'super_admin' | 'accounting' | 'publicity' | 'forensic';

// Firestore-persisted shape for the `admins` collection (doc id == Firebase
// Auth uid). Only ever written via the Firebase console today — see
// admin.service.ts.
export interface AdminAccount {
  uid: string;
  email: string;
  name?: string;
  role: AdminRole;
}
