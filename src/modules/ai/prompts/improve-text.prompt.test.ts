import { buildImproveTextPrompt } from './improve-text.prompt';

const BASE_INPUT = { text: 'Responsible for backend services.', section: 'experience' as const };

describe('buildImproveTextPrompt', () => {
  describe('output constraints', () => {
    it('instructs the model to return only valid JSON', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('Return only valid JSON');
    });

    it('forbids markdown in the output', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('No markdown');
    });

    it('forbids code fences in the output', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('No code fences');
    });

    it('forbids text outside the JSON object', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('No text outside the JSON object');
    });

    it('includes the expected JSON shape with suggestions array', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('"suggestions"');
      expect(prompt).toContain('"text"');
      expect(prompt).toContain('"reason"');
    });
  });

  describe('content rules', () => {
    it('instructs the model not to invent metrics or achievements', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toMatch(/do not invent specific metrics/i);
    });

    it('instructs the model to preserve the original meaning', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toMatch(/preserve the original meaning/i);
    });

    it('instructs the model to write in third person', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toMatch(/third person/i);
    });

    it('requests 2 to 3 alternatives', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toMatch(/2 to 3/);
    });

    it('instructs each alternative to be independently usable', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toMatch(/independently usable/i);
    });
  });

  describe('context injection', () => {
    it('includes the section', () => {
      const prompt = buildImproveTextPrompt({ text: 'Some text.', section: 'summary' });
      expect(prompt).toContain('Section: summary');
    });

    it('includes the original text', () => {
      const prompt = buildImproveTextPrompt({ text: 'Managed deployments.', section: 'experience' });
      expect(prompt).toContain('Text: Managed deployments.');
    });

    it('defaults tone to professional when not provided', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).toContain('Tone: professional');
    });

    it('uses the provided tone when given', () => {
      const prompt = buildImproveTextPrompt({ ...BASE_INPUT, tone: 'concise' });
      expect(prompt).toContain('Tone: concise');
    });

    it('includes targetRole when provided', () => {
      const prompt = buildImproveTextPrompt({ ...BASE_INPUT, targetRole: 'Staff Engineer' });
      expect(prompt).toContain('Target role: Staff Engineer');
    });

    it('omits targetRole line when not provided', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(prompt).not.toContain('Target role:');
    });

    it('works for each supported section value', () => {
      const sections = ['summary', 'experience', 'project', 'education', 'skills'] as const;

      for (const section of sections) {
        const prompt = buildImproveTextPrompt({ text: 'Some text.', section });
        expect(prompt).toContain(`Section: ${section}`);
      }
    });
  });

  describe('pure function behaviour', () => {
    it('returns the same output for the same input', () => {
      const input = { text: 'Led backend team.', section: 'experience' as const, tone: 'impactful' as const };
      expect(buildImproveTextPrompt(input)).toBe(buildImproveTextPrompt(input));
    });

    it('returns a non-empty string', () => {
      const prompt = buildImproveTextPrompt(BASE_INPUT);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});
