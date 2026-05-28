import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { createAppDependencies, type AppDependencies } from './app.dependencies';
import { createInternalApiKeyAuthHook } from './modules/auth/internal-api-key-auth';
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

  const rateLimitErrorResponse = () => ({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  });

  // Protected AI scope. Auth runs onRequest so unauthorized calls are rejected before
  // JSON parsing, validation, provider selection, or AI provider work.
  await app.register(async (scope) => {
    scope.addHook('onRequest', createInternalApiKeyAuthHook());

    // Rate limiting is skipped in test to prevent flaky tests.
    if (env.NODE_ENV !== 'test') {
      await scope.register(rateLimit, {
        max: env.AI_RATE_LIMIT_MAX,
        timeWindow: env.AI_RATE_LIMIT_WINDOW,
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: rateLimitErrorResponse,
      });
    }

    await scope.register(aiRoutes, { provider: dependencies.aiProvider });
  });

  // Protected CV import scope. It has a lower default limit because uploads and parsing are
  // heavier than JSON-only AI actions and can trigger costly model calls.
  await app.register(async (scope) => {
    scope.addHook('onRequest', createInternalApiKeyAuthHook());

    if (env.NODE_ENV !== 'test') {
      await scope.register(rateLimit, {
        max: env.CV_PARSE_RATE_LIMIT_MAX,
        timeWindow: env.CV_PARSE_RATE_LIMIT_WINDOW,
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: rateLimitErrorResponse,
      });
    }

    await scope.register(cvImportRoutes, { provider: dependencies.aiProvider });
  });

  return app;
}
