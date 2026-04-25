import type { FastifyInstance } from 'fastify';
import { createAIProvider } from '../modules/ai/providers/provider-factory';
import { generateExperienceBulletsUseCase } from '../modules/ai/use-cases/generate-experience-bullets.use-case';
import { improveTextUseCase } from '../modules/ai/use-cases/improve-text.use-case';
import { analyzeCvUseCase } from '../modules/ai/use-cases/analyze-cv.use-case';
import { toErrorResponse, logAiError } from '../modules/ai/ai-error-handler';

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  const provider = createAIProvider();

  app.post('/api/ai/generate-experience-bullets', async (request, reply) => {
    try {
      const result = await generateExperienceBulletsUseCase(provider, request.body);
      return reply.status(200).send(result);
    } catch (err) {
      logAiError(request.log, {
        endpoint: '/api/ai/generate-experience-bullets',
        useCase: 'generateExperienceBullets',
        requestId: request.id,
      }, err);
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });

  app.post('/api/ai/improve-text', async (request, reply) => {
    try {
      const result = await improveTextUseCase(provider, request.body);
      return reply.status(200).send(result);
    } catch (err) {
      logAiError(request.log, {
        endpoint: '/api/ai/improve-text',
        useCase: 'improveText',
        requestId: request.id,
      }, err);
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });

  app.post('/api/ai/analyze-cv', async (request, reply) => {
    try {
      const result = await analyzeCvUseCase(provider, request.body);
      return reply.status(200).send(result);
    } catch (err) {
      logAiError(request.log, {
        endpoint: '/api/ai/analyze-cv',
        useCase: 'analyzeCv',
        requestId: request.id,
      }, err);
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });
}
