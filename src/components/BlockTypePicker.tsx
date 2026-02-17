import {
  LayoutTemplate,
  Grid3x3,
  ListOrdered,
  Type,
  Tags,
  Zap,
  Image,
  Sparkles,
  FileText,
  Layers,
} from 'lucide-react';

const BLOCK_TYPES = [
  {
    id: 'hero',
    name: 'Hero Banner',
    description: 'Large header with headline and CTA button',
    icon: LayoutTemplate,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'features',
    name: 'Feature Grid',
    description: 'Grid of feature cards with icons',
    icon: Grid3x3,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'steps',
    name: 'Process Steps',
    description: 'Sequential numbered steps',
    icon: ListOrdered,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'categories',
    name: 'Categories',
    description: 'Grid of category tags',
    icon: Tags,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    id: 'text-section',
    name: 'Text Section',
    description: 'Informational text content',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
  {
    id: 'cta',
    name: 'Call to Action',
    description: 'Colored banner with button',
    icon: Zap,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  {
    id: 'gallery',
    name: 'Image Gallery',
    description: 'Responsive image grid',
    icon: Image,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  {
    id: 'showcase',
    name: 'Showcase',
    description: 'Featured items display',
    icon: Sparkles,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
  },
  {
    id: 'tabs',
    name: 'Tabbed Content',
    description: 'Tabbed navigation with content sections',
    icon: Layers,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
  },
];

interface BlockTypePickerProps {
  selectedType: string;
  onSelect: (type: string) => void;
}

export function BlockTypePicker({ selectedType, onSelect }: BlockTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {BLOCK_TYPES.map((block) => {
        const Icon = block.icon;
        const isSelected = selectedType === block.id;

        return (
          <button
            key={block.id}
            onClick={() => onSelect(block.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              isSelected
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${block.bgColor}`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${block.color}`} />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">{block.name}</h3>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {block.description}
                </p>
              </div>
            </div>

            {isSelected && (
              <div className="mt-3 flex items-center gap-1 text-blue-600 text-xs font-medium">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                Selected
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
