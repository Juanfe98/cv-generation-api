import type { AiService } from '../ai.service';
import type { GenerateExperienceBulletsInput, GenerateExperienceBulletsResult } from '../ai.types';

export async function generateExperienceBulletsUseCase(
  service: AiService,
  input: GenerateExperienceBulletsInput,
): Promise<GenerateExperienceBulletsResult> {
  return service.generateExperienceBullets(input);
}
