'use client';

import { videoPresets } from '@/lib/data';
import type { VideoPreset } from '@/lib/data';

interface VideoSizeSelectorProps {
  selectedPreset: string;
  onSelect: (presetId: string) => void;
  customWidth: number;
  customHeight: number;
  onCustomChange: (width: number, height: number) => void;
}

const popularPresets = [
  { id: 'stories-reels', icon: '📱', label: 'ستوري/ريلز', ratio: '9:16' },
  { id: 'youtube', icon: '📺', label: 'يوتيوب', ratio: '16:9' },
  { id: 'instagram-post', icon: '📷', label: 'انستغرام', ratio: '1:1' },
  { id: 'tiktok', icon: '🎵', label: 'تيك توك', ratio: '9:16' },
];

export default function VideoSizeSelector({
  selectedPreset,
  onSelect,
  customWidth,
  customHeight,
  onCustomChange,
}: VideoSizeSelectorProps) {
  const selectedData = videoPresets.find(p => p.id === selectedPreset);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎬</span>
        <h2 className="text-xl font-semibold">مقاس الفيديو</h2>
      </div>

      {/* Quick select popular */}
      <div className="grid grid-cols-4 gap-2">
        {popularPresets.map((preset) => {
          const fullPreset = videoPresets.find(p => p.id === preset.id);
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                selectedPreset === preset.id
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{preset.icon}</span>
              <span className="text-xs font-medium">{preset.label}</span>
              <span className="text-xs opacity-60">{preset.ratio}</span>
            </button>
          );
        })}
      </div>

      {/* All presets */}
      <div className="grid grid-cols-2 gap-2">
        {videoPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={`p-3 rounded-xl border transition-all text-right ${
              selectedPreset === preset.id
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card border-border hover:border-primary/50 hover:bg-card-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs opacity-60">
                  {preset.width}×{preset.height}
                </div>
              </div>
              {selectedPreset === preset.id && (
                <span className="text-xs bg-primary text-background px-2 py-0.5 rounded-full">
                  ✓
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Custom dimensions */}
      {selectedPreset === 'custom' && (
        <div className="flex gap-4 p-4 rounded-xl bg-secondary border border-border">
          <div className="flex-1">
            <label className="block text-sm mb-2 opacity-80">العرض (px)</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => onCustomChange(parseInt(e.target.value) || 1080, customHeight)}
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary focus:outline-none text-center"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm mb-2 opacity-80">الارتفاع (px)</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => onCustomChange(customWidth, parseInt(e.target.value) || 1920)}
              className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary focus:outline-none text-center"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {selectedData && (
        <div className="flex items-center justify-center p-4 rounded-xl bg-secondary border border-border">
          <div
            className="border-2 border-primary/50 bg-black/30 rounded-lg flex items-center justify-center"
            style={{
              width: Math.min(120, (selectedData.width / selectedData.height) * 160),
              height: 160,
            }}
          >
            <span className="text-xs opacity-60">
              {selectedData.width}×{selectedData.height}
            </span>
          </div>
          <div className="mr-4 text-sm">
            <div className="font-medium">المقاس: {selectedData.name}</div>
            <div className="text-xs opacity-60">{selectedData.platforms}</div>
          </div>
        </div>
      )}
    </div>
  );
}
