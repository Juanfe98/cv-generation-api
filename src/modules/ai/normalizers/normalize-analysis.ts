import { AiNormalizationError } from '../ai.errors';
import { analyzeCvResponseSchema } from '../validators/ai.schemas';
import type { AnalyzeCvResult } from '../ai.types';

const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const MAX_STRENGTHS = 10;

function extractScore(raw: Record<string, unknown>): number {
  if (typeof raw.score !== 'number' || !isFinite(raw.score)) {
    throw new AiNormalizationError('AI analysis response missing a valid numeric score');
  }
  return Math.min(100, Math.max(0, Math.round(raw.score)));
}

function extractStrengths(raw: Record<string, unknown>): string[] {
  const items = Array.isArray(raw.strengths) ? raw.strengths : [];
  return items
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .slice(0, MAX_STRENGTHS)
    .map((s) => s.trim());
}

function extractImprovements(raw: Record<string, unknown>): AnalyzeCvResult['improvements'] {
  const items = Array.isArray(raw.improvements) ? raw.improvements : [];
  return items
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .filter(
      (item) =>
        typeof item.section === 'string' && item.section.trim().length > 0 &&
        typeof item.message === 'string' && item.message.trim().length > 0 &&
        VALID_PRIORITIES.has(item.priority as string),
    )
    .map((item) => ({
      section: (item.section as string).trim(),
      message: (item.message as string).trim(),
      priority: item.priority as 'low' | 'medium' | 'high',
    }));
}

export function normalizeAnalysis(raw: unknown): AnalyzeCvResult {
  if (raw === null || typeof raw !== 'object') {
    throw new AiNormalizationError('AI analysis response is not an object');
  }

  const r = raw as Record<string, unknown>;
  const score = extractScore(r);
  const strengths = extractStrengths(r);
  const improvements = extractImprovements(r);

  const validated = analyzeCvResponseSchema.safeParse({ score, strengths, improvements });
  if (!validated.success) {
    throw new AiNormalizationError(
      `AI analysis normalization failed: ${validated.error.message}`,
    );
  }

  return validated.data;
}
