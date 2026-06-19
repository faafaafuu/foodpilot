import 'reflect-metadata';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({
    origin: corsOrigin(),
    credentials: true,
  });
  registerSecurityHooks(app);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('FoodPilot API')
      .setDescription('Nutrition planning, calorie tracking, groceries, and cart preparation API.')
      .setVersion('0.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();

function corsOrigin(): boolean | string[] {
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }

  return process.env.NODE_ENV === 'production' ? [] : true;
}

function registerSecurityHooks(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 120);
  const buckets = new Map<string, { count: number; resetAt: number }>();

  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('x-frame-options', 'DENY');
    reply.header('referrer-policy', 'no-referrer');

    const now = Date.now();
    const key = request.ip;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
      done();
      return;
    }

    bucket.count += 1;
    if (bucket.count > rateLimitMax) {
      reply.code(HttpStatus.TOO_MANY_REQUESTS).send({ message: 'Too many requests' });
      return;
    }

    done();
  });
}
