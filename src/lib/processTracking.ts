/**
 * Process Tracking utilities
 * Handles retrieving the latest status for IP submissions
 */

import { supabase } from './supabase';

export interface ProcessTrackingRecord {
  id: string;
  ip_record_id: string;
  stage: string;
  status: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

/**
 * Get the latest process tracking record for a submission
 * Always retrieves only the most recent status change
 */
export async function getLatestProcessTrackingRecord(
  ipRecordId: string
): Promise<ProcessTrackingRecord | null> {
  try {
    const { data, error } = await supabase
      .from('process_tracking')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No records found is not necessarily an error
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching latest process tracking:', error);
      return null;
    }

    return data as ProcessTrackingRecord;
  } catch (error) {
    console.error('Exception fetching latest process tracking:', error);
    return null;
  }
}

/**
 * Get all process tracking records for a submission, ordered by date
 * Useful for displaying complete history
 */
export async function getAllProcessTrackingRecords(
  ipRecordId: string
): Promise<ProcessTrackingRecord[]> {
  try {
    const { data, error } = await supabase
      .from('process_tracking')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching process tracking records:', error);
      return [];
    }

    return (data || []) as ProcessTrackingRecord[];
  } catch (error) {
    console.error('Exception fetching process tracking records:', error);
    return [];
  }
}

/**
 * Get the latest status string for a submission
 */
export async function getLatestStatus(ipRecordId: string): Promise<string | null> {
  const record = await getLatestProcessTrackingRecord(ipRecordId);
  return record?.status || null;
}

/**
 * Get the latest stage for a submission
 */
export async function getLatestStage(ipRecordId: string): Promise<string | null> {
  const record = await getLatestProcessTrackingRecord(ipRecordId);
  return record?.stage || null;
}
