import { X, AlertTriangle } from 'lucide-react';

interface PublishValidationErrorProps {
  issues: string[];
  onClose: () => void;
}

/**
 * Modal component showing validation errors when publishing fails
 */
export function PublishValidationError({ issues, onClose }: PublishValidationErrorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Cannot Publish Page</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Your page has the following validation issues that must be fixed before publishing:
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
          <ul className="space-y-2">
            {issues.map((issue, idx) => (
              <li key={idx} className="text-sm text-red-700 flex gap-2">
                <span className="text-red-500 font-bold flex-shrink-0">✗</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-600 mb-6">
          Please go back to the page editor and fix these issues before attempting to publish again.
        </p>

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Go Back to Edit
        </button>
      </div>
    </div>
  );
}
