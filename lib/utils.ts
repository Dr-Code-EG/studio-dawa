import { quranApiBase, reciters } from './data';
import type { AyahData } from './types';

function getReciterEveryayahId(reciterId: string): string {
  const reciter = reciters.find(r => r.id === reciterId);
  return reciter?.everyayahId || 'Alafasy_128kbps';
}

export function getAyahAudioUrl(surahNumber: number, ayahNumber: number, reciterId: string): string {
  const everyayahId = getReciterEveryayahId(reciterId);
  const paddedSurah = String(surahNumber).padStart(3, '0');
  const paddedAyah = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${everyayahId}/${paddedSurah}${paddedAyah}.mp3`;
}

export async function fetchAyahs(
  surahNumber: number,
  fromAyah: number,
  toAyah: number,
  reciterId: string
): Promise<AyahData[]> {
  const ayahs: AyahData[] = [];

  for (let i = fromAyah; i <= toAyah; i++) {
    const audioUrl = getAyahAudioUrl(surahNumber, i, reciterId);

    ayahs.push({
      number: i,
      numberInSurah: i,
      text: '',
      surah: { number: surahNumber, name: '' },
      audioUrl,
    });
  }

  // Fetch Quran text from alquran.cloud API (Uthmani script)
  try {
    const response = await fetch(
      `${quranApiBase}/surah/${surahNumber}/quran-uthmani`
    );
    const data = await response.json();
    
    if (data.code === 200 && data.data) {
      const surahAyahs = data.data.ayahs;
      for (const ayah of ayahs) {
        const matchingAyah = surahAyahs.find(
          (a: any) => a.numberInSurah === ayah.numberInSurah
        );
        if (matchingAyah) {
          ayah.text = matchingAyah.text;
          ayah.surah.name = data.data.name;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching ayah text:', error);
  }

  return ayahs;
}

export async function fetchAyahDuration(audioUrl: string): Promise<number> {
  // Use fetch + AudioContext with timeout - no Audio element fallback
  // (Audio element can hang in some environments)
  const TIMEOUT = 8000;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(5000), TIMEOUT);

    fetch(audioUrl)
      .then(async (response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) throw new Error('Empty response');

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const duration = audioBuffer.duration * 1000;
        ctx.close();
        clearTimeout(timer);
        resolve(Math.max(duration, 500)); // Minimum 500ms
      })
      .catch((err) => {
        console.warn('Audio duration fetch failed:', audioUrl, err.message);
        clearTimeout(timer);
        resolve(5000); // Default 5 seconds
      });
  });
}

export function getQualityDimensions(quality: string, width: number, height: number) {
  switch (quality) {
    case '720p':
      return { width: 1280, height: 720 };
    case '4k':
      return { width: 3840, height: 2160 };
    case '1080p':
    default:
      return { width: 1920, height: 1080 };
  }
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
