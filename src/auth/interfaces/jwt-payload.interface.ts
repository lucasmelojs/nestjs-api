export interface JwtPayload {
  sub: string;        // User ID
  email: string;      // User email
  tenantId: string;   // Tenant ID
  firstName?: string; // User first name
  lastName?: string;  // User last name
  iat?: number;       // Issued at
  exp?: number;       // Expiration time
}