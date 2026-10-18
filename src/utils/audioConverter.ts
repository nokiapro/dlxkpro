import { RemasterMode } from '../types';

/**
 * Audio Conversion and WAV encoding utilities using Web Audio API
 */

export interface TrimOptions {
  startTime?: number; // in seconds
  endTime?: number;   // in seconds
  volume?: number;    // 0.0 to 2.0 (1.0 = normal)
  bitDepth?: 16 | 24;
  remasterMode?: RemasterMode;
}

/**
 * Remasters an AudioBuffer by dynamically boosting softer sections (verses, intros)
 * to match the loudest chorus sections, with musical soft-knee saturation and brickwall limiter.
 */
export function remasterAudioBuffer(
  audioBuffer: AudioBuffer,
  mode: RemasterMode = 'balanced',
  audioContext?: AudioContext
): AudioBuffer {
  if (mode === 'off') return audioBuffer;

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
  const outputBuffer = ctx.createBuffer(numChannels, length, sampleRate);

  // 1. Calculate combined RMS energy across all channels in 80ms frames with 50% overlap
  const hopSize = Math.max(32, Math.floor(sampleRate * 0.04));
  const windowSize = hopSize * 2;
  const numFrames = Math.floor(length / hopSize);
  const frameRms = new Float32Array(numFrames);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const start = f * hopSize;
    const end = Math.min(length, start + windowSize);
    const count = (end - start) * numChannels;

    for (let i = start; i < end; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = channels[ch][i];
        sum += s * s;
      }
    }
    frameRms[f] = Math.sqrt(sum / (count || 1));
  }

  // 2. Target loudness based on mode
  // 'max': Brings quiet parts almost completely up to chorus level (max boost 4.2x = ~+12.5dB)
  // 'balanced': Gentle musical leveling (max boost 2.6x = ~+8.3dB)
  const maxBoost = mode === 'max' ? 4.2 : 2.6;
  const targetRms = mode === 'max' ? 0.38 : 0.32;
  const noiseFloor = 0.012; // ignore absolute silence / background hiss

  const frameGains = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const currentR = Math.max(noiseFloor, frameRms[f]);
    if (frameRms[f] < noiseFloor * 0.6) {
      // Don't boost pure silence / noise floor
      frameGains[f] = 1.0;
    } else {
      const desiredGain = targetRms / currentR;
      frameGains[f] = Math.max(1.0, Math.min(maxBoost, desiredGain));
    }
  }

  // 3. Smooth gain envelope with smooth musical attack (20ms) and release (280ms)
  const attackCoeff = Math.exp(-1 / (sampleRate * 0.02));
  const releaseCoeff = Math.exp(-1 / (sampleRate * 0.28));
  const sampleGains = new Float32Array(length);
  let currentGain = 1.0;

  for (let i = 0; i < length; i++) {
    const fIdx = Math.min(numFrames - 1, Math.floor(i / hopSize));
    const targetG = frameGains[fIdx];
    if (targetG < currentGain) {
      currentGain = targetG + (currentGain - targetG) * attackCoeff;
    } else {
      currentGain = targetG + (currentGain - targetG) * releaseCoeff;
    }
    sampleGains[i] = currentGain;
  }

  // 4. Apply dynamic gain envelope + soft-knee peak saturation limiter
  const threshold = 0.85;
  const ceiling = 0.96; // -0.35 dB True Peak ceiling

  for (let ch = 0; ch < numChannels; ch++) {
    const inData = channels[ch];
    const outData = outputBuffer.getChannelData(ch);

    for (let i = 0; i < length; i++) {
      let s = inData[i] * sampleGains[i];

      // Soft-knee analog-style curve for smooth compression above threshold
      if (Math.abs(s) > threshold) {
        const sign = Math.sign(s);
        const excess = Math.abs(s) - threshold;
        const compressed = threshold + (ceiling - threshold) * Math.tanh(excess / (ceiling - threshold + 1e-4));
        s = sign * compressed;
      }

      // Hard clamp strictly within ceiling
      outData[i] = Math.max(-ceiling, Math.min(ceiling, s));
    }
  }

  return outputBuffer;
}

/**
 * Fetches an audio file (via local proxy if needed) and returns an ArrayBuffer
 */
export async function fetchAudioBuffer(audioUrl: string): Promise<ArrayBuffer> {
  // Use proxy to bypass CORS restrictions if external
  const isLocal = audioUrl.startsWith('/') || audioUrl.startsWith('data:');
  const targetUrl = isLocal
    ? audioUrl
    : `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`;

  const response = await fetch(targetUrl);
  if (!response.ok) {
    throw new Error(`Không thể tải luồng âm thanh (${response.status})`);
  }
  return await response.arrayBuffer();
}

/**
 * Decodes audio ArrayBuffer into an AudioBuffer using browser's AudioContext
 */
export async function decodeAudio(
  arrayBuffer: ArrayBuffer,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  // slice(0) to avoid detached buffer issues in some browsers
  const bufferCopy = arrayBuffer.slice(0);
  return await audioContext.decodeAudioData(bufferCopy);
}

/**
 * Encodes an AudioBuffer into a genuine uncompressed 16-bit or 24-bit PCM WAV Blob
 */
export function audioBufferToWav(
  audioBuffer: AudioBuffer,
  options: TrimOptions = {}
): Blob {
  const {
    startTime = 0,
    endTime = audioBuffer.duration,
    volume = 1.0,
    bitDepth = 16,
    remasterMode = 'off',
  } = options;

  const targetBuffer =
    remasterMode && remasterMode !== 'off'
      ? remasterAudioBuffer(audioBuffer, remasterMode)
      : audioBuffer;

  const sampleRate = targetBuffer.sampleRate;
  const numChannels = targetBuffer.numberOfChannels;

  // Calculate slice boundaries in samples
  const startSample = Math.max(0, Math.floor(startTime * sampleRate));
  const endSample = Math.min(
    targetBuffer.length,
    Math.floor(endTime * sampleRate)
  );
  const numSamples = Math.max(0, endSample - startSample);

  const bytesPerSample = bitDepth === 24 ? 3 : 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferLength = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk Descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  writeString(8, 'WAVE');

  // "fmt " Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // "data" Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels & write samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(targetBuffer.getChannelData(ch));
  }

  let offset = 44;
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  for (let i = startSample; i < endSample; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const rawSample = channels[ch][i] * volume;

      if (bitDepth === 16) {
        // 16-bit PCM: -32768 to 32767
        const sample16 = clamp(rawSample < 0 ? rawSample * 0x8000 : rawSample * 0x7fff, -0x8000, 0x7fff);
        view.setInt16(offset, sample16, true);
        offset += 2;
      } else {
        // 24-bit PCM: -8388608 to 8388607
        const sample24 = clamp(rawSample < 0 ? rawSample * 0x800000 : rawSample * 0x7fffff, -0x800000, 0x7fffff);
        const intSample = Math.floor(sample24);
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Verifies whether a Blob is a genuine RIFF/WAVE audio file
 * Checks the standard 12-byte header: "RIFF" .... "WAVE"
 */
export async function isWavBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 44) return false;
  try {
    const slice = blob.slice(0, 12);
    const buf = await slice.arrayBuffer();
    const view = new DataView(buf);
    // 'R' 'I' 'F' 'F' = 0x52 0x49 0x46 0x46
    const isRiff =
      view.getUint8(0) === 0x52 &&
      view.getUint8(1) === 0x49 &&
      view.getUint8(2) === 0x46 &&
      view.getUint8(3) === 0x46;
    // 'W' 'A' 'V' 'E' = 0x57 0x41 0x56 0x45
    const isWave =
      view.getUint8(8) === 0x57 &&
      view.getUint8(9) === 0x41 &&
      view.getUint8(10) === 0x56 &&
      view.getUint8(11) === 0x45;
    return isRiff && isWave;
  } catch {
    return false;
  }
}

/**
 * Triggers native browser download for a Blob
 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Generates formatted file name
 */
export function formatFileName(
  title: string,
  artist: string,
  ext: 'mp3' | 'wav',
  platformName: string = 'MusicCreator.ai',
  isRemastered: boolean = false
): string {
  const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '').trim() || 'Track';
  const cleanArtist = artist.replace(/[\\/:*?"<>|]/g, '').trim() || 'AI Artist';
  const cleanPlatform = platformName.replace(/[\\/:*?"<>|]/g, '').trim();
  const tag = isRemastered ? ' [Remastered]' : '';
  return `${cleanTitle} - ${cleanArtist}${tag} [${cleanPlatform}].${ext}`;
}

/**
 * Format duration in seconds to mm:ss
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
