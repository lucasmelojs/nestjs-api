import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../repositories/user.repository';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'test-secret-key-make-this-longer-for-production'),
    });
    console.log('JWT Strategy initialized with secret:', this.configService.get<string>('JWT_SECRET'));
  }

  async validate(payload: JwtPayload) {
    try {
      console.log('Validating JWT payload:', payload);

      if (!payload.tenantId) {
        console.log('No tenantId in JWT payload');
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.userRepository.findByEmail(
        payload.email,
        payload.tenantId
      );

      if (!user) {
        console.log('User not found in database');
        throw new UnauthorizedException('User not found');
      }

      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
      };

      console.log('User validated successfully:', userData);
      return userData;
    } catch (error) {
      console.error('JWT validation error:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}