export const CV_IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB upload limit.

// Keep provider prompts bounded. A 5 MB PDF can expand into far more text than a model
// should receive in one request, so validate the extracted text before calling AI.
export const CV_IMPORT_MAX_EXTRACTED_TEXT_CHARS = 50_000;

export const CV_IMPORT_ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export const CV_IMPORT_ACCEPTED_EXTENSIONS = ['.pdf', '.docx'] as const;

// Browsers or proxies sometimes send this generic MIME type for downloads/uploads.
// We only allow it when the filename extension is one of the supported CV formats.
export const CV_IMPORT_GENERIC_BINARY_MIME_TYPE = 'application/octet-stream';
