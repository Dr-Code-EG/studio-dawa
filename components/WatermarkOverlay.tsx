'use client';

import type { VideoSettings } from '@/lib/types';

interface WatermarkOverlayProps {
  settings: VideoSettings;
  onChange: (settings: Partial<VideoSettings>) => void;
}

export default function WatermarkOverlay({
  settings,
  onChange,
}: WatermarkOverlayProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">💧</span>
        <h2 className="text-xl font-semibold">العلامة المائية</h2>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
        <div>
          <div className="font-medium">تفعيل العلامة المائية</div>
          <div className="text-xs opacity-60 mt-1">
            إضافة اسمك أو حسابك على الفيديو
          </div>
        </div>
        <button
          onClick={() => onChange({ showWatermark: !settings.showWatermark })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.showWatermark ? 'bg-primary' : 'bg-accent'
          }`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
              settings.showWatermark ? 'right-0.5' : 'right-6'
            }`}
          />
        </button>
      </div>

      {settings.showWatermark && (
        <>
          {/* Watermark text */}
          <div>
            <label className="block text-sm mb-2 opacity-80">نص العلامة المائية</label>
            <input
              type="text"
              value={settings.watermarkText}
              onChange={(e) => onChange({ watermarkText: e.target.value })}
              placeholder="@حسابك أو اسمك"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Quick suggestions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onChange({ watermarkText: '@dawah_studio' })}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
            >
              @dawah_studio
            </button>
            <button
              onClick={() => onChange({ watermarkText: 'استوديو دعوة' })}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
            >
              استوديو دعوة
            </button>
            <button
              onClick={() => onChange({ watermarkText: 'صدقة جارية' })}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
            >
              صدقة جارية
            </button>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm mb-2 opacity-80">الموضع</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'bottom-right', label: 'يمين أسفل' },
                { value: 'bottom-left', label: 'يسار أسفل' },
                { value: 'top-right', label: 'يمين أعلى' },
                { value: 'top-left', label: 'يسار أعلى' },
                { value: 'center-bottom', label: 'وسط أسفل' },
                { value: 'center-top', label: 'وسط أعلى' },
              ].map((pos) => (
                <button
                  key={pos.value}
                  className="p-2 rounded-lg bg-card border border-border text-xs hover:border-primary/50 transition-colors text-center"
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-border overflow-hidden">
            <div className="h-32 flex items-center justify-center">
              <p className="text-lg opacity-80">معاينة الفيديو</p>
            </div>
            {settings.watermarkText && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs backdrop-blur-sm">
                {settings.watermarkText}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
