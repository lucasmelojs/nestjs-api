import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | undefined> {
    return this.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .andWhere('user.tenant_id = :tenantId', { tenantId })
      .getOne();
  }

  async createUser(data: RegisterDto): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Hash password using pgcrypto
      const [hashResult] = await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [data.password]
      );

      // Create user with hashed password
      const [user] = await queryRunner.query(
        `INSERT INTO users (email, password_hash, full_name, tenant_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.email, hashResult.hash, data.fullName, data.tenantId]
      );

      await queryRunner.commitTransaction();
      return user;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;

    } finally {
      await queryRunner.release();
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      const [result] = await queryRunner.query(
        `SELECT (password_hash = crypt($1, password_hash)) as valid
         FROM users
         WHERE id = $2`,
        [password, userId]
      );
      return result?.valid || false;

    } finally {
      await queryRunner.release();
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Hash new password
      const [hashResult] = await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [newPassword]
      );

      // Update password
      await queryRunner.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2`,
        [hashResult.hash, userId]
      );

      await queryRunner.commitTransaction();

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;

    } finally {
      await queryRunner.release();
    }
  }
}
