import { apiRequest, getAdminAccessToken } from '../lib/api';
import { AdminAccount } from '../types';

export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: AdminAccount['role'];
  departmentName: string | null;
  assignedBy: string | null;
  active: boolean;
  createdAt: string;
}

interface StaffBackend {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department_name: string | null;
  assigned_by: string | null;
  active: boolean;
  created_at: string;
}

function mapStaff(s: StaffBackend): StaffMember {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role as AdminAccount['role'],
    departmentName: s.department_name,
    assignedBy: s.assigned_by,
    active: s.active,
    createdAt: s.created_at,
  };
}

// Roster staff admin — GET/POST/PATCH /admin/staff.
export const fetchStaffList = async (): Promise<StaffMember[]> => {
  const data = await apiRequest<StaffBackend[]>('/admin/staff', { admin: true });
  return data.map(mapStaff);
};

export const createStaffMember = async (input: {
  name: string;
  email: string;
  password: string;
  role: AdminAccount['role'];
  departmentName?: string;
}): Promise<StaffMember> => {
  const data = await apiRequest<StaffBackend>('/admin/staff', {
    method: 'POST',
    admin: true,
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      department_name: input.departmentName,
    },
  });
  return mapStaff(data);
};

export const updateStaffMember = async (
  id: string,
  updates: Partial<{ name: string; role: AdminAccount['role']; departmentName: string; active: boolean }>
): Promise<StaffMember> => {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.role !== undefined) body.role = updates.role;
  if (updates.departmentName !== undefined) body.department_name = updates.departmentName;
  if (updates.active !== undefined) body.active = updates.active;
  const data = await apiRequest<StaffBackend>(`/admin/staff/${id}`, {
    method: 'PATCH',
    admin: true,
    body,
  });
  return mapStaff(data);
};

// Lit le compte admin de la session backend (persisté dans localStorage par
// adminLogin — équivalent du doc Firestore `admins/{uid}`).
export const fetchAdminAccount = async (_uid?: string): Promise<AdminAccount | null> => {
  try {
    if (!getAdminAccessToken()) return null;
    const raw = localStorage.getItem('wanda_admin_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return {
      uid: user.id || user.email || '',
      email: user.email || '',
      name: user.name || undefined,
      role: (user.admin_role as AdminAccount['role']) || 'accounting',
    } as AdminAccount;
  } catch (err) {
    console.warn('Error fetching admin account:', err);
    return null;
  }
};
