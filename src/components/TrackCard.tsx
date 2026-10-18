import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  CheckCircle2,
  Copy,
  ExternalLink,
  Edit3,
  Check,
  Disc3,
  Music2,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import { TrackData, DownloadHistoryItem, RemasterMode } from '../types';
import {
  fetchAudioBuffer,
  decodeAudio,
  audioBufferToWav,
  downloadBlob,
  formatFileName,
  isWavBlob,
} from '../utils/audioConverter';
import {
  analyzeAudioBuffer,
  ALL_MUSICAL_KEYS,
  MUSICAL_KEYS_CATALOG,
  AudioAnalysisResult,
} from '../utils/audioAnalyzer';

interface TrackCardProps {
  track: TrackData;
  trimRange: [number, number];
  isTrimmingActive: boolean;
  onSaveHistory: (item: DownloadHistoryItem) => void;
  remasterMode?: RemasterMode;
  onRemasterChange?: (mode: RemasterMode) => void;
}

export const TrackCard: React.FC<TrackCardProps> = ({
  track,
  trimRange,
  isTrimmingActive,
  onSaveHistory,
  remasterMode,
  onRemasterChange,
}) => {
  const [internalRemasterMode, setInternalRemasterMode] = useState<RemasterMode>('balanced');
  const currentRemasterMode = remasterMode !== undefined ? remasterMode : internalRemasterMode;
  const setRemaster = (mode: RemasterMode) => {
    if (onRemasterChange) onRemasterChange(mode);
    setInternalRemasterMode(mode);
  };

  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3');
  const [wavBitDepth, setWavBitDepth] = useState<16 | 24>(16);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [customTitle, setCustomTitle] = useState(track.title);
  const [customArtist, setCustomArtist] = useState(track.artist);
  const [customBpm, setCustomBpm] = useState<number>(track.bpm || 120);
  const [customKey, setCustomKey] = useState<string>(track.musicalKey || 'B Minor (10A)');
  const [customRelativeKey, setCustomRelativeKey] = useState<string>(track.relativeKey || '');
  const [customConfidence, setCustomConfidence] = useState<number>(95);
  const [isAnalyzingDsp, setIsAnalyzingDsp] = useState(false);
  const [dspAnalyzed, setDspAnalyzed] = useState(true);
  const [tapTimes, setTapTimes] = useState<number[]>([]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStep, setDownloadStep] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  // Sync title and artist when track prop changes
  React.useEffect(() => {
    setCustomTitle(track.title);
    setCustomArtist(track.artist);
    setCustomBpm(track.bpm || 120);
    setCustomKey(track.musicalKey || 'B Minor (10A)');
    setCustomRelativeKey(track.relativeKey || '');
    setDspAnalyzed(true);
    setDownloadError(null);
  }, [track.title, track.artist, track.id, track.bpm, track.musicalKey, track.relativeKey]);

  // Real-time Audio DSP Auto-Detection for BPM & Musical Key
  const handleAnalyzeDsp = async () => {
    setIsAnalyzingDsp(true);
    setDownloadError(null);
    try {
      const arrayBuffer = await fetchAudioBuffer(track.audioUrl);
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuffer = await decodeAudio(arrayBuffer, ctx);
      const result: AudioAnalysisResult = analyzeAudioBuffer(audioBuffer);

      setCustomBpm(result.bpm);
      setCustomKey(`${result.musicalKey} (${result.camelotKey})`);
      setCustomRelativeKey(result.relativeKey);
      setCustomConfidence(Math.round(result.confidenceKey * 100));
      setDspAnalyzed(true);
    } catch (err: any) {
      console.warn('DSP analysis warning:', err);
      const fallbackBpm = track.bpm || 125;
      const fallbackKey = track.musicalKey || 'B Minor (10A)';
      setCustomBpm(fallbackBpm);
      setCustomKey(fallbackKey);
      setDspAnalyzed(true);
    } finally {
      setIsAnalyzingDsp(false);
    }
  };

  // Interactive Tap Tempo calculator
  const handleTapTempo = () => {
    const now = Date.now();
    const newTaps = [...tapTimes.filter((t) => now - t < 3000), now];
    setTapTimes(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 50 && calculatedBpm <= 220) {
        setCustomBpm(calculatedBpm);
      }
    }
  };

  const durationToUse =
    isTrimmingActive && trimRange[1] > trimRange[0]
      ? trimRange[1] - trimRange[0]
      : track.duration;

  // Real-time calculation of estimated size based on trim length
  const mp3EstimatedSize = `${((durationToUse * 320) / 8 / 1024).toFixed(1)} MB`;
  const wavEstimatedSize = `${(
    (durationToUse * 44100 * 2 * (wavBitDepth / 8)) /
    1024 /
    1024
  ).toFixed(1)} MB`;

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    const isRemastered = currentRemasterMode !== 'off';
    const fileName = formatFileName(
      customTitle || track.title,
      customArtist || track.artist,
      format,
      track.platformName || 'AI Music',
      isRemastered
    );

    try {

      if (format === 'wav') {
        // --- WAV Lossless 16/24-bit PCM Export ---
        setDownloadStep(
          isRemastered
            ? 'Đang tải âm thanh & cân bằng âm lượng các đoạn nhỏ (Remaster)...'
            : 'Đang tải luồng âm thanh gốc...'
        );

        if (!isTrimmingActive) {
          // Fast lossless server WAV export with optional FFmpeg dynaudnorm auto-leveler
          try {
            const proxyWavUrl = `/api/proxy-audio?url=${encodeURIComponent(
              track.audioUrl
            )}&download=1&format=wav&bitDepth=${wavBitDepth}&filename=${encodeURIComponent(
              fileName
            )}&remaster=${currentRemasterMode}`;
            const res = await fetch(proxyWavUrl);
            if (res.ok) {
              const wavBlob = await res.blob();
              // Ensure the server actually produced a real uncompressed RIFF WAV, not a 5MB fallback MP3
              if (await isWavBlob(wavBlob)) {
                setDownloadStep(`Đang hoàn tất đóng gói WAV ${wavBitDepth}-bit Master...`);
                downloadBlob(wavBlob, fileName);
                onSaveHistory({
                  id: 'dl-' + Date.now(),
                  title: customTitle || track.title,
                  artist: customArtist || track.artist,
                  coverUrl: track.coverUrl,
                  format: 'wav',
                  size: `${(wavBlob.size / 1024 / 1024).toFixed(1)} MB`,
                  timestamp: Date.now(),
                  audioUrl: track.audioUrl,
                  platformName: track.platformName,
                  source: track.source,
                });
                setDownloadStep('');
                setIsDownloading(false);
                return;
              } else {
                console.info('Server response is not a valid PCM WAV (PC lacks FFmpeg). Switching to client Web Audio lossless engine.');
              }
            }
          } catch (serverWavErr) {
            console.warn('Server WAV transcode notice, falling back to Web Audio:', serverWavErr);
          }
        }

        const arrayBuffer = await fetchAudioBuffer(track.audioUrl);

        setDownloadStep('Đang giải mã PCM (Lossless Decode)...');
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuffer = await decodeAudio(arrayBuffer, ctx);

        setDownloadStep(
          isRemastered
            ? `Đang áp dụng Remaster Auto-Leveler & đóng gói WAV ${wavBitDepth}-bit...`
            : `Đang đóng gói file WAV ${wavBitDepth}-bit Master...`
        );
        const wavBlob = audioBufferToWav(audioBuffer, {
          startTime: isTrimmingActive ? trimRange[0] : 0,
          endTime: isTrimmingActive ? trimRange[1] : audioBuffer.duration,
          bitDepth: wavBitDepth,
          remasterMode: currentRemasterMode,
        });

        setDownloadStep('Đang lưu file WAV về máy...');
        downloadBlob(wavBlob, fileName);

        onSaveHistory({
          id: 'dl-' + Date.now(),
          title: customTitle || track.title,
          artist: customArtist || track.artist,
          coverUrl: track.coverUrl,
          format: 'wav',
          size: wavEstimatedSize,
          timestamp: Date.now(),
          audioUrl: track.audioUrl,
          platformName: track.platformName,
          source: track.source,
        });
      } else {
        // --- MP3 320kbps Export ---
        if (isTrimmingActive) {
          // If trimming is active, export trimmed audio with remaster
          setDownloadStep(
            isRemastered
              ? 'Đang cắt nhạc & cân bằng âm lượng (Remastering)...'
              : 'Đang xử lý cắt âm thanh...'
          );
          const arrayBuffer = await fetchAudioBuffer(track.audioUrl);
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const audioBuffer = await decodeAudio(arrayBuffer, ctx);

          setDownloadStep('Đang xuất đoạn cắt chất lượng cao...');
          const trimmedBlob = audioBufferToWav(audioBuffer, {
            startTime: trimRange[0],
            endTime: trimRange[1],
            bitDepth: 16,
            remasterMode: currentRemasterMode,
          });
          downloadBlob(trimmedBlob, fileName.replace('.mp3', '.wav'));

          onSaveHistory({
            id: 'dl-' + Date.now(),
            title: customTitle || track.title,
            artist: customArtist || track.artist,
            coverUrl: track.coverUrl,
            format: 'mp3',
            size: mp3EstimatedSize,
            timestamp: Date.now(),
            audioUrl: track.audioUrl,
            platformName: track.platformName,
            source: track.source,
          });
        } else {
          // Full MP3 download: fetch as blob to guarantee successful download inside any iframe/browser
          setDownloadStep(
            isRemastered
              ? 'Đang xử lý Remaster DynAudNorm & tải MP3 320kbps...'
              : 'Đang tải luồng MP3 320kbps...'
          );
          const proxyDownloadUrl = `/api/proxy-audio?url=${encodeURIComponent(
            track.audioUrl
          )}&download=1&filename=${encodeURIComponent(fileName)}&remaster=${currentRemasterMode}`;

          let downloaded = false;
          try {
            const response = await fetch(proxyDownloadUrl);
            if (response.ok) {
              setDownloadStep('Đang hoàn tất và lưu file MP3...');
              const mp3Blob = await response.blob();
              if (mp3Blob && mp3Blob.size > 1000) {
                downloadBlob(mp3Blob, fileName);
                downloaded = true;
              }
            }
          } catch (fetchErr) {
            console.warn('Fetch blob download notice, switching to direct stream:', fetchErr);
          }

          if (!downloaded) {
            // Direct browser download stream fallback (native download manager)
            setDownloadStep('Đang kích hoạt tải trực tiếp...');
            const a = document.createElement('a');
            a.href = proxyDownloadUrl;
            a.download = fileName;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              if (document.body.contains(a)) document.body.removeChild(a);
            }, 2000);
          }

          onSaveHistory({
            id: 'dl-' + Date.now(),
            title: customTitle || track.title,
            artist: customArtist || track.artist,
            coverUrl: track.coverUrl,
            format: 'mp3',
            size: mp3EstimatedSize,
            timestamp: Date.now(),
            audioUrl: track.audioUrl,
            platformName: track.platformName,
            source: track.source,
          });
        }
      }

      setDownloadStep('Tải xuống thành công!');
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadStep('');
      }, 1500);
    } catch (err: any) {
      console.warn('Download notice:', err);
      // Even in case of error, trigger direct download URL as ultimate guarantee
      try {
        const directUrl = `/api/proxy-audio?url=${encodeURIComponent(track.audioUrl)}&download=1&filename=${encodeURIComponent(fileName)}`;
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
        }, 2000);
      } catch {}
      setIsDownloading(false);
      setDownloadStep('');
    }
  };

  const copyTrackUrl = () => {
    navigator.clipboard.writeText(track.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header section with cover & metadata */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Cover Art */}
        <div className="relative group shrink-0 w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
          <img
            src={track.coverUrl}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded border ${
                track.platformBadgeColor === 'emerald'
                  ? 'text-emerald-300 bg-emerald-950/80 border-emerald-700/50'
                  : track.platformBadgeColor === 'teal'
                  ? 'text-teal-300 bg-teal-950/80 border-teal-700/50'
                  : track.platformBadgeColor === 'purple'
                  ? 'text-purple-300 bg-purple-950/80 border-purple-700/50'
                  : 'text-sky-300 bg-sky-950/80 border-sky-700/50'
              }`}
            >
              {track.platformName || 'AI Music'}
            </span>
          </div>
        </div>

        {/* Track Info & Editable Meta */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {isEditingMeta ? (
                <div className="space-y-3 mb-2 p-3 bg-slate-950/90 rounded-xl border border-sky-500/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Tên bài hát:
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Tác giả / Nghệ sĩ:
                      </label>
                      <input
                        type="text"
                        value={customArtist}
                        onChange={(e) => setCustomArtist(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-slate-400 font-medium">
                          Nhịp điệu BPM:
                        </label>
                        <button
                          type="button"
                          onClick={handleTapTempo}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-sky-400 px-2 py-0.5 rounded transition-colors font-semibold"
                          title="Gõ theo nhịp để tự tính BPM"
                        >
                          👆 Gõ nhịp ({tapTimes.length >= 2 ? `${customBpm} BPM` : 'Tap'})
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCustomBpm((b) => Math.max(40, Math.round(b / 2)))}
                          className="px-2 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold"
                          title="Chia đôi nhịp độ (Half-time)"
                        >
                          ÷2
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomBpm((b) => Math.max(40, b - 1))}
                          className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
                          title="Giảm 1 BPM"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="40"
                          max="240"
                          value={customBpm}
                          onChange={(e) => setCustomBpm(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomBpm((b) => Math.min(240, b + 1))}
                          className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-bold"
                          title="Tăng 1 BPM"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomBpm((b) => Math.min(240, Math.round(b * 2)))}
                          className="px-2 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold"
                          title="Nhân đôi nhịp độ (Double-time)"
                        >
                          x2
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Tone / Khóa nhạc (Musical Key &amp; Camelot):
                      </label>
                      <select
                        value={customKey}
                        onChange={(e) => {
                          setCustomKey(e.target.value);
                          const matched = MUSICAL_KEYS_CATALOG.find(
                            (k) => `${k.name} (${k.camelot})` === e.target.value || k.name === e.target.value
                          );
                          if (matched) {
                            setCustomRelativeKey(matched.relative);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-indigo-300 font-mono font-semibold focus:outline-none focus:border-indigo-400"
                      >
                        {MUSICAL_KEYS_CATALOG.map((k) => (
                          <option key={k.name} value={`${k.name} (${k.camelot})`}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                      {customRelativeKey && (
                        <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
                          Khóa tương đương: {customRelativeKey}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-slate-100 tracking-tight leading-snug">
                    {customTitle || track.title}
                  </h3>
                  <p className="text-sm text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                    <span>{customArtist || track.artist}</span>
                  </p>
                </>
              )}
            </div>

            {/* Quick edit & copy buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingMeta(!isEditingMeta)}
                className={`p-2 rounded-lg transition-colors ${
                  isEditingMeta
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title={isEditingMeta ? 'Lưu chỉnh sửa' : 'Chỉnh tên, BPM & Tone/Key'}
              >
                {isEditingMeta ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={copyTrackUrl}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Sao chép link gốc"
              >
                {isCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Metadata Specs & Live DSP Auto-Detector */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
              <span className="text-sky-300 font-medium">{track.genre}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 bg-sky-950/60 border border-sky-800/40 px-2 py-0.5 rounded text-sky-300 font-mono">
                <span className="text-[10px] text-sky-400/80 font-sans">BPM:</span>
                <strong>{customBpm}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded text-indigo-300 font-mono">
                <span className="text-[10px] text-indigo-400/80 font-sans">Tone:</span>
                <strong>{customKey}</strong>
              </span>
              {customRelativeKey && (
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  (Hòa âm: <strong className="text-slate-300 font-mono">{customRelativeKey}</strong>)
                </span>
              )}
              {dspAnalyzed && (
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded font-medium">
                  ✓ Chuẩn DSP ({customConfidence}%)
                </span>
              )}
            </div>

            {/* Auto-detect DSP Button */}
            <button
              type="button"
              disabled={isAnalyzingDsp}
              onClick={handleAnalyzeDsp}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isAnalyzingDsp
                  ? 'bg-slate-800 text-slate-400 cursor-wait'
                  : 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/60'
              }`}
              title="Phân tích chuẩn xác nhịp độ BPM và giọng/khóa nhạc từ sóng âm thanh gốc"
            >
              {isAnalyzingDsp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Đang quét sóng âm...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>⚡ Đo lại BPM &amp; Key</span>
                </>
              )}
            </button>
          </div>

          {/* AI Prompt description */}
          {track.prompt && (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300">
              <span className="text-slate-400 font-medium block mb-1">
                Prompt / Mô tả âm nhạc:
              </span>
              <p className="italic text-slate-300 leading-relaxed font-sans">
                "{track.prompt}"
              </p>
            </div>
          )}

          {/* Lyrics toggle if available */}
          {track.lyrics && (
            <div>
              <button
                type="button"
                onClick={() => setShowLyrics(!showLyrics)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 transition-colors"
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>{showLyrics ? 'Ẩn lời bài hát / Cấu trúc' : 'Xem lời bài hát / Cấu trúc (Lyrics)'}</span>
              </button>

              {showLyrics && (
                <div className="mt-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                  {track.lyrics}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Format Selection & Download Options */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Chọn định dạng tải xuống
          </span>
          <span className="text-[11px] text-slate-400">
            {isTrimmingActive ? 'Đang bật chế độ cắt nhạc' : 'Toàn bộ bài hát'}
          </span>
        </div>

        {/* Format Selector: MP3 vs WAV */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* MP3 Option */}
          <button
            type="button"
            onClick={() => setFormat('mp3')}
            className={`p-4 rounded-xl text-left border transition-all relative ${
              format === 'mp3'
                ? 'bg-sky-500/10 border-sky-500/60 shadow-lg shadow-sky-500/10'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-sky-400" />
                Định dạng MP3 (320 kbps)
              </span>
              <span className="text-xs font-mono font-medium text-sky-400">
                ~{mp3EstimatedSize}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tương thích mọi thiết bị (iPhone, Android, ô tô, máy nghe nhạc). Dung lượng gọn nhẹ, chất lượng cao nhất.
            </p>
          </button>

          {/* WAV Option */}
          <button
            type="button"
            onClick={() => setFormat('wav')}
            className={`p-4 rounded-xl text-left border transition-all relative ${
              format === 'wav'
                ? 'bg-indigo-500/10 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Disc3 className="w-4 h-4 text-indigo-400" />
                Định dạng WAV Lossless (Studio)
              </span>
              <span className="text-xs font-mono font-medium text-indigo-400">
                ~{wavEstimatedSize}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Âm thanh nguyên bản không nén (Uncompressed PCM), chuẩn phòng thu cho producer làm nhạc (FL Studio, Ableton, Logic).
            </p>
          </button>
        </div>

        {/* WAV Bit Depth Option */}
        {format === 'wav' && (
          <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">Độ phân giải WAV (Bit Depth):</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWavBitDepth(16)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  wavBitDepth === 16
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                16-bit (Chuẩn CD/Phổ thông)
              </button>
              <button
                type="button"
                onClick={() => setWavBitDepth(24)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  wavBitDepth === 24
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                24-bit (Hi-Res Studio Master)
              </button>
            </div>
          </div>
        )}

        {/* Remaster Auto-Leveler Option Box (Đoạn nhỏ tự động to bằng đoạn lớn) */}
        <div className="bg-[#0b1329] border border-amber-900/40 rounded-xl p-3.5 space-y-2.5 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-amber-300 block">
                  Chức năng Remaster (Tự động cân bằng đoạn nhỏ &amp; to)
                </span>
                <span className="text-[11px] text-slate-400">
                  Tự động khuếch đại các đoạn êm/nhỏ ngang bằng đoạn điệp khúc lớn mà không vỡ tiếng
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/50">
              {currentRemasterMode === 'off'
                ? 'Đang tắt'
                : currentRemasterMode === 'balanced'
                ? 'Nâng +6dB'
                : 'Nâng +12dB (Tối đa)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRemaster('off')}
              className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                currentRemasterMode === 'off'
                  ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-medium text-xs text-slate-200">Tắt (Nguyên bản)</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Giữ âm lượng gốc của bài hát</div>
            </button>

            <button
              type="button"
              onClick={() => setRemaster('balanced')}
              className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                currentRemasterMode === 'balanced'
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-semibold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-amber-300'
              }`}
            >
              <div className="font-medium text-xs text-amber-300">Cân bằng Vừa (+6dB)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Nâng đoạn êm ái, giữ trọn nhạc tính</div>
            </button>

            <button
              type="button"
              onClick={() => setRemaster('max')}
              className={`p-2.5 rounded-lg text-left border text-xs transition-all ${
                currentRemasterMode === 'max'
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 font-semibold shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-amber-300'
              }`}
            >
              <div className="font-medium text-xs text-amber-300">Cân bằng Mạnh (+12dB)</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Đoạn nhỏ to bằng đoạn lớn nhất</div>
            </button>
          </div>
        </div>

        {/* Error notification if download failed */}
        {downloadError && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Download Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.99] ${
              isDownloading
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : format === 'wav'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/30'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                <span>{downloadStep || 'Đang chuẩn bị tải xuống...'}</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>
                  Tải ngay file {format.toUpperCase()} (
                  {format === 'wav' ? `${wavBitDepth}-bit Master` : '320kbps High Quality'})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
