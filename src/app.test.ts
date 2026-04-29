import { buildApp } from './app';
import type { FastifyInstance } from 'fastify';

describe('App hardening', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────

  describe('CORS', () => {
    it('returns Access-Control-Allow-Origin for allowed origin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        headers: { origin: 'http://localhost:5173' },
        payload: { text: 'Responsible for backend services.', section: 'experience' },
      });

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('responds to OPTIONS preflight with 204', async () => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/api/ai/improve-text',
        headers: {
          origin: 'http://localhost:5173',
          'access-control-request-method': 'POST',
        },
      });

      expect(res.statusCode).toBe(204);
    });

    it('does not set CORS header for disallowed origin', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        headers: { origin: 'https://evil.example.com' },
        payload: { text: 'Some text.', section: 'experience' },
      });

      expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example.com');
    });

    it('health route also returns CORS header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:5173' },
      });

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  // ─── Body size limit ──────────────────────────────────────────────────────

  describe('body size limit', () => {
    it('returns 413 when request body exceeds 256 KB', async () => {
      const oversized = { text: 'x'.repeat(260 * 1024), section: 'experience' };

      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: oversized,
      });

      expect(res.statusCode).toBe(413);
    });

    it('accepts request body at the limit boundary', async () => {
      // A realistic large CV: should be well under 256 KB
      const largeButValid = {
        text: 'A'.repeat(3000), // max allowed by schema
        section: 'experience',
      };

      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: largeButValid,
      });

      // Schema validates text length — 3000 chars is at the schema max.
      expect(res.statusCode).toBe(200);
    });
  });
});
