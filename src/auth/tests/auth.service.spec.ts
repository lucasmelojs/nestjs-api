import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';
import { AuthToken } from '../entities/auth-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let tokenRepository: Repository<AuthToken>;
  let tenantRepository: Repository<Tenant>;
  let jwtService: JwtService;
  let dataSource: DataSource;

  const mockUser = {
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

  const mockTenant = {
    id: '456',
    name: 'Test Tenant',
    domain: 'test.com',
    status: 'active',
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
          provide: getRepositoryToken(Tenant),
          useValue: {
            findOne: jest.fn(),
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
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    jwtService = module.get<JwtService>(JwtService);
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('register', () => {
    it('should throw NotFoundException when tenant not found', async () => {
      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.register('test@example.com', 'password', '456', 'Test User'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when email already exists', async () => {
      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(mockTenant as Tenant);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(
        service.register('test@example.com', 'password', '456', 'Test User'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create new user successfully', async () => {
      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(mockTenant as Tenant);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      mockQueryRunner.query
        .mockResolvedValueOnce([{ hash: 'hashed_password' }])
        .mockResolvedValueOnce([mockUser]);

      const result = await service.register(
        'test@example.com',
        'password',
        '456',
        'Test User',
      );

      expect(result).toEqual(mockUser);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      jest.spyOn(tenantRepository, 'findOne').mockResolvedValue(mockTenant as Tenant);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      mockQueryRunner.query.mockRejectedValue(new Error('Database error'));

      await expect(
        service.register('test@example.com', 'password', '456', 'Test User'),
      ).rejects.toThrow('Database error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  // ... existing test cases ...
});
