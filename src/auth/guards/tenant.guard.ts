import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new UnauthorizedException('No tenant context available');
    }

    request.tenant = {
      id: user.tenantId
    };

    return true;
  }
}