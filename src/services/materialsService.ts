/**
 * Materials Service
 * 
 * Handles all academic presentation materials operations:
 * - Requesting materials from applicants
 * - Submitting materials from applicants
 * - Getting materials status
 * - Rejecting/resetting materials
 */

import { supabase } from '../lib/supabase';

export interface MaterialsData {
  id?: string;
  ip_record_id: string;
  status: 'not_requested' | 'requested' | 'submitted' | 'rejected';
  materials_requested_at?: string | null;
  materials_requested_by?: string | null;
  materials_submitted_at?: string | null;
  submitted_by?: string | null;
  poster_file_url?: string | null;
  poster_file_name?: string | null;
  poster_file_size?: number | null;
  paper_file_url?: string | null;
  paper_file_name?: string | null;
  paper_file_size?: number | null;
}

export const materialsService = {
  /**
   * Request materials from applicant (Admin only)
   * 
   * Creates or updates presentation_materials record with status='requested'
   * Initiates the materials workflow
   */
  async requestMaterials(
    ipRecordId: string,
    adminId: string
  ): Promise<MaterialsData> {
    try {
      const now = new Date().toISOString();

      // Get or create materials record
      const { data: existing, error: fetchError } = await supabase
        .from('presentation_materials')
        .select('id')
        .eq('ip_record_id', ipRecordId)
        .single();

      let result;

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('presentation_materials')
          .update({
            status: 'requested',
            materials_requested_at: now,
            materials_requested_by: adminId,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('presentation_materials')
          .insert({
            ip_record_id: ipRecordId,
            status: 'requested',
            materials_requested_at: now,
            materials_requested_by: adminId,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result as MaterialsData;
    } catch (error: any) {
      console.error('Error requesting materials:', error);
      throw new Error(`Failed to request materials: ${error.message}`);
    }
  },

  /**
   * Submit materials from applicant (Applicant only)
   * 
   * Updates presentation_materials record with files and sets status='submitted'
   * Called after files are uploaded to storage
   */
  async submitMaterials(
    ipRecordId: string,
    applicantId: string,
    files: {
      posterUrl: string;
      posterName: string;
      posterSize: number;
      paperUrl: string;
      paperName: string;
      paperSize: number;
    }
  ): Promise<MaterialsData> {
    try {
      if (!ipRecordId || !applicantId || !files) {
        throw new Error('Missing required parameters');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('presentation_materials')
        .update({
          status: 'submitted',
          materials_submitted_at: now,
          submitted_by: applicantId,
          poster_file_url: files.posterUrl,
          poster_file_name: files.posterName,
          poster_file_size: files.posterSize,
          paper_file_url: files.paperUrl,
          paper_file_name: files.paperName,
          paper_file_size: files.paperSize,
        })
        .eq('ip_record_id', ipRecordId)
        .select()
        .single();

      if (error) throw error;

      return data as MaterialsData;
    } catch (error: any) {
      console.error('Error submitting materials:', error);
      throw new Error(`Failed to submit materials: ${error.message}`);
    }
  },

  /**
   * Get materials status and details (Admin & Applicant)
   * 
   * Retrieves the current materials record for a submission
   * Returns null if no materials record exists yet
   */
  async getMaterials(ipRecordId: string): Promise<MaterialsData | null> {
    try {
      const { data, error } = await supabase
        .from('presentation_materials')
        .select('*')
        .eq('ip_record_id', ipRecordId)
        .single();

      // PGRST116 = no rows found, which is fine (not requested yet)
      if (error && error.code === 'PGRST116') {
        return null;
      }

      if (error) throw error;

      return data as MaterialsData;
    } catch (error: any) {
      console.error('Error fetching materials:', error);
      throw new Error(`Failed to fetch materials: ${error.message}`);
    }
  },

  /**
   * Get all materials for a record (Admin only)
   * 
   * Retrieves complete materials details including submission history
   */
  async getMaterialsWithDetails(ipRecordId: string) {
    try {
      const { data, error } = await supabase
        .from('presentation_materials')
        .select(`
          *,
          requested_by:materials_requested_by(full_name, email),
          submitted_by_user:submitted_by(full_name, email)
        `)
        .eq('ip_record_id', ipRecordId)
        .single();

      if (error && error.code === 'PGRST116') {
        return null;
      }

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error('Error fetching detailed materials:', error);
      throw new Error(`Failed to fetch materials details: ${error.message}`);
    }
  },

  /**
   * Reject materials and reset to 'requested' status (Admin only)
   * 
   * Clears submitted files and resets to requested state for resubmission
   */
  async rejectMaterials(
    ipRecordId: string,
    reason?: string
  ): Promise<MaterialsData> {
    try {
      if (!ipRecordId) {
        throw new Error('Missing ip_record_id');
      }

      const { data, error } = await supabase
        .from('presentation_materials')
        .update({
          status: 'requested',
          // Clear submitted files
          poster_file_url: null,
          poster_file_name: null,
          poster_file_size: null,
          paper_file_url: null,
          paper_file_name: null,
          paper_file_size: null,
          materials_submitted_at: null,
          submitted_by: null,
        })
        .eq('ip_record_id', ipRecordId)
        .select()
        .single();

      if (error) throw error;

      return data as MaterialsData;
    } catch (error: any) {
      console.error('Error rejecting materials:', error);
      throw new Error(`Failed to reject materials: ${error.message}`);
    }
  },

  /**
   * Check if materials have been submitted
   * 
   * Returns true if status is 'submitted'
   */
  async isSubmitted(ipRecordId: string): Promise<boolean> {
    try {
      const materials = await this.getMaterials(ipRecordId);
      return materials?.status === 'submitted';
    } catch (error) {
      console.error('Error checking submission status:', error);
      return false;
    }
  },

  /**
   * Check if materials have been requested
   * 
   * Returns true if status is 'requested' or 'submitted'
   */
  async isRequested(ipRecordId: string): Promise<boolean> {
    try {
      const materials = await this.getMaterials(ipRecordId);
      return materials !== null && ['requested', 'submitted', 'rejected'].includes(materials.status);
    } catch (error) {
      console.error('Error checking request status:', error);
      return false;
    }
  },

  /**
   * Get materials submission deadline
   * 
   * Returns the deadline timestamp (materials_requested_at + 10 business days)
   */
  getDeadline(materialsRequestedAt: string | null): Date | null {
    if (!materialsRequestedAt) return null;

    const requestDate = new Date(materialsRequestedAt);
    let deadline = new Date(requestDate);
    let businessDaysAdded = 0;

    // Add 10 business days (skip weekends)
    while (businessDaysAdded < 10) {
      deadline.setDate(deadline.getDate() + 1);
      const dayOfWeek = deadline.getDay();
      
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysAdded++;
      }
    }

    return deadline;
  },

  /**
   * Get days remaining for submission
   * 
   * Returns number of days until deadline
   * Negative if past deadline
   */
  getDaysRemaining(materialsRequestedAt: string | null): number {
    if (!materialsRequestedAt) return -1;

    const deadline = this.getDeadline(materialsRequestedAt);
    if (!deadline) return -1;

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / msPerDay);

    return daysRemaining;
  },

  /**
   * Validate file before upload
   * 
   * Checks file type and size against requirements
   */
  validateFile(file: File, fileType: 'poster' | 'paper'): { valid: boolean; error?: string } {
    const requirements = {
      poster: {
        types: ['image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        label: 'Scientific Poster (JPG/PNG, 10MB max)',
      },
      paper: {
        types: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        maxSize: 5 * 1024 * 1024, // 5MB
        label: 'IMRaD Short Paper (PDF/DOCX, 5MB max)',
      },
    };

    const req = requirements[fileType];

    // Check file type
    if (!req.types.includes(file.type)) {
      return {
        valid: false,
        error: `${req.label} - Invalid file type. Allowed: ${fileType === 'poster' ? 'JPG, PNG' : 'PDF, DOCX'}`,
      };
    }

    // Check file size
    if (file.size > req.maxSize) {
      const maxSizeMB = req.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `${req.label} - File too large. Max: ${maxSizeMB}MB, Got: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      };
    }

    return { valid: true };
  },

  /**
   * Get storage path for file
   * 
   * Returns the path where file should be stored in bucket
   */
  getStoragePath(ipRecordId: string, fileType: 'poster' | 'paper', fileName: string): string {
    const ext = fileName.split('.').pop() || '';
    const timestamp = Date.now();
    return `presentations/${ipRecordId}/${fileType}-${timestamp}.${ext}`;
  },
};

export default materialsService;
