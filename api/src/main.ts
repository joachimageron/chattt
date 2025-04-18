import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Configure CORS to allow cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Parse cookies
  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((e) => console.log('Application failed to start', e));
