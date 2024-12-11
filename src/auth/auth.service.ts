import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
  ) {}

  async validateUser(tenantId: string, email: string, password: string): Promise<any> {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant');
    }

    const user = await this.usersService.findByEmail(email, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Using pgcrypto for password verification
    const isPasswordValid = await this.usersService.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles,
      },
    };
  }
}