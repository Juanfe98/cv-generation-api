import { improveTextUseCase } from './improve-text.use-case';
import { MockAIProvider } from '../providers/mock.provider';
import { AiValidationError, AiNormalizationError } from '../ai.errors';
import type { AIProvider } from '../providers/ai-provider';
import type { ImproveTextResult } from '../ai.types';

const VALID_INPUT = { text: 'Responsible for backend services.', section: 'experience' as const };

describe('improveTextUseCase', () => {
  describe('input validation', () => {
    it('throws AiValidationError when text is missing', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), { section: 'experience' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when text is empty string', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), { text: '', section: 'experience' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when section is missing', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), { text: 'Some text.' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when section is not a valid enum value', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), { text: 'Some text.', section: 'hobbies' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when text exceeds max length', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), { text: 'x'.repeat(3001), section: 'summary' }),
      ).rejects.toThrow(AiValidationError);
    });

    it('throws AiValidationError when input is not an object', async () => {
      await expect(
        improveTextUseCase(new MockAIProvider(), 'raw string'),
      ).rejects.toThrow(AiValidationError);
    });
  });

  describe('valid input', () => {
    it('returns suggestions for each supported section', async () => {
      const sections = ['summary', 'experience', 'project', 'education', 'skills'] as const;

      for (const section of sections) {
        const result = await improveTextUseCase(new MockAIProvider(), {
          text: 'Some text to improve.',
          section,
        });

        expect(result).toHaveProperty('suggestions');
        expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('accepts optional tone without error', async () => {
      const result = await improveTextUseCase(new MockAIProvider(), {
        ...VALID_INPUT,
        tone: 'concise',
      });

      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('accepts optional targetRole without error', async () => {
      const result = await improveTextUseCase(new MockAIProvider(), {
        ...VALID_INPUT,
        targetRole: 'Senior Engineer',
      });

      expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('does not mutate the original input object', async () => {
      const input = { text: 'Original text.', section: 'summary' as const };
      const snapshot = { ...input };

      await improveTextUseCase(new MockAIProvider(), input);

      expect(input).toEqual(snapshot);
    });
  });

  describe('normalized response', () => {
    it('each suggestion has a non-empty text string', async () => {
      const result = await improveTextUseCase(new MockAIProvider(), VALID_INPUT);

      for (const suggestion of result.suggestions) {
        expect(typeof suggestion.text).toBe('string');
        expect(suggestion.text.length).toBeGreaterThan(0);
        expect(suggestion.text.length).toBeLessThanOrEqual(600);
      }
    });

    it('limits results to 5 suggestions', async () => {
      const manySuggestions = Array.from({ length: 10 }, (_, i) => ({
        text: `Improved bullet ${i + 1} with enough words to pass validation.`,
      }));

      const fakeProvider: AIProvider = {
        improveText: async () => ({ suggestions: manySuggestions as never }),
        generateExperienceBullets: jest.fn(),
        analyzeCv: jest.fn(),
        parseCv: jest.fn(),
      };

      const result = await improveTextUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions).toHaveLength(5);
    });

    it('strips whitespace-only suggestions', async () => {
      const rawSuggestions = [
        { text: '   ', reason: 'should be dropped' },
        { text: 'Valid improved text that should survive normalization.' },
      ];

      const fakeProvider: AIProvider = {
        improveText: async () => ({ suggestions: rawSuggestions as never }),
        generateExperienceBullets: jest.fn(),
        analyzeCv: jest.fn(),
        parseCv: jest.fn(),
      };

      const result = await improveTextUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].text).toBe(
        'Valid improved text that should survive normalization.',
      );
    });

    it('throws AiNormalizationError when provider returns no valid suggestions', async () => {
      const emptyProvider: AIProvider = {
        improveText: async () => ({ suggestions: [] as never }),
        generateExperienceBullets: jest.fn(),
        analyzeCv: jest.fn(),
        parseCv: jest.fn(),
      };

      await expect(
        improveTextUseCase(emptyProvider, VALID_INPUT),
      ).rejects.toThrow(AiNormalizationError);
    });

    it('drops non-string reason values', async () => {
      const rawSuggestions = [
        { text: 'Bullet with valid reason.', reason: 'Clearer and more impactful.' },
        { text: 'Bullet with invalid reason.', reason: 123 },
      ];

      const fakeProvider: AIProvider = {
        improveText: async () => ({ suggestions: rawSuggestions as never }),
        generateExperienceBullets: jest.fn(),
        analyzeCv: jest.fn(),
        parseCv: jest.fn(),
      };

      const result = await improveTextUseCase(fakeProvider, VALID_INPUT);

      expect(result.suggestions[0].reason).toBe('Clearer and more impactful.');
      expect(result.suggestions[1].reason).toBeUndefined();
    });
  });

  describe('provider errors', () => {
    it('forwards provider errors without swallowing them', async () => {
      const failingProvider: AIProvider = {
        improveText: () => Promise.reject(new Error('provider unavailable')),
        generateExperienceBullets: jest.fn(),
        analyzeCv: jest.fn(),
        parseCv: jest.fn(),
      };

      await expect(
        improveTextUseCase(failingProvider, VALID_INPUT),
      ).rejects.toThrow('provider unavailable');
    });
  });

  describe('dependency injection', () => {
    it('calls the injected prompt builder with validated input', async () => {
      const buildPrompt = jest.fn().mockReturnValue('prompt');

      await improveTextUseCase(new MockAIProvider(), VALID_INPUT, { buildPrompt });

      expect(buildPrompt).toHaveBeenCalledTimes(1);
      expect(buildPrompt).toHaveBeenCalledWith(
        expect.objectContaining({ text: VALID_INPUT.text, section: VALID_INPUT.section }),
      );
    });

    it('uses the injected normalizer and returns its result', async () => {
      const mockResult: ImproveTextResult = {
        suggestions: [{ text: 'Custom normalizer output.' }],
      };
      const normalize = jest.fn().mockReturnValue(mockResult);

      const result = await improveTextUseCase(new MockAIProvider(), VALID_INPUT, { normalize });

      expect(normalize).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResult);
    });
  });
});
