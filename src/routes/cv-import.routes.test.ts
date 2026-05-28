import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import { extractTextFromPdf } from '../modules/cv-import/extractors/pdf.extractor';

jest.mock('../modules/cv-import/extractors/pdf.extractor');

const mockExtractTextFromPdf = jest.mocked(extractTextFromPdf);
const AUTH_HEADERS = { 'x-internal-api-key': 'test-internal-api-key' };

function multipartBody(options: {
  boundary: string;
  filename: string;
  contentType: string;
  content: string;
}): Buffer {
  const { boundary, filename, contentType, content } = options;
  return Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: ${contentType}`,
      '',
      content,
      `--${boundary}--`,
      '',
    ].join('\r\n'),
  );
}

describe('CV import routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    mockExtractTextFromPdf.mockResolvedValue('Jane Doe\nSoftware Engineer');
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('returns 400 when no multipart file is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: AUTH_HEADERS,
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('MISSING_FILE');
  });

  it('parses one uploaded PDF and returns structured CV data', async () => {
    const boundary = '----cv-import-test';
    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: {
        ...AUTH_HEADERS,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody({
        boundary,
        filename: 'cv.pdf',
        contentType: 'application/pdf',
        content: '%PDF test',
      }),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty('name', 'Jane Doe');
    expect(mockExtractTextFromPdf).toHaveBeenCalled();
  });

  it('returns 400 for unsupported uploaded file types', async () => {
    const boundary = '----cv-import-test';
    const res = await app.inject({
      method: 'POST',
      url: '/api/cv/parse',
      headers: {
        ...AUTH_HEADERS,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: multipartBody({
        boundary,
        filename: 'cv.png',
        contentType: 'image/png',
        content: 'not a cv',
      }),
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('CV_IMPORT_VALIDATION_ERROR');
  });
});
