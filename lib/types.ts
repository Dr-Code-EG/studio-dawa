export interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
  surah: {
    number: number;
    name: string;
  };
  audioUrl?: string;
  duration?: number;
}

export interface BackgroundFile {
  file: File;
  url: string;
  startAyah: number;
  endAyah: number;
  isVideo: boolean;
  muted: boolean;
}

export interface VideoSettings {
  surahNumber: number | null;
  ayahFrom: number;
  ayahTo: number;
  reciterId: string;
  videoPresetId: string;
  customWidth: number;
  customHeight: number;
  backgrounds: BackgroundFile[];
  enableFade: boolean;
  fadeDuration: number;
  textPosition: 'top' | 'center' | 'bottom';
  textColor: string;
  fontSize: number;
  fontFamily: string;
  showWatermark: boolean;
  watermarkText: string;
  quality: '720p' | '1080p' | '4k';
}

export const defaultSettings: VideoSettings = {
  surahNumber: null,
  ayahFrom: 1,
  ayahTo: 1,
  reciterId: 'ar.alafasy',
  videoPresetId: 'stories-reels',
  customWidth: 1080,
  customHeight: 1920,
  backgrounds: [],
  enableFade: true,
  fadeDuration: 1000,
  textPosition: 'center',
  textColor: '#ffffff',
  fontSize: 48,
  fontFamily: 'Amiri',
  showWatermark: false,
  watermarkText: '',
  quality: '1080p',
};
