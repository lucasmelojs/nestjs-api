import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const result = await this.usersRepository.query(
      'SELECT register_user($1, $2, $3) as id',
      [createUserDto.email, createUserDto.password, createUserDto.role || 'user']
    );

    return this.findById(result[0].id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.usersRepository.query(
      'SELECT id, email, password, role FROM users WHERE email = $1',
      [email]
    );
    return users[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const users = await this.usersRepository.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [id]
    );

    if (!users[0]) {
      throw new NotFoundException('User not found');
    }

    return users[0];
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    const result = await this.usersRepository.query(
      'SELECT verify_password($1, $2) as valid',
      [password, hashedPassword]
    );
    return result[0].valid;
  }

  async setRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.usersRepository.query(
      'SELECT update_refresh_token($1, $2)',
      [userId, refreshToken]
    );
  }

  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const users = await this.usersRepository.query(
      'SELECT refresh_token FROM users WHERE id = $1',
      [userId]
    );

    if (!users[0] || !users[0].refresh_token) {
      return false;
    }

    const result = await this.usersRepository.query(
      'SELECT verify_password($1, $2) as valid',
      [refreshToken, users[0].refresh_token]
    );
    return result[0].valid;
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.query(
      'SELECT update_refresh_token($1, NULL)',
      [userId]
    );
  }
}