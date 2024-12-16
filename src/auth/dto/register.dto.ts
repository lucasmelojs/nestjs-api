import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email address for the new account',
    example: 'user@example.com',
    format: 'email',
    required: true,
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    description: 'Password for the new account',
    example: 'StrongP@ss123',
    minLength: 8,
    required: true,
    pattern: '/((?=.*\\d)|(?=.*\\W+))(?![.\\n])(?=.*[A-Z])(?=.*[a-z]).*$/',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Full name must be a string' })
  fullName?: string;

  @ApiProperty({
    description: 'Tenant ID for multi-tenant setup',
    example: 'e37c743c-7a2e-4e6c-b169-9e52354d3e01',
    required: true,
  })
  @IsNotEmpty({ message: 'Tenant ID is required' })
  @IsString({ message: 'Tenant ID must be a string' })
  tenantId: string;
}
