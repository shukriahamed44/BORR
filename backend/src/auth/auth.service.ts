/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Core Authentication Business Logic Service (`AuthService`).
 * Handles user account creation, bcrypt password hashing, credential verification, and dual-token generation
 * (Access Token & Refresh Token) using NestJS JwtService and Prisma database operations.
 *
 * IN SIMPLE WORDS:
 * The service that performs the actual authentication work: encrypting passwords, creating users in the database,
 * checking login details, and issuing access tokens.
 */

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Registers a new public user. Strictly forces CUSTOMER role for security.
   */
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: Role.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'User registered successfully.',
      user,
      ...tokens,
    };
  }

  /**
   * Provisions a new user account with specific role (ADMIN, STAFF, WAREHOUSE_OPERATOR, CUSTOMER).
   * Restricted to ADMIN authorization.
   */
  async createUser(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      message: `User created successfully with role '${user.role}'.`,
      user,
    };
  }

  /**
   * Validates user credentials and issues access & refresh tokens on successful authentication.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Verifies an incoming refresh token and issues a fresh pair of access and refresh tokens.
   */
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || 'ammunation-jwt-refresh-secret-key-2026';

      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User associated with token no longer exists.');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        message: 'Tokens refreshed successfully.',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  /**
   * Handles password reset requests and generates a secure password reset token.
   */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Do not reveal email non-existence for security hygiene
      return {
        message: 'If the email address exists in our system, a password reset token has been dispatched.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'PASSWORD_RESET' },
      {
        secret: process.env.JWT_SECRET || 'ammunation-jwt-secret-key-2026',
        expiresIn: '30m',
      },
    );

    return {
      message: 'Password reset token generated successfully.',
      resetToken,
    };
  }

  /**
   * Helper function to sign Access Token (short-lived 15m) and Refresh Token (long-lived 7d).
   */
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessTokenSecret =
      process.env.JWT_SECRET || 'ammunation-jwt-secret-key-2026';
    const refreshTokenSecret =
      process.env.JWT_REFRESH_SECRET || 'ammunation-jwt-refresh-secret-key-2026';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessTokenSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }
}
