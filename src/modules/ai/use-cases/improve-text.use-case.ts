import type { AiService } from '../ai.service';
import type { ImproveTextInput, ImproveTextResult } from '../ai.types';

export async function improveTextUseCase(
  service: AiService,
  input: ImproveTextInput,
): Promise<ImproveTextResult> {
  return service.improveText(input);
}
