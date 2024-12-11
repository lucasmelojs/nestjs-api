import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tenant } from '../tenants/tenant.entity';

@Entity('users')
export class User {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The UUID of the user',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user',
  })
  @Column()
  email: string;

  @Column()
  password: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The UUID of the tenant this user belongs to',
  })
  @Column('uuid')
  tenantId: string;

  @ApiPropertyOptional({
    description: 'The tenant details',
    type: () => Tenant,
  })
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ApiProperty({
    example: ['user'],
    description: 'Array of roles assigned to the user',
  })
  @Column('jsonb', { default: ['user'] })
  roles: string[];

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'The creation date of the user',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'The last update date of the user',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}