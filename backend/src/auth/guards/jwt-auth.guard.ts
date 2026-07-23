/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Authentication Guard extending Passport `AuthGuard('jwt')`.
 * Intercepts incoming HTTP requests to protected routes, verifies the presence and signature of the
 * Bearer JWT Access Token in the Authorization header, and attaches the validated user payload to `req.user`.
 *
 * IN SIMPLE WORDS:
 * A security gatekeeper that blocks anyone who doesn't have a valid, unexpired login token header.
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
