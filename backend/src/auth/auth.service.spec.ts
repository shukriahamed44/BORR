/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Unit Testing Suite for Authentication Service (`AuthServiceSpec`).
 * Utilizes NestJS `@nestjs/testing` module and Jest framework.
 * Mocks `PrismaService` and `JwtService` dependencies to isolate domain business logic
 * for user registration, bcrypt password hashing, login credential verification, and JWT token issuance.
 *
 * IN SIMPLE WORDS:
 * Automated test file that checks if user registration, password verification, and login tokens work correctly without calling a real database.
 */

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-uuid-101',
    email: 'test.commander@ammunation.com',
    passwordHash: '$2b$10$hashedpasswordstring',
    name: 'Commander Test',
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const mockCustomerUser = {
    id: 'user-uuid-101',
    email: 'test.customer@ammunation.com',
    passwordHash: '$2b$10$hashedpasswordstring',
    name: 'Customer Test',
    role: Role.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('register', () => {
    it('should successfully register a new user as CUSTOMER role', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockCustomerUser);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const dto = {
        email: 'test.customer@ammunation.com',
        password: 'Password123!',
        name: 'Customer Test',
      };

      const result = await service.register(dto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: expect.any(String),
          name: dto.name,
          role: Role.CUSTOMER,
        },
        select: expect.any(Object),
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result.user.role).toEqual(Role.CUSTOMER);
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = {
        email: 'test.commander@ammunation.com',
        password: 'Password123!',
        name: 'Commander Test',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully authenticate user with correct credentials', async () => {
      const plainPassword = 'Password123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const dbUser = { ...mockUser, passwordHash: hashedPassword };

      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
      mockJwtService.signAsync.mockResolvedValue('mock-access-token');

      const dto = {
        email: 'test.commander@ammunation.com',
        password: plainPassword,
      };

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result.user.email).toEqual(dto.email);
    });

    it('should throw UnauthorizedException for invalid email or password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'nonexistent@ammunation.com',
        password: 'WrongPassword!',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
