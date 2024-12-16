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

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    password_hash: 'hashed_password',
    tenant_id: '456',
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

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      mockQueryRunner.query.mockResolvedValue([{ valid: false }]);

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tokens for valid credentials', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      mockQueryRunner.query.mockResolvedValue([{ valid: true }]);
      
      const mockTokens = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      };

      jest.spyOn(jwtService, 'signAsync')
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);

      const result = await service.login('test@example.com', 'correct-password');
      
      expect(result).toEqual(mockTokens);
      expect(tokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should throw ConflictException for existing user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      await expect(service.register('test@example.com', 'password', '456')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create new user successfully', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      mockQueryRunner.query.mockResolvedValue([{ hash: 'hashed_password' }]);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);

      const result = await service.register('test@example.com', 'password', '456');
      
      expect(result).toEqual(mockUser);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
