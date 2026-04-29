import { CvImportExtractionError } from '../cv-import.errors';

type PdfParseResult = { text: string };

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Lazy-load to avoid pdfjs-dist crashing during module initialization in Jest
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<PdfParseResult>;
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    if (err instanceof CvImportExtractionError) throw err;
    throw new CvImportExtractionError('Failed to extract text from PDF', err);
  }
}
