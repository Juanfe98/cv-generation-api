import type { FastifyInstance } from 'fastify';
import { createAIProvider } from '../modules/ai/providers/provider-factory';
import { generateExperienceBulletsUseCase } from '../modules/ai/use-cases/generate-experience-bullets.use-case';
import { improveTextUseCase } from '../modules/ai/use-cases/improve-text.use-case';
import { AiValidationError, AiProviderError, AiNotImplementedError } from '../modules/ai/ai.errors';

interface ErrorBody {
  error: { code: string; message: string };
}

function toErrorResponse(err: unknown): { statusCode: number; body: ErrorBody } {
  if (err instanceof AiValidationError) {
    return {
      statusCode: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: err.message } },
    };
  }
  if (err instanceof AiProviderError || err instanceof AiNotImplementedError) {
    return {
      statusCode: 503,
      body: { error: { code: 'AI_PROVIDER_ERROR', message: 'AI service temporarily unavailable' } },
    };
  }
  return {
    statusCode: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
  };
}

export async function aiRoutes(app: FastifyInstance): Promise<void> {
  const provider = createAIProvider();

  app.post('/api/ai/generate-experience-bullets', async (request, reply) => {
    try {
      const result = await generateExperienceBulletsUseCase(provider, request.body);
      return reply.status(200).send(result);
    } catch (err) {
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });

  app.post('/api/ai/improve-text', async (request, reply) => {
    try {
      const result = await improveTextUseCase(provider, request.body);
      return reply.status(200).send(result);
    } catch (err) {
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });
}
