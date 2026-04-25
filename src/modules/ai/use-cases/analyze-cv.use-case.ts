import { analyzeCvRequestSchema } from '../validators/ai.schemas';
import { AiValidationError } from '../ai.errors';
import { normalizeAnalysis } from '../normalizers/normalize-analysis';
import { buildAnalyzeCvPrompt } from '../prompts/analyze-cv.prompt';
import type { AIProvider } from '../providers/ai-provider';
import type { AnalyzeCvInput, AnalyzeCvResult } from '../ai.types';

export interface AnalyzeCvDeps {
  buildPrompt?: (input: AnalyzeCvInput) => string;
  normalize?: (raw: unknown) => AnalyzeCvResult;
}

export async function analyzeCvUseCase(
  provider: AIProvider,
  rawInput: unknown,
  deps: AnalyzeCvDeps = {},
): Promise<AnalyzeCvResult> {
  const {
    buildPrompt = buildAnalyzeCvPrompt,
    normalize = normalizeAnalysis,
  } = deps;

  const parsed = analyzeCvRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AiValidationError(`Invalid analyze-cv input: ${parsed.error.message}`);
  }

  const validInput = parsed.data;
  buildPrompt(validInput);

  const raw = await provider.analyzeCv(validInput);
  return normalize(raw);
}
