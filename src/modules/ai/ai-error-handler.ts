import {
  AiValidationError,
  AiProviderError,
  AiNormalizationError,
  AiGenerationFailedError,
  AiNotImplementedError,
  AiConfigurationError,
  isAiError,
} from './ai.errors';

export interface ErrorBody {
  error: { code: string; message: string };
}

export interface AiErrorContext {
  endpoint: string;
  useCase: string;
  requestId?: string;
}

export interface AiLogger {
  error(obj: Record<string, unknown>, msg: string): void;
}

export function toErrorResponse(err: unknown): { statusCode: number; body: ErrorBody } {
  if (err instanceof AiValidationError) {
    return {
      statusCode: 400,
      body: { error: { code: 'AI_VALIDATION_ERROR', message: err.message } },
    };
  }
  if (err instanceof AiNormalizationError) {
    return {
      statusCode: 503,
      body: { error: { code: 'AI_NORMALIZATION_ERROR', message: 'AI service returned unusable output' } },
    };
  }
  if (err instanceof AiGenerationFailedError) {
    return {
      statusCode: 503,
      body: { error: { code: 'AI_GENERATION_FAILED', message: 'AI service failed to generate a response' } },
    };
  }
  if (err instanceof AiProviderError || err instanceof AiNotImplementedError) {
    return {
      statusCode: 503,
      body: { error: { code: 'AI_PROVIDER_ERROR', message: 'AI service temporarily unavailable' } },
    };
  }
  if (err instanceof AiConfigurationError) {
    return {
      statusCode: 503,
      body: { error: { code: 'AI_CONFIGURATION_ERROR', message: 'AI service is not configured correctly' } },
    };
  }
  return {
    statusCode: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
  };
}

export function logAiError(log: AiLogger, context: AiErrorContext, err: unknown): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const entry: Record<string, unknown> = {
    endpoint: context.endpoint,
    useCase: context.useCase,
    provider: process.env.AI_PROVIDER ?? 'unknown',
    ...(context.requestId !== undefined ? { requestId: context.requestId } : {}),
    errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
    // Safe to log message for typed AI errors. For unknown errors in production,
    // avoid leaking internal details (framework messages, DB errors, etc.).
    errorMessage: isAiError(err) || !isProduction
      ? (err instanceof Error ? err.message : String(err))
      : 'Unhandled error',
    // Stack traces only outside production to avoid leaking internals.
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  };

  log.error(entry, 'AI request failed');
}
