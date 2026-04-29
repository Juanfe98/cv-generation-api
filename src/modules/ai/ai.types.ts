// ai.types.ts re-exports schema-inferred types under the naming convention used
// by the provider interface (*Input / *Result). Schemas remain the single source
// of truth for shapes; this file is the import point for the rest of the module.

import type {
  AiSuggestion,
  AnalyzeCvRequest,
  AnalyzeCvResponse,
  GenerateExperienceBulletsRequest,
  ImproveTextRequest,
  SuggestionsResponse,
} from './validators/ai.schemas';

export type AIProviderName = 'mock' | 'gemini' | 'openrouter';

export type { AiSuggestion };

export type GenerateExperienceBulletsInput = GenerateExperienceBulletsRequest;
export type GenerateExperienceBulletsResult = SuggestionsResponse;

export type ImproveTextInput = ImproveTextRequest;
export type ImproveTextResult = SuggestionsResponse;

export type AnalyzeCvInput = AnalyzeCvRequest;
export type AnalyzeCvResult = AnalyzeCvResponse;
