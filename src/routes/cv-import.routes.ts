import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import Busboy from 'busboy';
import type { AIProvider } from '../modules/ai/providers/ai-provider';
import { parseCvUseCase } from '../modules/cv-import/use-cases/parse-cv.use-case';
import {
  CvImportValidationError,
  CvImportExtractionError,
} from '../modules/cv-import/cv-import.errors';
import { CV_IMPORT_MAX_FILE_SIZE_BYTES } from '../modules/cv-import/cv-import.constants';
import { toErrorResponse, logAiError } from '../modules/ai/ai-error-handler';

interface FileData {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

function getHeaderValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function parseMultipartBody(rawBody: Buffer, contentType: string): Promise<FileData | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let fileData: FileData | null = null;
    let fileCount = 0;
    let fileTooLarge = false;

    const finishOnce = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      callback();
    };

    const bb = Busboy({
      headers: { 'content-type': contentType },
      limits: {
        files: 1,
        fileSize: CV_IMPORT_MAX_FILE_SIZE_BYTES,
      },
    });

    bb.on('file', (_fieldname, file, info) => {
      fileCount += 1;

      // The endpoint accepts exactly one CV file. Rejecting multiple files prevents
      // ambiguous behavior where the route silently chooses one uploaded document.
      if (fileCount > 1) {
        file.resume();
        finishOnce(() => reject(new CvImportValidationError('Upload exactly one CV file.')));
        return;
      }

      const chunks: Buffer[] = [];

      file.on('data', (chunk: Buffer) => chunks.push(chunk));
      file.on('limit', () => {
        fileTooLarge = true;
        file.resume();
      });
      file.on('end', () => {
        if (fileTooLarge) return;
        const buffer = Buffer.concat(chunks);
        fileData = {
          buffer,
          filename: info.filename,
          mimetype: info.mimeType,
          size: buffer.length,
        };
      });
      file.on('error', (err) => finishOnce(() => reject(err)));
    });

    bb.on('filesLimit', () => {
      finishOnce(() => reject(new CvImportValidationError('Upload exactly one CV file.')));
    });

    bb.on('finish', () => {
      if (fileTooLarge) {
        finishOnce(() =>
          reject(new CvImportValidationError('File too large. Maximum size is 5MB.')),
        );
        return;
      }
      finishOnce(() => resolve(fileData));
    });

    bb.on('error', (err) => finishOnce(() => reject(err)));
    bb.end(rawBody);
  });
}

interface CvImportRoutesOptions extends FastifyPluginOptions {
  provider: AIProvider;
}

export async function cvImportRoutes(
  app: FastifyInstance,
  options: CvImportRoutesOptions,
): Promise<void> {
  // Scoped content-type parser: reads multipart body as raw buffer (no global plugin needed).
  // The extra bytes account for multipart boundaries/headers while Busboy enforces file size.
  app.addContentTypeParser(
    'multipart/form-data',
    { parseAs: 'buffer', bodyLimit: CV_IMPORT_MAX_FILE_SIZE_BYTES + 4096 },
    async (_req: FastifyRequest, body: Buffer) => body,
  );

  const { provider } = options;

  app.post('/api/cv/parse', async (request, reply) => {
    try {
      const contentType = getHeaderValue(request.headers['content-type']);

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
            message:
              'We had trouble reading your CV. Try a different file or fill in your details manually.',
          },
        });
      }

      logAiError(
        request.log,
        {
          endpoint: '/api/cv/parse',
          useCase: 'parseCv',
          requestId: request.id,
        },
        err,
      );
      const { statusCode, body } = toErrorResponse(err);
      return reply.status(statusCode).send(body);
    }
  });
}
