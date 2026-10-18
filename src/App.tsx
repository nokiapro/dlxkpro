import React, { useState, useEffect } from 'react';
import {
  Search,
  Clipboard,
  X,
  Disc,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  Music2,
  Check
} from 'lucide-react';
import { TrackData, PlatformSource, RemasterMode } from './types';
import { WaveformPlayer } from './components/WaveformPlayer';

interface SampleLink {
  label: string;
  platform: string;
  color: string;
  url: string;
}

const QUICK_SAMPLES: SampleLink[] = [
  {
    label: 'Love is Gone',
    platform: 'MusicCreator',
    color: 'border-sky-800/60 bg-sky-950/60 text-sky-300 hover:bg-sky-900/60',
    url: 'https://musiccreator.ai/track/love-is-gone-acoustic-cover',
  },
  {
    label: 'Festival EDM',
    platform: 'OpenMusic',
    color: 'border-teal-800/60 bg-teal-950/60 text-teal-300 hover:bg-teal-900/60',
    url: 'https://openmusic.ai/track/festival-dance-pop-anthem',
  },
  {
    label: 'Cyberpunk Beat',
    platform: 'Suno AI',
    color: 'border-purple-800/60 bg-purple-950/60 text-purple-300 hover:bg-purple-900/60',
    url: 'https://suno.com/song/84b496ee-3d02-4aed-a757-ec1de0c4f71e',
  },
  {
    label: 'Morning Cafe',
    platform: 'FreeMusic',
    color: 'border-emerald-800/60 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60',
    url: 'https://freemusic.ai/track/morning-cafe-acoustic-chill',
  },
];

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<TrackData | null>(null);
  const [remasterMode, setRemasterMode] = useState<RemasterMode>('balanced');

  // Audio trimming state
  const [trimRange, setTrimRange] = useState<[number, number]>([0, 0]);
  const [isTrimmingActive, setIsTrimmingActive] = useState(false);

  // Auto-load default track on initial mount so player is instantly visible and interactive
  useEffect(() => {
    extractTrack('https://musiccreator.ai/track/love-is-gone-acoustic-cover');
  }, []);

  const extractTrack = async (urlToFetch: string) => {
    const trimmed = urlToFetch.trim();
    if (!trimmed) {
      setErrorMessage('Vui lòng nhập hoặc dán một đường dẫn liên kết bài hát.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.ok
            ? 'Phản hồi từ máy chủ không đúng định dạng JSON.'
            : `Lỗi máy chủ (${res.status}): ${text.slice(0, 150) || 'Không thể kết nối đến API backend.'}`
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Không thể trích xuất bài hát từ URL này.');
      }

      setCurrentTrack(data);
      setTrimRange([0, data.duration || 140]);
      setIsTrimmingActive(false);
    } catch (err: any) {
      console.error('Extract error:', err);
      setErrorMessage(
        err.message || 'Lỗi khi trích xuất dữ liệu âm thanh từ server. Vui lòng kiểm tra lại link.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text);
          extractTrack(text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white flex flex-col font-sans">
      {/* Sleek Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-teal-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Disc className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>AI Music Stream &amp; Downloader</span>
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="text-purple-400 font-medium">Suno AI</span>
                <span aria-hidden="true">·</span>
                <span className="text-teal-400 font-medium">OpenMusic</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-400 font-medium">MusicCreator</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-medium">FreeMusic</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-300">M4A · MP3 · WAV (16/24-bit)</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Link Input Section */}
        <section className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              extractTrack(inputUrl);
            }}
            className="relative flex items-center bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-2xl focus-within:border-sky-500/80 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all backdrop-blur"
          >
            <div className="pl-3 pr-2 text-slate-500">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link bài hát (VD: https://suno.com/song/..., openmusic.ai, musiccreator.ai, freemusic.ai)..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none py-2"
            />

            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              {inputUrl && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Xóa link"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handlePaste}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                title="Dán từ Clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dán</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all disabled:opacity-50 active:scale-95"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang trích xuất...</span>
                  </>
                ) : (
                  <>
                    <Music2 className="w-3.5 h-3.5" />
                    <span>Trích xuất &amp; Nghe</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-[11px] text-slate-500 font-medium">Thử nhanh mẫu:</span>
            {QUICK_SAMPLES.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setInputUrl(sample.url);
                  extractTrack(sample.url);
                }}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${sample.color}`}
              >
                {sample.platform}: {sample.label}
              </button>
            ))}
          </div>
        </section>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Đang phân tích liên kết và nạp luồng phát...</p>
            <p className="text-xs text-slate-400">Trích xuất sóng âm, đo BPM, Tone chuẩn và chuẩn bị bộ phát</p>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-950/70 border border-rose-800 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => extractTrack(inputUrl || QUICK_SAMPLES[0].url)}
              className="px-3 py-1 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-semibold rounded-lg shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Player Component (When loaded) */}
        {currentTrack && (
          <section className="transition-opacity duration-300">
            <WaveformPlayer
              audioUrl={currentTrack.audioUrl}
              title={currentTrack.title}
              artist={currentTrack.artist}
              coverUrl={currentTrack.coverUrl}
              platformName={currentTrack.platformName}
              genre={currentTrack.genre}
              duration={currentTrack.duration}
              bpm={currentTrack.bpm}
              musicalKey={currentTrack.musicalKey}
              remasterMode={remasterMode}
              onRemasterChange={setRemasterMode}
              trimRange={trimRange}
              onTrimChange={setTrimRange}
              isTrimmingActive={isTrimmingActive}
              onToggleTrimming={() => setIsTrimmingActive(!isTrimmingActive)}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>Hỗ trợ tải định dạng M4A · MP3 (128kbps &amp; 320kbps) · WAV (16-bit &amp; 24-bit Lossless Studio Master)</p>
      </footer>
    </div>
  );
}
