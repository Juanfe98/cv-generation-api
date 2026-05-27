import type { ImproveTextInput } from '../ai.types';

const OUTPUT_FORMAT = `Return only valid JSON. No markdown. No code fences. No text outside the JSON object.
{
  "suggestions": [
    { "text": "string", "reason": "string" }
  ]
}`;

export function buildImproveTextPrompt(input: ImproveTextInput): string {
  const tone = input.tone ?? 'professional';

  const contextLines = [
    `Section: ${input.section}`,
    `Tone: ${tone}`,
    input.targetRole ? `Target role: ${input.targetRole}` : '',
    `Text: ${input.text}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a professional CV editor. Rewrite the text below and return 2 to 3 improved alternatives.

Rules:
- Preserve the original meaning; do not add claims that are not stated or clearly implied in the original
- Improve clarity, impact, and professional tone
- Write in third person; do not use "I", "we", or "my"
- Adapt the rewrite to the CV section provided
- Apply the requested tone
- Each alternative must be complete and independently usable
- Do not invent specific metrics or achievements not present in the original

${contextLines}

${OUTPUT_FORMAT}`;
}
