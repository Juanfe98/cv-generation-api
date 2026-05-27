import { env } from '../../../config/env';
import type { AIProviderName } from '../ai.types';
import { AiConfigurationError } from '../ai.errors';
import type { AIProvider } from './ai-provider';
import { MockAIProvider } from './mock.provider';
import { GeminiAIProvider } from './gemini.provider';
import { OpenRouterAIProvider } from './openrouter.provider';

export type { AIProviderName };

/**
 * Returns the active AIProvider implementation.
 *
 * Provider is read from env.AI_PROVIDER (set at startup).
 * Pass `override` only in tests — never in route or use-case code.
 */
export function createAIProvider(override?: AIProviderName): AIProvider {
  const name: AIProviderName = override ?? (env.NODE_ENV === 'test' ? 'mock' : env.AI_PROVIDER);

  switch (name) {
    case 'mock':
      return new MockAIProvider();
    case 'gemini':
      return new GeminiAIProvider();
    case 'openrouter':
      return new OpenRouterAIProvider();
    default: {
      const exhaustive: never = name;
      throw new AiConfigurationError(
        `Unknown AI provider: "${String(exhaustive)}". Valid values: mock, gemini, openrouter.`,
      );
    }
  }
}
