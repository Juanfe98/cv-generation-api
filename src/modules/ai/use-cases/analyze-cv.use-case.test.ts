import { analyzeCvUseCase } from './analyze-cv.use-case';
import { MockAIProvider } from '../providers/mock.provider';
import { AiValidationError, AiNormalizationError } from '../ai.errors';
import type { AIProvider } from '../providers/ai-provider';
import type { AnalyzeCvResult } from '../ai.types';

const VALID_INPUT = {
  cv: {
    summary: 'Senior backend engineer with 8 years of experience.',
    experience: [{ role: 'Backend Engineer', company: 'Acme', years: 4 }],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
  },
  targetRole: 'Staff Engineer',
};

const VALID_INPUT_NO_TARGET = {
  cv: { summary: 'Software engineer.' },
};

// ─── Input validation ─────────────────────────────────────────────────────────

describe('analyzeCvUseCase — input validation', () => {
  it('throws AiValidationError when cv is missing', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), { targetRole: 'Engineer' }),
    ).rejects.toThrow(AiValidationError);
  });

  it('throws AiValidationError when cv is not an object', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), { cv: 'not an object' }),
    ).rejects.toThrow(AiValidationError);
  });

  it('throws AiValidationError when input is null', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), null),
    ).rejects.toThrow(AiValidationError);
  });

  it('throws AiValidationError when input is not an object', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), 'string'),
    ).rejects.toThrow(AiValidationError);
  });

  it('throws AiValidationError when targetRole exceeds max length', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), { cv: {}, targetRole: 'x'.repeat(121) }),
    ).rejects.toThrow(AiValidationError);
  });

  it('accepts cv as empty object', async () => {
    await expect(
      analyzeCvUseCase(new MockAIProvider(), { cv: {} }),
    ).resolves.toHaveProperty('score');
  });

  it('accepts input without targetRole', async () => {
    const result = await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT_NO_TARGET);
    expect(result).toHaveProperty('score');
  });
});

// ─── Provider integration ─────────────────────────────────────────────────────

describe('analyzeCvUseCase — provider integration', () => {
  it('returns analysis with score, strengths, and improvements', async () => {
    const result = await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT);

    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.improvements)).toBe(true);
  });

  it('each strength is a non-empty string', async () => {
    const result = await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT);

    for (const strength of result.strengths) {
      expect(typeof strength).toBe('string');
      expect(strength.length).toBeGreaterThan(0);
    }
  });

  it('each improvement has section, message, and valid priority', async () => {
    const result = await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT);

    for (const item of result.improvements) {
      expect(typeof item.section).toBe('string');
      expect(item.section.length).toBeGreaterThan(0);
      expect(typeof item.message).toBe('string');
      expect(item.message.length).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(item.priority);
    }
  });

  it('does not mutate original input', async () => {
    const input = { cv: { summary: 'Engineer.' }, targetRole: 'Staff' };
    const snapshot = JSON.stringify(input);

    await analyzeCvUseCase(new MockAIProvider(), input);

    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('forwards provider errors without swallowing them', async () => {
    const failingProvider: AIProvider = {
      analyzeCv: () => Promise.reject(new Error('provider down')),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    await expect(
      analyzeCvUseCase(failingProvider, VALID_INPUT),
    ).rejects.toThrow('provider down');
  });
});

// ─── Normalization ────────────────────────────────────────────────────────────

describe('analyzeCvUseCase — normalization', () => {
  it('clamps score above 100 to 100', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({
        score: 150,
        strengths: ['Good profile'],
        improvements: [],
      }),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    const result = await analyzeCvUseCase(provider, VALID_INPUT);
    expect(result.score).toBe(100);
  });

  it('clamps score below 0 to 0', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({
        score: -20,
        strengths: [],
        improvements: [],
      }),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    const result = await analyzeCvUseCase(provider, VALID_INPUT);
    expect(result.score).toBe(0);
  });

  it('throws AiNormalizationError when provider returns no score', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({ strengths: [], improvements: [] } as never),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    await expect(
      analyzeCvUseCase(provider, VALID_INPUT),
    ).rejects.toThrow(AiNormalizationError);
  });

  it('throws AiNormalizationError when provider returns non-object', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => null as never,
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    await expect(
      analyzeCvUseCase(provider, VALID_INPUT),
    ).rejects.toThrow(AiNormalizationError);
  });

  it('filters out invalid improvements missing priority', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({
        score: 70,
        strengths: ['Good summary'],
        improvements: [
          { section: 'summary', message: 'Too generic', priority: 'high' },
          { section: 'skills', message: 'Missing category', priority: 'invalid' as never },
        ],
      }),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    const result = await analyzeCvUseCase(provider, VALID_INPUT);
    expect(result.improvements).toHaveLength(1);
    expect(result.improvements[0].section).toBe('summary');
  });

  it('filters out non-string strengths', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({
        score: 65,
        strengths: ['Valid strength', 42 as never, null as never, '  '],
        improvements: [],
      }),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    const result = await analyzeCvUseCase(provider, VALID_INPUT);
    expect(result.strengths).toHaveLength(1);
    expect(result.strengths[0]).toBe('Valid strength');
  });

  it('caps strengths at 10', async () => {
    const provider: AIProvider = {
      analyzeCv: async () => ({
        score: 80,
        strengths: Array.from({ length: 15 }, (_, i) => `Strength ${i + 1}`),
        improvements: [],
      }),
      generateExperienceBullets: jest.fn(),
      improveText: jest.fn(),
    };

    const result = await analyzeCvUseCase(provider, VALID_INPUT);
    expect(result.strengths).toHaveLength(10);
  });
});

// ─── Dependency injection ─────────────────────────────────────────────────────

describe('analyzeCvUseCase — dependency injection', () => {
  it('calls injected buildPrompt with validated input', async () => {
    const buildPrompt = jest.fn().mockReturnValue('prompt');

    await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT, { buildPrompt });

    expect(buildPrompt).toHaveBeenCalledTimes(1);
    expect(buildPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ cv: VALID_INPUT.cv, targetRole: VALID_INPUT.targetRole }),
    );
  });

  it('uses injected normalizer and returns its result', async () => {
    const mockResult: AnalyzeCvResult = {
      score: 99,
      strengths: ['Outstanding profile'],
      improvements: [],
    };
    const normalize = jest.fn().mockReturnValue(mockResult);

    const result = await analyzeCvUseCase(new MockAIProvider(), VALID_INPUT, { normalize });

    expect(normalize).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockResult);
  });
});
