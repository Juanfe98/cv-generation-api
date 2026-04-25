import { httpsPost, HttpError } from '../../../lib/http';
import type { AIProvider } from './ai-provider';
import type {
  AnalyzeCvInput,
  AnalyzeCvResult,
  GenerateExperienceBulletsInput,
  GenerateExperienceBulletsResult,
  ImproveTextInput,
  ImproveTextResult,
} from '../ai.types';
import { AiConfigurationError, AiProviderError } from '../ai.errors';
import { buildGenerateExperienceBulletsPrompt } from '../prompts/generate-experience-bullets.prompt';
import { buildImproveTextPrompt } from '../prompts/improve-text.prompt';
import { buildAnalyzeCvPrompt } from '../prompts/analyze-cv.prompt';
import { normalizeAnalysis, type RawAnalysis } from '../normalizers/normalize-analysis';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 20_000;

type GeminiApiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: unknown }> };
  }>;
};

function extractModelText(body: unknown): string {
  const response = body as GeminiApiResponse;
  const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiProviderError('Unexpected Gemini response shape: could not extract model text');
  }
  return text;
}

export class GeminiAIProvider implements AIProvider {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new AiConfigurationError(
        'GEMINI_API_KEY is not set. Set this environment variable to use the Gemini provider.',
      );
    }
    this.apiKey = key;
  }

  // Public so tests can spy on it without calling the real API.
  async callGemini(prompt: string): Promise<unknown> {
    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    let apiResponse: unknown;
    try {
      apiResponse = await httpsPost(url, payload, DEFAULT_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof Error && err.message.includes('timed out')) {
        throw new AiProviderError('Gemini request timed out after 20s', err);
      }
      if (err instanceof HttpError) {
        throw new AiProviderError(`Gemini API error: ${err.message}`, err);
      }
      throw new AiProviderError('Gemini request failed', err);
    }

    const modelText = extractModelText(apiResponse);

    try {
      return JSON.parse(modelText);
    } catch (err) {
      throw new AiProviderError('Gemini returned invalid JSON in model output', err);
    }
  }

  async generateExperienceBullets(
    input: GenerateExperienceBulletsInput,
  ): Promise<GenerateExperienceBulletsResult> {
    const prompt = buildGenerateExperienceBulletsPrompt(input);
    const raw = (await this.callGemini(prompt)) as { suggestions?: unknown[] };
    return { suggestions: (raw.suggestions ?? []) as GenerateExperienceBulletsResult['suggestions'] };
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    const prompt = buildImproveTextPrompt(input);
    const raw = (await this.callGemini(prompt)) as { suggestions?: unknown[] };
    return { suggestions: (raw.suggestions ?? []) as ImproveTextResult['suggestions'] };
  }

  async analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvResult> {
    const prompt = buildAnalyzeCvPrompt(input);
    const raw = (await this.callGemini(prompt)) as RawAnalysis;
    return normalizeAnalysis(raw);
  }
}
