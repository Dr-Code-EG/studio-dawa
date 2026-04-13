'use client';

import type { VideoSettings } from '@/lib/types';

interface EffectsSelectorProps {
  settings: VideoSettings;
  onChange: (settings: Partial<VideoSettings>) => void;
}

export default function EffectsSelector({
  settings,
  onChange,
}: EffectsSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✨</span>
        <h2 className="text-xl font-semibold">التأثيرات</h2>
      </div>

      {/* Fade toggle */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-medium">تأثير التلاشي (Fade)</div>
            <div className="text-xs opacity-60 mt-1">
              تأثير دخول وخروج سلس بين الآيات
            </div>
          </div>
          <button
            onClick={() => onChange({ enableFade: !settings.enableFade })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.enableFade ? 'bg-primary' : 'bg-accent'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                settings.enableFade ? 'right-0.5' : 'right-6'
              }`}
            />
          </button>
        </div>

        {settings.enableFade && (
          <div>
            <label className="block text-sm mb-2 opacity-80">
              مدة التلاشي: {settings.fadeDuration}ms
            </label>
            <input
              type="range"
              min={200}
              max={3000}
              step={100}
              value={settings.fadeDuration}
              onChange={(e) => onChange({ fadeDuration: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs opacity-40 mt-1">
              <span>200ms</span>
              <span>3000ms</span>
            </div>
          </div>
        )}
      </div>

      {/* Preset effects */}
      <div className="space-y-2">
        <label className="block text-sm opacity-80">تأثيرات جاهزة</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'بسيط', desc: 'بدون تأثيرات', icon: '⚪' },
            { name: 'ناعم', desc: 'تلاشي + تكبير خفيف', icon: '🌙' },
            { name: 'سينمائي', desc: 'تلاشي طويل + حركة', icon: '🎬' },
            { name: 'متحرك', desc: 'انتقالات نشطة', icon: '⭐' },
          ].map((effect) => (
            <button
              key={effect.name}
              className="p-3 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-right"
            >
              <div className="text-2xl mb-1">{effect.icon}</div>
              <div className="text-sm font-medium">{effect.name}</div>
              <div className="text-xs opacity-60">{effect.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Background overlay */}
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="font-medium mb-3">تعتيم الخلفية</div>
        <p className="text-xs opacity-60 mb-3">
          إضافة طبقة شفافة داكنة لتحسين قراءة النص
        </p>
        <div className="relative h-24 rounded-lg overflow-hidden bg-gradient-to-b from-black to-transparent">
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.4 }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-sm relative z-10" style={{ textShadow: '1px 1px 2px black' }}>
              نص تجريبي
            </span>
          </div>
        </div>
        <p className="text-xs text-primary mt-2">مفعّل تلقائياً بنسبة 40%</p>
      </div>
    </div>
  );
}
