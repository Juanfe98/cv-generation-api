import { buildApp } from '../app';
import type { AIProvider } from '../modules/ai/providers/ai-provider';
import { extractTextFromPdf } from '../modules/cv-import/extractors/pdf.extractor';

jest.mock('../modules/cv-import/extractors/pdf.extractor');

const mockExtractTextFromPdf = jest.mocked(extractTextFromPdf);
const VALID_AUTH_HEADERS = { 'x-internal-api-key': 'test-internal-api-key' };
const INVALID_AUTH_HEADERS = { 'x-internal-api-key': 'wrong-internal-api-key' };
const UNAUTHORIZED_BODY = { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };

function createProvider(): jest.Mocked<AIProvider> {
  return {
    generateExperienceBullets: jest.fn().mockResolvedValue({ suggestions: [] }),
    improveText: jest.fn().mockResolvedValue({
      suggestions: [{ text: 'Improved text.', reason: 'Clearer phrasing.' }],
    }),
    analyzeCv: jest.fn().mockResolvedValue({ score: 80, strengths: [], improvements: [] }),
    parseCv: jest.fn().mockResolvedValue({ name: 'Jane Doe' }),
  };
}

describe('protected route authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps GET /health public', async () => {
    const app = await buildApp({ aiProvider: createProvider() });

    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });

    await app.close();
  });

  it('rejects AI routes without invoking provider logic when the key is missing', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/improve-text',
      payload: { text: 'Improve this text.', section: 'experience' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHORIZED_BODY);
    expect(provider.improveText).not.toHaveBeenCalled();

    await app.close();
  });

  it('rejects AI routes without invoking provider logic when the key is invalid', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/improve-text',
      headers: INVALID_AUTH_HEADERS,
      payload: { text: 'Improve this text.', section: 'experience' },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHORIZED_BODY);
    expect(provider.improveText).not.toHaveBeenCalled();

    await app.close();
  });

  it('allows AI routes to continue when the key is valid', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/ai/improve-text',
      headers: VALID_AUTH_HEADERS,
      payload: { text: 'Improve this text.', section: 'experience' },
    });

    expect(res.statusCode).toBe(200);
    expect(provider.improveText).toHaveBeenCalledWith({
      text: 'Improve this text.',
      section: 'experience',
    });

    await app.close();
  });

  it('rejects CV parsing before file extraction when the key is missing', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: { 'content-type': 'multipart/form-data; boundary=----test' },
      payload: Buffer.from('this body should not be parsed'),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHORIZED_BODY);
    expect(mockExtractTextFromPdf).not.toHaveBeenCalled();
    expect(provider.parseCv).not.toHaveBeenCalled();

    await app.close();
  });

  it('rejects CV parsing before file extraction when the key is invalid', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: {
        ...INVALID_AUTH_HEADERS,
        'content-type': 'multipart/form-data; boundary=----test',
      },
      payload: Buffer.from('this body should not be parsed'),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual(UNAUTHORIZED_BODY);
    expect(mockExtractTextFromPdf).not.toHaveBeenCalled();
    expect(provider.parseCv).not.toHaveBeenCalled();

    await app.close();
  });

  it('allows CV parsing route validation to continue when the key is valid', async () => {
    const provider = createProvider();
    const app = await buildApp({ aiProvider: provider });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: VALID_AUTH_HEADERS,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_FILE');
    expect(mockExtractTextFromPdf).not.toHaveBeenCalled();
    expect(provider.parseCv).not.toHaveBeenCalled();

    await app.close();
  });
});
