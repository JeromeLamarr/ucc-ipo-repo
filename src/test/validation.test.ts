import { describe, it, expect } from 'vitest';
import {
  validateFile,
  validateRequiredDocuments,
  validateEmail,
  validateUUID,
  sanitizeHTML,
  validateEvaluationScores,
  validateRemarks,
  isValidUUID,
} from '../../lib/validation';

describe('Validation Utilities - Phase 6 Unit Tests', () => {
  // ============ File Validation Tests ============
  describe('validateFile', () => {
    it('should accept valid PDF files', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid DOCX files', () => {
      const file = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid Excel files', () => {
      const file = new File(['content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const result = validateFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept valid image files (PNG, JPG)', () => {
      const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
      const jpgFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      
      expect(validateFile(pngFile).valid).toBe(true);
      expect(validateFile(jpgFile).valid).toBe(true);
    });

    it('should reject executable files', () => {
      const file = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject files exceeding max size', () => {
      const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed');
    });

    it('should reject files with wrong extension', () => {
      const file = new File(['content'], 'test.txt.pdf', { type: 'text/plain' });
      const result = validateFile(file);
      expect(result.valid).toBe(false);
    });
  });

  // ============ Required Documents Tests ============
  describe('validateRequiredDocuments', () => {
    it('should accept when all required documents present', () => {
      const documentTypes = ['disclosure', 'drawing', 'attachment'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(true);
    });

    it('should reject when disclosure form missing', () => {
      const documentTypes = ['drawing', 'attachment'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disclosure');
    });

    it('should reject when drawings missing', () => {
      const documentTypes = ['disclosure', 'attachment'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Drawing');
    });

    it('should reject when supporting docs missing', () => {
      const documentTypes = ['disclosure', 'drawing'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Support');
    });

    it('should accept with extra documents', () => {
      const documentTypes = ['disclosure', 'drawing', 'attachment', 'other', 'research'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive', () => {
      const documentTypes = ['DISCLOSURE', 'DRAWING', 'ATTACHMENT'];
      const result = validateRequiredDocuments(documentTypes);
      expect(result.valid).toBe(true);
    });
  });

  // ============ Email Validation Tests ============
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'info+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid.email',
        'missing@domain',
        '@nodomain.com',
        'user@.com',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
      });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });
  });

  // ============ UUID Validation Tests ============
  describe('validateUUID', () => {
    it('should accept valid UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '00000000-0000-4000-8000-000000000000',
      ];

      validUUIDs.forEach(uuid => {
        const result = validateUUID(uuid);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-41d4-a716-44665544000g', // invalid char
        '',
        'undefined',
      ];

      invalidUUIDs.forEach(uuid => {
        const result = validateUUID(uuid);
        expect(result.valid).toBe(false);
      });
    });
  });

  // ============ XSS Prevention Tests ============
  describe('sanitizeHTML', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;script&gt;');
    });

    it('should escape HTML attributes', () => {
      const input = 'onclick="alert(\'xss\')"';
      const output = sanitizeHTML(input);
      expect(output).toContain('&quot;');
    });

    it('should handle normal text', () => {
      const input = 'This is normal text';
      const output = sanitizeHTML(input);
      expect(output).toBe('This is normal text');
    });

    it('should handle empty strings', () => {
      const output = sanitizeHTML('');
      expect(output).toBe('');
    });

    it('should handle ampersands', () => {
      const input = 'Q&A';
      const output = sanitizeHTML(input);
      expect(output).toBe('Q&amp;A');
    });

    it('should escape all dangerous characters', () => {
      const input = '&<>"\'';
      const output = sanitizeHTML(input);
      expect(output).toBe('&amp;&lt;&gt;&quot;&#039;');
    });
  });

  // ============ Evaluation Score Validation Tests ============
  describe('validateEvaluationScores', () => {
    it('should accept valid scores (0-10)', () => {
      const scores = { innovation: 5, feasibility: 8, marketPotential: 7, technicalMerit: 6 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(true);
    });

    it('should accept boundary scores', () => {
      const scores = { innovation: 0, feasibility: 10, marketPotential: 0, technicalMerit: 10 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(true);
    });

    it('should reject negative scores', () => {
      const scores = { innovation: -1, feasibility: 8, marketPotential: 7, technicalMerit: 6 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(false);
    });

    it('should reject scores above 10', () => {
      const scores = { innovation: 11, feasibility: 8, marketPotential: 7, technicalMerit: 6 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(false);
    });

    it('should reject non-numeric scores', () => {
      const scores = { innovation: 'five', feasibility: 8, marketPotential: 7, technicalMerit: 6 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(false);
    });

    it('should reject NaN scores', () => {
      const scores = { innovation: NaN, feasibility: 8, marketPotential: 7, technicalMerit: 6 };
      const result = validateEvaluationScores(scores);
      expect(result.valid).toBe(false);
    });
  });

  // ============ Remarks Validation Tests ============
  describe('validateRemarks', () => {
    it('should accept non-empty remarks', () => {
      const result = validateRemarks('This is a valid remark', 'revision');
      expect(result.valid).toBe(true);
    });

    it('should require remarks for revision', () => {
      const result = validateRemarks('', 'revision');
      expect(result.valid).toBe(false);
    });

    it('should require remarks for rejection', () => {
      const result = validateRemarks('', 'rejected');
      expect(result.valid).toBe(false);
    });

    it('should allow empty remarks for approval', () => {
      const result = validateRemarks('', 'approved');
      expect(result.valid).toBe(true);
    });

    it('should accept remarks with special characters', () => {
      const remarks = 'Please review & approve this item (score: 9/10)';
      const result = validateRemarks(remarks, 'revision');
      expect(result.valid).toBe(true);
    });
  });

  // ============ UUID Helper Tests ============
  describe('isValidUUID', () => {
    it('should identify valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should identify invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
    });
  });

  // ============ Integration Tests ============
  describe('Integration Tests', () => {
    it('should validate complete document submission', () => {
      // Simulate document upload
      const files = [
        new File(['content'], 'disclosure.pdf', { type: 'application/pdf' }),
        new File(['content'], 'drawing.png', { type: 'image/png' }),
        new File(['content'], 'support.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ];

      // Validate each file
      const allFilesValid = files.every(file => validateFile(file).valid);
      expect(allFilesValid).toBe(true);

      // Validate required documents
      const documentTypes = ['disclosure', 'drawing', 'attachment'];
      const docsValid = validateRequiredDocuments(documentTypes).valid;
      expect(docsValid).toBe(true);
    });

    it('should validate complete evaluation submission', () => {
      const scores = { innovation: 8, feasibility: 9, marketPotential: 7, technicalMerit: 8 };
      const remarks = 'Excellent submission with strong potential';
      const decision = 'approved';

      const scoresValid = validateEvaluationScores(scores).valid;
      const remarksValid = validateRemarks(remarks, decision).valid;

      expect(scoresValid).toBe(true);
      expect(remarksValid).toBe(true);
    });

    it('should sanitize and validate email content', () => {
      const applicantName = 'John <script>alert("xss")</script> Doe';
      const remarks = 'Approved by Admin & Manager';

      const sanitizedName = sanitizeHTML(applicantName);
      const sanitizedRemarks = sanitizeHTML(remarks);

      expect(sanitizedName).not.toContain('<script>');
      expect(sanitizedRemarks).toContain('&amp;');
    });
  });
});
