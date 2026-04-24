import type { GenerateExperienceBulletsInput } from '../ai.types';

// TODO: replace stub with structured few-shot prompt.
export function buildGenerateExperienceBulletsPrompt(input: GenerateExperienceBulletsInput): string {
  const tech = input.technologies?.join(', ') ?? 'not specified';
  return [
    `Generate 3 resume experience bullets for the following role.`,
    `Role: ${input.role}`,
    input.company ? `Company: ${input.company}` : '',
    input.seniority ? `Seniority: ${input.seniority}` : '',
    `Technologies: ${tech}`,
    input.responsibilities ? `Responsibilities: ${input.responsibilities}` : '',
    input.tone ? `Tone: ${input.tone}` : '',
    'Each bullet must start with a strong action verb and include a measurable outcome.',
  ]
    .filter(Boolean)
    .join('\n');
}
