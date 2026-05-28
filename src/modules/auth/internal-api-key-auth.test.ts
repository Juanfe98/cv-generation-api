import Fastify from 'fastify';
import {
  createInternalApiKeyAuthHook,
  INTERNAL_API_KEY_HEADER,
  validateInternalApiKey,
} from './internal-api-key-auth';

describe('validateInternalApiKey', () => {
  it('returns true when the received key matches the expected key', () => {
    expect(validateInternalApiKey('test-secret', 'test-secret')).toBe(true);
  });

  it('returns false when the received key is missing or invalid', () => {
    expect(validateInternalApiKey(undefined, 'test-secret')).toBe(false);
    expect(validateInternalApiKey('wrong-secret', 'test-secret')).toBe(false);
  });

  it('handles different length keys without throwing', () => {
    expect(() => validateInternalApiKey('short', 'a-much-longer-secret')).not.toThrow();
    expect(validateInternalApiKey('short', 'a-much-longer-secret')).toBe(false);
  });
});

describe('createInternalApiKeyAuthHook', () => {
  async function buildProtectedApp() {
    const app = Fastify({ logger: false });

    app.addHook('onRequest', createInternalApiKeyAuthHook('test-secret'));
    app.post('/protected', async () => ({ ok: true }));

    await app.ready();
    return app;
  }

  it('returns 401 with the standard error shape when the key is missing', async () => {
    const app = await buildProtectedApp();

    const res = await app.inject({ method: 'POST', url: '/protected' });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });

    await app.close();
  });

  it('returns 401 with the standard error shape when the key is invalid', async () => {
    const app = await buildProtectedApp();

    const res = await app.inject({
      method: 'POST',
      url: '/protected',
      headers: { [INTERNAL_API_KEY_HEADER]: 'wrong-secret' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
    });

    await app.close();
  });

  it('allows the request to continue when the key is valid', async () => {
    const app = await buildProtectedApp();

    const res = await app.inject({
      method: 'POST',
      url: '/protected',
      headers: { [INTERNAL_API_KEY_HEADER]: 'test-secret' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});
