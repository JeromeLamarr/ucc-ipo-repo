/**
 * Responsive Design Controls Component (Phase 2)
 * Allows customization of text blocks for different screen sizes
 */

import { SmartphoneIcon, TabletIcon, Monitor, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface ResponsiveDesignProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const FONT_SIZE_OPTIONS = [
  { value: 'xs', label: 'Extra Small (12px)', px: '12px' },
  { value: 'sm', label: 'Small (14px)', px: '14px' },
  { value: 'base', label: 'Base (16px)', px: '16px' },
  { value: 'lg', label: 'Large (18px)', px: '18px' },
  { value: 'xl', label: 'Extra Large (20px)', px: '20px' },
  { value: '2xl', label: '2X Large (24px)', px: '24px' },
];

const COLUMN_OPTIONS = [
  { value: 'single', label: '1 Column', cols: 1 },
  { value: 'two', label: '2 Columns', cols: 2 },
  { value: 'three', label: '3 Columns', cols: 3 },
];

export function ResponsiveDesignPanel({ formData, updateField }: ResponsiveDesignProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('desktop');
  const [showPreview, setShowPreview] = useState(true);

  // Initialize responsive settings if they don't exist
  const responsive = formData.responsive || {
    mobile: { fontSize: 'base', columns: 'single', padding: 'normal' },
    tablet: { fontSize: 'base', columns: 'single', padding: 'normal' },
    desktop: { fontSize: 'lg', columns: 'single', padding: 'comfortable' },
  };

  const handleResponsiveUpdate = (device: DeviceType, field: string, value: any) => {
    updateField('responsive', {
      ...responsive,
      [device]: {
        ...responsive[device],
        [field]: value,
      },
    });
  };

  const deviceConfig = {
    mobile: {
      label: 'Mobile',
      icon: SmartphoneIcon,
      width: 375,
      breakpoint: 'Up to 640px',
      description: 'iPhone and small phones',
    },
    tablet: {
      label: 'Tablet',
      icon: TabletIcon,
      width: 768,
      breakpoint: '641px - 1024px',
      description: 'iPad and tablets',
    },
    desktop: {
      label: 'Desktop',
      icon: Monitor,
      width: 1200,
      breakpoint: '1025px and up',
      description: 'Desktop and large screens',
    },
  };

  const config = deviceConfig[selectedDevice];
  const Icon = config.icon;
  const deviceSettings = responsive[selectedDevice];

  return (
    <div className="space-y-6">
      {/* Device Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold text-gray-900">Screen Size Settings</label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition flex items-center gap-1"
          >
            {showPreview ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(deviceConfig) as DeviceType[]).map(device => {
            const deviceInfo = deviceConfig[device];
            const DeviceIcon = deviceInfo.icon;
            return (
              <button
                key={device}
                onClick={() => setSelectedDevice(device)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedDevice === device
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 bg-white'
                }`}
              >
                <DeviceIcon
                  className={`h-6 w-6 mx-auto mb-1 ${
                    selectedDevice === device ? 'text-blue-600' : 'text-gray-600'
                  }`}
                />
                <div className={`font-medium text-sm ${selectedDevice === device ? 'text-blue-600' : 'text-gray-900'}`}>
                  {deviceInfo.label}
                </div>
                <div className="text-xs text-gray-500">{deviceInfo.breakpoint}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings for Selected Device */}
      <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{config.label} Settings</h3>
          </div>
          <p className="text-xs text-gray-600">{config.description}</p>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
          <div className="grid grid-cols-3 gap-2">
            {FONT_SIZE_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleResponsiveUpdate(selectedDevice, 'fontSize', option.value)}
                className={`p-2 text-xs rounded-lg border transition-all ${
                  deviceSettings.fontSize === option.value
                    ? 'border-blue-600 bg-white font-semibold text-blue-600'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
                style={{ fontSize: option.px }}
              >
                Aa
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Current: {FONT_SIZE_OPTIONS.find(o => o.value === deviceSettings.fontSize)?.label}
          </p>
        </div>

        {/* Column Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Column Layout</label>
          <div className="grid grid-cols-3 gap-3">
            {COLUMN_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleResponsiveUpdate(selectedDevice, 'columns', option.value)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  deviceSettings.columns === option.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-sm font-medium text-gray-700 mb-2">{option.label}</div>
                <div className="flex gap-1">
                  {Array.from({ length: option.cols }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-6 border border-gray-400 rounded ${
                        deviceSettings.columns === option.value ? 'bg-blue-300' : 'bg-gray-100'
                      }`}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            ⚠️ Note: Most mobile devices only show 1 column (wider content squishes)
          </p>
        </div>

        {/* Padding/Margin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Padding</label>
          <select
            value={deviceSettings.padding || 'normal'}
            onChange={(e) => handleResponsiveUpdate(selectedDevice, 'padding', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="tight">Tight (8px)</option>
            <option value="normal">Normal (16px)</option>
            <option value="comfortable">Comfortable (24px)</option>
            <option value="spacious">Spacious (32px)</option>
          </select>
        </div>

        {/* Show/Hide on Device */}
        <div>
          <label className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={deviceSettings.hidden !== true}
              onChange={(e) => handleResponsiveUpdate(selectedDevice, 'hidden', !e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Show on {config.label}</span>
          </label>
        </div>
      </div>

      {/* Responsive Preview */}
      {showPreview && <ResponsivePreview formData={formData} selectedDevice={selectedDevice} />}

      {/* Quick Reference */}
      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg space-y-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          💡 Responsive Design Tips
        </h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>✅ Mobile: Smaller fonts, single column, less padding</li>
          <li>✅ Tablet: Medium fonts, flexible columns</li>
          <li>✅ Desktop: Larger fonts, multiple columns if needed</li>
          <li>✅ Test each breakpoint to ensure good readability</li>
          <li>✅ Font size should never be smaller than 12px on mobile</li>
        </ul>
      </div>

      {/* Device Size Comparison */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">📊 Common Device Sizes</h4>
        <div className="space-y-2 text-xs text-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <strong>Mobile:</strong>
              <div className="text-gray-600">iPhone: 375-430px</div>
              <div className="text-gray-600">Android: 360-480px</div>
            </div>
            <div>
              <strong>Tablet:</strong>
              <div className="text-gray-600">iPad: 810px</div>
              <div className="text-gray-600">iPad Pro: 1024px</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponsivePreview({
  formData,
  selectedDevice,
}: {
  formData: Record<string, any>;
  selectedDevice: DeviceType;
}) {
  const responsive = formData.responsive || {
    mobile: { fontSize: 'base' },
    tablet: { fontSize: 'base' },
    desktop: { fontSize: 'lg' },
  };

  const fontSizeMap: Record<string, string> = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  };

  const widthMap: Record<DeviceType, number> = {
    mobile: 375,
    tablet: 768,
    desktop: 1200,
  };

  const deviceSettings = responsive[selectedDevice];
  const width = widthMap[selectedDevice];
  const fontSize = fontSizeMap[deviceSettings.fontSize] || '16px';

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">📱 Preview at {width}px</h4>
      <div
        className="bg-white border-8 border-gray-400 rounded-lg overflow-hidden mx-auto"
        style={{ width: `${Math.min(width, 300)}px` }}
      >
        <div
          className="p-4 bg-gradient-to-b from-blue-50 to-white min-h-40"
          style={{ fontSize }}
        >
          {formData.title && <h2 className="font-bold mb-3">{formData.title}</h2>}
          <p className="text-gray-700 leading-relaxed line-clamp-4">
            {formData.body || 'Your content will appear here...'}
          </p>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Font size: {fontSize} | Columns: {deviceSettings.columns || 'single'}
          </p>
        </div>
      </div>
    </div>
  );
}
