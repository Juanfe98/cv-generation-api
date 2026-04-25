import type { AnalyzeCvInput } from '../ai.types';

const OUTPUT_FORMAT = `Return only valid JSON. No markdown. No code fences. No text outside the JSON object.
{
  "score": 0-100,
  "strengths": ["string"],
  "improvements": [
    { "section": "string", "message": "string", "priority": "low|medium|high" }
  ]
}`;

export function buildAnalyzeCvPrompt(input: AnalyzeCvInput): string {
  const contextLines = [
    input.targetRole ? `Target role: ${input.targetRole}` : '',
    `CV: ${JSON.stringify(input.cv)}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a professional CV reviewer. Analyze the CV below and return a structured assessment.

Rules:
- Score from 0 to 100 based on clarity, impact, and relevance to the target role
- List up to 5 concrete strengths
- List specific improvements with section, actionable message, and priority (high/medium/low)
- Do not invent experience or credentials not present in the CV
- Be specific and actionable, not generic

${contextLines}

${OUTPUT_FORMAT}`;
}
