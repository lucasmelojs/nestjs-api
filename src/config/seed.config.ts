import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { User } from '../users/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.createInitialTenant();
  }

  private async createInitialTenant() {
    // Check if tenant exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { name: 'Default Tenant' },
    });

    if (!existingTenant) {
      // Create default tenant
      const tenant = this.tenantRepository.create({
        name: 'Default Tenant',
        subdomain: 'default',
        isActive: true,
      });

      const savedTenant = await this.tenantRepository.save(tenant);

      // Create default admin user
      const defaultUser = this.userRepository.create({
        email: 'admin@example.com',
        // Using pgcrypto to hash the password
        password: await this.userRepository.query(
          'SELECT encode(digest($1, \'sha256\'), \'hex\')',
          ['admin123'],
        ).then(result => result[0].encode),
        tenantId: savedTenant.id,
        roles: ['admin'],
      });

      await this.userRepository.save(defaultUser);

      console.log('=======================================');
      console.log('🌱 Seed Data Created Successfully!');
      console.log('---------------------------------------');
      console.log('👤 Default User Created:');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      console.log('Tenant ID:', savedTenant.id);
      console.log('=======================================');
    }
  }
}