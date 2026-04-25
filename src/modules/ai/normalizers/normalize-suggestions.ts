import { AiNormalizationError } from '../ai.errors';
import { suggestionsResponseSchema } from '../validators/ai.schemas';
import type { SuggestionsResponse } from '../validators/ai.schemas';

const MAX_TEXT_LENGTH = 600;
const MAX_REASON_LENGTH = 400;
const MAX_SUGGESTIONS = 5;

// Shape expected directly from raw LLM JSON response before normalization.
export interface RawSuggestion {
  text?: unknown;
  reason?: unknown;
}

function toValidText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

function toValidReason(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_REASON_LENGTH) : undefined;
}

export function normalizeSuggestions(
  items: ReadonlyArray<RawSuggestion>,
): SuggestionsResponse {
  const valid: Array<{ text: string; reason?: string }> = [];

  for (const item of items) {
    if (valid.length >= MAX_SUGGESTIONS) break;

    const text = toValidText(item.text);
    if (!text) continue;

    const reason = toValidReason(item.reason);
    valid.push(reason !== undefined ? { text, reason } : { text });
  }

  const parsed = suggestionsResponseSchema.safeParse({ suggestions: valid });

  if (!parsed.success) {
    throw new AiNormalizationError(
      'AI suggestions normalization failed: no valid suggestions in provider output',
    );
  }

  return parsed.data;
}
