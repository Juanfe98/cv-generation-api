import type { GenerateExperienceBulletsInput } from '../ai.types';

const OUTPUT_FORMAT = `Return only valid JSON. No markdown. No code fences. No text outside the JSON object.
{
  "suggestions": [
    { "text": "string", "reason": "string" }
  ]
}`;

export function buildGenerateExperienceBulletsPrompt(input: GenerateExperienceBulletsInput): string {
  const contextLines = [
    `Role: ${input.role}`,
    input.company       ? `Company: ${input.company}`                          : '',
    input.seniority     ? `Seniority: ${input.seniority}`                      : '',
    input.technologies?.length
                        ? `Technologies: ${input.technologies.join(', ')}`      : '',
    input.responsibilities ? `Responsibilities: ${input.responsibilities}`      : '',
    input.targetRole    ? `Target role: ${input.targetRole}`                   : '',
    input.tone          ? `Tone: ${input.tone}`                                : '',
  ].filter(Boolean).join('\n');

  return `You are a professional CV writer. Generate 3 to 5 experience bullet suggestions for the context below.

Rules:
- Start each bullet with a strong action verb (e.g. Led, Built, Reduced, Delivered, Designed)
- Keep each bullet concise — one sentence, under 25 words
- Write in third person; do not use "I", "we", or "my"
- Do not exaggerate and do not invent specific metrics; if suggesting measurable impact, use generic phrasing (e.g. "significantly reduced", "improved reliability") unless exact numbers appear in the context provided
- Tailor bullets to the role, seniority, technologies, and responsibilities given
- Each suggestion must be distinct and offer a different angle

Context:
${contextLines}

${OUTPUT_FORMAT}`;
}
