import { buildGenerateExperienceBulletsPrompt } from './generate-experience-bullets.prompt';

const BASE_INPUT = { role: 'Backend Engineer' };

describe('buildGenerateExperienceBulletsPrompt', () => {
  describe('output constraints', () => {
    it('instructs the model to return only valid JSON', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toContain('Return only valid JSON');
    });

    it('forbids markdown in the output', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toContain('No markdown');
    });

    it('forbids code fences in the output', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toContain('No code fences');
    });

    it('forbids text outside the JSON object', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toContain('No text outside the JSON object');
    });

    it('includes the expected JSON shape with suggestions array', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toContain('"suggestions"');
      expect(prompt).toContain('"text"');
      expect(prompt).toContain('"reason"');
    });
  });

  describe('content rules', () => {
    it('instructs the model not to invent specific metrics', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toMatch(/do not invent specific metrics/i);
    });

    it('instructs the model to use generic phrasing when numbers are absent', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toMatch(/generic phrasing/i);
    });

    it('instructs the model to use strong action verbs', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toMatch(/action verb/i);
    });

    it('instructs the model to write in third person', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toMatch(/third person/i);
    });

    it('requests between 3 and 5 suggestions', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).toMatch(/3 to 5/);
    });
  });

  describe('context injection', () => {
    it('includes the role', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({ role: 'Staff Engineer' });
      expect(prompt).toContain('Role: Staff Engineer');
    });

    it('includes company when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({ role: 'SRE', company: 'Acme' });
      expect(prompt).toContain('Company: Acme');
    });

    it('omits company line when not provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).not.toContain('Company:');
    });

    it('includes seniority when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({
        role: 'Engineer',
        seniority: 'Senior',
      });
      expect(prompt).toContain('Seniority: Senior');
    });

    it('omits seniority line when not provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).not.toContain('Seniority:');
    });

    it('includes technologies joined by comma when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({
        role: 'Engineer',
        technologies: ['TypeScript', 'Node.js', 'PostgreSQL'],
      });
      expect(prompt).toContain('Technologies: TypeScript, Node.js, PostgreSQL');
    });

    it('omits technologies line when array is empty', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({ role: 'Engineer', technologies: [] });
      expect(prompt).not.toContain('Technologies:');
    });

    it('includes responsibilities when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({
        role: 'Engineer',
        responsibilities: 'Owned the payments pipeline.',
      });
      expect(prompt).toContain('Responsibilities: Owned the payments pipeline.');
    });

    it('includes targetRole when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({
        role: 'Engineer',
        targetRole: 'Principal Engineer',
      });
      expect(prompt).toContain('Target role: Principal Engineer');
    });

    it('omits targetRole line when not provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).not.toContain('Target role:');
    });

    it('includes tone when provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt({ role: 'Engineer', tone: 'concise' });
      expect(prompt).toContain('Tone: concise');
    });

    it('omits tone line when not provided', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(prompt).not.toContain('Tone:');
    });
  });

  describe('pure function behaviour', () => {
    it('returns the same output for the same input', () => {
      const input = { role: 'DevOps Engineer', company: 'Corp', seniority: 'Mid' };
      expect(buildGenerateExperienceBulletsPrompt(input)).toBe(
        buildGenerateExperienceBulletsPrompt(input),
      );
    });

    it('returns a non-empty string', () => {
      const prompt = buildGenerateExperienceBulletsPrompt(BASE_INPUT);
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });
});
