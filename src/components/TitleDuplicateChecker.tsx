import React from 'react';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { TitleCheckResult, SimilarTitle } from '../hooks/useCheckTitleDuplicate';

interface TitleDuplicateCheckerProps {
  title: string;
  result: TitleCheckResult | null;
  loading: boolean;
  error: string | null;
  onPreventSubmit?: (prevent: boolean) => void;
}

export function TitleDuplicateChecker({
  title,
  result,
  loading,
  error,
  onPreventSubmit,
}: TitleDuplicateCheckerProps) {
  const isEmpty = !title || title.trim().length === 0;

  if (isEmpty) {
    return null;
  }

  React.useEffect(() => {
    // Notify parent if we should prevent submission
    if (onPreventSubmit && result) {
      onPreventSubmit(result.exactMatch.found);
    }
  }, [result, onPreventSubmit]);

  return (
    <div className="mt-2 space-y-2">
      {/* Loading state */}
      {loading && !result && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Checking title availability...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Exact match found (CONFLICT) */}
      {result && result.exactMatch.found && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">
              ⚠️ This title already exists
            </p>
            <p className="text-red-700 text-sm mt-1">
              The IP title <strong>"{result.exactMatch.title}"</strong> is already in the system.
            </p>
            <p className="text-red-600 text-xs mt-2">
              Please choose a different title or contact your supervisor if you believe this is an error.
            </p>
          </div>
        </div>
      )}

      {/* Similar titles warning */}
      {result &&
        !result.exactMatch.found &&
        result.similarTitles.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">
                💡 Similar titles found
              </p>
              <p className="text-amber-700 text-sm mt-1">
                Consider if any of these existing IPs are related:
              </p>
              <ul className="mt-2 space-y-1">
                {result.similarTitles.slice(0, 3).map((similar: SimilarTitle) => (
                  <li
                    key={similar.id}
                    className="text-amber-700 text-sm pl-4 border-l-2 border-amber-300"
                  >
                    <span className="font-medium">"{similar.title}"</span>
                    <span className="text-amber-600 ml-2">
                      ({similar.similarity}% match)
                    </span>
                  </li>
                ))}
              </ul>
              {result.similarTitles.length > 3 && (
                <p className="text-amber-600 text-xs mt-2 italic">
                  +{result.similarTitles.length - 3} more similar title(s)
                </p>
              )}
            </div>
          </div>
        )}

      {/* Title is unique */}
      {result &&
        !result.exactMatch.found &&
        result.similarTitles.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>✓ This title is unique and available</span>
          </div>
        )}
    </div>
  );
}
