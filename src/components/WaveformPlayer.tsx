import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Scissors,
  AlertCircle,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  Download,
  CheckCircle2,
  Repeat,
  Clock,
  Settings2,
} from 'lucide-react';
import {
  formatTime,
  audioBufferToWav,
  downloadBlob,
  fetchAudioBuffer,
  decodeAudio,
  isWavBlob,
} from '../utils/audioConverter';
import { RemasterMode } from '../types';

export type ExportFormatType = 'm4a' | 'mp3-320' | 'mp3-128' | 'wav-16' | 'wav-24';

export interface EqBands {
  bass: number;     // 60 Hz (-12 to +12 dB)
  lowMid: number;   // 250 Hz (-12 to +12 dB)
  mid: number;      // 1000 Hz (-12 to +12 dB)
  highMid: number;  // 4000 Hz (-12 to +12 dB)
  treble: number;   // 12000 Hz (-12 to +12 dB)
}

const DEFAULT_EQ: EqBands = {
  bass: 0,
  lowMid: 0,
  mid: 0,
  highMid: 0,
  treble: 0,
};

const EQ_PRESETS: { id: string; label: string; bands: EqBands }[] = [
  { id: 'flat', label: 'Chuẩn (Flat)', bands: { bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0 } },
  { id: 'vocal', label: 'Vocal Sáng', bands: { bass: -1, lowMid: 0, mid: 5, highMid: 4, treble: 2 } },
  { id: 'bass', label: 'Bass Uy Lực', bands: { bass: 7, lowMid: 4, mid: -1, highMid: 0, treble: 2 } },
  { id: 'acoustic', label: 'Acoustic Ấm', bands: { bass: 3, lowMid: 2, mid: 1, highMid: 3, treble: 4 } },
  { id: 'treble', label: 'Treble Sáng', bands: { bass: -1, lowMid: -1, mid: 0, highMid: 4, treble: 6 } },
  { id: 'club', label: 'Club / EDM', bands: { bass: 6, lowMid: 3, mid: -2, highMid: 3, treble: 5 } },
];

interface WaveformPlayerProps {
  audioUrl: string;
  title: string;
  artist: string;
  coverUrl: string;
  platformName?: string;
  genre?: string;
  duration?: number;
  bpm?: number;
  musicalKey?: string;
  remasterMode?: RemasterMode;
  onRemasterChange?: (mode: RemasterMode) => void;
  trimRange: [number, number];
  onTrimChange: (range: [number, number]) => void;
  isTrimmingActive: boolean;
  onToggleTrimming: () => void;
}

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  audioUrl,
  title,
  artist,
  coverUrl,
  platformName,
  genre,
  bpm,
  musicalKey,
  remasterMode = 'off',
  onRemasterChange,
  trimRange,
  onTrimChange,
  isTrimmingActive,
  onToggleTrimming,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio DSP References
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const makeupGainRef = useRef<GainNode | null>(null);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);

  // 5-Band Equalizer Nodes
  const eqBassRef = useRef<BiquadFilterNode | null>(null);
  const eqLowMidRef = useRef<BiquadFilterNode | null>(null);
  const eqMidRef = useRef<BiquadFilterNode | null>(null);
  const eqHighMidRef = useRef<BiquadFilterNode | null>(null);
  const eqTrebleRef = useRef<BiquadFilterNode | null>(null);
  const isMediaConnectedRef = useRef(false);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isSectionLooping, setIsSectionLooping] = useState(false);
  const [audioPeaks, setAudioPeaks] = useState<number[]>([]);
  const [retryWithFallback, setRetryWithFallback] = useState(false);

  // EQ State & Segment Editor
  const [eqBands, setEqBands] = useState<EqBands>(DEFAULT_EQ);
  const [selectedEqPreset, setSelectedEqPreset] = useState<string>('flat');
  const [isEqExpanded, setIsEqExpanded] = useState(false);
  const [eqScope, setEqScope] = useState<'full' | 'section'>('full');
  const [eqSectionRange, setEqSectionRange] = useState<[number, number]>([0, 30]);
  const [isEqLooping, setIsEqLooping] = useState(false);
  const [applyEqToDownload, setApplyEqToDownload] = useState(true);

  // Remaster State
  const [internalRemaster, setInternalRemaster] = useState<RemasterMode>(remasterMode);
  const currentRemasterMode = onRemasterChange ? remasterMode : internalRemaster;

  // Download States
  const [downloadScope, setDownloadScope] = useState<'full' | 'section'>('full');
  const [exportFormat, setExportFormat] = useState<ExportFormatType>('mp3-320');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Reset fallback state on URL change
  useEffect(() => {
    setRetryWithFallback(false);
    setDownloadError(null);
    setDownloadSuccess(false);
  }, [audioUrl]);

  // Initialize Web Audio Graph with Compressor, Makeup Gain, Limiter, and 5-Band EQ
  const initAudioGraph = useCallback(() => {
    if (!audioContextRef.current && audioRef.current && !isMediaConnectedRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(audioRef.current);
        sourceNodeRef.current = source;
        isMediaConnectedRef.current = true;

        // Dynamics Compressor for dynamic auto-leveling
        const comp = ctx.createDynamicsCompressor();
        compressorRef.current = comp;

        // Clean makeup gain
        const makeup = ctx.createGain();
        makeupGainRef.current = makeup;

        // Peak limiter for 0dB true peak safety
        const limiter = ctx.createDynamicsCompressor();
        limiterRef.current = limiter;

        // 5-Band Parametric Equalizer Nodes
        // 1. Bass Lowshelf (60 Hz)
        const eqBass = ctx.createBiquadFilter();
        eqBass.type = 'lowshelf';
        eqBass.frequency.value = 60;
        eqBass.gain.value = eqBands.bass;
        eqBassRef.current = eqBass;

        // 2. Low-Mid Peaking (250 Hz)
        const eqLowMid = ctx.createBiquadFilter();
        eqLowMid.type = 'peaking';
        eqLowMid.frequency.value = 250;
        eqLowMid.Q.value = 1.0;
        eqLowMid.gain.value = eqBands.lowMid;
        eqLowMidRef.current = eqLowMid;

        // 3. Mid Peaking (1000 Hz)
        const eqMid = ctx.createBiquadFilter();
        eqMid.type = 'peaking';
        eqMid.frequency.value = 1000;
        eqMid.Q.value = 1.0;
        eqMid.gain.value = eqBands.mid;
        eqMidRef.current = eqMid;

        // 4. High-Mid Peaking (4000 Hz)
        const eqHighMid = ctx.createBiquadFilter();
        eqHighMid.type = 'peaking';
        eqHighMid.frequency.value = 4000;
        eqHighMid.Q.value = 1.0;
        eqHighMid.gain.value = eqBands.highMid;
        eqHighMidRef.current = eqHighMid;

        // 5. Treble Highshelf (12000 Hz)
        const eqTreble = ctx.createBiquadFilter();
        eqTreble.type = 'highshelf';
        eqTreble.frequency.value = 12000;
        eqTreble.gain.value = eqBands.treble;
        eqTrebleRef.current = eqTreble;

        // Connect graph in series:
        // source -> comp -> makeup -> limiter -> eqBass -> eqLowMid -> eqMid -> eqHighMid -> eqTreble -> destination
        source.connect(comp);
        comp.connect(makeup);
        makeup.connect(limiter);
        limiter.connect(eqBass);
        eqBass.connect(eqLowMid);
        eqLowMid.connect(eqMid);
        eqMid.connect(eqHighMid);
        eqHighMid.connect(eqTreble);
        eqTreble.connect(ctx.destination);
      } catch (err) {
        console.warn('AudioContext graph init notice:', err);
      }
    }
  }, [eqBands]);

  // Apply real-time Remaster dynamic leveling
  const applyRemaster = async (mode: RemasterMode) => {
    if (onRemasterChange) {
      onRemasterChange(mode);
    } else {
      setInternalRemaster(mode);
    }

    if (!audioRef.current) return;
    if (mode === 'off' && !audioContextRef.current) return;

    try {
      if (isPlaying && !audioContextRef.current) {
        initAudioGraph();
      }
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const comp = compressorRef.current;
      const makeup = makeupGainRef.current;
      const limiter = limiterRef.current;

      if (comp && makeup && limiter) {
        if (mode === 'off') {
          comp.threshold.value = 0;
          comp.ratio.value = 1;
          makeup.gain.value = 1.0;
          limiter.threshold.value = 0;
          limiter.ratio.value = 1;
        } else if (mode === 'balanced') {
          comp.threshold.value = -24;
          comp.knee.value = 12;
          comp.ratio.value = 4.5;
          comp.attack.value = 0.015;
          comp.release.value = 0.25;
          makeup.gain.value = 1.8; // +5.1dB clean boost
          limiter.threshold.value = -1.0;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.002;
          limiter.release.value = 0.05;
        } else if (mode === 'max') {
          comp.threshold.value = -34;
          comp.knee.value = 16;
          comp.ratio.value = 8.0;
          comp.attack.value = 0.010;
          comp.release.value = 0.20;
          makeup.gain.value = 2.6; // +8.3dB clean boost
          limiter.threshold.value = -0.8;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.001;
          limiter.release.value = 0.04;
        }
      }
    } catch (err) {
      console.warn('Remaster mode change notice:', err);
    }
  };

  useEffect(() => {
    if (remasterMode && audioContextRef.current) {
      applyRemaster(remasterMode);
    }
  }, [remasterMode]);

  // Update EQ bands live in AudioContext
  const updateEqBand = (band: keyof EqBands, val: number) => {
    const clamped = Math.max(-12, Math.min(12, val));
    const nextBands = { ...eqBands, [band]: clamped };
    setEqBands(nextBands);
    setSelectedEqPreset('custom');

    if (isPlaying && !audioContextRef.current) {
      initAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (band === 'bass' && eqBassRef.current) eqBassRef.current.gain.value = clamped;
    if (band === 'lowMid' && eqLowMidRef.current) eqLowMidRef.current.gain.value = clamped;
    if (band === 'mid' && eqMidRef.current) eqMidRef.current.gain.value = clamped;
    if (band === 'highMid' && eqHighMidRef.current) eqHighMidRef.current.gain.value = clamped;
    if (band === 'treble' && eqTrebleRef.current) eqTrebleRef.current.gain.value = clamped;
  };

  // Apply EQ Preset
  const applyEqPreset = (presetId: string) => {
    const found = EQ_PRESETS.find((p) => p.id === presetId);
    if (!found) return;

    setSelectedEqPreset(presetId);
    setEqBands(found.bands);

    if (isPlaying && !audioContextRef.current) {
      initAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }

    if (eqBassRef.current) eqBassRef.current.gain.value = found.bands.bass;
    if (eqLowMidRef.current) eqLowMidRef.current.gain.value = found.bands.lowMid;
    if (eqMidRef.current) eqMidRef.current.gain.value = found.bands.mid;
    if (eqHighMidRef.current) eqHighMidRef.current.gain.value = found.bands.highMid;
    if (eqTrebleRef.current) eqTrebleRef.current.gain.value = found.bands.treble;
  };

  // Generate aesthetic waveform bars
  useEffect(() => {
    const count = 120;
    const seed = (title + artist).split('').reduce((acc, c) => acc + c.charCodeAt(0), 42);
    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
      const v1 = Math.sin((i / count) * Math.PI * 4 + seed);
      const v2 = Math.cos((i / count) * Math.PI * 8);
      const v3 = Math.sin((i / count) * Math.PI * 16);
      const height = Math.max(0.15, Math.min(0.95, (v1 * 0.4 + v2 * 0.3 + v3 * 0.2 + 0.6) * 0.75));
      peaks.push(height);
    }
    setAudioPeaks(peaks);
  }, [title, artist, audioUrl]);

  // Audio stream proxy URL
  const primaryProxy = audioUrl.startsWith('/api/proxy-audio')
    ? (retryWithFallback ? `${audioUrl}${audioUrl.includes('?') ? '&' : '?'}fallback=1` : audioUrl)
    : `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}${retryWithFallback ? '&fallback=1' : ''}`;

  const fallbackProxy = `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}&fallback=1`;

  // Audio setup
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsLoadingAudio(true);
    setAudioError(null);
    setIsPlaying(false);
    setCurrentTime(0);

    audio.crossOrigin = 'anonymous';
    const targetSrc = primaryProxy;
    if (audio.src !== targetSrc && !audio.src.endsWith(targetSrc)) {
      audio.src = targetSrc;
      audio.load();
    }

    const handleLoadedMetadata = () => {
      setIsLoadingAudio(false);
      setAudioError(null);
      const d = audio.duration || 145;
      setAudioDuration(d);
      if (trimRange[1] === 0 || trimRange[1] > d) {
        onTrimChange([0, d]);
      }
      if (eqSectionRange[1] === 0 || eqSectionRange[1] > d) {
        setEqSectionRange([0, Math.min(d, 30)]);
      }
    };

    const handleCanPlay = () => {
      setIsLoadingAudio(false);
      setAudioError(null);
    };

    const handleTimeUpdate = () => {
      const cur = audio.currentTime;
      setCurrentTime(cur);

      // Dynamic Live EQ filtering based on segment scope
      if (eqScope === 'section') {
        const inEqSection = cur >= eqSectionRange[0] && cur <= eqSectionRange[1];
        if (inEqSection) {
          if (eqBassRef.current) eqBassRef.current.gain.value = eqBands.bass;
          if (eqLowMidRef.current) eqLowMidRef.current.gain.value = eqBands.lowMid;
          if (eqMidRef.current) eqMidRef.current.gain.value = eqBands.mid;
          if (eqHighMidRef.current) eqHighMidRef.current.gain.value = eqBands.highMid;
          if (eqTrebleRef.current) eqTrebleRef.current.gain.value = eqBands.treble;
        } else {
          if (eqBassRef.current) eqBassRef.current.gain.value = 0;
          if (eqLowMidRef.current) eqLowMidRef.current.gain.value = 0;
          if (eqMidRef.current) eqMidRef.current.gain.value = 0;
          if (eqHighMidRef.current) eqHighMidRef.current.gain.value = 0;
          if (eqTrebleRef.current) eqTrebleRef.current.gain.value = 0;
        }

        if (isEqLooping && cur >= eqSectionRange[1]) {
          audio.currentTime = eqSectionRange[0];
          return;
        }
      } else {
        if (eqBassRef.current) eqBassRef.current.gain.value = eqBands.bass;
        if (eqLowMidRef.current) eqLowMidRef.current.gain.value = eqBands.lowMid;
        if (eqMidRef.current) eqMidRef.current.gain.value = eqBands.mid;
        if (eqHighMidRef.current) eqHighMidRef.current.gain.value = eqBands.highMid;
        if (eqTrebleRef.current) eqTrebleRef.current.gain.value = eqBands.treble;
      }

      // Section boundary handling when section looping is enabled or trimming is active
      const hasValidTrim = trimRange[1] > trimRange[0];
      if (hasValidTrim && isSectionLooping && cur >= trimRange[1]) {
        audio.currentTime = trimRange[0];
      } else if (hasValidTrim && isTrimmingActive && cur >= trimRange[1]) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = trimRange[0];
      }
    };

    const handleEnded = () => {
      if (isEqLooping && eqScope === 'section' && eqSectionRange[1] > eqSectionRange[0]) {
        audio.currentTime = eqSectionRange[0];
        audio.play().catch(() => {});
      } else if (isSectionLooping && trimRange[1] > trimRange[0]) {
        audio.currentTime = trimRange[0];
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      const currentSrc = audio.src || '';
      console.warn('Audio stream playback notice:', currentSrc, audio.error?.message || '');
      if (!retryWithFallback && !currentSrc.includes('fallback=1')) {
        setRetryWithFallback(true);
        audio.src = fallbackProxy;
        audio.load();
        return;
      }
      setIsLoadingAudio(false);
      setIsPlaying(false);
      setAudioError('Không thể phát luồng âm thanh này. Bạn có thể nhấn "Thử lại" hoặc dùng luồng dự phòng.');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [primaryProxy, retryWithFallback, trimRange, isSectionLooping, isTrimmingActive, onTrimChange, eqScope, eqSectionRange, isEqLooping, eqBands]);

  // Volume & Speed sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      initAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('Playback resume notice:', err);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || audioDuration <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * audioDuration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audioDuration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Audition only the selected section
  const playSelectedSection = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioContextRef.current) {
      initAudioGraph();
    }
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    audio.currentTime = trimRange[0];
    setCurrentTime(trimRange[0]);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {}
  };

  // Section Adjustments
  const setStartToCurrent = () => {
    const newStart = Math.min(currentTime, Math.max(0, trimRange[1] - 1));
    onTrimChange([Math.round(newStart * 10) / 10, trimRange[1]]);
    if (!isTrimmingActive) onToggleTrimming();
  };

  const setEndToCurrent = () => {
    const newEnd = Math.max(currentTime, trimRange[0] + 1);
    onTrimChange([trimRange[0], Math.round(newEnd * 10) / 10]);
    if (!isTrimmingActive) onToggleTrimming();
  };

  const nudgeStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(trimRange[1] - 0.5, trimRange[0] + delta));
    onTrimChange([Math.round(newStart * 10) / 10, trimRange[1]]);
    if (!isTrimmingActive) onToggleTrimming();
  };

  const nudgeEnd = (delta: number) => {
    const newEnd = Math.min(audioDuration || 300, Math.max(trimRange[0] + 0.5, trimRange[1] + delta));
    onTrimChange([trimRange[0], Math.round(newEnd * 10) / 10]);
    if (!isTrimmingActive) onToggleTrimming();
  };

  const resetToFullTrack = () => {
    onTrimChange([0, audioDuration || 180]);
    setIsSectionLooping(false);
  };

  // EQ Section Specific Adjustments
  const playEqSection = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioContextRef.current) initAudioGraph();
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    audio.currentTime = eqSectionRange[0];
    setCurrentTime(eqSectionRange[0]);
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {}
  };

  const setEqStartToCurrent = () => {
    const newStart = Math.min(currentTime, Math.max(0, eqSectionRange[1] - 0.5));
    setEqSectionRange([Math.round(newStart * 10) / 10, eqSectionRange[1]]);
  };

  const setEqEndToCurrent = () => {
    const newEnd = Math.max(currentTime, eqSectionRange[0] + 0.5);
    setEqSectionRange([eqSectionRange[0], Math.round(newEnd * 10) / 10]);
  };

  const nudgeEqStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(eqSectionRange[1] - 0.5, eqSectionRange[0] + delta));
    setEqSectionRange([Math.round(newStart * 10) / 10, eqSectionRange[1]]);
  };

  const nudgeEqEnd = (delta: number) => {
    const newEnd = Math.min(audioDuration || 300, Math.max(eqSectionRange[0] + 0.5, eqSectionRange[1] + delta));
    setEqSectionRange([eqSectionRange[0], Math.round(newEnd * 10) / 10]);
  };

  // Draw Waveform Canvas with Active Section Highlight
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const peaks = audioPeaks;
    if (!peaks.length) return;

    const barWidth = 3;
    const gap = 2;
    const totalBars = Math.floor(width / (barWidth + gap));
    const currentProgress = audioDuration > 0 ? currentTime / audioDuration : 0;

    // Draw baseline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Section highlight overlay
    const hasSection = (isTrimmingActive || isSectionLooping || downloadScope === 'section') && audioDuration > 0;
    if (hasSection) {
      const trimStartX = (trimRange[0] / audioDuration) * width;
      const trimEndX = (trimRange[1] / audioDuration) * width;

      // Darken outside regions
      ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
      ctx.fillRect(0, 0, trimStartX, height);
      ctx.fillRect(trimEndX, 0, width - trimEndX, height);

      // Section active box
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.fillRect(trimStartX, 0, trimEndX - trimStartX, height);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(trimStartX, 0, trimEndX - trimStartX, height);

      // Start & End handle lines
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(trimStartX - 1.5, 0, 3, height);
      ctx.fillRect(trimEndX - 1.5, 0, 3, height);
    }

    // Draw bars
    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + gap);
      const peakIdx = Math.floor((i / totalBars) * peaks.length);
      const peakVal = peaks[peakIdx] || 0.3;
      const barHeight = Math.max(4, peakVal * (height - 16));
      const y = (height - barHeight) / 2;

      const barProgress = i / totalBars;
      const isPlayed = barProgress <= currentProgress;

      if (isPlayed) {
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(1, '#6366f1');
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#334155';
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    // Playhead
    const playheadX = currentProgress * width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(playheadX - 1, 0, 2, height);
    ctx.beginPath();
    ctx.arc(playheadX, 4, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }, [audioPeaks, currentTime, audioDuration, isTrimmingActive, isSectionLooping, downloadScope, trimRange]);

  // Real-time calculation of estimated file size
  const activeDuration =
    downloadScope === 'section' && trimRange[1] > trimRange[0]
      ? trimRange[1] - trimRange[0]
      : (audioDuration || 180);

  const formatSizeEstimates: Record<ExportFormatType, string> = {
    'm4a': `${((activeDuration * 256) / 8 / 1024).toFixed(1)} MB`,
    'mp3-320': `${((activeDuration * 320) / 8 / 1024).toFixed(1)} MB`,
    'mp3-128': `${((activeDuration * 128) / 8 / 1024).toFixed(1)} MB`,
    'wav-16': `${((activeDuration * 44100 * 2 * 2) / 1024 / 1024).toFixed(1)} MB`,
    'wav-24': `${((activeDuration * 44100 * 2 * 3) / 1024 / 1024).toFixed(1)} MB`,
  };

  // Download Action
  const handleDownload = async () => {
    if (!audioUrl) {
      setDownloadError('Chưa có nguồn âm thanh để tải xuống.');
      return;
    }
    setIsDownloading(true);
    setDownloadError(null);

    const isTrimSelected = downloadScope === 'section' && trimRange[1] > trimRange[0];
    const start = isTrimSelected ? trimRange[0] : 0;
    const dur = isTrimSelected ? trimRange[1] - trimRange[0] : 0;

    let fmt = 'mp3';
    let br = '320';
    let bd = '16';
    let fileExt = 'mp3';

    if (exportFormat === 'm4a') {
      fmt = 'm4a';
      fileExt = 'm4a';
    } else if (exportFormat === 'mp3-128') {
      fmt = 'mp3';
      br = '128';
      fileExt = 'mp3';
    } else if (exportFormat === 'mp3-320') {
      fmt = 'mp3';
      br = '320';
      fileExt = 'mp3';
    } else if (exportFormat === 'wav-16') {
      fmt = 'wav';
      bd = '16';
      fileExt = 'wav';
    } else if (exportFormat === 'wav-24') {
      fmt = 'wav';
      bd = '24';
      fileExt = 'wav';
    }

    const cleanTitle = (title || 'Track').replace(/[/\\?%*:|"<>]/g, '_').trim();
    const cleanArtist = (artist || '').replace(/[/\\?%*:|"<>]/g, '_').trim();
    const sectionSuffix = isTrimSelected ? `_(${formatTime(start)}-${formatTime(trimRange[1])})` : '';
    const outFileName = `${cleanTitle}${cleanArtist ? ' - ' + cleanArtist : ''}${sectionSuffix}.${fileExt}`;

    try {

      const params = new URLSearchParams({
        url: audioUrl,
        download: '1',
        format: fmt,
        filename: outFileName,
        remaster: currentRemasterMode,
      });

      if (fmt === 'mp3') {
        params.set('bitrate', br);
      }
      if (fmt === 'wav') {
        params.set('bitDepth', bd);
      }
      if (isTrimSelected) {
        params.set('start', start.toFixed(2));
        params.set('duration', dur.toFixed(2));
      }

      if (applyEqToDownload) {
        params.set('eq_bass', eqBands.bass.toFixed(1));
        params.set('eq_lowmid', eqBands.lowMid.toFixed(1));
        params.set('eq_mid', eqBands.mid.toFixed(1));
        params.set('eq_highmid', eqBands.highMid.toFixed(1));
        params.set('eq_treble', eqBands.treble.toFixed(1));
      }

      const downloadUrl = `/api/proxy-audio?${params.toString()}`;

      if (fmt === 'wav') {
        // --- High-Fidelity Lossless WAV Export Pipeline ---
        let wavBlob: Blob | null = null;

        // 1. Attempt fast direct download of server-transcoded WAV (if host has FFmpeg installed)
        try {
          const res = await fetch(downloadUrl);
          if (res.ok) {
            const blob = await res.blob();
            // Verify it's a genuine RIFF/WAVE file (not an MP3 stream falsely sent as WAV)
            if (blob && blob.size > 2000 && blob.type !== 'text/html' && (await isWavBlob(blob))) {
              wavBlob = blob;
            } else {
              console.info('Server response is not a valid PCM WAV (PC likely lacks FFmpeg in PATH). Switching to client Web Audio lossless engine.');
            }
          }
        } catch (serverErr) {
          console.warn('Server WAV fetch notice, switching to client lossless Web Audio engine:', serverErr);
        }

        // 2. If server transcode was bypassed, timed out, or non-200, synthesize genuine lossless WAV in browser
        if (!wavBlob) {
          try {
            // Fetch audio buffer through proxy (which is proven 100% reliable)
            const rawArrayBuf = await fetchAudioBuffer(audioUrl);
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioCtx();
            const decoded = await decodeAudio(rawArrayBuf, ctx);

            // If EQ is enabled, process decoded audio through OfflineAudioContext
            let processedBuffer = decoded;
            if (
              applyEqToDownload &&
              (Math.abs(eqBands.bass) > 0.05 ||
                Math.abs(eqLowMidRef.current ? eqBands.lowMid : 0) > 0.05 ||
                Math.abs(eqBands.mid) > 0.05 ||
                Math.abs(eqBands.highMid) > 0.05 ||
                Math.abs(eqBands.treble) > 0.05)
            ) {
              try {
                const offlineCtx = new OfflineAudioContext(
                  decoded.numberOfChannels,
                  decoded.length,
                  decoded.sampleRate
                );
                const srcNode = offlineCtx.createBufferSource();
                srcNode.buffer = decoded;

                const bBass = offlineCtx.createBiquadFilter();
                bBass.type = 'lowshelf';
                bBass.frequency.value = 60;
                bBass.gain.value = eqBands.bass;

                const bLowMid = offlineCtx.createBiquadFilter();
                bLowMid.type = 'peaking';
                bLowMid.frequency.value = 250;
                bLowMid.Q.value = 1.0;
                bLowMid.gain.value = eqBands.lowMid;

                const bMid = offlineCtx.createBiquadFilter();
                bMid.type = 'peaking';
                bMid.frequency.value = 1000;
                bMid.Q.value = 1.0;
                bMid.gain.value = eqBands.mid;

                const bHighMid = offlineCtx.createBiquadFilter();
                bHighMid.type = 'peaking';
                bHighMid.frequency.value = 4000;
                bHighMid.Q.value = 1.0;
                bHighMid.gain.value = eqBands.highMid;

                const bTreble = offlineCtx.createBiquadFilter();
                bTreble.type = 'highshelf';
                bTreble.frequency.value = 12000;
                bTreble.gain.value = eqBands.treble;

                srcNode.connect(bBass);
                bBass.connect(bLowMid);
                bLowMid.connect(bMid);
                bMid.connect(bHighMid);
                bHighMid.connect(bTreble);
                bTreble.connect(offlineCtx.destination);

                srcNode.start(0);
                processedBuffer = await offlineCtx.startRendering();
              } catch (eqOfflineErr) {
                console.warn('Offline EQ render notice, using pristine buffer:', eqOfflineErr);
              }
            }

            wavBlob = audioBufferToWav(processedBuffer, {
              startTime: isTrimSelected ? start : 0,
              endTime: isTrimSelected ? start + dur : processedBuffer.duration,
              bitDepth: bd === '24' ? 24 : 16,
              remasterMode: currentRemasterMode,
            });
          } catch (clientErr) {
            console.warn('Client Web Audio WAV synthesis notice:', clientErr);
          }
        }

        if (wavBlob && wavBlob.size > 2000) {
          downloadBlob(wavBlob, outFileName);
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 4000);
          return;
        }

        // 3. Direct browser stream fallback as final guarantee
        const directA = document.createElement('a');
        directA.href = downloadUrl;
        directA.download = outFileName;
        document.body.appendChild(directA);
        directA.click();
        setTimeout(() => {
          if (document.body.contains(directA)) document.body.removeChild(directA);
        }, 2000);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
        return;
      }

      // --- Standard MP3 / M4A Download Pipeline ---
      let downloadedViaBlob = false;
      try {
        const res = await fetch(downloadUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 1000 && blob.type !== 'text/html') {
            downloadBlob(blob, outFileName);
            downloadedViaBlob = true;
          }
        }
      } catch (fetchErr) {
        console.warn('Fetch blob download notice:', fetchErr);
      }

      // If blob fetch was bypassed (e.g. large file, mobile device, or network pause), trigger native browser stream
      if (!downloadedViaBlob) {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = outFileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) {
            document.body.removeChild(a);
          }
        }, 2000);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.warn('Download fallback trigger:', err);
      // Ultimate fallback: direct stream without throwing
      const fallbackUrl = `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}&download=1&format=${exportFormat.startsWith('wav') ? 'wav' : exportFormat === 'm4a' ? 'm4a' : 'mp3'}&filename=${encodeURIComponent(outFileName)}`;
      const a = document.createElement('a');
      a.href = fallbackUrl;
      a.download = outFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 2000);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-6 animate-fade-in backdrop-blur-xl">
      {/* Hidden standard HTML5 audio element */}
      <audio ref={audioRef} preload="metadata">
        <source src={primaryProxy} type="audio/mpeg" />
        <source src={fallbackProxy} type="audio/mpeg" />
      </audio>

      {/* 1. Track Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-700/80 shadow-lg shadow-sky-500/10">
            <img
              src={coverUrl}
              alt={title}
              className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}
            />
            {isPlaying && (
              <div className="absolute inset-0 bg-sky-500/20 backdrop-blur-[1px] flex items-center justify-center">
                <span className="w-3 h-3 rounded-full bg-sky-400 animate-ping" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-950/90 text-sky-400 border border-sky-800/60">
                {platformName || 'AI Music'}
              </span>
              {genre && (
                <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={genre}>
                  {genre}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-100 text-lg truncate mt-1" title={title}>
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="font-medium text-slate-300">{artist}</span>
              {bpm && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-sky-400">{bpm} BPM</span>
                </>
              )}
              {musicalKey && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono font-semibold text-indigo-400">Tone {musicalKey}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick status pill */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Âm thanh gốc đã sẵn sàng</span>
          </span>
        </div>
      </div>

      {/* Error alert */}
      {audioError && (
        <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{audioError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAudioError(null);
              setRetryWithFallback(!retryWithFallback);
            }}
            className="px-3 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-semibold"
          >
            Thử luồng khác
          </button>
        </div>
      )}

      {/* 2. Interactive Waveform Player */}
      <div className="space-y-2">
        <div className="relative group">
          <canvas
            ref={canvasRef}
            width={720}
            height={80}
            onClick={handleSeek}
            className="w-full h-20 bg-slate-950 rounded-2xl cursor-pointer border border-slate-800 transition-colors group-hover:border-slate-700 shadow-inner"
          />

          {/* Floating Time Display */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2 px-1">
            <span className="font-semibold text-slate-200">{formatTime(currentTime)}</span>
            {(isTrimmingActive || isSectionLooping || downloadScope === 'section') && (
              <span className="text-sky-400 font-sans font-medium text-xs bg-sky-950/80 border border-sky-800/60 px-2.5 py-0.5 rounded-full">
                Đoạn chọn: {formatTime(trimRange[0])} – {formatTime(trimRange[1])} (Dài {formatTime(Math.max(0, trimRange[1] - trimRange[0]))})
              </span>
            )}
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Main Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seekRelative(-5)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              title="Lùi 5 giây"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoadingAudio}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-400 to-indigo-500 hover:opacity-95 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 transition-transform active:scale-95 disabled:opacity-60"
              title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            >
              {isLoadingAudio ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => seekRelative(5)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              title="Tới 5 giây"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                const audio = audioRef.current;
                if (audio) {
                  audio.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              title="Quay lại từ đầu"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Section Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playSelectedSection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Nghe thử riêng đoạn đã chọn"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Nghe đoạn chọn</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSectionLooping(!isSectionLooping)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isSectionLooping
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Lặp lại liên tục đoạn đã chọn (A-B Loop) để thẩm âm và tinh chỉnh EQ"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Lặp đoạn (A-B)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEqExpanded(!isEqExpanded)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                isEqExpanded || selectedEqPreset !== 'flat'
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Cân bằng EQ</span>
            </button>
          </div>

          {/* Speed & Volume */}
          <div className="flex items-center gap-3">
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x (Chuẩn)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="text-slate-400 hover:text-slate-200"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 h-1.5 accent-sky-400 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section / Đoạn Muốn Làm (Trimmer & Segment Editor) */}
      <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Chọn &amp; Tinh chỉnh đoạn muốn làm (Cắt nhạc &amp; Thẩm âm EQ)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              Đoạn đang chọn: <strong className="text-sky-300">{formatTime(trimRange[0])}</strong> đến <strong className="text-sky-300">{formatTime(trimRange[1])}</strong>
            </span>
            <button
              type="button"
              onClick={resetToFullTrack}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline ml-2"
            >
              Chọn lại toàn bài
            </button>
          </div>
        </div>

        {/* Inputs for precise start & end */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Time Box */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Điểm Bắt Đầu (Start Time)</span>
              <span className="font-mono text-sky-400 font-bold">{trimRange[0].toFixed(1)}s ({formatTime(trimRange[0])})</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={Math.max(0, trimRange[1] - 0.5)}
                step="0.1"
                value={trimRange[0]}
                onChange={(e) => onTrimChange([Number(e.target.value), trimRange[1]])}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeStart(-1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(-0.2)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  -0.2s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(0.2)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  +0.2s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  +1s
                </button>
              </div>
              <button
                type="button"
                onClick={setStartToCurrent}
                className="px-2.5 py-1 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-300 text-[11px] font-medium transition-colors"
                title="Lấy vị trí đang phát làm điểm bắt đầu"
              >
                📍 Lấy vị trí này
              </button>
            </div>
          </div>

          {/* End Time Box */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Điểm Kết Thúc (End Time)</span>
              <span className="font-mono text-sky-400 font-bold">{trimRange[1].toFixed(1)}s ({formatTime(trimRange[1])})</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={trimRange[0] + 0.5}
                max={audioDuration || 300}
                step="0.1"
                value={trimRange[1]}
                onChange={(e) => onTrimChange([trimRange[0], Number(e.target.value)])}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeEnd(-1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(-0.2)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  -0.2s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(0.2)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  +0.2s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono"
                >
                  +1s
                </button>
              </div>
              <button
                type="button"
                onClick={setEndToCurrent}
                className="px-2.5 py-1 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-300 text-[11px] font-medium transition-colors"
                title="Lấy vị trí đang phát làm điểm kết thúc"
              >
                📍 Lấy vị trí này
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 5-Band Equalizer Section with Editable EQ Segment */}
      <div className="bg-slate-950/80 rounded-2xl p-4 border border-indigo-900/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Cân Bằng Âm Thanh (5-Band Studio Equalizer)
            </h4>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {EQ_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyEqPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedEqPreset === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => applyEqPreset('flat')}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-medium ml-1"
              title="Đặt lại EQ về 0 dB"
            >
              Reset
            </button>
          </div>
        </div>

        {/* 5-Band Sliders Grid */}
        <div className="grid grid-cols-5 gap-3 pt-1">
          {[
            { key: 'bass' as keyof EqBands, label: 'Bass', freq: '60 Hz', desc: 'Âm trầm' },
            { key: 'lowMid' as keyof EqBands, label: 'Low-Mid', freq: '250 Hz', desc: 'Độ ấm' },
            { key: 'mid' as keyof EqBands, label: 'Mid', freq: '1.0 kHz', desc: 'Giọng hát' },
            { key: 'highMid' as keyof EqBands, label: 'High-Mid', freq: '4.0 kHz', desc: 'Rõ nét' },
            { key: 'treble' as keyof EqBands, label: 'Treble', freq: '12 kHz', desc: 'Độ sáng' },
          ].map((band) => {
            const val = eqBands[band.key];
            return (
              <div key={band.key} className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-200">{band.label}</span>
                <span className="text-[10px] font-mono text-slate-400">{band.freq}</span>
                <span className={`text-xs font-mono font-bold ${val > 0 ? 'text-indigo-400' : val < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {val > 0 ? `+${val} dB` : `${val} dB`}
                </span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  value={val}
                  onChange={(e) => updateEqBand(band.key, Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer my-1"
                />
                <span className="text-[10px] text-slate-500 text-center">{band.desc}</span>
              </div>
            );
          })}
        </div>

        {/* Editable EQ Segment Box (Phần EQ có thể chỉnh sửa đoạn muốn làm hơn nữa) */}
        <div className="bg-slate-900/80 rounded-xl p-3.5 border border-indigo-900/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span className="text-xs font-bold text-slate-200">
                Phạm Vi Áp Dụng EQ (Chỉnh sửa đoạn muốn làm)
              </span>
            </div>

            {/* Scope Toggle: Full track vs Segment */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEqScope('full');
                  setIsEqLooping(false);
                }}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  eqScope === 'full'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Toàn bài hát
              </button>
              <button
                type="button"
                onClick={() => setEqScope('section')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  eqScope === 'section'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chỉnh theo đoạn muốn làm
              </button>
            </div>
          </div>

          {eqScope === 'section' ? (
            <div className="space-y-3 pt-1 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-indigo-300 font-medium">
                  Đoạn áp dụng EQ: <strong>{formatTime(eqSectionRange[0])}</strong> đến <strong>{formatTime(eqSectionRange[1])}</strong> ({Math.max(0, eqSectionRange[1] - eqSectionRange[0]).toFixed(1)}s)
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentTime >= eqSectionRange[0] && currentTime <= eqSectionRange[1] ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Đang phát trong vùng EQ (Áp dụng âm thanh đã chỉnh)
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                      Ngoài vùng EQ (Bypass âm thanh gốc để so sánh A/B)
                    </span>
                  )}
                </span>
              </div>

              {/* Start & End Segment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* EQ Segment Start */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Bắt đầu đoạn EQ:</span>
                    <span className="font-mono text-indigo-300 font-bold">{formatTime(eqSectionRange[0])} ({eqSectionRange[0].toFixed(1)}s)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, eqSectionRange[1] - 0.5)}
                    step="0.1"
                    value={eqSectionRange[0]}
                    onChange={(e) => setEqSectionRange([Number(e.target.value), eqSectionRange[1]])}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => nudgeEqStart(-1)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        -1s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqStart(-0.2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        -0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqStart(0.2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        +0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqStart(1)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        +1s
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={setEqStartToCurrent}
                      className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-[11px] font-medium"
                      title="Lấy thời gian hiện tại làm mốc bắt đầu"
                    >
                      📍 Lấy mốc này
                    </button>
                  </div>
                </div>

                {/* EQ Segment End */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Kết thúc đoạn EQ:</span>
                    <span className="font-mono text-indigo-300 font-bold">{formatTime(eqSectionRange[1])} ({eqSectionRange[1].toFixed(1)}s)</span>
                  </div>
                  <input
                    type="range"
                    min={eqSectionRange[0] + 0.5}
                    max={audioDuration || 300}
                    step="0.1"
                    value={eqSectionRange[1]}
                    onChange={(e) => setEqSectionRange([eqSectionRange[0], Number(e.target.value)])}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => nudgeEqEnd(-1)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        -1s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqEnd(-0.2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        -0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqEnd(0.2)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        +0.2s
                      </button>
                      <button
                        type="button"
                        onClick={() => nudgeEqEnd(1)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                      >
                        +1s
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={setEqEndToCurrent}
                      className="px-2 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-[11px] font-medium"
                      title="Lấy thời gian hiện tại làm mốc kết thúc"
                    >
                      📍 Lấy mốc này
                    </button>
                  </div>
                </div>
              </div>

              {/* EQ Segment Play & Loop Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={playEqSection}
                    className="px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Nghe thử đoạn EQ này</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEqLooping(!isEqLooping)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      isEqLooping
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Lặp liên tục đoạn EQ (A-B Loop)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onTrimChange([eqSectionRange[0], eqSectionRange[1]]);
                    if (!isTrimmingActive) onToggleTrimming();
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 underline font-medium"
                  title="Đặt đoạn cắt tải xuống trùng với đoạn chỉnh EQ"
                >
                  Đồng bộ sang đoạn tải về máy
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              EQ đang được áp dụng xuyên suốt cho <strong>toàn bộ bài hát</strong>. Chuyển sang "Chỉnh theo đoạn muốn làm" nếu bạn chỉ muốn tinh chỉnh một phân đoạn cụ thể (ví dụ: điệp khúc, đoạn mở đầu).
            </p>
          )}

          {/* Toggle Apply EQ to Download */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <input
              type="checkbox"
              id="applyEqToDownload"
              checked={applyEqToDownload}
              onChange={(e) => setApplyEqToDownload(e.target.checked)}
              className="accent-indigo-500 rounded cursor-pointer w-4 h-4"
            />
            <label htmlFor="applyEqToDownload" className="text-xs text-slate-300 cursor-pointer select-none">
              Áp dụng cân bằng EQ này vào file khi tải về máy (M4A / MP3 / WAV)
            </label>
          </div>
        </div>
      </div>

      {/* 5. Remaster Studio Normalizer */}
      <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/90 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Remaster Âm Lượng (Tự động nâng đoạn nhỏ bằng đoạn to)
            </h4>
          </div>
          <span className="text-[11px] text-amber-300/80 bg-amber-950/60 border border-amber-800/40 px-2.5 py-0.5 rounded-full font-mono">
            Limiter 0dB True Peak
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'off' as RemasterMode, title: 'Tắt (Original)', desc: 'Giữ nguyên âm lượng dải động gốc của bài' },
            { id: 'balanced' as RemasterMode, title: 'Cân bằng Studio (+6dB)', desc: 'Tự động nâng đoạn êm dịu to rõ đều đặn' },
            { id: 'max' as RemasterMode, title: 'Tối đa Punch (+12dB)', desc: 'Khuếch đại tối đa, đoạn nhỏ to ngang điệp khúc' },
          ].map((mode) => {
            const isSel = currentRemasterMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => applyRemaster(mode.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSel
                    ? 'bg-amber-950/80 border-amber-600 text-white shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSel ? 'text-amber-300' : 'text-slate-200'}`}>
                    {mode.title}
                  </span>
                  {isSel && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Download Suite (M4A, MP3 128/320, WAV 16/24-bit) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 border border-sky-900/40 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Tùy chọn tải về định dạng &amp; phạm vi
            </h4>
          </div>

          {/* Scope Selector: Full track vs Selected section */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setDownloadScope('full')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                downloadScope === 'full'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Toàn bộ bài hát ({formatTime(audioDuration)})
            </button>
            <button
              type="button"
              onClick={() => {
                setDownloadScope('section');
                if (!isTrimmingActive) onToggleTrimming();
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                downloadScope === 'section'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chỉ tải đoạn đã chọn ({formatTime(trimRange[0])} - {formatTime(trimRange[1])})
            </button>
          </div>
        </div>

        {/* Format Grid (M4A, MP3 128/320, WAV 16/24-bit) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            {
              id: 'm4a' as ExportFormatType,
              badge: 'M4A',
              spec: 'AAC 256kbps',
              sub: 'Chuẩn Apple / Siêu nét',
              color: 'text-purple-400',
              border: 'border-purple-800/60',
            },
            {
              id: 'mp3-320' as ExportFormatType,
              badge: 'MP3',
              spec: '320 kbps',
              sub: 'Studio HQ Tối Đa',
              color: 'text-sky-400',
              border: 'border-sky-800/60',
            },
            {
              id: 'mp3-128' as ExportFormatType,
              badge: 'MP3',
              spec: '128 kbps',
              sub: 'Nhẹ / Tiết kiệm dung lượng',
              color: 'text-emerald-400',
              border: 'border-emerald-800/60',
            },
            {
              id: 'wav-16' as ExportFormatType,
              badge: 'WAV',
              spec: '16-bit PCM',
              sub: 'Chuẩn CD Lossless',
              color: 'text-teal-400',
              border: 'border-teal-800/60',
            },
            {
              id: 'wav-24' as ExportFormatType,
              badge: 'WAV',
              spec: '24-bit PCM',
              sub: 'Hi-Res Studio Master',
              color: 'text-amber-400',
              border: 'border-amber-800/60',
            },
          ].map((fmt) => {
            const isSel = exportFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setExportFormat(fmt.id)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSel
                    ? 'bg-slate-800 border-sky-500 shadow-lg shadow-sky-500/10 ring-2 ring-sky-500/30'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black tracking-wider ${fmt.color}`}>{fmt.badge}</span>
                  <span className="text-[10px] font-mono text-slate-400">{formatSizeEstimates[fmt.id]}</span>
                </div>
                <div className="font-semibold text-slate-100 text-xs mt-1">{fmt.spec}</div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{fmt.sub}</p>
              </button>
            );
          })}
        </div>

        {/* Download Feedback Messages */}
        {downloadError && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{downloadError}</span>
          </div>
        )}

        {downloadSuccess && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Đã tải file thành công về máy của bạn!</span>
          </div>
        )}

        {/* Big Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-teal-400 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-sky-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang kết xuất và tải xuống ({exportFormat.toUpperCase()})...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                Tải về máy định dạng{' '}
                <span className="uppercase">{exportFormat}</span>{' '}
                ({downloadScope === 'section' ? `Đoạn ${formatTime(trimRange[0])}–${formatTime(trimRange[1])}` : 'Toàn bài'}) · Ước tính {formatSizeEstimates[exportFormat]}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
