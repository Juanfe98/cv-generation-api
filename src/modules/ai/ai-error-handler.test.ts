import { toErrorResponse, logAiError, type AiLogger } from './ai-error-handler';
import {
  AiValidationError,
  AiProviderError,
  AiNormalizationError,
  AiGenerationFailedError,
  AiNotImplementedError,
  AiConfigurationError,
} from './ai.errors';

function mockLogger(): { error: jest.Mock } & AiLogger {
  return { error: jest.fn() };
}

const BASE_CONTEXT = { endpoint: '/api/ai/test', useCase: 'testUseCase' };

// ─── toErrorResponse ──────────────────────────────────────────────────────────

describe('toErrorResponse', () => {
  it('maps AiValidationError to 400 AI_VALIDATION_ERROR', () => {
    const err = new AiValidationError('role is required');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(400);
    expect(body.error.code).toBe('AI_VALIDATION_ERROR');
    expect(body.error.message).toBe('role is required');
  });

  it('preserves user-facing message for validation errors', () => {
    const err = new AiValidationError('text must not exceed 3000 characters');
    const { body } = toErrorResponse(err);

    expect(body.error.message).toBe('text must not exceed 3000 characters');
  });

  it('maps AiNormalizationError to 503 AI_NORMALIZATION_ERROR', () => {
    const err = new AiNormalizationError('no valid suggestions');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(503);
    expect(body.error.code).toBe('AI_NORMALIZATION_ERROR');
    expect(body.error.message).toBe('AI service returned unusable output');
  });

  it('does not expose internal normalization message to client', () => {
    const err = new AiNormalizationError('internal detail about provider output');
    const { body } = toErrorResponse(err);

    expect(body.error.message).not.toContain('internal detail');
  });

  it('maps AiGenerationFailedError to 503 AI_GENERATION_FAILED', () => {
    const err = new AiGenerationFailedError('model returned empty response');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(503);
    expect(body.error.code).toBe('AI_GENERATION_FAILED');
    expect(body.error.message).toBe('AI service failed to generate a response');
  });

  it('maps AiProviderError to 503 AI_PROVIDER_ERROR', () => {
    const err = new AiProviderError('request timed out');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(503);
    expect(body.error.code).toBe('AI_PROVIDER_ERROR');
    expect(body.error.message).toBe('AI service temporarily unavailable');
  });

  it('does not expose internal provider message to client', () => {
    const err = new AiProviderError('HTTP 429 from https://api.key.internal/secret');
    const { body } = toErrorResponse(err);

    expect(body.error.message).toBe('AI service temporarily unavailable');
    expect(body.error.message).not.toContain('429');
    expect(body.error.message).not.toContain('internal');
  });

  it('maps AiNotImplementedError to 503 AI_PROVIDER_ERROR', () => {
    const err = new AiNotImplementedError('analyzeCv');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(503);
    expect(body.error.code).toBe('AI_PROVIDER_ERROR');
  });

  it('maps AiConfigurationError to 503 AI_CONFIGURATION_ERROR', () => {
    const err = new AiConfigurationError('GEMINI_API_KEY is not set');
    const { statusCode, body } = toErrorResponse(err);

    expect(statusCode).toBe(503);
    expect(body.error.code).toBe('AI_CONFIGURATION_ERROR');
    expect(body.error.message).toBe('AI service is not configured correctly');
  });

  it('does not expose API key details in configuration error response', () => {
    const err = new AiConfigurationError('GEMINI_API_KEY is not set');
    const { body } = toErrorResponse(err);

    expect(body.error.message).not.toContain('GEMINI_API_KEY');
  });

  it('maps unknown error to 500 INTERNAL_ERROR', () => {
    const { statusCode, body } = toErrorResponse(new Error('unexpected'));

    expect(statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('maps non-Error value to 500 INTERNAL_ERROR', () => {
    const { statusCode, body } = toErrorResponse('string error');

    expect(statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('response always has error.code and error.message as strings', () => {
    const errors = [
      new AiValidationError('x'),
      new AiProviderError('x'),
      new AiNormalizationError('x'),
      new AiGenerationFailedError('x'),
      new AiConfigurationError('x'),
      new Error('x'),
      null,
    ];

    for (const err of errors) {
      const { body } = toErrorResponse(err);
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
    }
  });
});

// ─── logAiError ───────────────────────────────────────────────────────────────

describe('logAiError', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs endpoint, useCase, provider, and errorType', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('timeout'));

    expect(log.error).toHaveBeenCalledTimes(1);
    const [entry] = log.error.mock.calls[0];
    expect(entry.endpoint).toBe('/api/ai/test');
    expect(entry.useCase).toBe('testUseCase');
    expect(typeof entry.provider).toBe('string');
    expect(entry.errorType).toBe('AiProviderError');
  });

  it('includes requestId when provided', () => {
    const log = mockLogger();
    logAiError(log, { ...BASE_CONTEXT, requestId: 'req-abc-123' }, new AiProviderError('x'));

    const [entry] = log.error.mock.calls[0];
    expect(entry.requestId).toBe('req-abc-123');
  });

  it('omits requestId when not provided', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('x'));

    const [entry] = log.error.mock.calls[0];
    expect(entry).not.toHaveProperty('requestId');
  });

  it('logs error message for typed AI errors', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('request timed out'));

    const [entry] = log.error.mock.calls[0];
    expect(entry.errorMessage).toBe('request timed out');
  });

  it('logs error message for validation errors', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiValidationError('role is required'));

    const [entry] = log.error.mock.calls[0];
    expect(entry.errorMessage).toBe('role is required');
  });

  it('logs errorType as UnknownError for non-Error values', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, 'plain string error');

    const [entry] = log.error.mock.calls[0];
    expect(entry.errorType).toBe('UnknownError');
  });

  it('does not include stack trace when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('timeout'));

    const [entry] = log.error.mock.calls[0];
    expect(entry).not.toHaveProperty('stack');
  });

  it('includes stack trace when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'test';
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('timeout'));

    const [entry] = log.error.mock.calls[0];
    expect(entry).toHaveProperty('stack');
  });

  it('uses "AI request failed" as the log message', () => {
    const log = mockLogger();
    logAiError(log, BASE_CONTEXT, new AiProviderError('x'));

    const [, msg] = log.error.mock.calls[0];
    expect(msg).toBe('AI request failed');
  });
});
