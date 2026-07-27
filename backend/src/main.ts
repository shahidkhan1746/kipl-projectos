import "./polyfills";
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Serve locally-stored uploads (dev fallback when no cloud provider is set)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global validation pipe — uses class-validator decorators
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strip unknown properties
    forbidNonWhitelisted: true,
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
