import { IsString, IsEmail, IsNotEmpty, MinLength, IsUUID, IsArray, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsArray()
  @IsOptional()
  roles?: string[];
}