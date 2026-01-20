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

      const { data, error: invokeError } = await supabase.functions.invoke(
        'check-title',
        {
          method: 'GET',
          body: null,
          headers: {
            'Content-Type': 'application/json',
          },
          // Pass query params via URL (GET request)
        }
      );

      // For GET requests, we need to construct the full URL
      const response = await fetch(
        `${supabase.functions.url}/check-title?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: TitleCheckResult = await response.json();
      setResult(result);
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
