import { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import {
  BACKGROUND_OPTIONS,
  PADDING_OPTIONS,
  SIZE_PRESET_OPTIONS,
  WEIGHT_OPTIONS,
  DEFAULT_SECTION_STYLE,
} from './cmsStyles';
import type { SectionStyle, TypographyStyle } from './cmsStyles';

interface SectionStyleEditorProps {
  style: SectionStyle | null | undefined;
  onChange: (style: SectionStyle) => void;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Default</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TypographyEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TypographyStyle | undefined;
  onChange: (v: TypographyStyle) => void;
}) {
  const update = (key: keyof TypographyStyle, val: string) => {
    onChange({ ...(value ?? {}), [key]: val || undefined });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Size"
          value={value?.sizePreset}
          options={SIZE_PRESET_OPTIONS}
          onChange={(v) => update('sizePreset', v)}
        />
        <SelectField
          label="Weight"
          value={value?.weight}
          options={WEIGHT_OPTIONS}
          onChange={(v) => update('weight', v)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Align"
          value={value?.align}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
          onChange={(v) => update('align', v)}
        />
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
          <div className="flex gap-1">
            <input
              type="color"
              value={value?.color || '#111827'}
              onChange={(e) => update('color', e.target.value)}
              className="h-7 w-9 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={value?.color || ''}
              onChange={(e) => update('color', e.target.value)}
              placeholder="inherit"
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SectionStyleEditor({ style, onChange }: SectionStyleEditorProps) {
  const [open, setOpen] = useState(false);

  const current: SectionStyle = style ?? {};

  const update = <K extends keyof SectionStyle>(key: K, val: SectionStyle[K]) => {
    onChange({ ...current, [key]: val || undefined });
  };

  const reset = () => onChange({});

  const hasCustomStyle = style && Object.keys(style).length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
          <span className="text-sm font-medium text-gray-700">Section Style</span>
          {hasCustomStyle && (
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Custom</span>
          )}
        </div>
        {hasCustomStyle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Background"
              value={current.background}
              options={BACKGROUND_OPTIONS}
              onChange={(v) => update('background', v as SectionStyle['background'])}
            />
            <SelectField
              label="Padding"
              value={current.padding}
              options={PADDING_OPTIONS}
              onChange={(v) => update('padding', v as SectionStyle['padding'])}
            />
            <SelectField
              label="Width"
              value={current.width}
              options={[
                { value: 'boxed', label: 'Boxed' },
                { value: 'full', label: 'Full Width' },
              ]}
              onChange={(v) => update('width', v as SectionStyle['width'])}
            />
            <SelectField
              label="Align"
              value={current.align}
              options={[
                { value: 'left', label: 'Left' },
                { value: 'center', label: 'Center' },
                { value: 'right', label: 'Right' },
              ]}
              onChange={(v) => update('align', v as SectionStyle['align'])}
            />
            <SelectField
              label="Border"
              value={current.border}
              options={[
                { value: 'none', label: 'None' },
                { value: 'top', label: 'Top' },
                { value: 'bottom', label: 'Bottom' },
                { value: 'both', label: 'Both' },
              ]}
              onChange={(v) => update('border', v as SectionStyle['border'])}
            />
            <SelectField
              label="Shadow"
              value={current.shadow}
              options={[
                { value: 'none', label: 'None' },
                { value: 'sm', label: 'Small' },
                { value: 'md', label: 'Medium' },
                { value: 'lg', label: 'Large' },
              ]}
              onChange={(v) => update('shadow', v as SectionStyle['shadow'])}
            />
          </div>

          <p className="text-xs text-gray-400">
            Defaults: {DEFAULT_SECTION_STYLE.background} bg · {DEFAULT_SECTION_STYLE.padding} padding · {DEFAULT_SECTION_STYLE.width} width
          </p>
        </div>
      )}
    </div>
  );
}
