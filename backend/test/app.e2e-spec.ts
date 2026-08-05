/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * End-to-End (E2E) Integration Test Suite (`AppE2ESpec`).
 * Boots the full NestJS HTTP server pipeline with `ValidationPipe` and global route prefix (`api/v1`).
 * Tests full client integration cycles using `supertest` HTTP requests across Authentication, Equipment catalog, and System endpoints.
 *
 * IN SIMPLE WORDS:
 * End-to-end automated test file that sends real HTTP requests to test if registration, login, and product listing APIs work together smoothly.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AmmuNation ERP E2E Pipeline (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/v1/products - Should list equipment products publicly', () => {
    return request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('count');
        expect(res.body).toHaveProperty('products');
        expect(Array.isArray(res.body.products)).toBe(true);
      });
  });

  it('2. POST /api/v1/auth/register - Should register a new E2E test user', async () => {
    const uniqueEmail = `e2e.test.${Date.now()}@ammunation.com`;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password123!',
        name: 'E2E Tester',
        role: 'CUSTOMER',
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(uniqueEmail);

    accessToken = res.body.accessToken;
  });

  it('3. GET /api/v1/auth/me - Should fetch user profile with Bearer JWT token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.name).toBe('E2E Tester');
      });
  });
});
