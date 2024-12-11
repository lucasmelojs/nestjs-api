import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists in the tenant
    const existingUser = await this.userRepository.findOne({
      where: {
        email: createUserDto.email,
        tenantId: createUserDto.tenantId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists in this tenant');
    }

    // Hash password using pgcrypto
    const hashedPassword = await this.hashPassword(createUserDto.password);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.userRepository.save(user);
  }

  async findAll(tenantId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { tenantId },
      select: ['id', 'email', 'roles', 'createdAt', 'updatedAt'],
    });
  }

  async findById(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id, tenantId },
      select: ['id', 'email', 'roles', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found in tenant`);
    }

    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found in tenant`);
    }

    return user;
  }

  async update(id: string, tenantId: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id, tenantId);

    if (updateUserDto.password) {
      updateUserDto.password = await this.hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const user = await this.findById(id, tenantId);
    await this.userRepository.remove(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const result = await this.userRepository.query(
      'SELECT hash_password($1) as hashed_password',
      [password],
    );
    return result[0].hashed_password;
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    const result = await this.userRepository.query(
      'SELECT verify_password($1, $2) as is_valid',
      [password, hashedPassword],
    );
    return result[0].is_valid;
  }
}