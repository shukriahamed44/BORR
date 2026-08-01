/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Main Application Bootstrap Entry Point (`main.ts`).
 * Instantiates NestJS HTTP Application instance, configures global DTO validation pipes with strict payload stripping,
 * applies global activity logging interceptors, sets `/api/v1` global route prefix, enables CORS,
 * and initializes Swagger OpenAPI Documentation at `/api/docs`.
 *
 * IN SIMPLE WORDS:
 * The starting file that launches the server, enforces validation and security rules, and serves live Swagger API docs at /api/docs.
 */

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Route Prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend and mobile access
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Input Validation Pipe with payload sanitation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global HTTP Activity Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger OpenAPI Auto-Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('AmmuNation Enterprise ERP API')
    .setDescription(
      'Enterprise Resource Planning API documentation for AmmuNation backend services, including Authentication, RBAC, Equipment Management, Reservations, Payments, and Inventory Logs.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`AmmuNation Backend running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation available at http://localhost:${port}/api/docs`);
}
bootstrap();
