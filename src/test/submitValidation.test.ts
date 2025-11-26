import { describe, it, expect } from 'vitest';
import { validateRequiredDocuments, validateFile } from '../lib/validation';

describe('Submit Function Validation', () => {
  describe('validateRequiredDocuments', () => {
    it('should accept array of UploadedFile objects', () => {
      const files = [
        { type: 'disclosure', file: new File([], 'disclosure.pdf') },
        { type: 'drawing', file: new File([], 'drawing.pdf') },
        { type: 'attachment', file: new File([], 'attachment.pdf') },
      ];

      const result = validateRequiredDocuments(files);
      expect(result).toBeNull();
    });

    it('should reject when missing disclosure document', () => {
      const files = [
        { type: 'drawing', file: new File([], 'drawing.pdf') },
        { type: 'attachment', file: new File([], 'attachment.pdf') },
      ];

      const result = validateRequiredDocuments(files);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('disclosure');
    });

    it('should reject when missing drawing document', () => {
      const files = [
        { type: 'disclosure', file: new File([], 'disclosure.pdf') },
        { type: 'attachment', file: new File([], 'attachment.pdf') },
      ];

      const result = validateRequiredDocuments(files);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('drawing');
    });

    it('should reject when missing attachment document', () => {
      const files = [
        { type: 'disclosure', file: new File([], 'disclosure.pdf') },
        { type: 'drawing', file: new File([], 'drawing.pdf') },
      ];

      const result = validateRequiredDocuments(files);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('attachment');
    });

    it('should accept extra documents beyond required three', () => {
      const files = [
        { type: 'disclosure', file: new File([], 'disclosure.pdf') },
        { type: 'drawing', file: new File([], 'drawing.pdf') },
        { type: 'attachment', file: new File([], 'attachment.pdf') },
        { type: 'attachment', file: new File([], 'extra.pdf') },
        { type: 'attachment', file: new File([], 'another.pdf') },
      ];

      const result = validateRequiredDocuments(files);
      expect(result).toBeNull();
    });

    it('should handle backward compatibility with string array', () => {
      const files = ['disclosure', 'drawing', 'attachment'] as any;
      const result = validateRequiredDocuments(files);
      expect(result).toBeNull();
    });

    it('should reject string array missing required type', () => {
      const files = ['disclosure', 'drawing'] as any;
      const result = validateRequiredDocuments(files);
      expect(result).not.toBeNull();
      expect(result?.message).toContain('attachment');
    });

    it('should handle empty array', () => {
      const files: any[] = [];
      const result = validateRequiredDocuments(files);
      expect(result).not.toBeNull();
      expect(result?.message).toMatch(/disclosure|drawing|attachment/);
    });
  });

  describe('validateFile', () => {
    it('should validate PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate DOC files', () => {
      const file = new File(['content'], 'test.doc', { type: 'application/msword' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate DOCX files', () => {
      const file = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate Excel files', () => {
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate image files', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject files exceeding size limit', () => {
      // Create a mock file that simulates large size
      const largeContent = new Array(51 * 1024 * 1024).fill('x').join(''); // 51MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('size');
    });
  });

  describe('Integration: Submit Flow Validation', () => {
    it('should validate complete submission with all required documents', () => {
      const uploadedFiles = [
        { type: 'disclosure', file: new File(['disclosure'], 'disc.pdf') },
        { type: 'drawing', file: new File(['drawing'], 'draw.pdf') },
        { type: 'attachment', file: new File(['attach'], 'attach.pdf') },
      ];

      // Simulate the submit validation flow
      const docValidationError = validateRequiredDocuments(uploadedFiles);
      const fileValidationErrors = uploadedFiles.map(f => validateFile(f.file)).filter(v => !v.valid);

      expect(docValidationError).toBeNull();
      expect(fileValidationErrors).toHaveLength(0);
    });

    it('should reject submission missing required documents', () => {
      const uploadedFiles = [
        { type: 'disclosure', file: new File(['disclosure'], 'disc.pdf') },
      ];

      const docValidationError = validateRequiredDocuments(uploadedFiles);
      expect(docValidationError).not.toBeNull();
      expect(docValidationError?.field).toBe('documents');
    });

    it('should reject submission with invalid file types', () => {
      const uploadedFiles = [
        { type: 'disclosure', file: new File(['disclosure'], 'disc.exe') },
        { type: 'drawing', file: new File(['drawing'], 'draw.pdf') },
        { type: 'attachment', file: new File(['attach'], 'attach.pdf') },
      ];

      const fileValidationErrors = uploadedFiles.map(f => validateFile(f.file)).filter(v => !v.valid);
      expect(fileValidationErrors.length).toBeGreaterThan(0);
    });
  });
});
