import type { AiSuggestion } from '../ai.types';

// Converts raw provider output into typed AiSuggestion[].
// Use inside provider implementations when the LLM returns plain text arrays.
export function normalizeSuggestions(
  items: ReadonlyArray<{ text: string; reason?: string }>,
): AiSuggestion[] {
  return items.map(({ text, reason }) =>
    reason !== undefined ? { text, reason } : { text },
  );
}
