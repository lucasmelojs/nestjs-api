export interface User {
  id: string;
  email: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}