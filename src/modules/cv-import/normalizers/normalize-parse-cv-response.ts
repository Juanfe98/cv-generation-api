import { AiNormalizationError } from '../../ai/ai.errors';
import { parseCvResponseSchema, type ParseCvResponse } from '../cv-import.schemas';

export function normalizeParseCvResponse(raw: unknown): ParseCvResponse {
  const parsed = parseCvResponseSchema.safeParse(raw);

  if (!parsed.success) {
    // Model output is untrusted. Never cast invalid data into the app shape; fail safely
    // so the route can return a controlled error instead of leaking malformed fields.
    throw new AiNormalizationError(`Invalid parse-cv AI response: ${parsed.error.message}`);
  }

  return parsed.data;
}
