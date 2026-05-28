import {
  CV_IMPORT_ACCEPTED_EXTENSIONS,
  CV_IMPORT_ACCEPTED_MIME_TYPES,
  CV_IMPORT_GENERIC_BINARY_MIME_TYPE,
} from './cv-import.constants';

type CvImportFileKind = 'pdf' | 'docx';

export interface CvImportFileTypeResult {
  kind: CvImportFileKind;
  extension: string;
}

const MIME_TO_KIND: Record<string, CvImportFileKind> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const EXTENSION_TO_KIND: Record<string, CvImportFileKind> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
};

export function getCvImportExtension(filename: string): string | undefined {
  const lowerFilename = filename.toLowerCase();
  return (CV_IMPORT_ACCEPTED_EXTENSIONS as readonly string[]).find((extension) =>
    lowerFilename.endsWith(extension),
  );
}

export function getCvImportFileType(
  filename: string,
  mimetype: string,
): CvImportFileTypeResult | null {
  const extension = getCvImportExtension(filename);
  if (!extension) return null;

  const extensionKind = EXTENSION_TO_KIND[extension];
  const mimeKind = MIME_TO_KIND[mimetype];

  // Some clients upload with application/octet-stream. Trust the extension only for this
  // generic MIME type; otherwise require MIME and extension to agree to avoid surprises.
  if (mimetype === CV_IMPORT_GENERIC_BINARY_MIME_TYPE) {
    return { kind: extensionKind, extension };
  }

  if (!(CV_IMPORT_ACCEPTED_MIME_TYPES as readonly string[]).includes(mimetype)) return null;
  if (mimeKind !== extensionKind) return null;

  return { kind: extensionKind, extension };
}
