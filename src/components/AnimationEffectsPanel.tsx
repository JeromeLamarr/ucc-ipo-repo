/**
 * Animation & Visual Effects (Phase 3)
 * Adds entrance animations, scroll effects, and interactive elements
 */

import { Play, Settings, Zap } from 'lucide-react';
import { useState } from 'react';

interface AnimationEffectsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
}

const ANIMATION_PRESETS = [
  {
    name: 'Fade In',
    value: 'fadeIn',
    description: 'Smooth fade entrance',
    css: `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      animation: fadeIn 0.6s ease-out;
    `,
  },
  {
    name: 'Slide In Up',
    value: 'slideInUp',
    description: 'Slide up from bottom',
    css: `
      @keyframes slideInUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      animation: slideInUp 0.6s ease-out;
    `,
  },
  {
    name: 'Slide In Left',
    value: 'slideInLeft',
    description: 'Slide from left side',
    css: `
      @keyframes slideInLeft {
        from { transform: translateX(-30px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      animation: slideInLeft 0.6s ease-out;
    `,
  },
  {
    name: 'Slide In Right',
    value: 'slideInRight',
    description: 'Slide from right side',
    css: `
      @keyframes slideInRight {
        from { transform: translateX(30px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      animation: slideInRight 0.6s ease-out;
    `,
  },
  {
    name: 'Zoom In',
    value: 'zoomIn',
    description: 'Scale up entrance',
    css: `
      @keyframes zoomIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      animation: zoomIn 0.6s ease-out;
    `,
  },
  {
    name: 'Bounce In',
    value: 'bounceIn',
    description: 'Bouncy entrance animation',
    css: `
      @keyframes bounceIn {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
      animation: bounceIn 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `,
  },
];

const PARALLAX_INTENSITIES = [
  { value: 'none', label: 'None', intensity: 0 },
  { value: 'subtle', label: 'Subtle', intensity: 10 },
  { value: 'medium', label: 'Medium', intensity: 20 },
  { value: 'strong', label: 'Strong', intensity: 30 },
];

const DURATION_OPTIONS = [
  { value: '300', label: '0.3s (Fast)' },
  { value: '600', label: '0.6s (Normal)' },
  { value: '1000', label: '1.0s (Slow)' },
  { value: '1500', label: '1.5s (Very Slow)' },
];

const DELAY_OPTIONS = [
  { value: '0', label: 'Immediate' },
  { value: '200', label: '0.2s Delay' },
  { value: '400', label: '0.4s Delay' },
  { value: '600', label: '0.6s Delay' },
  { value: '1000', label: '1.0s Delay' },
];

const TRIGGER_OPTIONS = [
  { value: 'onView', label: '👁️ On Scroll Into View', description: 'When block becomes visible' },
  { value: 'onLoad', label: '⏱️ On Page Load', description: 'Immediately when page loads' },
  { value: 'onClick', label: '👆 On Click', description: 'When user clicks block' },
  { value: 'onHover', label: '✨ On Hover', description: 'When mouse hovers over block' },
];

type AnimationTab = 'entrance' | 'scroll' | 'interactive';

export function AnimationEffectsPanel({ formData, updateField }: AnimationEffectsProps) {
  const [activeTab, setActiveTab] = useState<AnimationTab>('entrance');
  const [previewAnimation, setPreviewAnimation] = useState(false);

  const animation = formData.animation || {};

  const tabs: Array<{ id: AnimationTab; label: string; icon: string }> = [
    { id: 'entrance', label: 'Entrance', icon: '👋' },
    { id: 'scroll', label: 'Scroll', icon: '📜' },
    { id: 'interactive', label: 'Interactive', icon: '✨' },
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
                  ? 'border-pink-600 text-pink-600 bg-pink-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entrance Animations */}
      {activeTab === 'entrance' && (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-900">Animation Type</label>
              <button
                onClick={() => setPreviewAnimation(!previewAnimation)}
                className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 transition flex items-center gap-1"
              >
                <Play className="h-3 w-3" />
                {previewAnimation ? 'Stop' : 'Preview'}
              </button>
            </div>

            <div className="space-y-2">
              {ANIMATION_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => updateField('animation', { ...animation, type: preset.value })}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    animation.type === preset.value
                      ? 'border-pink-600 bg-pink-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{preset.name}</div>
                      <div className="text-xs text-gray-600">{preset.description}</div>
                    </div>
                    {animation.type === preset.value && (
                      <span className="text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {animation.type && (
            <>
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateField('animation', { ...animation, duration: parseInt(option.value) })}
                      className={`p-2 text-xs rounded-lg border transition-all ${
                        animation.duration === parseInt(option.value)
                          ? 'border-pink-600 bg-pink-50 font-semibold text-pink-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delay</label>
                <div className="grid grid-cols-3 gap-2">
                  {DELAY_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateField('animation', { ...animation, delay: parseInt(option.value) })}
                      className={`p-2 text-xs rounded-lg border transition-all ${
                        animation.delay === parseInt(option.value)
                          ? 'border-pink-600 bg-pink-50 font-semibold text-pink-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trigger</label>
                <div className="space-y-2">
                  {TRIGGER_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="trigger"
                        value={option.value}
                        checked={animation.trigger === option.value}
                        onChange={(e) => updateField('animation', { ...animation, trigger: e.target.value })}
                        className="w-4 h-4 text-pink-600 mt-0.5"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Preview */}
          {previewAnimation && animation.type && (
            <EntranceAnimationPreview animation={animation} />
          )}
        </div>
      )}

      {/* Scroll Effects */}
      {activeTab === 'scroll' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Parallax Effect (Depth)
            </label>
            <div className="space-y-2">
              {PARALLAX_INTENSITIES.map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="parallax"
                    value={option.value}
                    checked={formData.parallax === option.value}
                    onChange={(e) => updateField('parallax', e.target.value)}
                    className="w-4 h-4 text-pink-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600">
                      {option.value === 'none'
                        ? 'No parallax effect'
                        : `Moves at ${option.intensity}% of scroll speed`}
                    </div>
                  </div>
                  {option.value !== 'none' && (
                    <div
                      className="w-12 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded"
                      style={{
                        transform: `translateY(${(option.intensity / 100) * -4}px)`,
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sticky Behavior
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sticky === true}
                onChange={(e) => updateField('sticky', e.target.checked)}
                className="w-4 h-4 text-pink-600 rounded"
              />
              <div>
                <div className="font-medium text-gray-900">Stick to viewport while scrolling</div>
                <div className="text-xs text-gray-600">Block stays visible as user scrolls</div>
              </div>
            </label>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Scroll Effects Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✅ Parallax creates depth and visual interest</li>
              <li>✅ Use subtle parallax (10-20) for best effect</li>
              <li>✅ Sticky blocks work well for CTA sections</li>
              <li>⚠️ Use sparingly - can distract from content</li>
            </ul>
          </div>
        </div>
      )}

      {/* Interactive Effects */}
      {activeTab === 'interactive' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Hover Effects
            </label>
            <div className="space-y-2">
              {[
                { value: 'none', label: 'None', description: 'No effect' },
                { value: 'lift', label: 'Lift Up', description: 'Subtle upward movement' },
                { value: 'scale', label: 'Scale', description: 'Slightly grow' },
                { value: 'glow', label: 'Glow', description: 'Add shadow/glow' },
                { value: 'rotate', label: 'Rotate', description: 'Slight rotation' },
              ].map(option => (
                <label
                  key={option.value}
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.hoverEffect === option.value}
                    onChange={() => updateField('hoverEffect', option.value)}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Animation Easing
            </label>
            <select
              value={formData.easing || 'ease-out'}
              onChange={(e) => updateField('easing', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="linear">Linear (constant speed)</option>
              <option value="ease-in">Ease In (slow start)</option>
              <option value="ease-out">Ease Out (slow end)</option>
              <option value="ease-in-out">Ease In Out (slow start & end)</option>
              <option value="cubic-bezier">Cubic Bezier (custom)</option>
            </select>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Performance Note</h4>
            <p className="text-xs text-yellow-800">
              Animations can impact performance. Use them sparingly on pages with many blocks.
              Test on mobile devices to ensure smooth performance.
            </p>
          </div>
        </div>
      )}

      {/* Global Animation Settings */}
      <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-pink-600" />
          <h4 className="font-semibold text-gray-900">Animations Quick Stats</h4>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div>
            <div className="font-bold text-pink-600">{animation.type ? '✓' : '✗'}</div>
            <div className="text-gray-600">Entrance</div>
          </div>
          <div>
            <div className="font-bold text-purple-600">{formData.parallax !== 'none' ? '✓' : '✗'}</div>
            <div className="text-gray-600">Scroll Effect</div>
          </div>
          <div>
            <div className="font-bold text-indigo-600">{formData.hoverEffect ? '✓' : '✗'}</div>
            <div className="text-gray-600">Hover</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntranceAnimationPreview({ animation }: { animation: Record<string, any> }) {
  const [isAnimating, setIsAnimating] = useState(true);

  // Create animation CSS
  const getAnimationCSS = () => {
    const animationMap: Record<string, string> = {
      fadeIn: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        animation: fadeIn ${animation.duration || 600}ms ease-out forwards;
      `,
      slideInUp: `
        @keyframes slideInUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        animation: slideInUp ${animation.duration || 600}ms ease-out forwards;
      `,
      slideInLeft: `
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        animation: slideInLeft ${animation.duration || 600}ms ease-out forwards;
      `,
      slideInRight: `
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        animation: slideInRight ${animation.duration || 600}ms ease-out forwards;
      `,
      zoomIn: `
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        animation: zoomIn ${animation.duration || 600}ms ease-out forwards;
      `,
      bounceIn: `
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        animation: bounceIn ${animation.duration || 700}ms cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
      `,
    };

    return animationMap[animation.type] || '';
  };

  return (
    <div className="space-y-3">
      <style>{getAnimationCSS()}</style>
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-medium text-gray-600 mb-3">Animation Preview:</p>
        <div
          key={isAnimating ? 'animate' : 'still'}
          className="p-6 bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-lg text-center font-medium"
          style={{
            opacity: isAnimating ? 1 : 0,
          }}
        >
          🎨 Preview Text Block
        </div>
        <button
          onClick={() => setIsAnimating(!isAnimating)}
          className="w-full mt-3 px-3 py-2 text-xs bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition"
        >
          {isAnimating ? '⏸️ Reset & Play Again' : '▶️ Play Animation'}
        </button>
      </div>
    </div>
  );
}
