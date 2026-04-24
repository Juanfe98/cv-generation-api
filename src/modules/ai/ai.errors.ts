export class AiProviderError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiProviderError';
    this.cause = cause;
  }
}

export class AiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiValidationError';
  }
}

// Thrown by provider stubs that have not been implemented yet.
export class AiNotImplementedError extends Error {
  constructor(feature: string) {
    super(`AI feature not yet implemented: ${feature}`);
    this.name = 'AiNotImplementedError';
  }
}

// Thrown when AI_PROVIDER is set to an unrecognised value.
export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}
