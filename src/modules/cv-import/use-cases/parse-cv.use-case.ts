import type { AIProvider } from '../../ai/providers/ai-provider';
import type { ParseCvResponse } from '../cv-import.schemas';
import { CvImportValidationError, CvImportExtractionError } from '../cv-import.errors';
import { extractTextFromPdf } from '../extractors/pdf.extractor';
import { extractTextFromDocx } from '../extractors/docx.extractor';

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ParseCvInput {
  buffer: Buffer;
  mimetype: string;
  filename: string;
  size: number;
}

export async function parseCvUseCase(
  provider: AIProvider,
  input: ParseCvInput,
): Promise<ParseCvResponse> {
  if (input.size > MAX_FILE_SIZE) {
    throw new CvImportValidationError(`File too large. Maximum size is 5MB.`);
  }

  const isAcceptedMime = (ACCEPTED_MIME_TYPES as readonly string[]).includes(input.mimetype);
  const isAcceptedExt = (ACCEPTED_EXTENSIONS as readonly string[]).some((ext) =>
    input.filename.toLowerCase().endsWith(ext),
  );

  if (!isAcceptedMime && !isAcceptedExt) {
    throw new CvImportValidationError(`Unsupported file type. Upload a PDF or DOCX file.`);
  }

  const isPdf =
    input.mimetype === 'application/pdf' || input.filename.toLowerCase().endsWith('.pdf');

  let cvText: string;
  try {
    cvText = isPdf
      ? await extractTextFromPdf(input.buffer)
      : await extractTextFromDocx(input.buffer);
  } catch (err) {
    if (err instanceof CvImportExtractionError) throw err;
    throw new CvImportExtractionError('Could not read file content', err);
  }

  if (!cvText.trim()) {
    throw new CvImportValidationError(
      'No readable text found in the file. Try a different format.',
    );
  }

  return provider.parseCv(cvText);
}
