import { improveTextRequestSchema } from '../validators/ai.schemas';
import { AiValidationError } from '../ai.errors';
import { normalizeSuggestions, type RawSuggestion } from '../normalizers/normalize-suggestions';
import { buildImproveTextPrompt } from '../prompts/improve-text.prompt';
import type { AIProvider } from '../providers/ai-provider';
import type { ImproveTextInput, ImproveTextResult } from '../ai.types';

export interface ImproveTextDeps {
  buildPrompt?: (input: ImproveTextInput) => string;
  normalize?: (items: ReadonlyArray<RawSuggestion>) => ImproveTextResult;
}

export async function improveTextUseCase(
  provider: AIProvider,
  rawInput: unknown,
  deps: ImproveTextDeps = {},
): Promise<ImproveTextResult> {
  const { buildPrompt = buildImproveTextPrompt, normalize = normalizeSuggestions } = deps;

  const parsed = improveTextRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AiValidationError(`Invalid improve-text input: ${parsed.error.message}`);
  }

  const validInput = parsed.data;
  buildPrompt(validInput);

  const raw = await provider.improveText(validInput);
  return normalize(raw.suggestions);
}
