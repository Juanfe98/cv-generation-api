import { generateExperienceBulletsRequestSchema } from '../validators/ai.schemas';
import { AiValidationError } from '../ai.errors';
import { normalizeSuggestions, type RawSuggestion } from '../normalizers/normalize-suggestions';
import { buildGenerateExperienceBulletsPrompt } from '../prompts/generate-experience-bullets.prompt';
import type { AIProvider } from '../providers/ai-provider';
import type { GenerateExperienceBulletsInput, GenerateExperienceBulletsResult } from '../ai.types';

export interface GenerateExperienceBulletsDeps {
  buildPrompt?: (input: GenerateExperienceBulletsInput) => string;
  normalize?: (items: ReadonlyArray<RawSuggestion>) => GenerateExperienceBulletsResult;
}

export async function generateExperienceBulletsUseCase(
  provider: AIProvider,
  rawInput: unknown,
  deps: GenerateExperienceBulletsDeps = {},
): Promise<GenerateExperienceBulletsResult> {
  const {
    buildPrompt = buildGenerateExperienceBulletsPrompt,
    normalize = normalizeSuggestions,
  } = deps;

  const parsed = generateExperienceBulletsRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AiValidationError(`Invalid generate-experience-bullets input: ${parsed.error.message}`);
  }

  const validInput = parsed.data;
  buildPrompt(validInput);

  const raw = await provider.generateExperienceBullets(validInput);
  return normalize(raw.suggestions);
}
