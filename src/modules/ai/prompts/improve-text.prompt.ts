import type { ImproveTextInput } from '../ai.types';

// TODO: replace stub with structured prompt, including tone examples.
export function buildImproveTextPrompt(input: ImproveTextInput): string {
  const tone = input.tone ?? 'professional';
  return [
    `Rewrite the following ${input.section} text to sound more ${tone}.`,
    input.targetRole ? `Target role: ${input.targetRole}` : '',
    `Text: ${input.text}`,
  ]
    .filter(Boolean)
    .join('\n');
}
