'use client';

import { useState, useRef } from 'react';
import { reciters } from '@/lib/data';
import { getAyahAudioUrl } from '@/lib/utils';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface ReciterSelectorProps {
  selectedReciter: string;
  onSelect: (reciterId: string) => void;
  surahNumber: number | null;
  ayahNumber: number;
}

export default function ReciterSelector({
  selectedReciter,
  onSelect,
  surahNumber,
  ayahNumber,
}: ReciterSelectorProps) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async (reciterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!surahNumber) return;

    if (playing === reciterId) {
      audioRef.current?.pause();
      setPlaying(null);
      return;
    }

    audioRef.current?.pause();

    const url = getAyahAudioUrl(surahNumber, ayahNumber, reciterId);
    const audio = new Audio(url);
    audioRef.current = audio;

    setPlaying(reciterId);

    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);

    try {
      await audio.play();
    } catch {
      setPlaying(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎙️</span>
        <h2 className="text-xl font-semibold">اختيار القارئ</h2>
      </div>

      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
        {reciters.map((reciter) => (
          <button
            key={reciter.id}
            onClick={() => onSelect(reciter.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
              selectedReciter === reciter.id
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card border-border hover:border-primary/50 hover:bg-card-hover'
            }`}
          >
            <div className="flex-1">
              <div className="font-medium">{reciter.name}</div>
            </div>

            {surahNumber && (
              <button
                onClick={(e) => handlePreview(reciter.id, e)}
                className={`p-2 rounded-lg transition-colors ${
                  playing === reciter.id
                    ? 'bg-primary text-background'
                    : 'bg-secondary hover:bg-accent'
                }`}
              >
                {playing === reciter.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs opacity-60">
        💡 يمكنك الاستماع لمعاينة الصوت بعد اختيار سورة
      </p>
    </div>
  );
}
