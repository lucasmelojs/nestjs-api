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

@ApiTags('Authentication')
@ApiBearerAuth()
@ApiExtraModels(UserProfileResponse, TokenResponse)
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
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['Invalid email format', 'Password must be at least 8 characters'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000
    }
  })
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchange a valid refresh token for new access and refresh tokens',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'The refresh token obtained from login or previous refresh',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'New access and refresh tokens generated successfully',
    type: TokenResponse
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid refresh token' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000
    }
  })
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate current session and revoke all refresh tokens for security',
  })
  @ApiResponse({
    status: 204,
    description: 'Successfully logged out and all sessions invalidated'
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Invalid token' }
      }
    }
  })
  async logout(@CurrentUser() userId: string) {
    await this.authService.logout(userId);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @Throttle({
    default: {
      limit: 20,
      ttl: 60000
    }
  })
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve detailed profile information for the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserProfileResponse
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'Invalid token' }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'User not found' },
        error: { type: 'string', example: 'Not Found' }
      }
    }
  })
  getProfile(@CurrentUser() userId: string) {
    return this.authService.getProfile(userId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000
    }
  })
  @ApiOperation({
    summary: 'Change user password',
    description: 'Allow authenticated users to change their password by providing current and new passwords',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Current password and new password information',
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Current password is incorrect',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Current password is incorrect' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid password format or requirements not met',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['Password must be at least 8 characters', 'Password must contain at least one uppercase letter'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async changePassword(
    @CurrentUser() userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: 300000
    }
  })
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Initiate the password reset process by requesting a reset link via email',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent (if user exists)',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If your email is registered, you will receive a password reset link'
        },
        token: {
          type: 'string',
          description: 'Reset token (only in development)',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 3,
      ttl: 300000
    }
  })
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using the token received via email',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    required: true
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password has been reset successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired reset token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid or expired reset token' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid password format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['Password must be at least 8 characters', 'Password must contain at least one uppercase letter'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}
