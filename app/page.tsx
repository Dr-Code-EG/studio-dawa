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
  // Note: FFmpeg requires SharedArrayBuffer which needs COOP/COEP headers
  // We use Canvas + MediaRecorder as the primary approach

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

  // Load FFmpeg (optional - only used for webm->mp4 conversion)
  const loadFFmpeg = async () => {
    try {
      setStatusMessage('جاري تحميل محرك الفيديو...');
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }: any) => {
        console.log('[FFmpeg]', message);
      });
      await ffmpeg.load({
        coreURL: '/ffmpeg-core.js',
        wasmURL: '/ffmpeg-core.wasm',
      });
      ffmpegRef.current = ffmpeg;
      return true;
    } catch (err) {
      console.error('FFmpeg load error:', err);
      return false;
    }
  };

  // Draw a single frame on canvas
  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bgImg: HTMLImageElement | null,
    text: string,
    opacity: number,
  ) => {
    ctx.globalAlpha = 1;
    if (bgImg) {
      const imgRatio = bgImg.width / bgImg.height;
      const canvasRatio = width / height;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgRatio > canvasRatio) {
        drawH = height;
        drawW = height * imgRatio;
        drawX = (width - drawW) / 2;
        drawY = 0;
      } else {
        drawW = width;
        drawH = width / imgRatio;
        drawX = 0;
        drawY = (height - drawH) / 2;
      }
      ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);
      // Dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, width, height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Text
    ctx.globalAlpha = opacity;
    let y: number;
    if (settings.textPosition === 'top') {
      y = height * 0.2;
    } else if (settings.textPosition === 'bottom') {
      y = height * 0.75;
    } else {
      y = height * 0.5;
    }

    const fontSize = Math.round(settings.fontSize * (height / 1080));
    ctx.font = `${fontSize}px "Noto Naskh Arabic", "Amiri", "Arial", sans-serif`;
    ctx.fillStyle = settings.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'rtl';

    // Word wrap
    const maxWidth = width * 0.85;
    const lineHeight = fontSize * 1.6;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const totalTextHeight = lines.length * lineHeight;
    let startY = y - totalTextHeight / 2 + lineHeight / 2;
    for (const line of lines) {
      ctx.fillText(line, width / 2, startY, maxWidth);
      startY += lineHeight;
    }

    // Watermark
    if (settings.showWatermark && settings.watermarkText) {
      ctx.globalAlpha = 0.3;
      ctx.font = `${Math.round(fontSize * 0.35)}px "Noto Naskh Arabic", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(settings.watermarkText, width / 2, height * 0.92);
    }

    ctx.globalAlpha = 1;
  }, [settings.textPosition, settings.fontSize, settings.textColor, settings.showWatermark, settings.watermarkText]);

  // Generate video using Canvas + MediaRecorder + FFmpeg
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

      if (settings.quality === '720p') {
        const scale = 720 / height;
        width = Math.round(width * scale);
        height = 720;
      } else if (settings.quality === '4k') {
        const scale = 2160 / height;
        width = Math.round(width * scale);
        height = 2160;
      }

      // Load background as data URL to avoid CORS
      setStatusMessage('جاري تحميل الخلفية...');
      setProgress(10);

      const bg = settings.backgrounds[0];
      const bgDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(bg.file);
      });

      const bgImg = new Image();
      await new Promise<void>((resolve, reject) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = reject;
        bgImg.src = bgDataUrl;
      });

      // Fetch ayah audio data
      setStatusMessage('جاري تحميل ملفات الصوت...');
      setProgress(20);

      const audioData: { url: string; duration: number; text: string }[] = [];

      for (let i = 0; i < ayahs.length; i++) {
        const ayah = ayahs[i];
        setStatusMessage(`جاري تحميل الآية ${i + 1} من ${ayahs.length}...`);
        setProgress(20 + (i / ayahs.length) * 20);

        const duration = await fetchAyahDuration(ayah.audioUrl!);
        audioData.push({
          url: ayah.audioUrl!,
          duration,
          text: ayah.text || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        });
      }

      // Create canvas
      setStatusMessage('جاري إنشاء الفيديو...');
      setProgress(50);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Setup audio context
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();
      const canvasStream = canvas.captureStream(30);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      // MediaRecorder - record at 30fps
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.start();

      // Render each ayah sequentially
      let totalTimeMs = 0;

      for (let i = 0; i < audioData.length; i++) {
        const ayah = audioData[i];
        const durationMs = ayah.duration;
        const fadeDurationMs = settings.enableFade ? settings.fadeDuration : 0;

        setStatusMessage(`جاري رسم الآية ${i + 1} من ${audioData.length}...`);
        setProgress(50 + (i / audioData.length) * 35);

        // Fetch audio with error handling
        let decodedAudio: AudioBuffer | null = null;
        try {
          const audioResponse = await fetch(ayah.url);
          if (!audioResponse.ok) {
            throw new Error(`HTTP ${audioResponse.status} for ${ayah.url}`);
          }
          const contentType = audioResponse.headers.get('content-type') || '';
          if (!contentType.includes('audio') && !contentType.includes('octet-stream')) {
            // Might be an error page
            const text = await audioResponse.text();
            throw new Error(`Unexpected content-type: ${contentType}, response: ${text.substring(0, 100)}`);
          }
          const audioBuffer = await audioResponse.arrayBuffer();
          
          // Ensure audio context is running
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          decodedAudio = await audioContext.decodeAudioData(audioBuffer);
        } catch (decodeErr) {
          console.warn(`Audio decode failed for ayah ${i + 1}:`, decodeErr);
          // Continue without audio for this ayah
        }

        if (decodedAudio) {
          const source = audioContext.createBufferSource();
          source.buffer = decodedAudio;
          source.connect(dest);
          source.start(audioContext.currentTime);
        }

        // Draw frames using setTimeout (works in headless, unlike rAF)
        const startTime = performance.now();

        await new Promise<void>((resolve) => {
          const drawFrame_loop = () => {
            const elapsed = performance.now() - startTime;
            const t = elapsed / 1000;
            const ayahDurSec = durationMs / 1000;
            const fadeSec = fadeDurationMs / 1000;

            if (t >= ayahDurSec) {
              resolve();
              return;
            }

            // Fade in/out
            let opacity = 1;
            if (settings.enableFade && fadeSec > 0) {
              if (t < fadeSec) {
                opacity = t / fadeSec;
              } else if (t > ayahDurSec - fadeSec) {
                opacity = (ayahDurSec - t) / fadeSec;
              }
              opacity = Math.max(0, Math.min(1, opacity));
            }

            drawFrame(ctx, width, height, bgImg, ayah.text, opacity);

            // Use setTimeout instead of rAF for headless compatibility
            // 33ms ≈ 30fps
            setTimeout(drawFrame_loop, 33);
          };
          drawFrame_loop();
        });

        totalTimeMs += durationMs;
      }

      // Stop recording
      recorder.stop();
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      setProgress(88);
      setStatusMessage('جاري تحويل الفيديو...');

      // Create webm blob
      const webmBlob = new Blob(chunks, { type: mimeType });

      // Use FFmpeg to convert to mp4 (optional)
      try {
        const loaded = await loadFFmpeg();
        if (loaded) {
          const ffmpeg = ffmpegRef.current!;
          const webmData = await fetchFile(webmBlob);
          await ffmpeg.writeFile('input.webm', webmData);

          setStatusMessage('جاري التحويل إلى MP4...');
          setProgress(92);

          await ffmpeg.exec([
            '-i', 'input.webm',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-y',
            'output.mp4',
          ]);

          setProgress(97);
          setStatusMessage('جاري تجهيز الفيديو...');

          const outputData = await ffmpeg.readFile('output.mp4');
          let outputArray: Uint8Array;
          if (outputData instanceof Uint8Array) {
            const copy = new ArrayBuffer(outputData.byteLength);
            const view = new Uint8Array(copy);
            view.set(outputData);
            outputArray = view;
          } else {
            outputArray = new TextEncoder().encode(String(outputData));
          }
          const outputBlob = new Blob([outputArray as BlobPart], { type: 'video/mp4' });
          const url = URL.createObjectURL(outputBlob);
          setVideoUrl(url);
        } else {
          // FFmpeg failed, offer webm directly
          const url = URL.createObjectURL(webmBlob);
          setVideoUrl(url);
        }
      } catch (ffmpegErr) {
        console.warn('FFmpeg conversion failed, offering webm:', ffmpegErr);
        const url = URL.createObjectURL(webmBlob);
        setVideoUrl(url);
      }
      setProgress(100);
      setStatusMessage('تم بنجاح! ✅');

      audioContext.close();

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
