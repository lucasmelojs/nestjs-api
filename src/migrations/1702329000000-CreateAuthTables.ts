import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1702329000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgcrypto extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Create tenants table
    await queryRunner.query(`
      CREATE TABLE tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        subdomain VARCHAR(255) NOT NULL UNIQUE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table with pgcrypto password hashing
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        password TEXT NOT NULL,
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        roles JSONB NOT NULL DEFAULT '[\'user\']'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email, tenant_id)
      );

      -- Create function to hash password using pgcrypto
      CREATE OR REPLACE FUNCTION hash_password(password TEXT)
      RETURNS TEXT AS $$
      BEGIN
        RETURN encode(digest(password, 'sha256'), 'hex');
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Create function to verify password
      CREATE OR REPLACE FUNCTION verify_password(password TEXT, hashed_password TEXT)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN encode(digest(password, 'sha256'), 'hex') = hashed_password;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Add Row Level Security (RLS)
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create policy to restrict access by tenant
      CREATE POLICY tenant_isolation_policy ON users
        USING (tenant_id = current_setting('app.tenant_id')::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS users');
    await queryRunner.query('DROP TABLE IF EXISTS tenants');
    await queryRunner.query('DROP FUNCTION IF EXISTS hash_password');
    await queryRunner.query('DROP FUNCTION IF EXISTS verify_password');
    await queryRunner.query('DROP EXTENSION IF EXISTS pgcrypto');
  }
}