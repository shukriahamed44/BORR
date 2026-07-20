/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * NestJS Authentication Feature Module (`AuthModule`).
 * Encapsulates Passport strategies, NestJS JWT signing configuration, `AuthService`, and `AuthController`.
 * Configures JwtModule with default secret key fallback and exports authentication services for dependency injection.
 *
 * IN SIMPLE WORDS:
 * The module container that packages all authentication logic, guards, strategies, and routes together
 * so NestJS can load them into the app.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'ammunation-jwt-secret-key-2026',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
