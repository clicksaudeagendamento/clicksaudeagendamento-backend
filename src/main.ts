import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import logger from './configs/logger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as crypto from 'crypto';

import { bullBoardRouter } from './admin/dynamic-bull-board';
import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as swaggerStats from 'swagger-stats';

// Make crypto available globally
(global as any).crypto = crypto;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // expose static assets from the 'uploads' directory
  // this is where uploaded files will be stored
  // and served via the /uploads/ URL prefix
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // swagger-stats dashboard em /swagger-stats
  app.use(
    swaggerStats.getMiddleware({
      uriPath: '/swagger-stats',
      authentication: true,
      onAuthenticate: (req, username, password) =>
        username === 'admin' && password === 'admin',
    }),
  );

  // Bull Board para filas dinâmicas com autenticação básica
  app.use(
    '/admin/queues',
    basicAuth({
      users: { admin: process.env.BULL_BOARD_PASSWORD || 'admin' },
      challenge: true,
      realm: 'BullBoard',
    }),
    bullBoardRouter,
  );

  await app.listen(process.env.PORT ?? 3001);
  logger.info(`Application running on port ${process.env.PORT ?? 3001}`);
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal error during application bootstrap');
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error: any) => {
  logger.error({ error }, 'Uncaught Exception');
});
