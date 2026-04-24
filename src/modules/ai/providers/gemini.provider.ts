import type { AIProvider } from './ai-provider';
import type {
  AnalyzeCvInput,
  AnalyzeCvResult,
  GenerateExperienceBulletsInput,
  GenerateExperienceBulletsResult,
  ImproveTextInput,
  ImproveTextResult,
} from '../ai.types';
import { AiNotImplementedError } from '../ai.errors';

// Gemini implementation — wire up @google/generative-ai SDK here.
// Each method should: build prompt → call Gemini → normalize response.
export class GeminiAIProvider implements AIProvider {
  async generateExperienceBullets(
    _input: GenerateExperienceBulletsInput,
  ): Promise<GenerateExperienceBulletsResult> {
    throw new AiNotImplementedError('generateExperienceBullets');
  }

  async improveText(_input: ImproveTextInput): Promise<ImproveTextResult> {
    throw new AiNotImplementedError('improveText');
  }

  async analyzeCv(_input: AnalyzeCvInput): Promise<AnalyzeCvResult> {
    throw new AiNotImplementedError('analyzeCv');
  }
}
