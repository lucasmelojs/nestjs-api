import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validateTenantId(tenantId: string): Promise<boolean> {
    const count = await this.userRepository
      .createQueryBuilder('user')
      .where('user.tenant_id = :tenantId', { tenantId })
      .getCount();

    if (count === 0) {
      throw new NotFoundException('Invalid tenant ID');
    }

    return true;
  }

  async isTenantActive(tenantId: string): Promise<boolean> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.tenant', 'tenant')
      .where('tenant.id = :tenantId', { tenantId })
      .andWhere('tenant.status = :status', { status: 'active' })
      .getOne();

    return !!result;
  }
}
