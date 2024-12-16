import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponse {
  @ApiProperty({
    description: 'User\'s unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid'
  })
  id: string;

  @ApiProperty({
    description: 'User\'s email address',
    example: 'john.doe@example.com',
    format: 'email'
  })
  email: string;

  @ApiProperty({
    description: 'User\'s full name',
    example: 'John Doe',
    required: false,
    nullable: true
  })
  fullName: string;

  @ApiProperty({
    description: 'User\'s account status',
    example: 'active',
    enum: ['active', 'inactive']
  })
  status: string;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-01T12:00:00Z',
    format: 'date-time',
    required: false,
    nullable: true
  })
  lastLogin: Date;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time'
  })
  createdAt: Date;
}
