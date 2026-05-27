import { createAIProvider } from './modules/ai/providers/provider-factory';
import type { AIProvider } from './modules/ai/providers/ai-provider';

export interface AppDependencies {
  aiProvider: AIProvider;
}

export function createAppDependencies(): AppDependencies {
  return {
    aiProvider: createAIProvider(),
  };
}
