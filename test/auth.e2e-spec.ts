      const newPassword = 'NewTest@123456';

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword
        })
        .expect(200);

      // Try logging in with new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);
    });

    it('should fail with invalid reset token', async () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'NewTest@123456'
        })
        .expect(400);
    });

    it('should fail with expired reset token', async () => {
      // Update token to be expired
      await authTokenRepository.update(
        { tokenHash: resetToken },
        { expiresAt: new Date(Date.now() - 1000) } // expired 1 second ago
      );

      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewTest@123456'
        })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const tenant = await tenantRepository.save(testTenant);
      
      const queryRunner = connection.createQueryRunner();
      const hashedPassword = (await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [testUser.password]
      ))[0].hash;
      await queryRunner.release();

      await userRepository.save({
        ...testUser,
        password: hashedPassword,
        tenant
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword'
          })
          .expect(401);
      }

      // Next attempt should be rate limited
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(429);
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log entries for authentication events', async () => {
      const tenant = await tenantRepository.save(testTenant);
      
      const queryRunner = connection.createQueryRunner();
      const hashedPassword = (await queryRunner.query(
        `SELECT crypt($1, gen_salt('bf', 10)) as hash`,
        [testUser.password]
      ))[0].hash;
      
      const user = await userRepository.save({
        ...testUser,
        password: hashedPassword,
        tenant
      });

      // Perform login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Verify audit log entry
      const auditLogs = await queryRunner.query(
        `SELECT * FROM auth_audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      
      await queryRunner.release();

      expect(auditLogs.length).toBe(1);
      expect(auditLogs[0].action).toBe('login');
      expect(auditLogs[0].user_id).toBe(user.id);
      expect(auditLogs[0].tenant_id).toBe(tenant.id);
    });
  });
});
