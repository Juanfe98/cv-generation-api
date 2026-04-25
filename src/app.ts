import Fastify, { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import { env } from './config/env';
import { healthRoutes } from './routes/health.routes';
import { aiRoutes } from './routes/ai.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  await app.register(sensible);

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
  await app.register(aiRoutes);

  return app;
}
