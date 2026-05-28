import 'dotenv/config';
import { z } from 'zod';
import type { AIProviderName } from '../modules/ai/ai.types';

type NodeEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  PORT: number;
  NODE_ENV: NodeEnv;
  AI_PROVIDER: AIProviderName;
  INTERNAL_API_KEY: string;
  GEMINI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL: string;
  CORS_ORIGIN: string | false;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
}

const nodeEnvSchema = z.enum(['development', 'production', 'test']).catch('development');
const aiProviderSchema = z.enum(['mock', 'gemini', 'openrouter']);

const rawEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().catch(3000),
  NODE_ENV: nodeEnvSchema,
  AI_PROVIDER: aiProviderSchema.optional(),
  INTERNAL_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).catch('deepseek/deepseek-chat:free'),
  CORS_ORIGIN: z.string().min(1).optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().catch(60),
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().catch(60_000),
});

function getDefaultProvider(nodeEnv: NodeEnv): AIProviderName {
  return nodeEnv === 'production' ? 'gemini' : 'mock';
}

function getCorsOrigin(value: string | undefined, nodeEnv: NodeEnv): string | false {
  if (value) return value;
  // Production with no explicit origin = no cross-origin access allowed.
  if (nodeEnv === 'production') return false;
  return 'http://localhost:5173';
}

function getInternalApiKey(value: string | undefined, nodeEnv: NodeEnv): string {
  if (value) return value;

  if (nodeEnv === 'production') {
    // Fail fast: a public production backend without this key would expose paid AI routes.
    throw new Error('INTERNAL_API_KEY is required when NODE_ENV=production.');
  }

  // Local/test fallback keeps development simple. It is intentionally predictable and must
  // never be used as a production secret.
  return nodeEnv === 'test' ? 'test-internal-api-key' : 'dev-internal-api-key';
}

const rawEnv = rawEnvSchema.parse(process.env);

export const env: EnvConfig = {
  PORT: rawEnv.PORT,
  NODE_ENV: rawEnv.NODE_ENV,
  AI_PROVIDER: rawEnv.AI_PROVIDER ?? getDefaultProvider(rawEnv.NODE_ENV),
  INTERNAL_API_KEY: getInternalApiKey(rawEnv.INTERNAL_API_KEY, rawEnv.NODE_ENV),
  GEMINI_API_KEY: rawEnv.GEMINI_API_KEY,
  OPENROUTER_API_KEY: rawEnv.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: rawEnv.OPENROUTER_MODEL,
  CORS_ORIGIN: getCorsOrigin(rawEnv.CORS_ORIGIN, rawEnv.NODE_ENV),
  RATE_LIMIT_MAX: rawEnv.RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW: rawEnv.RATE_LIMIT_WINDOW,
};
