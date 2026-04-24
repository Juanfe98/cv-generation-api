import type { AnalyzeCvInput } from '../ai.types';

// TODO: replace stub with structured prompt that requests JSON output matching AnalyzeCvResult.
export function buildAnalyzeCvPrompt(input: AnalyzeCvInput): string {
  return [
    'Analyze the following CV and return a structured assessment.',
    input.targetRole ? `Target role: ${input.targetRole}` : '',
    `CV: ${JSON.stringify(input.cv)}`,
  ]
    .filter(Boolean)
    .join('\n');
}
