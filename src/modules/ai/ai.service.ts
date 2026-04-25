import { createAIProvider } from './providers/provider-factory';
import type { AIProvider } from './providers/ai-provider';
import type {
  AnalyzeCvInput,
  AnalyzeCvResult,
  GenerateExperienceBulletsInput,
  GenerateExperienceBulletsResult,
  ImproveTextInput,
  ImproveTextResult,
} from './ai.types';
import { AiProviderError, isAiError } from './ai.errors';

// Single entry point for all AI operations.
// Wraps provider calls with consistent error handling.
// Use cases call this service; they never instantiate providers directly.
export class AiService {
  private readonly provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider ?? createAIProvider();
  }

  async generateExperienceBullets(
    input: GenerateExperienceBulletsInput,
  ): Promise<GenerateExperienceBulletsResult> {
    try {
      return await this.provider.generateExperienceBullets(input);
    } catch (err) {
      if (isAiError(err)) throw err;
      throw new AiProviderError('Failed to generate experience bullets', err);
    }
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    try {
      return await this.provider.improveText(input);
    } catch (err) {
      if (isAiError(err)) throw err;
      throw new AiProviderError('Failed to improve text', err);
    }
  }

  async analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvResult> {
    try {
      return await this.provider.analyzeCv(input);
    } catch (err) {
      if (isAiError(err)) throw err;
      throw new AiProviderError('Failed to analyze CV', err);
    }
  }
}
