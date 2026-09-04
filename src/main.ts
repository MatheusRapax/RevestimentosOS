import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { env, validateEnv } from './config/env';
import { AuditInterceptor } from './core/audit/audit.interceptor';
import { AuditService } from './core/audit/audit.service';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  // Validate environment variables
  validateEnv();

  // Create NestJS application
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Increase body parser limits for large import payloads and preserve rawBody for webhooks
  app.use(
    bodyParser.json({
      limit: '50mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // L4: log de request só fora de produção (e ainda assim enxuto). Antes logava
  // método/URL/origin/User-Agent de toda request, inclusive em produção.
  if (env.nodeEnv !== 'production') {
    app.use((req: any, res: any, next: any) => {
      console.log(`📡 ${req.method} ${req.url}`);
      next();
    });
  }

  // Enable CORS for future frontend integration
  // Enable CORS with explicit options
  app.enableCors({
    origin: [
      'https://frontend.moa.software',
      'http://frontend.moa.software',
      'http://localhost:3001',
      'http://localhost:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Clinic-Id',
  });

  // Global audit interceptor
  const auditService = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(auditService));

  // Start server
  await app.listen(env.port);

  console.log(`🚀 MOA NEXUS API running on http://localhost:${env.port}`);
  console.log(`📊 Health check: http://localhost:${env.port}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${env.port}/auth`);
}

bootstrap();
