'use client';

interface AyahRangeSelectorProps {
  surahAyahsCount: number;
  ayahFrom: number;
  ayahTo: number;
  onChange: (from: number, to: number) => void;
}

export default function AyahRangeSelector({
  surahAyahsCount,
  ayahFrom,
  ayahTo,
  onChange,
}: AyahRangeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📖</span>
        <h2 className="text-xl font-semibold">اختيار الآيات</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 opacity-80">من آية</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={surahAyahsCount}
              value={ayahFrom}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange(val, Math.max(val, ayahTo));
              }}
              className="flex-1"
            />
            <input
              type="number"
              min={1}
              max={surahAyahsCount}
              value={ayahFrom}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                onChange(val, Math.max(val, ayahTo));
              }}
              className="w-20 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none text-center"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-2 opacity-80">إلى آية</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={ayahFrom}
              max={surahAyahsCount}
              value={ayahTo}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange(ayahFrom, Math.max(val, ayahFrom));
              }}
              className="flex-1"
            />
            <input
              type="number"
              min={ayahFrom}
              max={surahAyahsCount}
              value={ayahTo}
              onChange={(e) => {
                const val = parseInt(e.target.value) || ayahFrom;
                onChange(ayahFrom, Math.max(val, ayahFrom));
              }}
              className="w-20 px-3 py-2 rounded-lg bg-secondary border border-border focus:border-primary focus:outline-none text-center"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
        <span className="text-sm">عدد الآيات المختارة:</span>
        <span className="text-primary font-bold text-lg">
          {ayahTo - ayahFrom + 1}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onChange(1, surahAyahsCount)}
          className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
        >
          السورة كاملة
        </button>
        <button
          onClick={() => onChange(1, Math.min(10, surahAyahsCount))}
          className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
        >
          أول 10 آيات
        </button>
        <button
          onClick={() => onChange(1, Math.min(5, surahAyahsCount))}
          className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-card-hover border border-border transition-colors"
        >
          أول 5 آيات
        </button>
      </div>
    </div>
  );
}
