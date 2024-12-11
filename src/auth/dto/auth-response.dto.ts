import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      roles: ['user'],
    },
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
  };
}