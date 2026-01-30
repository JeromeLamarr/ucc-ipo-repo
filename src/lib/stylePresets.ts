// Preset mappings for CMS styling
// Maps user-friendly names to Tailwind classes or hex colors

export const BACKGROUND_PRESETS = {
  'Blue Gradient': 'bg-gradient-to-r from-blue-600 to-blue-800',
  'Purple Gradient': 'bg-gradient-to-r from-purple-600 to-purple-800',
  'Green Gradient': 'bg-gradient-to-r from-green-600 to-green-800',
  'Primary Solid': '#2563EB', // solid blue
  'Secondary Solid': '#9333EA', // solid purple
};

export const BUTTON_PRESETS = {
  'Primary': {
    bg: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    text: 'text-white',
    hex: '#2563EB',
  },
  'Secondary': {
    bg: 'bg-purple-600',
    bgHover: 'hover:bg-purple-700',
    text: 'text-white',
    hex: '#9333EA',
  },
  'Green': {
    bg: 'bg-green-600',
    bgHover: 'hover:bg-green-700',
    text: 'text-white',
    hex: '#16a34a',
  },
  'Dark': {
    bg: 'bg-gray-900',
    bgHover: 'hover:bg-gray-800',
    text: 'text-white',
    hex: '#111827',
  },
};

export const ICON_COLOR_PRESETS = {
  'Blue': { bg: 'bg-blue-100', text: 'text-blue-600' },
  'Purple': { bg: 'bg-purple-100', text: 'text-purple-600' },
  'Green': { bg: 'bg-green-100', text: 'text-green-600' },
  'Orange': { bg: 'bg-orange-100', text: 'text-orange-600' },
  'Red': { bg: 'bg-red-100', text: 'text-red-600' },
  'Pink': { bg: 'bg-pink-100', text: 'text-pink-600' },
  'Indigo': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
};

export const TEXT_ALIGNMENT_PRESETS = {
  'Left': 'left',
  'Center': 'center',
  'Right': 'right',
};

// Helper function to get preset value
export function getPresetValue(presetType: string, presetName: string): any {
  const presets: Record<string, Record<string, any>> = {
    background: BACKGROUND_PRESETS,
    button: BUTTON_PRESETS,
    iconColor: ICON_COLOR_PRESETS,
    textAlignment: TEXT_ALIGNMENT_PRESETS,
  };

  return presets[presetType]?.[presetName];
}

// Helper to find preset name from value
export function findPresetName(presetType: string, value: string): string | null {
  const presets: Record<string, Record<string, any>> = {
    background: BACKGROUND_PRESETS,
    button: BUTTON_PRESETS,
    iconColor: ICON_COLOR_PRESETS,
    textAlignment: TEXT_ALIGNMENT_PRESETS,
  };

  const presetMap = presets[presetType];
  if (!presetMap) return null;

  for (const [name, preset] of Object.entries(presetMap)) {
    if (typeof preset === 'string' && preset === value) {
      return name;
    } else if (typeof preset === 'object' && preset.hex === value) {
      return name;
    }
  }

  return null;
}
