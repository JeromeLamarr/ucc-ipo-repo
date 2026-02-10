/**
 * Content Versioning System (Phase 3)
 * Tracks content history with auto-save, manual snapshots, and version restoration
 */

import { Clock, Copy, Trash2, RotateCcw, Download, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ContentVersion {
  id: string;
  timestamp: number;
  content: Record<string, any>;
  author?: string;
  note?: string;
  isManual: boolean;
  isAutoSave: boolean;
}

interface ContentVersioningProps {
  currentContent: Record<string, any>;
  onRestore: (content: Record<string, any>) => Promise<void>;
  onSave?: () => Promise<void>;
  autoSaveInterval?: number; // milliseconds
}

export function ContentVersioningPanel({
  currentContent,
  onRestore,
  onSave,
  autoSaveInterval = 120000, // 2 minutes default
}: ContentVersioningProps) {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [autoSavingEnabled, setAutoSavingEnabled] = useState(true);
  const [showSaveNote, setShowSaveNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  // Load versions from localStorage
  useEffect(() => {
    loadVersions();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSavingEnabled) return;

    const interval = setInterval(() => {
      createAutoSaveVersion();
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [autoSavingEnabled, autoSaveInterval, currentContent]);

  const loadVersions = () => {
    try {
      const stored = localStorage.getItem('textBlockVersions');
      if (stored) {
        setVersions(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading versions:', err);
    }
  };

  const saveVersions = (newVersions: ContentVersion[]) => {
    try {
      localStorage.setItem('textBlockVersions', JSON.stringify(newVersions));
      setVersions(newVersions);
    } catch (err) {
      console.error('Error saving versions:', err);
    }
  };

  const createAutoSaveVersion = () => {
    const newVersion: ContentVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content: JSON.parse(JSON.stringify(currentContent)),
      isAutoSave: true,
      isManual: false,
    };

    // Keep only last 50 auto-saved versions
    let updated = [newVersion, ...versions];
    updated = updated.filter(v => !(v.isAutoSave && updated.indexOf(v) > 50));
    saveVersions(updated);
  };

  const createManualSnapshot = () => {
    const newVersion: ContentVersion = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      content: JSON.parse(JSON.stringify(currentContent)),
      note: noteText || undefined,
      isManual: true,
      isAutoSave: false,
      author: 'current_user', // Replace with actual user
    };

    saveVersions([newVersion, ...versions]);
    setNoteText('');
    setShowSaveNote(false);
  };

  const deleteVersion = async (id: string) => {
    if (!confirm('Delete this version? This cannot be undone.')) return;
    saveVersions(versions.filter(v => v.id !== id));
  };

  const restoreVersion = async (version: ContentVersion) => {
    if (!confirm(`Restore version from ${new Date(version.timestamp).toLocaleString()}?`)) return;

    try {
      setRestoring(true);
      await onRestore(version.content);
      // Create a manual snapshot of the restoration
      const newVersion: ContentVersion = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        content: JSON.parse(JSON.stringify(version.content)),
        note: `Restored from ${new Date(version.timestamp).toLocaleString()}`,
        isManual: true,
        isAutoSave: false,
      };
      saveVersions([newVersion, ...versions]);
    } finally {
      setRestoring(false);
    }
  };

  const exportVersion = (version: ContentVersion) => {
    const data = JSON.stringify(version, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-block-v${new Date(version.timestamp).getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Content Versioning
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {versions.length} version{versions.length !== 1 ? 's' : ''} saved ({autoSavingEnabled ? 'auto-save enabled' : 'auto-save disabled'})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveNote(true)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Save Snapshot
          </button>
          <button
            type="button"
            onClick={() => setAutoSavingEnabled(!autoSavingEnabled)}
            className={`px-3 py-2 text-sm rounded-lg transition font-medium ${
              autoSavingEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-1" />
            Auto-save {autoSavingEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Save Snapshot Modal */}
      {showSaveNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h4 className="font-semibold text-gray-900 mb-3">Save Version Snapshot</h4>
            <p className="text-sm text-gray-600 mb-3">
              Add a note to describe what changed in this version (optional)
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g., Updated hero section content, changed colors"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={createManualSnapshot}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Save Snapshot
              </button>
              <button
                onClick={() => {
                  setShowSaveNote(false);
                  setNoteText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No versions saved yet</p>
            <p className="text-xs text-gray-500">Versions will appear here as you work</p>
          </div>
        ) : (
          versions.map(version => (
            <div
              key={version.id}
              className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                selectedVersion === version.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-sm text-gray-900">
                      {formatDate(version.timestamp)}
                    </span>
                    {version.isManual && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                        📌 Manual
                      </span>
                    )}
                    {version.isAutoSave && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        ⏱️ Auto-save
                      </span>
                    )}
                  </div>
                  
                  {version.note && (
                    <p className="text-xs text-gray-600 mt-1 ml-6">{version.note}</p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {new Date(version.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => restoreVersion(version)}
                    disabled={restoring}
                    className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded transition disabled:opacity-50"
                    title="Restore this version"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => exportVersion(version)}
                    className="p-2 text-gray-600 hover:bg-green-100 hover:text-green-600 rounded transition"
                    title="Download as JSON"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteVersion(version.id)}
                    className="p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded transition"
                    title="Delete version"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedVersion === version.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
                  <div className="font-mono bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                    <strong>Preview:</strong>
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {version.content.body?.substring(0, 200) || 'No content'}
                      {version.content.body && version.content.body.length > 200 ? '...' : ''}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{versions.filter(v => v.isManual).length}</div>
          <div className="text-xs text-gray-600">Manual Saves</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{versions.filter(v => v.isAutoSave).length}</div>
          <div className="text-xs text-gray-600">Auto-saves</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {((versions.reduce((sum, v) => sum + JSON.stringify(v.content).length, 0) / 1024).toFixed(1))}
          </div>
          <div className="text-xs text-gray-600">KB Used</div>
        </div>
      </div>

      {/* Info & Tips */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
          💡 Version Control Tips
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>✅ Manual snapshots are saved to browser storage (up to 50 versions)</li>
          <li>✅ Auto-save runs every 2 minutes (configurable)</li>
          <li>✅ Export versions as JSON for backup or sharing</li>
          <li>✅ Restore any previous version with one click</li>
          <li>⚠️ Versions are stored in browser only - clear cache to lose them</li>
        </ul>
      </div>
    </div>
  );
}
