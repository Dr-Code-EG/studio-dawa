'use client';

import type { VideoSettings } from '@/lib/types';

interface TextCustomizerProps {
  settings: VideoSettings;
  onChange: (settings: Partial<VideoSettings>) => void;
}

const fontOptions = [
  { value: 'Amiri', label: 'أميري' },
  { value: 'Scheherazade New', label: 'شهرزاد' },
];

export default function TextCustomizer({
  settings,
  onChange,
}: TextCustomizerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✏️</span>
        <h2 className="text-xl font-semibold">إعدادات النص</h2>
      </div>

      {/* Font family */}
      <div>
        <label className="block text-sm mb-2 opacity-80">نوع الخط</label>
        <div className="grid grid-cols-2 gap-2">
          {fontOptions.map((font) => (
            <button
              key={font.value}
              onClick={() => onChange({ fontFamily: font.value })}
              className={`p-3 rounded-xl border transition-all ${
                settings.fontFamily === font.value
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
              style={{ fontFamily: font.value }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="block text-sm mb-2 opacity-80">
          حجم الخط: {settings.fontSize}px
        </label>
        <input
          type="range"
          min={24}
          max={120}
          value={settings.fontSize}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Text color */}
      <div>
        <label className="block text-sm mb-2 opacity-80">لون النص</label>
        <div className="flex gap-2 flex-wrap">
          {['#ffffff', '#fbbf24', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#000000'].map(
            (color) => (
              <button
                key={color}
                onClick={() => onChange({ textColor: color })}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  settings.textColor === color ? 'border-primary scale-110' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
              />
            )
          )}
          <input
            type="color"
            value={settings.textColor}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
          />
        </div>
      </div>

      {/* Text position */}
      <div>
        <label className="block text-sm mb-2 opacity-80">موضع النص</label>
        <div className="grid grid-cols-3 gap-2">
          {(['top', 'center', 'bottom'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onChange({ textPosition: pos })}
              className={`p-3 rounded-xl border transition-all ${
                settings.textPosition === pos
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-12 border border-border rounded relative overflow-hidden flex items-center justify-center">
                  <div
                    className="w-full h-2 bg-primary/60 rounded-sm"
                    style={{
                      marginTop: pos === 'top' ? '2px' : pos === 'center' ? '5px' : 'auto',
                      marginBottom: pos === 'bottom' ? '2px' : 'auto',
                    }}
                  />
                </div>
                <span className="text-xs">
                  {pos === 'top' ? 'أعلى' : pos === 'center' ? 'وسط' : 'أسفل'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text shadow */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
        <span className="text-sm flex-1">ظل النص</span>
        <div
          className="px-3 py-1 rounded-lg text-xs cursor-pointer transition-colors"
          style={{
            backgroundColor: settings.textPosition === 'top' ? 'primary' : 'var(--accent)',
          }}
        >
          مفعّل تلقائياً
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 border border-border">
        <p className="text-xs opacity-60 mb-3">معاينة النص:</p>
        <p
          className="text-center leading-relaxed"
          style={{
            fontFamily: settings.fontFamily,
            fontSize: Math.min(settings.fontSize, 36),
            color: settings.textColor,
            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
        </p>
      </div>
    </div>
  );
}
