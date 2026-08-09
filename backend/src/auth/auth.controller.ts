/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * HTTP Controller routing incoming requests under `/auth` path prefix with complete Swagger OpenAPI documentation annotations.
 * Exposes public registration, authentication, token refresh, and protected `/auth/me` profile endpoints.
 *
 * IN SIMPLE WORDS:
 * The API controller handling login, registration, token refresh, and profile requests, fully documented for Swagger UI.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto, UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Public self-registration for new Customer accounts' })
  @ApiResponse({ status: 201, description: 'User account created successfully with CUSTOMER role and JWT tokens.' })
  @ApiResponse({ status: 400, description: 'Validation failure on payload inputs.' })
  @ApiResponse({ status: 409, description: 'Email address already registered.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision new user account with elevated role (ADMIN, STAFF, WAREHOUSE_OPERATOR, CUSTOMER)' })
  @ApiResponse({ status: 201, description: 'Elevated user account created successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires ADMIN role.' })
  @ApiResponse({ status: 409, description: 'Email address already registered.' })
  async createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user credentials and issue dual JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns user profile, access token, and refresh token.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Request() req: any, @Body() dto: LoginDto) {
    // Recorded on the audit entry; behind a proxy this is the proxy address unless
    // Express `trust proxy` is enabled.
    return this.authService.login(dto, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new JWT access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate password reset request and issue password reset token' })
  @ApiResponse({ status: 200, description: 'Password reset request processed successfully.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user profile from JWT Bearer token' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized or missing Bearer token.' })
  getProfile(@Request() req: any) {
    return {
      user: req.user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update the authenticated user's own profile (name, email, phone)" })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  @ApiResponse({ status: 409, description: 'Email address already in use.' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Rotate the authenticated user's password after verifying the current one. Note: existing refresh tokens remain valid until they expire.",
  })
  @ApiResponse({ status: 200, description: 'Password changed.' })
  @ApiResponse({ status: 400, description: 'New password matches the current password.' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect.' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
