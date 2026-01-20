import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface SimilarTitle {
  id: string;
  title: string;
  similarity: number;
}

export interface TitleCheckResult {
  exists: boolean;
  exactMatch: {
    found: boolean;
    title?: string;
    id?: string;
  };
  similarTitles: SimilarTitle[];
}

interface UseCheckTitleDuplicateOptions {
  debounceMs?: number;
  excludeDraftId?: string;
  onlyOnBlur?: boolean;
}

export function useCheckTitleDuplicate(
  title: string,
  options: UseCheckTitleDuplicateOptions = {}
) {
  const {
    debounceMs = 600,
    excludeDraftId,
    onlyOnBlur = false,
  } = options;

  const [result, setResult] = useState<TitleCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkTitle = async (titleToCheck: string) => {
    if (!titleToCheck || titleToCheck.trim().length === 0) {
      setResult(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        title: titleToCheck.trim(),
      });

      if (excludeDraftId) {
        queryParams.append('excludeDraftId', excludeDraftId);
      }

      // Get the Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/check-title?${queryParams}`;

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TitleCheckResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error('[useCheckTitleDuplicate] Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onlyOnBlur) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!title || title.trim().length === 0) {
      setResult(null);
      return;
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      checkTitle(title);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [title, debounceMs, excludeDraftId, onlyOnBlur]);

  return {
    result,
    loading,
    error,
    checkTitle, // Allow manual checking
  };
}
