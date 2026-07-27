"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./polyfills");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const path_1 = require("path");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const config = app.get(config_1.ConfigService);
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
        origin: [
            config.get('FRONTEND_URL') ?? 'http://localhost:5173',
            'http://localhost:5173',
            'http://localhost:4173',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.setGlobalPrefix('api/v1');
    const port = config.get('PORT') ?? 3000;
    await app.listen(port);
    console.log(`\n  KIPL ProjectOS API running on http://localhost:${port}`);
    console.log(`  Environment: ${config.get('NODE_ENV')}\n`);
}
bootstrap();
//# sourceMappingURL=main.js.map