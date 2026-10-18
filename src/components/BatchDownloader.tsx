import React, { useState } from 'react';
import {
  ListPlus,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
  FileAudio,
  Disc3,
  Layers
} from 'lucide-react';
import { TrackData } from '../types';
import {
  downloadBlob,
  fetchAudioBuffer,
  decodeAudio,
  audioBufferToWav,
  isWavBlob,
} from '../utils/audioConverter';

interface BatchDownloaderProps {
  onSelectTrack: (track: TrackData) => void;
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({ onSelectTrack }) => {
  const [linksText, setLinksText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedTracks, setExtractedTracks] = useState<TrackData[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  const sampleLinks = [
    'https://suno.com/song/84b496ee-3d02-4aed-a757-ec1de0c4f71e',
    'https://openmusic.ai/track/festival-dance-pop-anthem',
    'https://suno.com/song/04250c89-056c-4851-929c-d39b16919471',
    'https://openmusic.ai/track/nightcity-synthwave-cruise',
    'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849965777-yof4in-f17aad9500db67fa.mp3',
    'https://cdn-media.freemusic.ai/freemusic/static/acoustic-music-generator/samples/wedding-95b3c55925f8b87d4402ad9ad6cc45b6e62f752acf56bf5e0ba07b53b0ba9cd4.mp3',
    'https://suno.com/song/6af8b60a-1fa6-47cc-9678-05b449a03913',
  ];

  const handleFillSamples = () => {
    setLinksText(sampleLinks.join('\n'));
  };

  const handleProcessBatch = async () => {
    const urls = linksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    if (urls.length === 0) {
      setStatusMessage('Vui lòng nhập ít nhất một đường dẫn hợp lệ (Suno.com, OpenMusic.ai, MusicCreator.ai hoặc FreeMusic.ai).');
      return;
    }

    setIsProcessing(true);
    setStatusMessage(`Đang phân tích 0/${urls.length} liên kết...`);
    const results: TrackData[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      setStatusMessage(`Đang phân tích (${i + 1}/${urls.length}): ${url.slice(0, 40)}...`);
      try {
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data && data.audioUrl) {
              results.push(data);
            }
          } catch {}
        }
      } catch (e) {
        console.error('Batch extract failed for', url, e);
      }
    }

    setExtractedTracks(results);
    setIsProcessing(false);
    setStatusMessage(`Đã trích xuất thành công ${results.length}/${urls.length} bài hát.`);
  };

  const handleDownloadAll = async (format: 'mp3' | 'wav') => {
    setIsProcessing(true);
    for (let index = 0; index < extractedTracks.length; index++) {
      const track = extractedTracks[index];
      const fileName = `${track.title} - ${track.artist} [${track.platformName}].${format}`;
      setStatusMessage(`[${index + 1}/${extractedTracks.length}] Đang xử lý tải: ${track.title}...`);

      try {
        if (format === 'wav') {
          let wavBlob: Blob | null = null;
          // 1. Try server transcode first
          try {
            const serverUrl = `/api/proxy-audio?url=${encodeURIComponent(
              track.audioUrl
            )}&download=1&format=wav&bitDepth=16&filename=${encodeURIComponent(fileName)}`;
            const res = await fetch(serverUrl);
            if (res.ok) {
              const b = await res.blob();
              if (await isWavBlob(b)) {
                wavBlob = b;
              }
            }
          } catch {}

          // 2. If server transcode not available (e.g. host PC lacks FFmpeg), use client Web Audio API
          if (!wavBlob) {
            const rawBuf = await fetchAudioBuffer(track.audioUrl);
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const decoded = await decodeAudio(rawBuf, ctx);
            wavBlob = audioBufferToWav(decoded, { bitDepth: 16 });
          }

          if (wavBlob) {
            downloadBlob(wavBlob, fileName);
          }
        } else {
          // MP3 320kbps download
          const downloadUrl = `/api/proxy-audio?url=${encodeURIComponent(
            track.audioUrl
          )}&download=1&format=mp3&bitrate=320&filename=${encodeURIComponent(fileName)}`;
          const res = await fetch(downloadUrl);
          if (res.ok) {
            const blob = await res.blob();
            downloadBlob(blob, fileName);
          }
        }
      } catch (err) {
        console.warn('Batch download item error:', track.title, err);
      }

      // Small delay between downloads to prevent browser throttling
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    setIsProcessing(false);
    setStatusMessage(`Đã hoàn tất tải toàn bộ danh sách định dạng ${format.toUpperCase()}.`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-base">
            Tải hàng loạt (Batch Downloader)
          </h3>
        </div>
        <button
          type="button"
          onClick={handleFillSamples}
          className="text-xs text-sky-400 hover:text-sky-300 font-medium"
        >
          Điền liên kết mẫu
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Dán nhiều đường dẫn bài hát từ <strong>musiccreator.ai</strong>, <strong>freemusic.ai</strong> hoặc <strong>suno.com</strong> (mỗi link trên 1 dòng). Hệ thống sẽ tự động quét và chuẩn bị danh sách tải về cùng lúc.
      </p>

      <textarea
        rows={4}
        value={linksText}
        onChange={(e) => setLinksText(e.target.value)}
        placeholder="https://musiccreator.ai/track/synthwave&#10;https://suno.com/song/cyberpunk&#10;https://freemusic.ai/track/acoustic-indie"
        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleProcessBatch}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs rounded-xl flex items-center gap-2 transition-colors"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{statusMessage}</span>
            </>
          ) : (
            <>
              <ListPlus className="w-4 h-4" />
              <span>Phân tích danh sách link</span>
            </>
          )}
        </button>

        {extractedTracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadAll('mp3')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải tất cả MP3</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadAll('wav')}
              className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 font-medium text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải tất cả WAV</span>
            </button>
          </div>
        )}
      </div>

      {/* Extracted tracks list */}
      {extractedTracks.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-300 block">
            Danh sách bài hát sẵn sàng ({extractedTracks.length}):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {extractedTracks.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-slate-100 truncate">
                        {item.title}
                      </p>
                      <span
                        className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded shrink-0 border ${
                          item.platformBadgeColor === 'emerald'
                            ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/40'
                            : 'text-sky-300 bg-sky-950/80 border-sky-800/40'
                        }`}
                      >
                        {item.platformName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.artist} · {item.genre}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectTrack(item)}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg transition-colors font-medium"
                  >
                    Xem &amp; Nghe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
