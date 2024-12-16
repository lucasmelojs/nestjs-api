import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('auth_tokens')
export class AuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp with time zone', nullable: true })
  revokedAt: Date;

  @ManyToOne(() => User, (user) => user.authTokens)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
