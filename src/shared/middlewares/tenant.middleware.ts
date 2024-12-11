import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantsService: TenantsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (tenantId) {
      const tenant = await this.tenantsService.findById(tenantId);
      if (tenant && tenant.isActive) {
        // Set the tenant context for the database session
        await this.tenantsService.setTenantContext(tenantId);
      }
    }
    
    next();
  }
}