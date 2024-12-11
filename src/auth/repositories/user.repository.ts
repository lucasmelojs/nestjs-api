import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { User } from '../interfaces/user.interface';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const { rows } = await this.db.query(
      'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );
    return rows[0] || null;
  }

  async create(data: RegisterDto): Promise<User> {
    const { rows } = await this.db.query(
      `INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        tenant_id
      ) VALUES (
        $1,
        crypt($2, gen_salt('bf', 10)),
        $3,
        $4,
        $5
      ) RETURNING *`,
      [data.email, data.password, data.firstName, data.lastName, data.tenantId]
    );
    return rows[0];
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const { rows } = await this.db.query(
      'SELECT verify_password($1, (SELECT password_hash FROM users WHERE id = $2)) as valid',
      [password, userId]
    );
    return rows[0]?.valid || false;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }
}