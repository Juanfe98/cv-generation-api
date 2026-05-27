import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { createAppDependencies, type AppDependencies } from './app.dependencies';
import { healthRoutes } from './routes/health.routes';
import { aiRoutes } from './routes/ai.routes';
import { cvImportRoutes } from './routes/cv-import.routes';

const BODY_LIMIT_BYTES = 256 * 1024; // 256 KB — sufficient for CV text payloads

export async function buildApp(
  dependencies: AppDependencies = createAppDependencies(),
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    bodyLimit: BODY_LIMIT_BYTES,
  });

  await app.register(sensible);

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);

    const isProduction = env.NODE_ENV === 'production';
    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      statusCode,
      error: isProduction && statusCode >= 500 ? 'Internal Server Error' : error.message,
    });
  });

  await app.register(healthRoutes);

  // Rate-limited scope for AI and CV import routes — skipped in test to prevent flaky tests.
  await app.register(async (scope) => {
    if (env.NODE_ENV !== 'test') {
      await scope.register(rateLimit, {
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW,
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: () => ({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
        }),
      });
    }
    await scope.register(aiRoutes, { provider: dependencies.aiProvider });
    await scope.register(cvImportRoutes, { provider: dependencies.aiProvider });
  });

  return app;
}
