import { Module } from '@nestjs/common';
import { UserRepository } from '../auth/repositories/user.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class RepositoriesModule {}