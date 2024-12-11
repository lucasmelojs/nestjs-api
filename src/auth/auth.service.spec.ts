import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    validatePassword: jest.fn(),
    setRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
    findById: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
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
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.validateUser('test@example.com', 'password'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'password'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should return user without password when validation succeeds', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user',
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        role: 'user',
      });
    });
  });

  describe('login', () => {
    it('should return tokens when login is successful', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };

      mockUsersService.findByEmail.mockResolvedValue(user);
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValueOnce('access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh_token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 900,
      });
    });
  });

  describe('register', () => {
    it('should throw ConflictException when email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1' });

      await expect(service.register({
        email: 'test@example.com',
        password: 'password',
      })).rejects.toThrow(ConflictException);
    });

    it('should create user and return tokens when registration is successful', async () => {
      const newUser = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(newUser);
      mockJwtService.signAsync.mockResolvedValueOnce('access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('refresh_token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.register({
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 900,
      });
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('1', 'refresh_token'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockUsersService.findById.mockResolvedValue({ id: '1' });
      mockUsersService.validateRefreshToken.mockResolvedValue(false);

      await expect(service.refreshTokens('1', 'refresh_token'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('should return new tokens when refresh is successful', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        role: 'user',
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockUsersService.validateRefreshToken.mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValueOnce('new_access_token');
      mockJwtService.signAsync.mockResolvedValueOnce('new_refresh_token');
      mockConfigService.get.mockReturnValue('secret');

      const result = await service.refreshTokens('1', 'refresh_token');

      expect(result).toEqual({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 900,
      });
    });
  });

  describe('logout', () => {
    it('should call removeRefreshToken', async () => {
      await service.logout('1');
      expect(mockUsersService.removeRefreshToken).toHaveBeenCalledWith('1');
    });
  });
});