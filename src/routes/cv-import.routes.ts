import type { FastifyInstance, FastifyRequest } from 'fastify';
import Busboy from 'busboy';
import { createAIProvider } from '../modules/ai/providers/provider-factory';
import { parseCvUseCase } from '../modules/cv-import/use-cases/parse-cv.use-case';
import { CvImportValidationError, CvImportExtractionError } from '../modules/cv-import/cv-import.errors';
import { toErrorResponse, logAiError } from '../modules/ai/ai-error-handler';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface FileData {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

function parseMultipartBody(rawBody: Buffer, contentType: string): Promise<FileData | null> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: { 'content-type': contentType } });
    let found = false;

    bb.on('file', (_fieldname, file, info) => {
      found = true;
      const chunks: Buffer[] = [];

      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ buffer, filename: info.filename, mimetype: info.mimeType, size: buffer.length });
      });
      file.on('error', reject);
    });

    bb.on('finish', () => {
      if (!found) resolve(null);
    });

    bb.on('error', reject);
    bb.end(rawBody);
  });
}

export async function cvImportRoutes(app: FastifyInstance): Promise<void> {
  // Scoped content-type parser: reads multipart body as raw buffer (no global plugin needed).
  // The higher bodyLimit here only applies to this scope's routes.
  app.addContentTypeParser(
    'multipart/form-data',
    { parseAs: 'buffer', bodyLimit: MAX_FILE_SIZE + 4096 },
    async (_req: FastifyRequest, body: Buffer) => body,
  );

  const provider = createAIProvider();

  app.post('/api/cv/parse', async (request, reply) => {
    try {
      const contentType = request.headers['content-type'] ?? '';

      if (!contentType.includes('multipart/form-data')) {
        return reply.status(400).send({
          error: { code: 'MISSING_FILE', message: 'No file provided. Upload a PDF or DOCX.' },
        });
      }

      const fileData = await parseMultipartBody(request.body as Buffer, contentType);

      if (!fileData) {
        return reply.status(400).send({
          error: { code: 'MISSING_FILE', message: 'No file provided. Upload a PDF or DOCX.' },
        });
      }

      const result = await parseCvUseCase(provider, fileData);
      return reply.status(200).send(result);
    } catch (err) {
      if (err instanceof CvImportValidationError) {
        return reply.status(400).send({
          error: { code: 'CV_IMPORT_VALIDATION_ERROR', message: err.message },
        });
      }

      if (err instanceof CvImportExtractionError) {
        return reply.status(422).send({
          error: {
            code: 'CV_IMPORT_EXTRACTION_ERROR',
            message: 'We had trouble reading your CV. Try a different file or fill in your details manually.',
          },
        });
      }

      logAiError(request.log, {
        endpoint: '/api/cv/parse',
        useCase: 'parseCv',
        requestId: request.id,
      }, err);
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });
}
