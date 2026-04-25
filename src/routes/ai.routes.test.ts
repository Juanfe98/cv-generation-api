import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';

describe('AI routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Health sanity check ──────────────────────────────────────────────────

  it('GET /health still returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  // ─── POST /api/ai/generate-experience-bullets ─────────────────────────────

  describe('POST /api/ai/generate-experience-bullets', () => {
    it('returns 200 with suggestions for valid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: { role: 'Backend Engineer', company: 'Acme' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.suggestions)).toBe(true);
      expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(body.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('each suggestion has a non-empty text string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: { role: 'Staff Engineer' },
      });

      const { suggestions } = res.json();
      for (const s of suggestions) {
        expect(typeof s.text).toBe('string');
        expect(s.text.length).toBeGreaterThan(0);
      }
    });

    it('returns 400 with AI_VALIDATION_ERROR when role is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: { company: 'Acme' },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('AI_VALIDATION_ERROR');
      expect(typeof body.error.message).toBe('string');
    });

    it('returns 400 with AI_VALIDATION_ERROR when role is empty string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: { role: '' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when body is empty object', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('accepts optional fields without error', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: {
          role: 'DevOps Engineer',
          company: 'Corp',
          seniority: 'Senior',
          technologies: ['Kubernetes', 'Terraform'],
          responsibilities: 'Owned cloud infrastructure.',
          targetRole: 'Principal Engineer',
          tone: 'impactful',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().suggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── POST /api/ai/improve-text ────────────────────────────────────────────

  describe('POST /api/ai/improve-text', () => {
    it('returns 200 with suggestions for valid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { text: 'Responsible for backend services.', section: 'experience' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.suggestions)).toBe(true);
      expect(body.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(body.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('each suggestion has a non-empty text string', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { text: 'Managed deployments.', section: 'experience' },
      });

      const { suggestions } = res.json();
      for (const s of suggestions) {
        expect(typeof s.text).toBe('string');
        expect(s.text.length).toBeGreaterThan(0);
      }
    });

    it('returns 400 with AI_VALIDATION_ERROR when text is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { section: 'experience' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when section is invalid', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { text: 'Some text.', section: 'hobbies' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when section is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { text: 'Some text.' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('accepts optional tone and targetRole', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: {
          text: 'Wrote backend code.',
          section: 'experience',
          tone: 'concise',
          targetRole: 'Staff Engineer',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('works for all supported section values', async () => {
      const sections = ['summary', 'experience', 'project', 'education', 'skills'];

      for (const section of sections) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/ai/improve-text',
          payload: { text: 'Sample text.', section },
        });

        expect(res.statusCode).toBe(200);
      }
    });
  });

  // ─── POST /api/ai/analyze-cv ─────────────────────────────────────────────

  describe('POST /api/ai/analyze-cv', () => {
    const VALID_CV = {
      summary: 'Senior backend engineer with 8 years of experience.',
      experience: [{ role: 'Backend Engineer', company: 'Acme', years: 4 }],
      skills: ['TypeScript', 'Node.js'],
    };

    it('returns 200 with score, strengths, and improvements for valid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { cv: VALID_CV, targetRole: 'Staff Engineer' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(typeof body.score).toBe('number');
      expect(body.score).toBeGreaterThanOrEqual(0);
      expect(body.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(body.strengths)).toBe(true);
      expect(Array.isArray(body.improvements)).toBe(true);
    });

    it('each improvement has section, message, and priority', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { cv: VALID_CV },
      });

      const { improvements } = res.json();
      for (const item of improvements) {
        expect(typeof item.section).toBe('string');
        expect(typeof item.message).toBe('string');
        expect(['low', 'medium', 'high']).toContain(item.priority);
      }
    });

    it('accepts input without targetRole', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { cv: VALID_CV },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 400 with AI_VALIDATION_ERROR when cv is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { targetRole: 'Engineer' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when body is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when cv is not an object', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { cv: 'not an object' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('returns 400 with AI_VALIDATION_ERROR when targetRole exceeds max length', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: { cv: {}, targetRole: 'x'.repeat(121) },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('AI_VALIDATION_ERROR');
    });

    it('does not leak internal error details in error response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: {},
      });

      const body = res.json();
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('statusCode');
    });

    it('error response has code and message as strings', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/analyze-cv',
        payload: {},
      });

      const { error } = res.json();
      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
    });
  });

  // ─── Error shape contract ────────────────────────────────────────────────

  describe('error response shape', () => {
    it('error response has code and message fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/generate-experience-bullets',
        payload: {},
      });

      const body = res.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(typeof body.error.code).toBe('string');
      expect(typeof body.error.message).toBe('string');
    });

    it('does not leak internal error details on validation failure', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/ai/improve-text',
        payload: { text: 'x', section: 'invalid-section' },
      });

      const body = res.json();
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('statusCode');
    });
  });
});
