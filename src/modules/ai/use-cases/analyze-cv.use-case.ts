import type { AiService } from '../ai.service';
import type { AnalyzeCvInput, AnalyzeCvResult } from '../ai.types';

export async function analyzeCvUseCase(
  service: AiService,
  input: AnalyzeCvInput,
): Promise<AnalyzeCvResult> {
  return service.analyzeCv(input);
}
