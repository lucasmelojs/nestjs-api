export interface JwtPayload {
  sub: string;        // User ID
  email: string;      // User email
  tenantId: string;   // Tenant ID
  iat?: number;       // Issued at
  exp?: number;       // Expiration time
}