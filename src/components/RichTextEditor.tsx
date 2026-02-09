import { useState } from 'react';
import { Bold, Italic, List, Link as LinkIcon, Heading2, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your text here...',
}: RichTextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      applyFormat('createLink', url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Sync content on key changes
    syncContent();
  };

  const syncContent = () => {
    const editor = document.getElementById('rich-text-editor') as HTMLDivElement;
    if (editor) {
      onChange(editor.innerHTML);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">Content</label>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
        >
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {isPreview ? (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 min-h-32 prose prose-sm max-w-none">
          <div dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 p-2 bg-gray-100 rounded-t-lg border border-b-0 border-gray-300">
            <ToolbarButton
              icon={<Heading2 className="h-4 w-4" />}
              title="Heading"
              onClick={() => applyFormat('formatBlock', 'h2')}
            />
            <ToolbarButton
              icon={<Type className="h-4 w-4" />}
              title="Paragraph"
              onClick={() => applyFormat('formatBlock', 'p')}
            />
            <div className="border-l border-gray-300 mx-1" />
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
            <div className="border-l border-gray-300 mx-1" />
            <ToolbarButton
              icon={<List className="h-4 w-4" />}
              title="Bullet List"
              onClick={() => applyFormat('insertUnorderedList')}
            />
            <ToolbarButton
              icon={<LinkIcon className="h-4 w-4" />}
              title="Link"
              onClick={insertLink}
            />
          </div>

          {/* Editor */}
          <div
            id="rich-text-editor"
            contentEditable
            onBlur={syncContent}
            onKeyUp={syncContent}
            onInput={handleKeyDown}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: value }}
            className="w-full px-3 py-2 border border-gray-300 rounded-b-lg focus:ring-2 focus:outline-none focus:border-blue-500 min-h-32 bg-white"
            style={{ 
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
          />
        </>
      )}

      <p className="text-xs text-gray-500">
        Supports: headings, paragraphs, bold, italic, lists, and links
      </p>
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
      className="p-2 hover:bg-gray-200 rounded text-gray-700 transition"
    >
      {icon}
    </button>
  );
}
