import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiExtraModels,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserProfileResponse } from './responses/user-profile.response';
import { TokenResponse } from './responses/token.response';
import { ErrorResponse } from './responses/error.response';

@ApiTags('Authentication')
@ApiBearerAuth()
@ApiExtraModels(UserProfileResponse, TokenResponse, ErrorResponse)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000 // 1 minute
    }
  })
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account and return access tokens',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration details',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered and authenticated',
    type: TokenResponse
  })
  @ApiConflictResponse({
    description: 'Email already registered',
    type: ErrorResponse
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse
  })
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.tenantId,
      registerDto.fullName
    );

    // Auto login after registration
    return this.authService.login(registerDto.email, registerDto.password);
  }

  // ... rest of the controller methods remain the same ...
}
