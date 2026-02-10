/**
 * Advanced Text Block Styling Component (Phase 2)
 * Provides enhanced styling options including:
 * - Text decorations
 * - Custom padding/margins
 * - Borders with customization
 * - Shadow and visual effects
 */

import { Check, Palette, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface AdvancedStylingProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
}

// Text Decoration Options
const TEXT_DECORATION_OPTIONS = [
  { value: 'none', label: 'None', icon: 'A' },
  { value: 'underline', label: 'Underline', icon: 'U̲' },
  { value: 'overline', label: 'Overline', icon: '‾A' },
  { value: 'line-through', label: 'Line-through', icon: 'S̶' },
];

// Border Styles
const BORDER_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid', icon: '━' },
  { value: 'dashed', label: 'Dashed', icon: '┅' },
  { value: 'dotted', label: 'Dotted', icon: '┈' },
  { value: 'double', label: 'Double', icon: '╋' },
];

// Border Width Options
const BORDER_WIDTH_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: '1px' },
  { value: '2', label: '2px' },
  { value: '3', label: '3px' },
  { value: '4', label: '4px' },
  { value: '8', label: '8px (thick)' },
];

// Padding/Margin Presets
const SPACING_PRESETS = [
  { value: 'tight', label: 'Tight (8px)', px: 8 },
  { value: 'normal', label: 'Normal (16px)', px: 16 },
  { value: 'comfortable', label: 'Comfortable (24px)', px: 24 },
  { value: 'spacious', label: 'Spacious (32px)', px: 32 },
  { value: 'extra', label: 'Extra (48px)', px: 48 },
];

// Shadow Presets
const SHADOW_PRESETS = [
  { value: 'none', label: 'None', css: 'none' },
  { value: 'subtle', label: 'Subtle', css: '0 1px 2px rgba(0,0,0,0.05)' },
  { value: 'light', label: 'Light', css: '0 4px 6px rgba(0,0,0,0.1)' },
  { value: 'medium', label: 'Medium', css: '0 10px 15px rgba(0,0,0,0.1)' },
  { value: 'strong', label: 'Strong', css: '0 20px 25px rgba(0,0,0,0.15)' },
  { value: 'dramatic', label: 'Dramatic', css: '0 25px 50px rgba(0,0,0,0.25)' },
];

// Opacity Options
const OPACITY_OPTIONS = [
  { value: '100', label: '100% Opaque' },
  { value: '90', label: '90%' },
  { value: '75', label: '75%' },
  { value: '50', label: '50% Transparent' },
  { value: '25', label: '25%' },
];

// Border Radius
const BORDER_RADIUS_OPTIONS = [
  { value: '0', label: 'None (sharp)' },
  { value: '4', label: 'Subtle (4px)' },
  { value: '8', label: 'Small (8px)' },
  { value: '12', label: 'Medium (12px)' },
  { value: '16', label: 'Large (16px)' },
  { value: '9999', label: 'Pill (rounded)' },
];

type StylingTab = 'decoration' | 'spacing' | 'border' | 'effects';

export function AdvancedStylingPanel({ formData, updateField }: AdvancedStylingProps) {
  const [activeTab, setActiveTab] = useState<StylingTab>('decoration');

  const tabs: Array<{ id: StylingTab; label: string; icon: string }> = [
    { id: 'decoration', label: 'Text', icon: '🔤' },
    { id: 'spacing', label: 'Spacing', icon: ' 📏' },
    { id: 'border', label: 'Border', icon: '⬜' },
    { id: 'effects', label: 'Effects', icon: '✨' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Decoration Tab */}
      {activeTab === 'decoration' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Text Decoration
            </label>
            <div className="grid grid-cols-2 gap-3">
              {TEXT_DECORATION_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateField('textDecoration', option.value)}
                  className={`p-3 text-center rounded-lg border-2 transition-all ${
                    formData.textDecoration === option.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-lg font-semibold mb-1">{option.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{option.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Applies text decoration to body text only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Opacity / Transparency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OPACITY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateField('opacity', option.value)}
                  className={`p-2 text-xs rounded-lg border transition-all ${
                    formData.opacity === option.value
                      ? 'border-purple-600 bg-purple-50 font-semibold text-purple-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                  style={{
                    opacity: parseInt(option.value) / 100,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacing Tab */}
      {activeTab === 'spacing' && (
        <div className="space-y-6">
          <SpacingControl
            label="Padding (inside space)"
            value={formData.padding || 'normal'}
            onChange={(val) => updateField('padding', val)}
            description="Space inside the text block (between content and edge)"
          />

          <SpacingControl
            label="Margin (outside space)"
            value={formData.margin || 'normal'}
            onChange={(val) => updateField('margin', val)}
            description="Space outside the text block (between block and other elements)"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 Pro Tip: Visual Comparison
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 border-2 border-red-300 rounded">
                <div className="text-xs font-semibold text-gray-700 mb-2">With Padding</div>
                <div style={{ padding: '16px', border: '2px solid gray', background: '#f9fafb' }}>
                  Padding inside
                </div>
              </div>
              <div className="p-4 border-2 border-blue-300 rounded">
                <div className="text-xs font-semibold text-gray-700 mb-2">With Margin</div>
                <div style={{ margin: '16px', border: '2px solid gray', background: '#f9fafb' }}>
                  Margin outside
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Border Tab */}
      {activeTab === 'border' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Border Width
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BORDER_WIDTH_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateField('borderWidth', option.value)}
                  className={`p-2 text-xs rounded-lg border transition-all ${
                    formData.borderWidth === option.value
                      ? 'border-purple-600 bg-purple-50 font-semibold text-purple-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                  style={{
                    borderBottom: `${parseInt(option.value)}px solid currentColor`,
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {parseInt(formData.borderWidth || '0') > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Border Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BORDER_STYLE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateField('borderStyle', option.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.borderStyle === option.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="text-lg mb-1">{option.icon}</div>
                      <div className="text-xs font-medium text-gray-700">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Color
                </label>
                <input
                  type="color"
                  value={formData.borderColor || '#cccccc'}
                  onChange={(e) => updateField('borderColor', e.target.value)}
                  className="w-20 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current: {formData.borderColor || '#cccccc'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Border Radius (corner rounding)
                </label>
                <div className="space-y-2">
                  {BORDER_RADIUS_OPTIONS.map(option => (
                    <label key={option.value} className="flex items-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="borderRadius"
                        value={option.value}
                        checked={formData.borderRadius === option.value}
                        onChange={(e) => updateField('borderRadius', e.target.value)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                      <div
                        className="ml-auto w-16 h-8 border-2 border-gray-400 bg-gray-100"
                        style={{
                          borderRadius: `${option.value}px`,
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Effects Tab */}
      {activeTab === 'effects' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Shadow / Depth
            </label>
            <div className="space-y-2">
              {SHADOW_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => updateField('boxShadow', preset.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all flex items-center justify-between ${
                    formData.boxShadow === preset.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium text-gray-700">{preset.label}</span>
                  <div
                    className="w-20 h-12 bg-white rounded border border-gray-200"
                    style={{
                      boxShadow: preset.css === 'none' ? 'none' : preset.css,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Backdrop Blur (frosted glass effect)
            </label>
            <div className="space-y-2">
              {[
                { value: 'none', label: 'None' },
                { value: '2px', label: 'Subtle (2px)' },
                { value: '4px', label: 'Light (4px)' },
                { value: '8px', label: 'Medium (8px)' },
                { value: '12px', label: 'Strong (12px)' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => updateField('backdropBlur', option.value)}
                  className={`w-full p-2 text-xs rounded-lg border transition-all text-left ${
                    formData.backdropBlur === option.value
                      ? 'border-purple-600 bg-purple-50 font-semibold text-purple-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Works best with semi-transparent backgrounds
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advanced: Custom CSS
            </label>
            <textarea
              value={formData.customCSS || ''}
              onChange={(e) => updateField('customCSS', e.target.value)}
              placeholder="e.g., transform: skew(-3deg);"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ Advanced users only: Add custom CSS properties
            </p>
          </div>
        </div>
      )}

      {/* Effects Preview */}
      <EffectsPreview formData={formData} />
    </div>
  );
}

function SpacingControl({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  description?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {SPACING_PRESETS.map(preset => (
          <button
            key={preset.value}
            onClick={() => onChange(preset.value)}
            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
              value === preset.value
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div
              className="w-12 h-12 border-2 border-gray-400 mb-1 flex items-center justify-center"
              style={{ padding: `${preset.px / 2}px` }}
            >
              <div className="w-full h-full bg-gray-200" />
            </div>
            <div className="text-xs font-medium text-gray-700 text-center">{preset.label}</div>
          </button>
        ))}
      </div>
      {description && <p className="text-xs text-gray-500 mt-2 ml-1">{description}</p>}
    </div>
  );
}

function EffectsPreview({ formData }: { formData: Record<string, any> }) {
  const decimalOpacity = parseInt(formData.opacity || '100') / 100;
  const borderStyle = formData.borderStyle || 'solid';
  const borderWidth = parseInt(formData.borderWidth || '0');

  const previewStyle: React.CSSProperties = {
    opacity: decimalOpacity,
    borderWidth: borderWidth > 0 ? `${borderWidth}px` : undefined,
    borderStyle: borderStyle as any,
    borderColor: formData.borderColor || undefined,
    borderRadius: formData.borderRadius ? `${formData.borderRadius}px` : undefined,
    boxShadow:
      formData.boxShadow === 'none'
        ? 'none'
        : formData.boxShadow === 'subtle'
          ? '0 1px 2px rgba(0,0,0,0.05)'
          : formData.boxShadow === 'light'
            ? '0 4px 6px rgba(0,0,0,0.1)'
            : formData.boxShadow === 'medium'
              ? '0 10px 15px rgba(0,0,0,0.1)'
              : formData.boxShadow === 'strong'
                ? '0 20px 25px rgba(0,0,0,0.15)'
                : '0 25px 50px rgba(0,0,0,0.25)',
    backdropFilter: formData.backdropBlur && formData.backdropBlur !== 'none' ? `blur(${formData.backdropBlur})` : undefined,
    WebkitBackdropFilter: formData.backdropBlur && formData.backdropBlur !== 'none' ? `blur(${formData.backdropBlur})` : undefined,
    textDecoration: formData.textDecoration || 'none',
    padding: formData.padding === 'tight' ? '8px' : formData.padding === 'normal' ? '16px' : formData.padding === 'comfortable' ? '24px' : formData.padding === 'spacious' ? '32px' : formData.padding === 'extra' ? '48px' : '16px',
  };

  return (
    <div className="mt-6 p-4 border-2 border-purple-300 rounded-lg bg-purple-50">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">✨ Live Preview</h4>
      <div
        style={previewStyle}
        className="p-4 bg-white rounded text-center font-medium text-gray-700 transition-all duration-300"
      >
        This is how your styled text block will look
      </div>
      <p className="text-xs text-gray-600 mt-3">
        👆 Preview updates as you adjust settings
      </p>
    </div>
  );
}
