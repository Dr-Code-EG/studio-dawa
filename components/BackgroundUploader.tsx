'use client';

import { useRef, useState } from 'react';
import type { BackgroundFile } from '@/lib/types';
import { ImagePlus, Video, X, Volume2, VolumeX, GripVertical } from 'lucide-react';

interface BackgroundUploaderProps {
  backgrounds: BackgroundFile[];
  onChange: (backgrounds: BackgroundFile[]) => void;
  totalAyahs: number;
}

export default function BackgroundUploader({
  backgrounds,
  onChange,
  totalAyahs,
}: BackgroundUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newBackgrounds: BackgroundFile[] = [];

    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isVideo || isImage) {
        const url = URL.createObjectURL(file);
        newBackgrounds.push({
          file,
          url,
          startAyah: 1,
          endAyah: totalAyahs,
          isVideo,
          muted: true,
        });
      }
    });

    onChange([...backgrounds, ...newBackgrounds]);
  };

  const removeBackground = (index: number) => {
    URL.revokeObjectURL(backgrounds[index].url);
    const updated = backgrounds.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateBackground = (index: number, updates: Partial<BackgroundFile>) => {
    const updated = [...backgrounds];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🖼️</span>
        <h2 className="text-xl font-semibold">الخلفيات</h2>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-secondary'
        }`}
      >
        <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm opacity-60">اسحب الصور أو الفيديوهات هنا</p>
        <p className="text-xs opacity-40 mt-1">أو اضغط للاختيار</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Backgrounds list */}
      {backgrounds.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {backgrounds.map((bg, index) => (
            <div
              key={index}
              className="p-3 rounded-xl bg-card border border-border space-y-3"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 opacity-40" />
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
                  {bg.isVideo ? (
                    <video
                      src={bg.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={bg.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {bg.isVideo ? (
                      <Video className="w-3 h-3 text-primary" />
                    ) : (
                      <ImagePlus className="w-3 h-3 text-primary" />
                    )}
                    <span className="text-sm truncate">
                      {bg.file.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeBackground(index)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video mute toggle */}
              {bg.isVideo && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateBackground(index, { muted: !bg.muted })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      bg.muted
                        ? 'bg-secondary hover:bg-accent'
                        : 'bg-primary/20 text-primary hover:bg-primary/30'
                    }`}
                  >
                    {bg.muted ? (
                      <>
                        <VolumeX className="w-3 h-3" />
                        الفيديو صامت
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3" />
                        صوت الفيديو مفعّل
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Ayah range */}
              {totalAyahs > 1 && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs mb-1 opacity-60">من آية</label>
                    <input
                      type="number"
                      min={1}
                      max={bg.endAyah || totalAyahs}
                      value={bg.startAyah}
                      onChange={(e) =>
                        updateBackground(index, {
                          startAyah: parseInt(e.target.value) || 1,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-xs text-center focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs mb-1 opacity-60">إلى آية</label>
                    <input
                      type="number"
                      min={bg.startAyah || 1}
                      max={totalAyahs}
                      value={bg.endAyah}
                      onChange={(e) =>
                        updateBackground(index, {
                          endAyah: parseInt(e.target.value) || totalAyahs,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded bg-secondary border border-border text-xs text-center focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {backgrounds.length === 0 && (
        <p className="text-xs opacity-40 text-center">
          💡 يمكنك استخدام خلفية واحدة أو أكثر لكل جزء من الآيات
        </p>
      )}
    </div>
  );
}
