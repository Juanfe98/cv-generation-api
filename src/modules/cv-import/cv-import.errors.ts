export class CvImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CvImportValidationError';
  }
}

export class CvImportExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CvImportExtractionError';
  }
}
