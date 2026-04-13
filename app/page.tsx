'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import SurahSelector from '@/components/SurahSelector';
import AyahRangeSelector from '@/components/AyahRangeSelector';
import ReciterSelector from '@/components/ReciterSelector';
import VideoSizeSelector from '@/components/VideoSizeSelector';
import BackgroundUploader from '@/components/BackgroundUploader';
import TextCustomizer from '@/components/TextCustomizer';
import EffectsSelector from '@/components/EffectsSelector';
import WatermarkOverlay from '@/components/WatermarkOverlay';
import { defaultSettings, videoPresets } from '@/lib/data';
import type { VideoSettings, BackgroundFile, AyahData } from '@/lib/types';
import { fetchAyahs, fetchAyahDuration, getAyahAudioUrl } from '@/lib/utils';
import { 
  Download, Loader2, Sparkles, BookOpen, Play, Settings, 
  ImagePlus, Type, Wand2, Droplets, Monitor, CheckCircle,
  AlertCircle
} from 'lucide-react';

type TabId = 'surah' | 'reciter' | 'size' | 'background' | 'text' | 'effects' | 'watermark';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'surah', label: 'السورة والآيات', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'reciter', label: 'القارئ', icon: <Play className="w-4 h-4" /> },
  { id: 'size', label: 'مقاس الفيديو', icon: <Monitor className="w-4 h-4" /> },
  { id: 'background', label: 'الخلفيات', icon: <ImagePlus className="w-4 h-4" /> },
  { id: 'text', label: 'النص', icon: <Type className="w-4 h-4" /> },
  { id: 'effects', label: 'التأثيرات', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'watermark', label: 'العلامة المائية', icon: <Droplets className="w-4 h-4" /> },
];

export default function Home() {
  const [settings, setSettings] = useState<VideoSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState<TabId>('surah');
  const [surahAyahsCount, setSurahAyahsCount] = useState(7);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const updateSettings = useCallback((updates: Partial<VideoSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSurahSelect = useCallback((surahNumber: number, ayahsCount: number) => {
    setSettings((prev) => ({ 
      ...prev, 
      surahNumber,
      ayahFrom: 1,
      ayahTo: Math.min(ayahsCount, prev.ayahTo),
    }));
    setSurahAyahsCount(ayahsCount);
  }, []);

  // Load FFmpeg
  const loadFFmpeg = async () => {
    if (ffmpegLoaded) return true;
    
    try {
      setStatusMessage('جاري تحميل محرك الفيديو...');
      const ffmpeg = new FFmpeg();
      
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      });
      
      ffmpegRef.current = ffmpeg;
      setFfmpegLoaded(true);
      return true;
    } catch (err) {
      console.error('FFmpeg load error:', err);
      return false;
    }
  };

  // Generate video
  const generateVideo = async () => {
    if (!settings.surahNumber) {
      setError('الرجاء اختيار سورة أولاً');
      return;
    }

    if (settings.backgrounds.length === 0) {
      setError('الرجاء إضافة خلفية واحدة على الأقل');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setError(null);
    setStatusMessage('جاري تحميل بيانات الآيات...');

    try {
      // Load FFmpeg
      const loaded = await loadFFmpeg();
      if (!loaded) {
        setError('فشل تحميل محرك الفيديو. يرجى المحاولة مرة أخرى.');
        setIsGenerating(false);
        return;
      }

      const ffmpeg = ffmpegRef.current!;

      // Fetch ayahs
      const ayahs = await fetchAyahs(
        settings.surahNumber,
        settings.ayahFrom,
        settings.ayahTo,
        settings.reciterId
      );

      // Get dimensions
      const preset = videoPresets.find(p => p.id === settings.videoPresetId) || videoPresets[0];
      let width = settings.videoPresetId === 'custom' ? settings.customWidth : preset.width;
      let height = settings.videoPresetId === 'custom' ? settings.customHeight : preset.height;

      // Scale for quality
      if (settings.quality === '720p') {
        const scale = 720 / height;
        width = Math.round(width * scale);
        height = 720;
      } else if (settings.quality === '4k') {
        const scale = 2160 / height;
        width = Math.round(width * scale);
        height = 2160;
      }

      // Process each ayah
      const totalAyahs = ayahs.length;
      let currentTime = 0;
      const segments: { audio: Blob; duration: number; text: string }[] = [];

      for (let i = 0; i < ayahs.length; i++) {
        const ayah = ayahs[i];
        setStatusMessage(`جاري معالجة الآية ${i + 1} من ${totalAyahs}...`);
        setProgress(((i + 1) / totalAyahs) * 50);

        // Get audio duration
        const duration = await fetchAyahDuration(ayah.audioUrl!);
        
        // Fetch audio file
        const audioResponse = await fetch(ayah.audioUrl!);
        const audioBlob = await audioResponse.blob();

        segments.push({
          audio: audioBlob,
          duration,
          text: ayah.text,
        });

        currentTime += duration;
      }

      // Write audio files to FFmpeg
      setStatusMessage('جاري دمج الملفات...');
      setProgress(60);

      for (let i = 0; i < segments.length; i++) {
        const data = await fetchFile(segments[i].audio);
        await ffmpeg.writeFile(`audio_${i}.mp3`, data);
      }

      // Write background
      const bg = settings.backgrounds[0];
      const bgData = await fetchFile(bg.file);

      if (bg.isVideo) {
        await ffmpeg.writeFile('background.mp4', bgData);
      } else {
        await ffmpeg.writeFile('background.png', bgData);
      }

      // Load Arabic font into FFmpeg virtual filesystem
      setStatusMessage('جاري تحميل الخط العربي...');
      setProgress(65);

      const fontResponse = await fetch('/NotoNaskhArabic.ttf');
      const fontArrayBuffer = await fontResponse.arrayBuffer();
      await ffmpeg.writeFile('NotoNaskhArabic.ttf', new Uint8Array(fontArrayBuffer));

      // Build filter complex and concat
      setStatusMessage('جاري إنشاء الفيديو...');
      setProgress(70);

      const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);

      // Create text file with ayah texts
      for (let i = 0; i < segments.length; i++) {
        const textContent = segments[i].text;
        await ffmpeg.writeFile(`text_${i}.txt`, textContent);
      }

      // Build command
      let videoInput: string;
      if (bg.isVideo) {
        videoInput = `-t ${totalDuration / 1000} -i background.mp4`;
      } else {
        videoInput = `-t ${totalDuration / 1000} -loop 1 -i background.png`;
      }

      // Audio concat
      let audioConcat = '';
      for (let i = 0; i < segments.length; i++) {
        audioConcat += `[a${i}]`;
      }
      audioConcat += `concat=n=${segments.length}:v=0:a=1[outa]`;

      // Create drawtext filters for each ayah
      const drawtextFilters = segments.map((seg, i) => {
        const startTime = segments.slice(0, i).reduce((sum, s) => sum + s.duration, 0) / 1000;
        const duration = seg.duration / 1000;
        const fadeDuration = settings.enableFade ? settings.fadeDuration / 1000 : 0;
        
        // Calculate text position
        let y: number;
        if (settings.textPosition === 'top') {
          y = Math.round(height * 0.15);
        } else if (settings.textPosition === 'bottom') {
          y = Math.round(height * 0.75);
        } else {
          y = Math.round(height * 0.45);
        }

        const fontSize = Math.round(settings.fontSize * (height / 1080));
        const escapeText = seg.text.replace(/'/g, '').replace(/:/g, '');

        let filter = `drawtext=text='${escapeText}':fontfile='NotoNaskhArabic.ttf':fontsize=${fontSize}:fontcolor=${settings.textColor}:x=(w-text_w)/2:y=${y}:enable='between(t,${startTime},${startTime + duration})'`;
        
        if (settings.enableFade && fadeDuration > 0) {
          filter += `:alpha='if(lt(t,${startTime + fadeDuration}),${startTime === 0 ? 1 : `(t-${startTime})/${fadeDuration}`},if(gt(t,${startTime + duration - fadeDuration}),(${startTime + duration}-t)/${fadeDuration},1))'`;
        }

        return filter;
      });

      const complexFilter = `${audioConcat};${drawtextFilters.join(';')}`;

      // Execute FFmpeg
      setStatusMessage('جاري التصدير النهائي...');
      setProgress(85);

      await ffmpeg.exec([
        ...videoInput.split(' '),
        ...Array.from({ length: segments.length }, (_, i) => `-i audio_${i}.mp3`).join(' ').split(' '),
        '-filter_complex', complexFilter,
        '-map', '0:v',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-y',
        'output.mp4',
      ]);

      setProgress(95);
      setStatusMessage('جاري تجهيز الفيديو للتحميل...');

      // Read output
      const outputData = await ffmpeg.readFile('output.mp4');
      const outputArray = outputData instanceof Uint8Array ? outputData : new TextEncoder().encode(String(outputData));
      // @ts-expect-error - FFmpeg types are not perfectly aligned
      const outputBlob = new Blob([outputArray], { type: 'video/mp4' });
      const url = URL.createObjectURL(outputBlob);
      
      setVideoUrl(url);
      setProgress(100);
      setStatusMessage('تم بنجاح! ✅');

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء الفيديو');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen islamic-pattern">
      {/* Header */}
      <header className="border-b border-border/50 bg-secondary/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
              <div>
                <h1 className="text-xl font-bold">استوديو دعوة للقرآن الكريم</h1>
                <p className="text-xs opacity-60">أنشئ فيديوهات قرآنية احترافية بسهولة</p>
              </div>
            </div>

            {videoUrl && (
              <a
                href={videoUrl}
                download="quran_video.mp4"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background hover:bg-primary-hover transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">تحميل الفيديو</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Settings */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl overflow-hidden sticky top-24">
              {/* Tabs */}
              <div className="flex overflow-x-auto border-b border-border/50">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-4 max-h-[calc(100vh-250px)] overflow-y-auto">
                {activeTab === 'surah' && (
                  <>
                    <SurahSelector
                      selectedSurah={settings.surahNumber}
                      onSelect={handleSurahSelect}
                    />
                    {settings.surahNumber && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <AyahRangeSelector
                          surahAyahsCount={surahAyahsCount}
                          ayahFrom={settings.ayahFrom}
                          ayahTo={settings.ayahTo}
                          onChange={(from, to) => updateSettings({ ayahFrom: from, ayahTo: to })}
                        />
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'reciter' && (
                  <ReciterSelector
                    selectedReciter={settings.reciterId}
                    onSelect={(id) => updateSettings({ reciterId: id })}
                    surahNumber={settings.surahNumber}
                    ayahNumber={settings.ayahFrom}
                  />
                )}

                {activeTab === 'size' && (
                  <VideoSizeSelector
                    selectedPreset={settings.videoPresetId}
                    onSelect={(id) => updateSettings({ videoPresetId: id })}
                    customWidth={settings.customWidth}
                    customHeight={settings.customHeight}
                    onCustomChange={(w, h) => updateSettings({ customWidth: w, customHeight: h })}
                  />
                )}

                {activeTab === 'background' && (
                  <BackgroundUploader
                    backgrounds={settings.backgrounds}
                    onChange={(bgs) => updateSettings({ backgrounds: bgs })}
                    totalAyahs={settings.ayahTo - settings.ayahFrom + 1}
                  />
                )}

                {activeTab === 'text' && (
                  <TextCustomizer
                    settings={settings}
                    onChange={updateSettings}
                  />
                )}

                {activeTab === 'effects' && (
                  <EffectsSelector
                    settings={settings}
                    onChange={updateSettings}
                  />
                )}

                {activeTab === 'watermark' && (
                  <WatermarkOverlay
                    settings={settings}
                    onChange={updateSettings}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Main content - Preview & Generate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                ملخص الإعدادات
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-secondary">
                  <div className="text-xs opacity-60">السورة</div>
                  <div className="font-medium text-sm mt-1">
                    {settings.surahNumber ? `سورة ${settings.surahNumber}` : 'لم يتم الاختيار'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <div className="text-xs opacity-60">الآيات</div>
                  <div className="font-medium text-sm mt-1">
                    {settings.ayahFrom} - {settings.ayahTo}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <div className="text-xs opacity-60">الخلفيات</div>
                  <div className="font-medium text-sm mt-1">
                    {settings.backgrounds.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-secondary">
                  <div className="text-xs opacity-60">الجودة</div>
                  <div className="font-medium text-sm mt-1">
                    {settings.quality}
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generateVideo}
                disabled={isGenerating || !settings.surahNumber || settings.backgrounds.length === 0}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                  isGenerating
                    ? 'bg-accent cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover active:scale-[0.98]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {statusMessage}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    إنشاء الفيديو
                  </>
                )}
              </button>

              {/* Progress */}
              {isGenerating && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span>{statusMessage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full gold-gradient transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Success */}
              {videoUrl && !isGenerating && (
                <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-sm text-green-400">تم إنشاء الفيديو بنجاح!</p>
                </div>
              )}
            </div>

            {/* Preview area */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">معاينة مباشرة</h2>
              
              {videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-xl bg-black"
                  style={{ maxHeight: '600px' }}
                />
              ) : (
                <div className="aspect-video rounded-xl bg-secondary flex flex-col items-center justify-center">
                  <Monitor className="w-16 h-16 opacity-20 mb-4" />
                  <p className="text-sm opacity-40">سيتم عرض معاينة الفيديو هنا</p>
                  <p className="text-xs opacity-30 mt-2">
                    اختر سورة وخلفية ثم اضغط على "إنشاء الفيديو"
                  </p>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-primary">💡</span>
                نصائح
              </h3>
              <ul className="space-y-2 text-sm opacity-70">
                <li>• استخدم خلفيات عالية الجودة للحصول على أفضل نتيجة</li>
                <li>• مقاس 9:16 مثالي للستوري والريلز والتيك توك</li>
                <li>• تأثير التلاشي يعطي مظهراً سينمائياً احترافياً</li>
                <li>• يمكنك إضافة علامة مائية لحماية محتواك</li>
                <li>• الصوت يتم جلبه تلقائياً من everyayah.com API</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6 text-center text-sm opacity-60">
        <p>استوديو دعوة للقرآن الكريم - صدقة جارية</p>
        <p className="text-xs mt-1">اللهم اجعله في ميزان حسناتنا</p>
      </footer>
    </div>
  );
}
