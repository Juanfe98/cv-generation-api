import mammoth from 'mammoth';
import { CvImportExtractionError } from '../cv-import.errors';

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err) {
    throw new CvImportExtractionError('Failed to extract text from DOCX', err);
  }
}
