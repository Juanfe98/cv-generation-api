import 'dotenv/config';

type NodeEnv = 'development' | 'production' | 'test';

interface EnvConfig {
  PORT: number;
  NODE_ENV: NodeEnv;
}

function getNodeEnv(value: string | undefined): NodeEnv {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: getNodeEnv(process.env.NODE_ENV),
};
