import "./polyfills";
import { NestFactory } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

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

  // Global exception filter — sanitized, uniform error responses
  app.useGlobalFilters(new AllExceptionsFilter());

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

  const port = config.get('PORT') ?? 3000;
  await app.listen(port);
  console.log(`\n  KIPL ProjectOS API running on http://localhost:${port}`);
  console.log(`  Environment: ${config.get('NODE_ENV')}\n`);
}
bootstrap();
