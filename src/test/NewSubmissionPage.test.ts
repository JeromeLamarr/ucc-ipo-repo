import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewSubmissionPage } from '../../pages/NewSubmissionPage';
import * as authContext from '../../contexts/AuthContext';

describe('NewSubmissionPage - Phase 6 Integration Tests', () => {
  beforeEach(() => {
    // Mock auth context
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      profile: {
        id: 'test-user-123',
        full_name: 'Test User',
        email: 'test@example.com',
        affiliation: 'UCC',
        role: 'applicant',
      },
      loading: false,
      error: null,
    } as any);
  });

  describe('Document Upload Section', () => {
    it('should display required documents section', () => {
      render(<NewSubmissionPage />);
      // Navigate to step 5 (documents)
      // Check for required documents list
      expect(screen.getByText(/disclosure form/i)).toBeInTheDocument();
      expect(screen.getByText(/technical drawings/i)).toBeInTheDocument();
      expect(screen.getByText(/supporting documentation/i)).toBeInTheDocument();
    });

    it('should show file upload inputs', () => {
      render(<NewSubmissionPage />);
      const fileInputs = screen.getAllByRole('button', { name: /upload/i });
      expect(fileInputs.length).toBeGreaterThan(0);
    });

    it('should display document status indicators', () => {
      render(<NewSubmissionPage />);
      // Check for status indicators (green/red checks)
      expect(screen.getByText(/uploaded|missing/i)).toBeInTheDocument();
    });

    it('should show file size and type requirements', () => {
      render(<NewSubmissionPage />);
      expect(screen.getByText(/pdf|docx|xlsx|png|jpg/i)).toBeInTheDocument();
    });
  });

  describe('File Validation', () => {
    it('should reject files with invalid types', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      await userEvent.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        expect(screen.getByText(/not allowed|invalid file/i)).toBeInTheDocument();
      });
    });

    it('should accept valid PDF files', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const validFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      
      await userEvent.upload(fileInput, validFile);
      
      await waitFor(() => {
        expect(screen.getByText(/document.pdf/)).toBeInTheDocument();
      });
    });

    it('should reject files exceeding max size', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
      
      await userEvent.upload(fileInput, largeFile);
      
      await waitFor(() => {
        expect(screen.getByText(/exceeds.*size|too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Required Documents Enforcement', () => {
    it('should disable submit button without all documents', () => {
      render(<NewSubmissionPage />);
      const submitButton = screen.getByRole('button', { name: /submit|next/i });
      // Without all documents, button should be disabled or show warning
      expect(submitButton).toBeDisabled();
    });

    it('should show clear error when disclosure form missing', async () => {
      render(<NewSubmissionPage />);
      // Try to submit without disclosure
      const submitButton = screen.getByRole('button', { name: /submit/i });
      await userEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/disclosure|required/i)).toBeInTheDocument();
      });
    });

    it('should enable submit when all documents uploaded', async () => {
      render(<NewSubmissionPage />);
      
      // Upload all required documents
      const fileInputs = screen.getAllByRole('input', { type: 'file' });
      
      const files = [
        new File(['test'], 'disclosure.pdf', { type: 'application/pdf' }),
        new File(['test'], 'drawing.png', { type: 'image/png' }),
        new File(['test'], 'support.docx', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ];
      
      for (let i = 0; i < Math.min(fileInputs.length, files.length); i++) {
        await userEvent.upload(fileInputs[i], files[i]);
      }
      
      const submitButton = screen.getByRole('button', { name: /submit/i });
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Messages', () => {
    it('should display helpful error messages', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await userEvent.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        const errorMsg = screen.getByText(/error|invalid/i);
        expect(errorMsg).toBeInTheDocument();
        // Error should be specific about what went wrong
        expect(errorMsg.textContent).toMatch(/type|extension|format/i);
      });
    });

    it('should clear errors when valid file uploaded', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      // First upload invalid
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await userEvent.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        expect(screen.getByText(/error|invalid/i)).toBeInTheDocument();
      });
      
      // Then upload valid
      const validFile = new File(['test'], 'valid.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, validFile);
      
      await waitFor(() => {
        expect(screen.queryByText(/error|invalid/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('UI Feedback', () => {
    it('should show document status indicators', () => {
      render(<NewSubmissionPage />);
      // Should show which documents are uploaded
      expect(screen.getByText(/uploaded|missing/i)).toBeInTheDocument();
    });

    it('should update status when document added', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const file = new File(['test'], 'disclosure.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/✓|uploaded/i)).toBeInTheDocument();
      });
    });

    it('should show total file count', async () => {
      render(<NewSubmissionPage />);
      const fileInputs = screen.getAllByRole('input', { type: 'file' });
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInputs[0], file);
      
      await waitFor(() => {
        expect(screen.getByText(/1\s+file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<NewSubmissionPage />);
      const labels = screen.getAllByText(/disclosure|drawing|supporting/i);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have descriptive button text', () => {
      render(<NewSubmissionPage />);
      expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    it('should announce validation errors to screen readers', async () => {
      render(<NewSubmissionPage />);
      const fileInput = screen.getByRole('input', { type: 'file' });
      
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      await userEvent.upload(fileInput, invalidFile);
      
      await waitFor(() => {
        const error = screen.getByText(/error|invalid/i);
        expect(error).toHaveAttribute('role', 'alert');
      });
    });
  });
});
