import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    // TODO: Implement user validation using pgcrypto
    throw new Error('Method not implemented.');
  }

  async login(loginDto: LoginDto) {
    // TODO: Implement login logic
    throw new Error('Method not implemented.');
  }

  async register(registerDto: RegisterDto) {
    // TODO: Implement registration logic
    throw new Error('Method not implemented.');
  }

  async refreshToken(token: string) {
    // TODO: Implement token refresh logic
    throw new Error('Method not implemented.');
  }
}