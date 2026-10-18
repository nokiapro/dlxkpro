export type PlatformSource =
  | 'musiccreator.ai'
  | 'freemusic.ai'
  | 'openmusic.ai'
  | 'suno'
  | 'direct'
  | 'demo';

export interface TrackData {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  genre: string;
  prompt?: string;
  bpm?: number;
  musicalKey?: string;
  camelotKey?: string;
  relativeKey?: string;
  lyrics?: string;
  fileSizeEstimate: {
    mp3: string;
    wav: string;
  };
  sampleRate: string;
  bitrate: string;
  source: PlatformSource;
  platformName: string;
  platformBadgeColor: 'sky' | 'emerald' | 'indigo' | 'purple' | 'teal' | 'amber' | 'rose';
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  format: 'mp3' | 'wav';
  size: string;
  timestamp: number;
  audioUrl: string;
  platformName?: string;
  source?: PlatformSource;
}

export type AudioFxPreset = 'flat' | 'bass-boost' | 'lofi' | 'vocal';

export type RemasterMode = 'off' | 'balanced' | 'max';
