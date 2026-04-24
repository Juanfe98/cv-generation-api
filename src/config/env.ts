import 'dotenv/config';
import type { AIProviderName } from '../modules/ai/ai.types';

type NodeEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  PORT: number;
  NODE_ENV: NodeEnv;
  AI_PROVIDER: AIProviderName;
}

function getNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

const VALID_AI_PROVIDERS: AIProviderName[] = ['mock', 'gemini'];

function getAIProvider(value: string | undefined, nodeEnv: NodeEnv): AIProviderName {
  if (value === undefined || value === '') {
    return nodeEnv === 'production' ? 'gemini' : 'mock';
  }
  if (value === 'mock' || value === 'gemini') return value;
  throw new Error(
    `Invalid AI_PROVIDER: "${value}". Valid values: ${VALID_AI_PROVIDERS.join(', ')}.`,
  );
}

const nodeEnv = getNodeEnv(process.env.NODE_ENV);

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: nodeEnv,
  AI_PROVIDER: getAIProvider(process.env.AI_PROVIDER, nodeEnv),
};
