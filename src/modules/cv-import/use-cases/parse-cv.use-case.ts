import type { AIProvider } from '../../ai/providers/ai-provider';
import type { ParseCvResponse } from '../cv-import.schemas';
import { CvImportValidationError, CvImportExtractionError } from '../cv-import.errors';
import {
  CV_IMPORT_MAX_EXTRACTED_TEXT_CHARS,
  CV_IMPORT_MAX_FILE_SIZE_BYTES,
} from '../cv-import.constants';
import { getCvImportFileType } from '../cv-import.file-types';
import { extractTextFromPdf } from '../extractors/pdf.extractor';
import { extractTextFromDocx } from '../extractors/docx.extractor';

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
  if (input.size > CV_IMPORT_MAX_FILE_SIZE_BYTES) {
    throw new CvImportValidationError(`File too large. Maximum size is 5MB.`);
  }

  const fileType = getCvImportFileType(input.filename, input.mimetype);
  if (!fileType) {
    // Validate MIME and extension together. Accepting only one of them lets disguised
    // files reach extractors, producing confusing errors and unnecessary processing.
    throw new CvImportValidationError(`Unsupported file type. Upload a PDF or DOCX file.`);
  }

  let cvText: string;
  try {
    cvText =
      fileType.kind === 'pdf'
        ? await extractTextFromPdf(input.buffer)
        : await extractTextFromDocx(input.buffer);
  } catch (err) {
    if (err instanceof CvImportExtractionError) throw err;
    throw new CvImportExtractionError('Could not read file content', err);
  }

  const normalizedText = cvText.trim();
  if (!normalizedText) {
    throw new CvImportValidationError(
      'No readable text found in the file. Try a different format.',
    );
  }

  if (normalizedText.length > CV_IMPORT_MAX_EXTRACTED_TEXT_CHARS) {
    // Reject rather than silently truncating: partial CV extraction can look correct while
    // omitting important experience, which is worse than asking the user to upload less text.
    throw new CvImportValidationError(
      'CV text is too long to parse automatically. Try a shorter CV or remove extra pages.',
    );
  }

  return provider.parseCv(normalizedText);
}
