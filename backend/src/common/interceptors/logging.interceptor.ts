/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Global Activity & Performance Logging Interceptor implementing `NestInterceptor`.
 * Intercepts all incoming HTTP requests, records request method, URL, client IP, and calculates execution latency in milliseconds.
 * Logs response status codes and errors to standard output using `Logger` for auditability and observability.
 *
 * IN SIMPLE WORDS:
 * A monitoring recorder that logs every API call coming into the server (which route was called, by whom, and how many milliseconds it took).
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const delay = Date.now() - startTime;
          this.logger.log(
            `[${method}] ${url} ${statusCode} - ${delay}ms | IP: ${ip} | User-Agent: ${userAgent}`,
          );
        },
        error: (error) => {
          const delay = Date.now() - startTime;
          const status = error.status || 500;
          this.logger.error(
            `[${method}] ${url} ${status} - ${delay}ms | Error: ${error.message} | IP: ${ip}`,
          );
        },
      }),
    );
  }
}
