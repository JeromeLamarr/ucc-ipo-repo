/**
 * Validation utilities for UCC IP Office system
 */

export const ALLOWED_DOCUMENT_TYPES = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export const ALLOWED_MIME_TYPES = Object.values(ALLOWED_DOCUMENT_TYPES);

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_TOTAL_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

export const REQUIRED_DOCUMENTS = {
  disclosure: 'Disclosure Form',
  drawing: 'Technical Drawings/Diagrams',
  attachment: 'Supporting Documents',
};

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): ValidationError | null {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      field: 'file_type',
      message: `Invalid file type: ${file.type}. Allowed types: ${Object.keys(ALLOWED_DOCUMENT_TYPES).join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      field: 'file_size',
      message: `File size exceeds maximum: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Additional validation: check file extension matches MIME type
  const fileName = file.name.toLowerCase();
  const ext = fileName.split('.').pop();
  const isExtensionValid = ext && Object.keys(ALLOWED_DOCUMENT_TYPES).includes(ext);

  if (!isExtensionValid) {
    return {
      field: 'file_extension',
      message: `Invalid file extension: .${ext}. Allowed: ${Object.keys(ALLOWED_DOCUMENT_TYPES).join(', ')}`,
    };
  }

  return null;
}

/**
 * Validate total upload size
 */
export function validateTotalSize(files: File[]): ValidationError | null {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
    return {
      field: 'total_size',
      message: `Total upload size exceeds maximum: ${(MAX_TOTAL_UPLOAD_SIZE / 1024 / 1024).toFixed(0)}MB. Your total: ${(totalSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  return null;
}

/**
 * Check if required documents are present
 */
export function validateRequiredDocuments(
  uploadedTypes: Array<string | { type: string; file: File }>
): ValidationError | null {
  // Handle both string array and object array
  const types = uploadedTypes.map(item => typeof item === 'string' ? item : item.type);
  
  const hasDisclosure = types.includes('disclosure');
  const hasDrawing = types.includes('drawing');
  const hasAttachment = types.includes('attachment');

  if (!hasDisclosure) {
    return {
      field: 'disclosure',
      message: 'Disclosure Form is required',
    };
  }

  if (!hasDrawing) {
    return {
      field: 'drawing',
      message: 'Technical Drawings/Diagrams are required',
    };
  }

  if (!hasAttachment) {
    return {
      field: 'attachment',
      message: 'Supporting Documents are required',
    };
  }

  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return html.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Validate evaluation scores
 */
export function validateEvaluationScores(scores: Record<string, number>): ValidationError | null {
  for (const [key, value] of Object.entries(scores)) {
    if (typeof value !== 'number' || value < 0 || value > 10) {
      return {
        field: key,
        message: `${key} score must be between 0 and 10`,
      };
    }
  }
  return null;
}

/**
 * Validate remarks (non-empty for rejections/revisions)
 */
export function validateRemarks(remarks: string, decision: string): ValidationError | null {
  if ((decision === 'revision' || decision === 'rejected') && !remarks.trim()) {
    return {
      field: 'remarks',
      message: `Remarks are required when requesting revisions or rejecting`,
    };
  }
  return null;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  details?: Record<string, string>;
  code?: string;
}

export function createErrorResponse(
  message: string,
  details?: Record<string, string>,
  code?: string
): ErrorResponse {
  return {
    success: false,
    error: message,
    ...(details && { details }),
    ...(code && { code }),
  };
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export function createSuccessResponse<T>(
  data: T,
  message?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}
