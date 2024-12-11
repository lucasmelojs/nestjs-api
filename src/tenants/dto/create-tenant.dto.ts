import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'The name of the tenant organization',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @ApiProperty({
    example: 'acme',
    description: 'The subdomain for the tenant (used for routing)',
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  subdomain: string;
}