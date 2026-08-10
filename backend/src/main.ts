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
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
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

  // Export the spec to disk so the API contract is reviewable without running the server,
  // and so it can drive client generation, mock servers and contract tests.
  // Skipped in production, where the filesystem is typically read-only.
  if (process.env.NODE_ENV !== 'production') {
    writeOpenApiArtifacts(document, logger);
  }

  const port = process.env.PORT || 3000;
  // Bind every interface: a bare `listen(port)` resolves to the IPv6 loopback only,
  // which a phone or a container on the LAN cannot reach.
  await app.listen(port, '0.0.0.0');
  logger.log(`AmmuNation Backend running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger OpenAPI Documentation available at http://localhost:${port}/api/docs`);
}

/**
 * Writes `docs/openapi.json` plus a self-contained Redoc page. Regenerated on every boot,
 * so the committed artefacts cannot drift from the decorators that produced them.
 */
function writeOpenApiArtifacts(document: OpenAPIObject, logger: Logger) {
  try {
    const docsDir = join(process.cwd(), 'docs');
    mkdirSync(docsDir, { recursive: true });

    writeFileSync(
      join(docsDir, 'openapi.json'),
      JSON.stringify(document, null, 2),
      'utf8',
    );

    // Redoc renders the spec inline; the CDN script is the only external dependency,
    // and the spec itself is embedded so the file works offline once cached.
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AmmuNation ERP API Reference</title>
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="redoc"></div>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <script>
      Redoc.init(${JSON.stringify(document)}, { hideDownloadButton: false, theme: { colors: { primary: { main: '#2563EB' } } } }, document.getElementById('redoc'));
    </script>
  </body>
</html>`;

    writeFileSync(join(docsDir, 'api-reference.html'), html, 'utf8');
    logger.log('OpenAPI spec written to backend/docs/openapi.json + api-reference.html');
  } catch (error) {
    // Documentation output must never prevent the API from starting.
    logger.warn(`Could not write OpenAPI artefacts: ${(error as Error).message}`);
  }
}

bootstrap();
