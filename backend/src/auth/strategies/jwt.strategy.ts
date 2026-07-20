/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Passport JWT Authentication Strategy extending `PassportStrategy(Strategy)`.
 * Decodes Bearer token from incoming HTTP Authorization header, verifies signature using `JWT_SECRET`,
 * and validates the claims payload (sub, email, role). Returns request user identity object.
 *
 * IN SIMPLE WORDS:
 * The security component that decodes the user's digital ID card (JWT token), verifies it wasn't forged,
 * and extracts their User ID, Email, and Role.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'ammunation-jwt-secret-key-2026',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token: User no longer exists.');
    }

    return user;
  }
}
