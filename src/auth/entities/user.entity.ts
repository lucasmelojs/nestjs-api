import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AuthToken } from './auth-token.entity';
import { Tenant } from './tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'last_login', type: 'timestamp with time zone', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @OneToMany(() => AuthToken, (token) => token.user)
  authTokens: AuthToken[];

  @ManyToOne(() => Tenant, tenant => tenant.users)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
