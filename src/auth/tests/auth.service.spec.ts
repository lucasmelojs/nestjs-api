import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let tokenRepository: Repository<AuthToken>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let dataSource: DataSource;

  const mockUser: Partial<User> = {
    id: '123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    tenantId: '456',
    fullName: 'Test User',
    status: 'active',
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AuthToken),
          useValue: {
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    tokenRepository = module.get<Repository<AuthToken>>(getRepositoryToken(AuthToken));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('validateUser', () => {
    it('should return null for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password', '456');
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      mockQueryRunner.query.mockResolvedValue([{ valid: false }]);

      const result = await service.validateUser('test@example.com', 'wrong-password', '456');
      expect(result).toBeNull();
    });

    it('should return user for valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      mockQueryRunner.query.mockResolvedValue([{ valid: true }]);

      const result = await service.validateUser(
        'test@example.com',
        'correct-password',
        '456',
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return new tokens for valid refresh token', async () => {
      const mockTokenRecord = {
        id: '1',
        user: mockUser as User,
        tokenHash: 'old-token',
        revokedAt: null,
      };

      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: mockUser.id });
      jest.spyOn(tokenRepository, 'findOne').mockResolvedValue(mockTokenRecord as AuthToken);
      jest.spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(tokenRepository.update).toHaveBeenCalled();
      expect(tokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should throw NotFoundException for non-existent user', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent-id', 'old-pass', 'new-pass'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for incorrect current password', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser as User);
      mockQueryRunner.query.mockResolvedValueOnce([{ valid: false }]);

      await expect(
        service.changePassword(mockUser.id, 'wrong-pass', 'new-pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should change password successfully', async () => {
      jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser as User);
      mockQueryRunner.query
        .mockResolvedValueOnce([{ valid: true }])
        .mockResolvedValueOnce([{ hash: 'new-hash' }]);

      const result = await service.changePassword(
        mockUser.id,
        'current-pass',
        'new-pass',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
