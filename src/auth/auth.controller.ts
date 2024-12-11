import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user',
    description: 'Login with email and password to receive JWT token',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    description: 'Tenant ID',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    examples: {
      userLogin: {
        summary: 'Basic user login',
        description: 'Example of user login credentials',
        value: {
          email: 'user@example.com',
          password: 'Password123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or tenant',
  })
  async login(@Body() loginDto: LoginDto) {
    try {
      const user = await this.authService.validateUser(
        loginDto.tenantId,
        loginDto.email,
        loginDto.password,
      );
      return this.authService.login(user);
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}