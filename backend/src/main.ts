import "./polyfills";
import { NestFactory } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SystemLogsService } from './system-logs/system-logs.service';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { applyPendingMigrations } from './common/schema-migrations';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  if (config.get('NODE_ENV') === 'production') {
    const missing = ['JWT_SECRET', 'JWT_REFRESH_SECRET']
      .filter((key) => !config.get(key));
    if (missing.length) {
      throw new Error(`Missing required production configuration: ${missing.join(', ')}`);
    }
  }

  // Behind the Vercel rewrite of /api/v1/*, so the socket address is the proxy
  // for every caller. Without this, req.ip is Vercel's edge and rate limiting
  // buckets the whole company together. Honouring X-Forwarded-For makes it the
  // caller again — client-supplied and so spoofable, which is why the throttler
  // prefers the token subject and the login email over it (see
  // common/user-throttler.guard.ts).
  app.set('trust proxy', true);

  // Global exception filter — sanitized uniform error responses and persistent database logging
  let systemLogsService: SystemLogsService | undefined;
  try {
    systemLogsService = app.get(SystemLogsService, { strict: false });
  } catch {}
  app.useGlobalFilters(new AllExceptionsFilter(systemLogsService));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Global validation pipe — uses class-validator decorators
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strip unknown properties
    forbidNonWhitelisted: false,
    transform: true,        // auto-transform payloads to DTO types
    transformOptions: { enableImplicitConversion: true },
  }));

  // CORS — allow frontend. FRONTEND_URL may be a comma-separated list of origins
  // (e.g. the custom domain, the www variant and the *.vercel.app URL).
  const allowedOrigins = [
    ...String(config.get('FRONTEND_URL') ?? '')
      .split(',').map(o => o.trim()).filter(Boolean),
    'http://localhost:5173',
    'http://localhost:4173',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Schema before traffic. Production runs with synchronize off, so a deploy
  // that adds a column and forgets the migration used to boot cleanly and then
  // fail every read of the affected table — see common/schema-migrations.ts.
  if (config.get('DB_AUTO_MIGRATE') !== 'false') {
    try {
      await applyPendingMigrations(app.get(DataSource));
    } catch (err) {
      // Never a reason to refuse to start: a migration that cannot apply must
      // not take a working API down with it. It must not be quiet, though.
      new Logger('Bootstrap').error(
        `Startup migrations could not run: ${(err as Error)?.message ?? err}`,
      );
    }
  }

  const port = config.get('PORT') ?? 3000;
  await app.listen(port);
  console.log(`\n  KIPL ProjectOS API running on http://localhost:${port}`);
  console.log(`  Environment: ${config.get('NODE_ENV')}\n`);
}
bootstrap();
