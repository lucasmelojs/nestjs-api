import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const tenant = await this.tenantsService.findById(payload.tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant');
    }

    const user = await this.usersService.findById(payload.sub, payload.tenantId);
    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
    };
  }
}