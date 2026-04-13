'use client';

import { useState, useMemo } from 'react';
import { surahs } from '@/lib/data';
import { BookOpen } from 'lucide-react';

interface SurahSelectorProps {
  selectedSurah: number | null;
  onSelect: (surahNumber: number, ayahsCount: number) => void;
}

export default function SurahSelector({ selectedSurah, onSelect }: SurahSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredSurahs = useMemo(() => {
    if (!search) return surahs;
    return surahs.filter(
      (s) =>
        s.name.includes(search) ||
        s.englishName.toLowerCase().includes(search.toLowerCase()) ||
        s.number.toString().includes(search)
    );
  }, [search]);

  const selectedSurahData = surahs.find((s) => s.number === selectedSurah);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">اختيار السورة</h2>
        {selectedSurahData && (
          <span className="mr-auto text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
            {selectedSurahData.name} - {selectedSurahData.ayahsCount} آية
          </span>
        )}
      </div>

      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-2">
        {filteredSurahs.map((surah) => (
          <button
            key={surah.number}
            onClick={() => onSelect(surah.number, surah.ayahsCount)}
            className={`p-3 rounded-xl border transition-all text-right ${
              selectedSurah === surah.number
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-card border-border hover:border-primary/50 hover:bg-card-hover'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-primary/60 font-mono w-6 h-6 flex items-center justify-center rounded-full bg-primary/10">
                {surah.number}
              </span>
              <div>
                <div className="font-semibold text-sm">{surah.name}</div>
                <div className="text-xs text-muted-foreground opacity-60">
                  {surah.ayahsCount} آية
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
