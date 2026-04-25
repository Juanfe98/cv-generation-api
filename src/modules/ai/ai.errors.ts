// Thrown when provider infrastructure fails: network, timeout, HTTP errors.
export class AiProviderError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiProviderError';
    this.cause = cause;
  }
}

// Thrown on invalid user input before calling the provider.
export class AiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiValidationError';
  }
}

// Thrown when provider output cannot be normalized into a usable result.
export class AiNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiNormalizationError';
  }
}

// Thrown when the model returns an empty or structurally unusable response.
export class AiGenerationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiGenerationFailedError';
  }
}

// Thrown by provider stubs that have not been implemented yet.
export class AiNotImplementedError extends Error {
  constructor(feature: string) {
    super(`AI feature not yet implemented: ${feature}`);
    this.name = 'AiNotImplementedError';
  }
}

// Thrown when AI_PROVIDER is set to an unrecognised value or GEMINI_API_KEY is missing.
export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

export type AnyAiError =
  | AiProviderError
  | AiValidationError
  | AiNormalizationError
  | AiGenerationFailedError
  | AiNotImplementedError
  | AiConfigurationError;

export function isAiError(err: unknown): err is AnyAiError {
  return (
    err instanceof AiProviderError ||
    err instanceof AiValidationError ||
    err instanceof AiNormalizationError ||
    err instanceof AiGenerationFailedError ||
    err instanceof AiNotImplementedError ||
    err instanceof AiConfigurationError
  );
}
