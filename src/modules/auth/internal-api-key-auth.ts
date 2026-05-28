import { createHash, timingSafeEqual } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env';

export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

type AuthFailureReason = 'missing_api_key' | 'invalid_api_key';

function unauthorizedResponse(): { error: { code: string; message: string } } {
  return {
    error: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    },
  };
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

export function validateInternalApiKey(
  receivedKey: string | undefined,
  expectedKey: string,
): boolean {
  if (!receivedKey) return false;

  // Compare fixed-length hashes so timingSafeEqual can be used even when the raw
  // strings have different lengths. Never compare secrets with plain ===.
  return timingSafeEqual(sha256(receivedKey), sha256(expectedKey));
}

function logAuthFailure(request: FastifyRequest, reason: AuthFailureReason): void {
  // Safe metadata only: never log the received or expected API key.
  request.log.warn(
    {
      event: 'api_auth_failed',
      reason,
      method: request.method,
      url: request.url,
      requestId: request.id,
    },
    'Internal API authentication failed',
  );
}

export function createInternalApiKeyAuthHook(expectedKey = env.INTERNAL_API_KEY) {
  return async function authenticateInternalApiKey(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // Browser preflight requests cannot include custom API-key headers. Keep OPTIONS
    // unauthenticated so local direct-to-backend development can still pass CORS checks.
    if (request.method === 'OPTIONS') return;

    const receivedKey = getHeaderValue(request.headers[INTERNAL_API_KEY_HEADER]);

    if (!receivedKey) {
      logAuthFailure(request, 'missing_api_key');
      await reply.status(401).send(unauthorizedResponse());
      return;
    }

    if (!validateInternalApiKey(receivedKey, expectedKey)) {
      logAuthFailure(request, 'invalid_api_key');
      await reply.status(401).send(unauthorizedResponse());
    }
  };
}
