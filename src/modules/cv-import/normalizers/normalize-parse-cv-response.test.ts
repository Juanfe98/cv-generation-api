import { AiNormalizationError } from '../../ai/ai.errors';
import { normalizeParseCvResponse } from './normalize-parse-cv-response';

describe('normalizeParseCvResponse', () => {
  it('returns parsed CV data when model output matches the schema', () => {
    const result = normalizeParseCvResponse({
      name: 'Jane Doe',
      experience: [{ company: 'Acme', role: 'Engineer' }],
      skills: ['TypeScript'],
    });

    expect(result).toEqual({
      name: 'Jane Doe',
      experience: [{ company: 'Acme', role: 'Engineer' }],
      skills: ['TypeScript'],
    });
  });

  it('throws AiNormalizationError instead of casting invalid model output', () => {
    expect(() =>
      normalizeParseCvResponse({
        experience: [{ company: '', role: '' }],
      }),
    ).toThrow(AiNormalizationError);
  });
});
