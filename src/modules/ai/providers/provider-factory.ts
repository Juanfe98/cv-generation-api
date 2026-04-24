import { env } from '../../../config/env';
import type { AIProviderName } from '../ai.types';
import type { AIProvider } from './ai-provider';
import { MockAIProvider } from './mock.provider';
import { GeminiAIProvider } from './gemini.provider';

export type { AIProviderName };

// Selects the active provider from env. Falls back to mock in test/dev.
export function createAIProvider(override?: AIProviderName): AIProvider {
  const name: AIProviderName = override ?? env.AI_PROVIDER;

  switch (name) {
    case 'mock':
      return new MockAIProvider();
    case 'gemini':
      return new GeminiAIProvider();
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown AI provider: ${String(exhaustive)}`);
    }
  }
}
