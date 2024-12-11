import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockRepository = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userId = 'test-uuid';
      mockRepository.query.mockResolvedValueOnce([{ id: userId }]);
      mockRepository.query.mockResolvedValueOnce([{
        id: userId,
        email: 'test@example.com',
        role: 'user',
      }]);

      const result = await service.create({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        role: 'user',
      });
      expect(mockRepository.query).toHaveBeenCalledWith(
        'SELECT register_user($1, $2, $3) as id',
        ['test@example.com', 'password', 'user']
      );
    });
  });

  describe('findByEmail', () => {
    it('should return null when user not found', async () => {
      mockRepository.query.mockResolvedValue([]);

      const result = await service.findByEmail('test@example.com');
      expect(result).toBeNull();
    });

    it('should return user when found', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user',
      };

      mockRepository.query.mockResolvedValue([user]);

      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockRepository.query.mockResolvedValue([]);

      await expect(service.findById('1'))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should return user when found', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };

      mockRepository.query.mockResolvedValue([user]);

      const result = await service.findById('1');
      expect(result).toEqual(user);
    });
  });

  describe('validatePassword', () => {
    it('should return validation result', async () => {
      mockRepository.query.mockResolvedValue([{ valid: true }]);

      const result = await service.validatePassword('password', 'hashedPassword');
      expect(result).toBe(true);
      expect(mockRepository.query).toHaveBeenCalledWith(
        'SELECT verify_password($1, $2) as valid',
        ['password', 'hashedPassword']
      );
    });
  });

  describe('setRefreshToken', () => {
    it('should update refresh token', async () => {
      await service.setRefreshToken('1', 'refreshToken');
      
      expect(mockRepository.query).toHaveBeenCalledWith(
        'SELECT update_refresh_token($1, $2)',
        ['1', 'refreshToken']
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return false when user not found', async () => {
      mockRepository.query.mockResolvedValueOnce([]);

      const result = await service.validateRefreshToken('1', 'refreshToken');
      expect(result).toBe(false);
    });

    it('should return false when refresh token is null', async () => {
      mockRepository.query.mockResolvedValueOnce([{ refresh_token: null }]);

      const result = await service.validateRefreshToken('1', 'refreshToken');
      expect(result).toBe(false);
    });

    it('should validate refresh token when found', async () => {
      mockRepository.query.mockResolvedValueOnce([{ refresh_token: 'hashedToken' }]);
      mockRepository.query.mockResolvedValueOnce([{ valid: true }]);

      const result = await service.validateRefreshToken('1', 'refreshToken');
      expect(result).toBe(true);
    });
  });

  describe('removeRefreshToken', () => {
    it('should remove refresh token', async () => {
      await service.removeRefreshToken('1');
      
      expect(mockRepository.query).toHaveBeenCalledWith(
        'SELECT update_refresh_token($1, NULL)',
        ['1']
      );
    });
  });
});