import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('tenants')
export class Tenant {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The UUID of the tenant',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Acme Corporation',
    description: 'The name of the tenant organization',
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({
    example: 'acme',
    description: 'The subdomain for the tenant',
  })
  @Column({ unique: true })
  subdomain: string;

  @ApiProperty({
    example: true,
    description: 'Whether the tenant is active',
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'The creation date of the tenant',
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'The last update date of the tenant',
  })
  @UpdateDateColumn()
  updatedAt: Date;
}