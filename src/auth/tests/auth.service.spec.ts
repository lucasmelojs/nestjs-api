import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserRepository } from '../repositories/user.repository';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: UserRepository;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '123',
    email: 'test@example.com',
    tenantId: '456',
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockUserRepository = {
    findByEmail: jest.fn(),
    verifyPassword: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockImplementation((payload, options) => {
      // Return different tokens based on expiration time
      if (options?.expiresIn === '7d') {
        return Promise.resolve('refresh-token');
      }
      return Promise.resolve('access-token');
    }),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const config = {
        'JWT_EXPIRATION': '15m',
        'JWT_REFRESH_EXPIRATION': '7d'
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('test@example.com', 'password', '456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrong-password', '456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user when credentials are valid', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password',
        '456',
      );

      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password',
      tenantId: '456',
    };

    it('should return tokens and user data on successful login', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      });

      // Verify JWT service was called correctly
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          tenantId: mockUser.tenantId,
        }),
        expect.any(Object)
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: '456',
    };

    it('should throw ConflictException when user already exists', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create user and return tokens on successful registration', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      });

      // Verify create was called
      expect(mockUserRepository.create).toHaveBeenCalledWith(registerDto);

      // Verify JWT service was called correctly
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          tenantId: mockUser.tenantId,
        }),
        expect.any(Object)
      );
    });
  });
});
