import { useState, useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Heading2,
  Type,
  Underline,
  Code,
  Quote,
  ListOrdered,
  Strikethrough,
  HelpCircle,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  showKeyboardHelp?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your text here...',
  showKeyboardHelp = true,
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    focusEditor();
  }, []);

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      applyFormat('createLink', url);
    }
  }, [applyFormat]);

  const insertCodeBlock = useCallback(() => {
    applyFormat('formatBlock', 'pre');
  }, [applyFormat]);

  const insertBlockquote = useCallback(() => {
    applyFormat('formatBlock', 'blockquote');
  }, [applyFormat]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'k':
          e.preventDefault();
          insertLink();
          break;
      }
    }

    // Sync content
    syncContent();
  };

  const syncContent = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <label className="block text-sm font-medium text-gray-700">Content</label>
        <div className="flex gap-2">
          {showKeyboardHelp && (
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              title="Keyboard shortcuts"
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition flex items-center gap-1"
            >
              <HelpCircle className="h-3 w-3" />
              Help
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
          >
            {isPreview ? '✏️ Edit' : '👁️ Preview'}
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700 space-y-1 mb-2">
          <div className="font-semibold text-blue-900 mb-2">⌨️ Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-2">
            <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">⌘/Ctrl+B</kbd> Bold</div>
            <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">⌘/Ctrl+I</kbd> Italic</div>
            <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">⌘/Ctrl+U</kbd> Underline</div>
            <div><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">⌘/Ctrl+K</kbd> Link</div>
          </div>
        </div>
      )}

      {isPreview ? (
        <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 min-h-40 prose prose-sm max-w-none overflow-auto">
          <div dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      ) : (
        <>
          {/* Toolbar - Organized by groups */}
          <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2 space-y-2">
            {/* Paragraph Styles */}
            <div className="flex flex-wrap gap-1">
              <div className="text-xs font-medium text-gray-600 self-center mr-2">Styles:</div>
              <ToolbarButton
                icon={<Type className="h-4 w-4" />}
                title="Paragraph (Ctrl+0)"
                onClick={() => applyFormat('formatBlock', 'p')}
              />
              <ToolbarButton
                icon={<Heading2 className="h-4 w-4" />}
                title="Heading 2"
                onClick={() => applyFormat('formatBlock', 'h2')}
              />
              <select
                onChange={(e) => applyFormat('formatBlock', e.target.value)}
                defaultValue=""
                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
              >
                <option value="">More styles...</option>
                <option value="h1">Heading 1</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
              </select>
            </div>

            {/* Text Formatting */}
            <div className="flex flex-wrap gap-1">
              <div className="text-xs font-medium text-gray-600 self-center mr-2">Format:</div>
              <ToolbarButton
                icon={<Bold className="h-4 w-4" />}
                title="Bold (Ctrl+B)"
                onClick={() => applyFormat('bold')}
              />
              <ToolbarButton
                icon={<Italic className="h-4 w-4" />}
                title="Italic (Ctrl+I)"
                onClick={() => applyFormat('italic')}
              />
              <ToolbarButton
                icon={<Underline className="h-4 w-4" />}
                title="Underline (Ctrl+U)"
                onClick={() => applyFormat('underline')}
              />
              <ToolbarButton
                icon={<Strikethrough className="h-4 w-4" />}
                title="Strikethrough"
                onClick={() => applyFormat('strikethrough')}
              />
            </div>

            {/* Lists & Content */}
            <div className="flex flex-wrap gap-1">
              <div className="text-xs font-medium text-gray-600 self-center mr-2">Content:</div>
              <ToolbarButton
                icon={<List className="h-4 w-4" />}
                title="Bullet List"
                onClick={() => applyFormat('insertUnorderedList')}
              />
              <ToolbarButton
                icon={<ListOrdered className="h-4 w-4" />}
                title="Numbered List"
                onClick={() => applyFormat('insertOrderedList')}
              />
              <ToolbarButton
                icon={<Quote className="h-4 w-4" />}
                title="Blockquote"
                onClick={insertBlockquote}
              />
              <ToolbarButton
                icon={<Code className="h-4 w-4" />}
                title="Code Block"
                onClick={insertCodeBlock}
              />
              <ToolbarButton
                icon={<LinkIcon className="h-4 w-4" />}
                title="Link (Ctrl+K)"
                onClick={insertLink}
              />
            </div>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            onBlur={syncContent}
            onKeyUp={handleKeyDown}
            onInput={syncContent}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: value }}
            className="w-full px-4 py-3 border border-t-0 border-gray-300 rounded-b-lg focus:ring-2 focus:outline-none focus:border-blue-500 min-h-48 bg-white"
            style={{
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          />
        </>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>✨ Supports: headings, paragraphs, bold, italic, underline, strikethrough, bullet lists, numbered lists, quotes, code blocks, and links</p>
        {showKeyboardHelp && <p>💡 Tip: Use Ctrl/⌘+B for bold, Ctrl/⌘+I for italic, Ctrl/⌘+U for underline</p>}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 hover:bg-gray-200 hover:text-gray-900 rounded text-gray-700 transition flex-shrink-0"
    >
      {icon}
    </button>
  );
}
