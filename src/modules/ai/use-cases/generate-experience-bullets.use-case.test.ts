import { generateExperienceBulletsUseCase } from './generate-experience-bullets.use-case';
import { MockAIProvider } from '../providers/mock.provider';
import { AiValidationError, AiNormalizationError } from '../ai.errors';
import type { AIProvider } from '../providers/ai-provider';
import type { GenerateExperienceBulletsResult } from '../ai.types';

const VALID_INPUT = { role: 'Backend Engineer', company: 'Acme' };

describe('generateExperienceBulletsUseCase', () => {
  describe('input validation', () => {
    it('throws AiValidationError when role is missing', async () => {
      await expect(
        generateExperienceBulletsUseCase(new MockAIProvider(), {}),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when role is empty string', async () => {
      await expect(
        generateExperienceBulletsUseCase(new MockAIProvider(), { role: '' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when input is not an object', async () => {
      await expect(
        generateExperienceBulletsUseCase(new MockAIProvider(), null),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when role exceeds max length', async () => {
      await expect(
        generateExperienceBulletsUseCase(new MockAIProvider(), { role: 'x'.repeat(121) }),
      ).rejects.toThrow(AiValidationError);
    });
  });

  describe('provider integration', () => {
    it('returns normalized suggestions from MockAIProvider', async () => {
      const result = await generateExperienceBulletsUseCase(new MockAIProvider(), VALID_INPUT);

      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('each suggestion has a non-empty text string', async () => {
      const result = await generateExperienceBulletsUseCase(new MockAIProvider(), VALID_INPUT);

      for (const suggestion of result.suggestions) {
        expect(typeof suggestion.text).toBe('string');
        expect(suggestion.text.length).toBeGreaterThan(0);
      }
    });

    it('does not mutate the original input object', async () => {
      const input = { role: 'Frontend Engineer', company: 'Corp' };
      const snapshot = { ...input };

      await generateExperienceBulletsUseCase(new MockAIProvider(), input);

      expect(input).toEqual(snapshot);
    });

    it('forwards provider errors without swallowing them', async () => {
      const failingProvider: AIProvider = {
        generateExperienceBullets: () => Promise.reject(new Error('provider down')),
        improveText: jest.fn(),
        analyzeCv: jest.fn(),
      };

      await expect(
        generateExperienceBulletsUseCase(failingProvider, VALID_INPUT),
      ).rejects.toThrow('provider down');
    });
  });

  describe('normalization', () => {
    it('throws AiNormalizationError when provider returns no valid suggestions', async () => {
      const emptyProvider: AIProvider = {
        generateExperienceBullets: async () => ({ suggestions: [] as never }),
        improveText: jest.fn(),
        analyzeCv: jest.fn(),
      };

      await expect(
        generateExperienceBulletsUseCase(emptyProvider, VALID_INPUT),
      ).rejects.toThrow(AiNormalizationError);
    });

    it('strips suggestions with empty text via injected normalizer', async () => {
      const rawSuggestions = [
        { text: '  ', reason: 'should be dropped' },
        { text: 'Valid bullet with strong action verb and outcome.', reason: 'good' },
      ];

      const fakeProvider: AIProvider = {
        generateExperienceBullets: async () => ({ suggestions: rawSuggestions as never }),
        improveText: jest.fn(),
        analyzeCv: jest.fn(),
      };

      const result = await generateExperienceBulletsUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].text).toBe('Valid bullet with strong action verb and outcome.');
    });

    it('limits results to 5 suggestions', async () => {
      const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
        text: `Bullet number ${i + 1} with enough content to be valid.`,
      }));

      const fakeProvider: AIProvider = {
        generateExperienceBullets: async () => ({ suggestions: manySuggestions as never }),
        improveText: jest.fn(),
        analyzeCv: jest.fn(),
      };

      const result = await generateExperienceBulletsUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions).toHaveLength(5);
    });

    it('drops invalid reason values and keeps valid ones', async () => {
      const rawSuggestions = [
        { text: 'Bullet with valid reason.', reason: 'Quantifies impact clearly.' },
        { text: 'Bullet with numeric reason.', reason: 42 },
      ];

      const fakeProvider: AIProvider = {
        generateExperienceBullets: async () => ({ suggestions: rawSuggestions as never }),
        improveText: jest.fn(),
        analyzeCv: jest.fn(),
      };

      const result = await generateExperienceBulletsUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions[0].reason).toBe('Quantifies impact clearly.');
      expect(result.suggestions[1].reason).toBeUndefined();
    });
  });

  describe('dependency injection', () => {
    it('calls the injected prompt builder with validated input', async () => {
      const buildPrompt = jest.fn().mockReturnValue('prompt text');

      await generateExperienceBulletsUseCase(new MockAIProvider(), VALID_INPUT, { buildPrompt });

      expect(buildPrompt).toHaveBeenCalledTimes(1);
      expect(buildPrompt).toHaveBeenCalledWith(expect.objectContaining({ role: 'Backend Engineer' }));
    });

    it('calls the injected normalizer with provider suggestions', async () => {
      const mockResult: GenerateExperienceBulletsResult = {
        suggestions: [{ text: 'Custom normalized bullet.' }],
      };
      const normalize = jest.fn().mockReturnValue(mockResult);

      const result = await generateExperienceBulletsUseCase(
        new MockAIProvider(),
        VALID_INPUT,
        { normalize },
      );

      expect(normalize).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });
  });
});
