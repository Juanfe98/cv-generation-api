import type { AnalyzeCvResult } from '../ai.types';
import type { Priority } from '../validators/ai.schemas';

// Shape expected directly from the raw LLM JSON response before normalization.
export interface RawAnalysis {
  score: number;
  strengths: string[];
  improvements: Array<{
    section: string;
    message: string;
    priority: Priority;
  }>;
}

// Converts raw provider analysis output into a typed AnalyzeCvResult.
// Clamps score to 0–100 to guard against malformed provider output.
export function normalizeAnalysis(raw: RawAnalysis): AnalyzeCvResult {
  return {
    score: Math.min(100, Math.max(0, raw.score)),
    strengths: raw.strengths,
    improvements: raw.improvements,
  };
}
