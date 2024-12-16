import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthToken } from './entities/auth-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthToken)
    private readonly tokenRepository: Repository<AuthToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async validateUser(email: string, password: string, tenantId: string) {
    const user = await this.userRepository.findOne({
      where: { email, tenantId },
    });

    if (!user) {
      return null;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const [result] = await queryRunner.query(
        `SELECT crypt($1, $2) = $2 as valid`,
        [password, user.passwordHash],
      );

      if (!result.valid) {
        return null;
      }

      return user;
    } finally {
      await queryRunner.release();
    }
  }

  async register(email: string, password: string, tenantId: string, fullName?: string) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Hash password using pgcrypto
      const [hashResult] = await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [password],
      );

      // Create new user
      const user = this.userRepository.create({
        email,
        passwordHash: hashResult.hash,
        tenantId,
        fullName,
      });

      await queryRunner.manager.save(user);
      await queryRunner.commitTransaction();

      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(email: string, password: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const [result] = await queryRunner.query(
        `SELECT crypt($1, $2) = $2 as valid`,
        [password, user.passwordHash],
      );

      if (!result.valid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { sub: user.id, email: user.email },
          { expiresIn: '15m' },
        ),
        this.jwtService.signAsync(
          { sub: user.id },
          { expiresIn: '7d', secret: this.configService.get('JWT_REFRESH_SECRET') },
        ),
      ]);

      await this.tokenRepository.save({
        user,
        tokenHash: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { accessToken, refreshToken };
    } finally {
      await queryRunner.release();
    }
  }

  // ... rest of the service methods remain the same ...
}
