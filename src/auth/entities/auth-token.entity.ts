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
  user_id: string;

  @Column({ name: 'token_hash' })
  token_hash: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expires_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ name: 'revoked_at', type: 'timestamp with time zone', nullable: true })
  revoked_at: Date;

  @ManyToOne(() => User, (user) => user.auth_tokens)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
