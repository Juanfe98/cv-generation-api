import { env } from '../../../config/env';
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
import { AiConfigurationError, AiGenerationFailedError, AiProviderError } from '../ai.errors';
import { buildGenerateExperienceBulletsPrompt } from '../prompts/generate-experience-bullets.prompt';
import { buildImproveTextPrompt } from '../prompts/improve-text.prompt';
import { buildAnalyzeCvPrompt } from '../prompts/analyze-cv.prompt';
import { normalizeAnalysis } from '../normalizers/normalize-analysis';
import { buildParseCvPrompt } from '../../cv-import/prompts/parse-cv.prompt';
import type { ParseCvResponse } from '../../cv-import/cv-import.schemas';
import { normalizeParseCvResponse } from '../../cv-import/normalizers/normalize-parse-cv-response';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek/deepseek-chat:free';
const DEFAULT_TIMEOUT_MS = 30_000;

function getDefaultReferer(): string {
  if (typeof env.CORS_ORIGIN === 'string') return env.CORS_ORIGIN;
  if (Array.isArray(env.CORS_ORIGIN)) return env.CORS_ORIGIN[0] ?? 'http://localhost:5173';
  return 'http://localhost:5173';
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: { content?: unknown };
  }>;
};

export interface OpenRouterAIProviderOptions {
  apiKey?: string;
  model?: string;
  referer?: string;
}

export class OpenRouterAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly headers: Record<string, string>;

  constructor(options: OpenRouterAIProviderOptions = {}) {
    const key = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new AiConfigurationError(
        'OPENROUTER_API_KEY is not set. Set this environment variable to use the OpenRouter provider.',
      );
    }
    this.apiKey = key;
    this.model = options.model ?? env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': options.referer ?? getDefaultReferer(),
      'X-Title': 'CV Builder',
    };
  }

  async callOpenRouter(prompt: string): Promise<unknown> {
    const payload = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    };

    let apiResponse: unknown;
    try {
      apiResponse = await httpsPost(OPENROUTER_API_URL, payload, DEFAULT_TIMEOUT_MS, this.headers);
    } catch (err) {
      if (err instanceof Error && err.message.includes('timed out')) {
        throw new AiProviderError(
          `OpenRouter request timed out after ${DEFAULT_TIMEOUT_MS / 1000}s`,
          err,
        );
      }
      if (err instanceof HttpError) {
        throw new AiProviderError(`OpenRouter API error: ${err.message}`, err);
      }
      throw new AiProviderError('OpenRouter request failed', err);
    }

    const response = apiResponse as OpenRouterResponse;
    const content = response?.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || !content.trim()) {
      throw new AiGenerationFailedError('OpenRouter returned an empty or malformed response');
    }

    try {
      return JSON.parse(content);
    } catch (err) {
      throw new AiProviderError('OpenRouter returned invalid JSON in model output', err);
    }
  }

  async generateExperienceBullets(
    input: GenerateExperienceBulletsInput,
  ): Promise<GenerateExperienceBulletsResult> {
    const prompt = buildGenerateExperienceBulletsPrompt(input);
    const raw = (await this.callOpenRouter(prompt)) as { suggestions?: unknown[] };
    return {
      suggestions: (raw.suggestions ?? []) as GenerateExperienceBulletsResult['suggestions'],
    };
  }

  async improveText(input: ImproveTextInput): Promise<ImproveTextResult> {
    const prompt = buildImproveTextPrompt(input);
    const raw = (await this.callOpenRouter(prompt)) as { suggestions?: unknown[] };
    return { suggestions: (raw.suggestions ?? []) as ImproveTextResult['suggestions'] };
  }

  async analyzeCv(input: AnalyzeCvInput): Promise<AnalyzeCvResult> {
    const prompt = buildAnalyzeCvPrompt(input);
    const raw = await this.callOpenRouter(prompt);
    return normalizeAnalysis(raw);
  }

  async parseCv(cvText: string): Promise<ParseCvResponse> {
    const prompt = buildParseCvPrompt(cvText);
    const raw = await this.callOpenRouter(prompt);
    return normalizeParseCvResponse(raw);
  }
}
