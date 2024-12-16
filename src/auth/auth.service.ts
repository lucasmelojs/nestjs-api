import { Injectable, UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthToken } from './entities/auth-token.entity';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthToken)
    private readonly tokenRepository: Repository<AuthToken>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(email: string, password: string, tenantId: string, fullName?: string) {
    // First check if tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, status: 'active' }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found or inactive');
    }

    // Check if user already exists for this tenant
    const existingUser = await this.userRepository.findOne({
      where: { email, tenantId }
    });

    if (existingUser) {
      throw new ConflictException('Email already registered for this tenant');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Hash password using pgcrypto
      const [hashResult] = await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [password]
      );

      // Create new user
      const [user] = await queryRunner.query(
        `INSERT INTO users (email, password_hash, full_name, tenant_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING *`,
        [email, hashResult.hash, fullName, tenantId]
      );

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

      // Update last login timestamp
      await this.userRepository.update(user.id, {
        lastLogin: new Date(),
      });

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

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const tokenRecord = await this.tokenRepository.findOne({
        where: { tokenHash: refreshToken, revokedAt: null },
        relations: ['user'],
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = tokenRecord.user;
      const [accessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { sub: user.id, email: user.email },
          { expiresIn: '15m' },
        ),
        this.jwtService.signAsync(
          { sub: user.id },
          { expiresIn: '7d', secret: this.configService.get('JWT_REFRESH_SECRET') },
        ),
      ]);

      // Revoke old refresh token and save new one
      await this.tokenRepository.update(tokenRecord.id, { revokedAt: new Date() });
      await this.tokenRepository.save({
        user,
        tokenHash: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.tokenRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'fullName', 'status', 'lastLogin', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const [result] = await queryRunner.query(
        `SELECT crypt($1, $2) = $2 as valid`,
        [currentPassword, user.passwordHash],
      );

      if (!result.valid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Hash new password using pgcrypto
      const [hashResult] = await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [newPassword],
      );

      // Update password and revoke all tokens
      await queryRunner.startTransaction();
      try {
        await queryRunner.query(
          `UPDATE users SET password_hash = $1 WHERE id = $2`,
          [hashResult.hash, userId],
        );
        await queryRunner.query(
          `UPDATE auth_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
          [userId],
        );
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      }
    } finally {
      await queryRunner.release();
    }

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      // Return success even if user doesn't exist for security
      return { message: 'If your email is registered, you will receive a password reset link' };
    }

    // Generate reset token
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'password_reset' },
      { expiresIn: '1h', secret: this.configService.get('PASSWORD_RESET_SECRET') },
    );

    // TODO: Implement email sending logic here
    // For now, just return the token for testing
    return { message: 'Reset token generated', token: resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('PASSWORD_RESET_SECRET'),
      });

      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const queryRunner = this.dataSource.createQueryRunner();
      try {
        await queryRunner.connect();
        // Hash new password using pgcrypto
        const [hashResult] = await queryRunner.query(
          `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
          [newPassword],
        );

        // Update password and revoke all tokens
        await queryRunner.startTransaction();
        try {
          await queryRunner.query(
            `UPDATE users SET password_hash = $1 WHERE id = $2`,
            [hashResult.hash, payload.sub],
          );
          await queryRunner.query(
            `UPDATE auth_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
            [payload.sub],
          );
          await queryRunner.commitTransaction();
        } catch (error) {
          await queryRunner.rollbackTransaction();
          throw error;
        }
      } finally {
        await queryRunner.release();
      }

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
