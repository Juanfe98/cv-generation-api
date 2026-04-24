import type {
  AnalyzeCvInput,
  AnalyzeCvResult,
  GenerateExperienceBulletsInput,
  GenerateExperienceBulletsResult,
  ImproveTextInput,
  ImproveTextResult,
} from '../ai.types';

// All AI providers must implement this interface.
// Routes and use-cases depend only on this abstraction, never on a concrete provider.
export interface AIProvider {
  generateExperienceBullets(input: GenerateExperienceBulletsInput): Promise<GenerateExperienceBulletsResult>;
  improveText(input: ImproveTextInput): Promise<ImproveTextResult>;
  analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvResult>;
}
