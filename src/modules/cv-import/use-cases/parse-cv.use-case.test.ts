import { parseCvUseCase } from './parse-cv.use-case';
import type { AIProvider } from '../../ai/providers/ai-provider';
import { CvImportExtractionError, CvImportValidationError } from '../cv-import.errors';
import {
  CV_IMPORT_MAX_EXTRACTED_TEXT_CHARS,
  CV_IMPORT_MAX_FILE_SIZE_BYTES,
} from '../cv-import.constants';
import { extractTextFromPdf } from '../extractors/pdf.extractor';
import { extractTextFromDocx } from '../extractors/docx.extractor';

jest.mock('../extractors/pdf.extractor');
jest.mock('../extractors/docx.extractor');

const mockExtractTextFromPdf = jest.mocked(extractTextFromPdf);
const mockExtractTextFromDocx = jest.mocked(extractTextFromDocx);

const provider: AIProvider = {
  generateExperienceBullets: jest.fn(),
  improveText: jest.fn(),
  analyzeCv: jest.fn(),
  parseCv: jest.fn().mockResolvedValue({ name: 'Jane Doe' }),
};

const pdfInput = {
  buffer: Buffer.from('pdf'),
  filename: 'cv.pdf',
  mimetype: 'application/pdf',
  size: 3,
};

describe('parseCvUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractTextFromPdf.mockResolvedValue('Jane Doe\nSoftware Engineer');
    mockExtractTextFromDocx.mockResolvedValue('Jane Doe\nSoftware Engineer');
    jest.mocked(provider.parseCv).mockResolvedValue({ name: 'Jane Doe' });
  });

  it('extracts PDF text and sends trimmed text to the provider', async () => {
    mockExtractTextFromPdf.mockResolvedValue('  Jane Doe\nBackend Engineer  ');

    const result = await parseCvUseCase(provider, pdfInput);

    expect(result).toEqual({ name: 'Jane Doe' });
    expect(mockExtractTextFromPdf).toHaveBeenCalledWith(pdfInput.buffer);
    expect(provider.parseCv).toHaveBeenCalledWith('Jane Doe\nBackend Engineer');
  });

  it('extracts DOCX text when MIME and extension agree', async () => {
    await parseCvUseCase(provider, {
      ...pdfInput,
      filename: 'cv.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(mockExtractTextFromDocx).toHaveBeenCalledWith(pdfInput.buffer);
  });

  it('allows generic binary MIME when the extension is supported', async () => {
    await parseCvUseCase(provider, {
      ...pdfInput,
      mimetype: 'application/octet-stream',
    });

    expect(mockExtractTextFromPdf).toHaveBeenCalled();
  });

  it('rejects files larger than the upload limit', async () => {
    await expect(
      parseCvUseCase(provider, { ...pdfInput, size: CV_IMPORT_MAX_FILE_SIZE_BYTES + 1 }),
    ).rejects.toThrow(CvImportValidationError);
  });

  it('rejects unsupported extensions and MIME types', async () => {
    await expect(
      parseCvUseCase(provider, { ...pdfInput, filename: 'cv.png', mimetype: 'image/png' }),
    ).rejects.toThrow('Unsupported file type');
  });

  it('rejects MIME and extension mismatches', async () => {
    await expect(
      parseCvUseCase(provider, {
        ...pdfInput,
        filename: 'cv.docx',
        mimetype: 'application/pdf',
      }),
    ).rejects.toThrow('Unsupported file type');
  });

  it('rejects files with no readable text', async () => {
    mockExtractTextFromPdf.mockResolvedValue('   ');

    await expect(parseCvUseCase(provider, pdfInput)).rejects.toThrow('No readable text found');
  });

  it('rejects extracted text that is too large for one AI request', async () => {
    mockExtractTextFromPdf.mockResolvedValue('x'.repeat(CV_IMPORT_MAX_EXTRACTED_TEXT_CHARS + 1));

    await expect(parseCvUseCase(provider, pdfInput)).rejects.toThrow('CV text is too long');
    expect(provider.parseCv).not.toHaveBeenCalled();
  });

  it('forwards extraction errors as extraction errors', async () => {
    mockExtractTextFromPdf.mockRejectedValue(new CvImportExtractionError('Failed to parse PDF'));

    await expect(parseCvUseCase(provider, pdfInput)).rejects.toThrow(CvImportExtractionError);
  });
});
