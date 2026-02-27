import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

export type RecordDocumentationData = {
  id: string;
  title: string;
  abstract: string | null;
  category: string;
  details: any;
  reference_number: string | null;
  status: string;
  current_stage: string;
  created_at: string;
  updated_at: string;
  applicant_id: string;
  supervisor_id: string | null;
  evaluator_id: string | null;
  applicant: {
    id: string;
    email: string;
    full_name: string;
    department_id?: string;
  } | null;
  supervisor: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  evaluator: {
    id: string;
    email: string;
    full_name: string;
  } | null;
};

export async function fetchFullRecordDocumentation(
  recordId: string
): Promise<RecordDocumentationData> {
  try {
    const { data, error } = await supabase
      .from('ip_records')
      .select(
        `
        *,
        applicant:users!applicant_id(id, email, full_name, department_id),
        supervisor:users!supervisor_id(id, email, full_name),
        evaluator:users!evaluator_id(id, email, full_name)
      `
      )
      .eq('id', recordId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch record: ${error.message}`);
    }

    if (!data) {
      throw new Error('Record not found');
    }

    return data as RecordDocumentationData;
  } catch (error: any) {
    console.error('Error fetching record documentation:', error);
    throw error;
  }
}
