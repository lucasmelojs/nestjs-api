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
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000 // 1 minute
    }
  })
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return access and refresh tokens',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: TokenResponse
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponse
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponse
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // ... rest of the controller methods remain the same ...
}
