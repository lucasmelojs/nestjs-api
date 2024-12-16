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

  // ... existing methods (login, validateUser, etc.) ...
}
