import 'dotenv/config';
import type { AIProviderName } from '../modules/ai/ai.types';

type NodeEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  PORT: number;
  NODE_ENV: NodeEnv;
  AI_PROVIDER: AIProviderName;
  CORS_ORIGIN: string | false;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: number;
}

function getNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

const VALID_AI_PROVIDERS: AIProviderName[] = ['mock', 'gemini', 'openrouter'];

function getAIProvider(value: string | undefined, nodeEnv: NodeEnv): AIProviderName {
  if (value === undefined || value === '') {
    return nodeEnv === 'production' ? 'gemini' : 'mock';
  }
  if (value === 'mock' || value === 'gemini' || value === 'openrouter') return value;
  throw new Error(
    `Invalid AI_PROVIDER: "${value}". Valid values: ${VALID_AI_PROVIDERS.join(', ')}.`,
  );
}

function getCorsOrigin(value: string | undefined, nodeEnv: NodeEnv): string | false {
  if (value) return value;
  // Production with no explicit origin = no cross-origin access allowed.
  if (nodeEnv === 'production') return false;
  return 'http://localhost:5173';
}

function getPositiveInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (!isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

const nodeEnv = getNodeEnv(process.env.NODE_ENV);

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: nodeEnv,
  AI_PROVIDER: getAIProvider(process.env.AI_PROVIDER, nodeEnv),
  CORS_ORIGIN: getCorsOrigin(process.env.CORS_ORIGIN, nodeEnv),
  RATE_LIMIT_MAX: getPositiveInt(process.env.RATE_LIMIT_MAX, 60),
  RATE_LIMIT_WINDOW: getPositiveInt(process.env.RATE_LIMIT_WINDOW, 60_000),
};
