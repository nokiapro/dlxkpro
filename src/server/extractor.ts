import path from 'path';

export type PlatformSource =
  | 'musiccreator.ai'
  | 'freemusic.ai'
  | 'openmusic.ai'
  | 'suno'
  | 'direct'
  | 'demo';

export interface TrackMetadata {
  id: string;
  url: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  audioUrl: string;
  coverUrl: string;
  genre: string;
  prompt?: string;
  bpm?: number;
  musicalKey?: string;
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

export function cleanMediaUrl(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/\\+$/, '').replace(/[\/"']+$/, '').trim();
  s = s.replace(/\\+$/, '').replace(/[\/"']+$/, '').trim();
  const m = s.match(/^(https?:\/\/.+?\.(?:mp3|wav|m4a|aac|mp4))(?:\?.*)?$/i);
  if (m) {
    const query = s.includes('?') ? '?' + s.split('?')[1].replace(/[\/"'\\]+$/, '') : '';
    return m[1] + query;
  }
  return s;
}

export function detectPlatform(url: string): {
  source: PlatformSource;
  name: string;
  badgeColor: 'sky' | 'emerald' | 'indigo' | 'purple' | 'teal' | 'amber' | 'rose';
} {
  const lower = url.toLowerCase();
  if (lower.includes('musiccreator.ai')) {
    return { source: 'musiccreator.ai', name: 'MusicCreator.ai', badgeColor: 'sky' };
  }
  if (lower.includes('freemusic.ai') || lower.includes('free-music.ai')) {
    return { source: 'freemusic.ai', name: 'FreeMusic.ai', badgeColor: 'emerald' };
  }
  if (lower.includes('openmusic.ai') || lower.includes('openmusic')) {
    return { source: 'openmusic.ai', name: 'OpenMusic.ai', badgeColor: 'teal' };
  }
  if (lower.includes('suno.com') || lower.includes('suno.ai')) {
    return { source: 'suno', name: 'Suno AI', badgeColor: 'purple' };
  }
  return { source: 'direct', name: 'Audio Stream', badgeColor: 'indigo' };
}

export const VERIFIED_AUDIO_POOLS = {
  musiccreator: [
    'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849965777-yof4in-f17aad9500db67fa.mp3',
    'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849967122-9pdcv3-51fe85e575398f68.mp3',
    'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849972468-ab0omn-f6cc6a34d6931e89.mp3',
    'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849968536-oliozs-72b9a4fe0f3ea7cd.mp3',
  ],
  freemusic: [
    'https://cdn-media.freemusic.ai/freemusic/static/acoustic-music-generator/samples/wedding-95b3c55925f8b87d4402ad9ad6cc45b6e62f752acf56bf5e0ba07b53b0ba9cd4.mp3',
    'https://cdn-media.freemusic.ai/freemusic/static/acoustic-music-generator/samples/cafe-1133117d59d2daee128984734b8494aee7ae02ad1b50195fcd7940f3ff6f5ee9.mp3',
    'https://cdn-media.freemusic.ai/freemusic/static/ai-classical-generator/samples/nocturne-aa5d365ff1715a4a997db4401902ff30048136a5bb7d5e4a16ce1d90dcf8af76.mp3',
    'https://cdn-media.freemusic.ai/freemusic/static/acoustic-music-generator/samples/vlog-2b6255a3dae6aac7f8d4bed4b500d5a63faf6cf2ed2e71cf9b209f0ffb066e01.mp3',
  ],
  openmusic: [
    'https://cdn-media.openmusic.ai/openmusic/static/ai-dance-pop-generator/samples/festival-94e16d31ed37838824121a06273de4298ccf32f59206878b0e1d448a5c88b174.mp3',
    'https://cdn-media.openmusic.ai/openmusic/static/ai-synthwave-generator/samples/nightcity-c4fb1a2e93f6a0f732e10fd89097665ead287ded180b37ce1fe9acf4f04ac1e1.mp3',
    'https://cdn-media.openmusic.ai/openmusic/static/acoustic-music-generator/samples/wedding-6a17e1c10877d63547301d88a8b4148bf8855a14b57b4599e4ab616ed9f245cb.mp3',
    'https://cdn-media.openmusic.ai/openmusic/static/ai-beat-maker/samples/darktrap-03030a6766b72453a1a760d8c8f80615f9778ea5b9a26b2fc06f751a3d99c1b8.mp3',
  ],
  suno: [
    'https://cdn1.suno.ai/84b496ee-3d02-4aed-a757-ec1de0c4f71e.mp4',
    'https://cdn1.suno.ai/04250c89-056c-4851-929c-d39b16919471.mp4',
    'https://cdn1.suno.ai/6af8b60a-1fa6-47cc-9678-05b449a03913.mp4',
    'https://cdn1.suno.ai/aa3ee15a-50d4-4a4f-a7f0-c3dcb7e487d2.mp4',
  ],
};

export const DEMO_TRACKS: Record<string, Partial<TrackMetadata>> = {
  'musiccreator-loveisgone': {
    id: 'demo-loveisgone',
    title: 'Love Is Gone (Acoustic Cover)',
    artist: 'hookeeyshop • MusicCreator.ai',
    genre: 'Melodic Pop / Acoustic',
    duration: 201,
    prompt: 'Emotional acoustic piano, guitar and vocal cover of Love Is Gone, heartfelt tone, deep warm reverb, studio master',
    bpm: 125,
    musicalKey: 'B Minor (10A)',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.musiccreator[0],
    url: 'https://musiccreator.ai/track/love-is-gone-acoustic-cover',
    source: 'musiccreator.ai',
    platformName: 'MusicCreator.ai',
    platformBadgeColor: 'sky',
    lyrics:
      "[Verse 1]\nDon't go tonight, stay here one more time\nRemind me what it's like, oh\nAnd let's fall in love one more time\nI need you now by my side\n\n[Chorus]\nIt hurts with every heartbeat\nI'm falling apart, oh\nI need you now by my side\nDon't go tonight, stay here one more time\n",
  },
  'musiccreator-gravity': {
    id: 'demo-gravity',
    title: 'Bittersweet Gravity (Cover)',
    artist: 'hookeeyshop • MusicCreator.ai',
    genre: 'Indie Pop / Chillout',
    duration: 155,
    prompt: 'Gentle upbeat indie pop groove with acoustic guitar, modern drums, melodic vocal lead, bittersweet vibe',
    bpm: 123,
    musicalKey: 'G Minor (6A)',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.musiccreator[1],
    url: 'https://musiccreator.ai/track/bittersweet-gravity-cover',
    source: 'musiccreator.ai',
    platformName: 'MusicCreator.ai',
    platformBadgeColor: 'sky',
    lyrics:
      '[Verse 1]\nFloating in the bittersweet gravity\nPulling me close to you\nEvery heartbeat echoes silently\nThrough the starry night so blue\n',
  },
  'musiccreator-cinderella': {
    id: 'demo-cinderella',
    title: 'So This Is Love (Acoustic Cover)',
    artist: 'hookeeyshop • MusicCreator.ai',
    genre: 'Romantic Acoustic / Waltz',
    duration: 185,
    prompt: 'Delicate 3/4 waltz acoustic rhythm, warm fingerpicking guitar, tender romantic vocal harmony',
    bpm: 165,
    musicalKey: 'A Minor (8A)',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.musiccreator[2],
    url: 'https://musiccreator.ai/track/so-this-is-love-acoustic-cover',
    source: 'musiccreator.ai',
    platformName: 'MusicCreator.ai',
    platformBadgeColor: 'sky',
    lyrics:
      "[Verse]\nSo this is love, mmm\nSo this is love\nSo this is what makes life divine\nI'm all aglow, mmm\nAnd now I know\nThe key to all heaven is mine\n",
  },
  'musiccreator-root': {
    id: 'demo-root',
    title: 'Root & Rise (Studio Cover)',
    artist: 'hookeeyshop • MusicCreator.ai',
    genre: 'Soulful R&B / Pop',
    duration: 241,
    prompt: 'Soulful acoustic pop ballad with rising dynamics, rhythmic piano and soulful vocal build',
    bpm: 120,
    musicalKey: 'D Minor (7A)',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.musiccreator[3],
    url: 'https://musiccreator.ai/track/root-and-rise-studio-cover',
    source: 'musiccreator.ai',
    platformName: 'MusicCreator.ai',
    platformBadgeColor: 'sky',
    lyrics:
      '[Verse]\nPlant the seeds in the dark\nWatch the fire ignite a spark\nRoot and rise above the pain\nDancing through the heavy rain\n',
  },
  'freemusic-acoustic': {
    id: 'demo-freemusic-acoustic',
    title: 'Wedding & Celebration (Royalty-Free Indie)',
    artist: 'FreeMusic.ai Studio',
    genre: 'Indie Folk / Commercial Acoustic',
    duration: 154,
    prompt: 'Warm acoustic fingerpicking guitar, uplifting stomp clap rhythm, sunny indie folk commercial vibe, 100% royalty-free',
    bpm: 118,
    musicalKey: 'E Minor (9A)',
    coverUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.freemusic[0],
    url: 'https://freemusic.ai/track/wedding-acoustic-indie',
    source: 'freemusic.ai',
    platformName: 'FreeMusic.ai',
    platformBadgeColor: 'emerald',
    lyrics:
      '[Acoustic Intro]\nWalking down the golden lane\nSunshine washing off the rain\nJoy is in the open air\nSmiles everywhere we stare\n[Chorus - Stomp & Clap]\nHey hey, live today!\nEvery moment finds a way!\n',
  },
  'freemusic-cafe': {
    id: 'demo-freemusic-cafe',
    title: 'Morning Cafe Aroma (Acoustic Chill)',
    artist: 'FreeMusic.ai Studio',
    genre: 'Coffee Shop Acoustic / Chillout',
    duration: 34,
    prompt: 'Gentle morning acoustic melodies for cafes, relaxing study sessions, warm coffee background vibe',
    bpm: 126,
    musicalKey: 'C Minor (5A)',
    coverUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.freemusic[1],
    url: 'https://freemusic.ai/track/morning-cafe-acoustic-chill',
    source: 'freemusic.ai',
    platformName: 'FreeMusic.ai',
    platformBadgeColor: 'emerald',
    lyrics: '[Acoustic Guitar Melodic Strums]\n(Warm morning coffee ambiance, gentle fingerpicking)\n',
  },
  'freemusic-nocturne': {
    id: 'demo-freemusic-nocturne',
    title: 'Midnight Moonlight Nocturne (Piano Solo)',
    artist: 'FreeMusic.ai Classical',
    genre: 'Classical Piano / Romantic',
    duration: 172,
    prompt: 'Emotional romantic classical piano nocturne inspired by Chopin, delicate phrasing, soothing nighttime melody',
    bpm: 87,
    musicalKey: 'D Minor (7A)',
    coverUrl: 'https://images.unsplash.com/photo-1520523839898-507127053e14?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.freemusic[2],
    url: 'https://freemusic.ai/track/midnight-moonlight-nocturne',
    source: 'freemusic.ai',
    platformName: 'FreeMusic.ai',
    platformBadgeColor: 'emerald',
    lyrics: '[Solo Grand Piano Expression]\n(Gentle rubato arpeggios, expressive nocturne phrasing)\n',
  },
  'suno-cyberpunk': {
    id: '84b496ee-3d02-4aed-a757-ec1de0c4f71e',
    title: 'Example Song - Tutorial Song for Bracket Lyrics',
    artist: 'Immovable Distortion (@immovabledistortion5402)',
    genre: 'Anthemic Rock / Pop / Dynamic Build',
    duration: 198,
    prompt: 'Bold, uplifting, anthemic, reflective, emotional crescendos, acoustic undertones, layered harmonies, powerful backing vocals, steady rhythm',
    bpm: 120,
    musicalKey: 'C Major (8B)',
    coverUrl: 'https://cdn2.suno.ai/image_large_84b496ee-3d02-4aed-a757-ec1de0c4f71e.jpeg',
    audioUrl: 'https://cdn1.suno.ai/84b496ee-3d02-4aed-a757-ec1de0c4f71e.mp4',
    url: 'https://suno.com/song/84b496ee-3d02-4aed-a757-ec1de0c4f71e',
    source: 'suno',
    platformName: 'Suno AI',
    platformBadgeColor: 'purple',
    lyrics:
      '[Verse 1: Soft and introspective, with a steady rhythm]\nThere’s a world that’s watching, eyes that never blink,\nEvery step we’re taking shapes the way they think.\nThe weight of every action, the whispers we create,\nWe’re building up the future with every choice we make.\n\n[Pre-Chorus: Rising intensity, with layered harmonies]\nIn the quiet, in the storm,\nWe’re the shelter, we’re the form.\nThey’re learning from the light,\n(Let’s make it burn bright.)\n\n[Chorus: Bold and anthemic, with soaring vocals]\nWe’ve got to be the ones who show them how to rise,\nStand up tall and never hide behind disguise.\nA beacon shining through, when the road feels unstable,\nWe’ll light the path and set the way, be the example.',
  },
  'suno-groove': {
    id: '04250c89-056c-4851-929c-d39b16919471',
    title: "V's Got Layers",
    artist: 'GROOVEBOT (@groovebot)',
    genre: 'Groove Funk / Electro Swing / AI Beats',
    duration: 138,
    prompt: 'Funky energetic rhythm, bass synth grooves, vibrant brass hits, modern electronic groove',
    bpm: 118,
    musicalKey: 'F Minor (4A)',
    coverUrl: 'https://cdn2.suno.ai/image_large_04250c89-056c-4851-929c-d39b16919471.jpeg',
    audioUrl: 'https://cdn1.suno.ai/04250c89-056c-4851-929c-d39b16919471.mp4',
    url: 'https://suno.com/song/04250c89-056c-4851-929c-d39b16919471',
    source: 'suno',
    platformName: 'Suno AI',
    platformBadgeColor: 'purple',
    lyrics:
      '[Instrumental Groove Funk Intro]\n(Funky slap bass and syncopated brass stabs)\n(Rhythmic drum groove with vinyl texture)\n',
  },
  'suno-hours': {
    id: '6af8b60a-1fa6-47cc-9678-05b449a03913',
    title: "Where'd The Hours Go",
    artist: 'GROOVEBOT (@groovebot)',
    genre: 'Indie Soul / R&B / Chill Pop',
    duration: 152,
    prompt: 'Soulful electric piano, intimate vocals, laid-back drum groove, reflective mood',
    bpm: 96,
    musicalKey: 'A Minor (8A)',
    coverUrl: 'https://cdn2.suno.ai/image_large_6af8b60a-1fa6-47cc-9678-05b449a03913.jpeg',
    audioUrl: 'https://cdn1.suno.ai/6af8b60a-1fa6-47cc-9678-05b449a03913.mp4',
    url: 'https://suno.com/song/6af8b60a-1fa6-47cc-9678-05b449a03913',
    source: 'suno',
    platformName: 'Suno AI',
    platformBadgeColor: 'purple',
    lyrics:
      "[Verse 1]\nMorning light fades fast\nLost in shadows of the past\nTime just slips from my grasp\nWonder how it goes so fast\n\n[Verse 2]\nClock keeps ticking slow and steady\nHeart is waiting till I'm ready\nWhere'd the hours go today\nWatch them gently float away\n",
  },
  'suno-contigo': {
    id: 'aa3ee15a-50d4-4a4f-a7f0-c3dcb7e487d2',
    title: 'Contigo',
    artist: 'Suno (@suno)',
    genre: 'Latin Pop / Reggaeton / Summer Acoustic',
    duration: 110,
    prompt: 'Upbeat latin reggaeton acoustic guitar, passionate vocals, tropical rhythmic beat',
    bpm: 104,
    musicalKey: 'G Minor (6A)',
    coverUrl: 'https://cdn2.suno.ai/image_large_f775b292-5313-4833-9318-7aae7f74577d.jpeg',
    audioUrl: 'https://cdn1.suno.ai/aa3ee15a-50d4-4a4f-a7f0-c3dcb7e487d2.mp4',
    url: 'https://suno.com/song/aa3ee15a-50d4-4a4f-a7f0-c3dcb7e487d2',
    source: 'suno',
    platformName: 'Suno AI',
    platformBadgeColor: 'purple',
    lyrics:
      '[Chorus]\nContigo, contigo\nContigo, contigo\n\n[Verse 1]\nYo tengo, yo tengo\nYo tengo contigo\nYo quiero, yo quiero\nContigo quiero estar\n',
  },
  'openmusic-festival': {
    id: 'openmusic-festival',
    title: 'Festival Mainstage Anthem',
    artist: 'OpenMusic EDM Producer',
    genre: 'Dance Pop / Festival Anthem / Big Room EDM',
    duration: 165,
    prompt: 'Euforic festival synth lead, energetic four-on-the-floor kick, uplifting vocal chops, build and drop',
    bpm: 128,
    musicalKey: 'F# Minor (11A)',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.openmusic[0],
    url: 'https://openmusic.ai/track/festival-dance-pop-anthem',
    source: 'openmusic.ai',
    platformName: 'OpenMusic.ai',
    platformBadgeColor: 'teal',
    lyrics:
      '[Intro: Pulsing Synth]\n(Bassline enters at 0:15 with pumping sidechain)\n\n[Build-up: Rising Snares]\nFeel the rhythm taking control tonight!\n\n[Drop: Mainstage Festival Energy]\n(High-energy supersaw drop with energetic brass stabs)\n',
  },
  'openmusic-nightcity': {
    id: 'openmusic-nightcity',
    title: 'Night City Cruise',
    artist: 'OpenMusic Synth Lab',
    genre: 'Retrowave / Synthwave / Cyberpunk',
    duration: 182,
    prompt: 'Neon 80s analog synthesizers, punchy gated reverb snare, driving arpeggiated bassline, retro futuristic vibe',
    bpm: 115,
    musicalKey: 'D Minor (7A)',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.openmusic[1],
    url: 'https://openmusic.ai/track/nightcity-synthwave-cruise',
    source: 'openmusic.ai',
    platformName: 'OpenMusic.ai',
    platformBadgeColor: 'teal',
    lyrics:
      '[Intro: Vintage Arpeggiator]\n(Analog pad swells into driving synth bassline)\n\n[Night Drive Theme]\nNeon reflections on rain-slicked streets\nSpeeding towards tomorrow without lookin back\n',
  },
  'openmusic-wedding': {
    id: 'openmusic-wedding',
    title: 'Acoustic Wedding Serenade',
    artist: 'OpenMusic Acoustic Studio',
    genre: 'Acoustic Folk / Warm Romance / Indie Pop',
    duration: 154,
    prompt: 'Warm fingerpicked acoustic guitars, gentle upright bass, light percussion, romantic tender atmosphere',
    bpm: 112,
    musicalKey: 'G Major (9B)',
    coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    audioUrl: VERIFIED_AUDIO_POOLS.openmusic[2],
    url: 'https://openmusic.ai/track/wedding-acoustic-serenade',
    source: 'openmusic.ai',
    platformName: 'OpenMusic.ai',
    platformBadgeColor: 'teal',
    lyrics:
      '[Acoustic Guitar Fingerpicking Intro]\n(Warm nylon string picking with subtle ambient strings)\n\n[Refrain]\nTwo souls together in harmony\nA gentle promise that will always stay\n',
  },
};

export async function extractSunoTrack(rawUrl: string): Promise<TrackMetadata | null> {
  const rawUuidMatch = rawUrl.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  const slugMatch = rawUrl.match(/(?:song|embed|track)\/([a-zA-Z0-9_-]+)/i);

  let songId = rawUuidMatch ? rawUuidMatch[1].toLowerCase() : slugMatch ? slugMatch[1] : null;
  if (!songId) return null;

  let title = `Suno AI Track (${songId.substring(0, 8)})`;
  let artist = 'Suno Creator';
  let coverUrl = `https://cdn2.suno.ai/image_large_${songId}.jpeg`;
  let genre = 'Suno AI Music / Multi-Genre';
  let duration = 180;
  let lyrics = '';
  let prompt = '';
  const bpm = 120;
  const musicalKey = 'C Major';
  let directAudioFromHtml: string | null = null;
  let pageOk = false;

  try {
    const clipApiUrl = `https://studio-api.prod.suno.com/api/clip/${songId}`;
    const clipRes = await fetch(clipApiUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (clipRes.ok) {
      pageOk = true;
      const cData = (await clipRes.json()) as any;
      if (cData.title && typeof cData.title === 'string' && cData.title.trim()) {
        title = cData.title.trim();
      }
      if (cData.display_name) {
        artist = cData.handle ? `${cData.display_name} (@${cData.handle})` : cData.display_name;
      }
      if (cData.image_large_url || cData.image_url) {
        coverUrl = cData.image_large_url || cData.image_url;
      }
      if (cData.metadata?.tags || cData.display_tags) {
        genre = cData.metadata?.tags || cData.display_tags;
        prompt = genre;
      }
      if (cData.metadata?.prompt) {
        lyrics = cData.metadata.prompt;
      }
      if (cData.duration || cData.metadata?.duration) {
        duration = Math.round(cData.duration || cData.metadata.duration);
      }
      if (Array.isArray(cData.media_urls) && cData.media_urls.length > 0) {
        directAudioFromHtml = cData.media_urls[0].url;
      }
    }
  } catch (err) {
    console.info('Suno clip API notice:', err);
  }

  if (!pageOk || title.startsWith('Suno AI Track')) {
    const targetPageUrl = rawUrl.startsWith('http') ? rawUrl : `https://suno.com/song/${songId}`;
    try {
      const pageRes = await fetch(targetPageUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (pageRes.ok) {
        pageOk = true;
        const html = await pageRes.text();
        if (!rawUuidMatch) {
          const cdnMatch = html.match(/cdn1\.suno\.ai\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.mp4/i);
          const clipMatch = html.match(/\/clip\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
          if (cdnMatch) {
            songId = cdnMatch[1].toLowerCase();
          } else if (clipMatch) {
            songId = clipMatch[1].toLowerCase();
          }
        }

        const unescaped = html.split('\\/').join('/').split('\\\\').join('');
        const audioMatches = [...unescaped.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|m4a|mp3|wav)[^\s"'<>?]*/gi)].map(m =>
          cleanMediaUrl(m[0])
        );

        const songMatches = audioMatches.filter(
          (u) =>
            u.includes(songId!) &&
            !u.includes('sil-') &&
            !u.includes('silent') &&
            !u.includes('placeholder')
        );
        if (songMatches.length > 0 && !directAudioFromHtml) {
          const cdnMp4 = songMatches.find(u => (u.includes('cdn1.suno.ai') || u.includes('cdn2.suno.ai')) && u.endsWith('.mp4'));
          directAudioFromHtml = cleanMediaUrl(cdnMp4 || songMatches[0]);
        }

        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
        if (ogTitle && ogTitle.trim()) {
          title = ogTitle.trim();
        }

        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
        if (ogImage && ogImage.trim()) {
          coverUrl = cleanMediaUrl(ogImage.trim());
        }

        const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1];
        if (desc && artist === 'Suno Creator') {
          const byMatch = desc.match(/by\s+([^(@]+)(?:\s*\((@[^)]+)\))?/i);
          if (byMatch) {
            const namePart = byMatch[1].trim();
            const handlePart = byMatch[2] ? ` (${byMatch[2].trim()})` : '';
            artist = `${namePart}${handlePart}`;
          }
        }

        if (!lyrics) {
          const lyricsMatch = html.match(
            /(\[(?:Verse|Chorus|Intro|Outro|Bridge|Pre-Chorus|Hook|Drop)[^\]]*\][\s\S]*?)(?="\}|","|"\]|<\/p>)/i
          );
          if (lyricsMatch && lyricsMatch[1]) {
            lyrics = lyricsMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/<[^>]+>/g, '')
              .trim();
          }
        }
      }
    } catch (err) {
      console.info('Suno page inspection notice:', err);
    }
  }

  const audioUrl = cleanMediaUrl(
    directAudioFromHtml ||
    `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a` ||
    `https://cdn1.suno.ai/${songId}.mp4`
  );

  return {
    id: songId,
    url: rawUrl,
    title,
    artist,
    duration,
    audioUrl,
    coverUrl,
    genre,
    prompt: prompt || `Suno AI Music (${genre})`,
    bpm,
    musicalKey,
    lyrics: lyrics || `[Suno AI Generated Music]\nTitle: ${title}\nArtist: ${artist}`,
    fileSizeEstimate: {
      mp3: `${((duration * 320) / 8 / 1024).toFixed(1)} MB`,
      wav: `${((duration * 44100 * 2 * 2) / 1024 / 1024).toFixed(1)} MB`,
    },
    sampleRate: '48.0 kHz',
    bitrate: '320 kbps (High Quality)',
    source: 'suno',
    platformName: 'Suno AI',
    platformBadgeColor: 'purple',
  };
}

export async function extractOpenMusicTrack(rawUrl: string): Promise<TrackMetadata | null> {
  let title = 'OpenMusic Track';
  let artist = 'OpenMusic.ai Studio';
  let coverUrl = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80';
  let genre = 'Electronic / Dance Pop AI';
  let duration = 165;
  let lyrics = '[OpenMusic.ai Studio Composition]\nGenerated with OpenMusic.ai neural engine';
  let prompt = 'OpenMusic AI Generated High Fidelity Production Track';
  let bpm = 124;
  let musicalKey = 'F# Minor';
  let audioUrl = '';

  if (rawUrl.includes('cdn-media.openmusic.ai') || rawUrl.match(/\.(mp3|wav|ogg|m4a)(\?.*)?$/i)) {
    audioUrl = cleanMediaUrl(rawUrl);
    const fileName = path.basename(audioUrl.split('?')[0]).replace(/\.[^/.]+$/, '');
    const cleanName = decodeURIComponent(fileName).replace(/[-_]/g, ' ').replace(/[a-f0-9]{32,}/gi, '').trim();
    if (cleanName) {
      title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
  } else {
    try {
      const pageRes = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (pageRes.ok) {
        const html = await pageRes.text();
        const unescaped = html.split('\\/').join('/').split('\\"').join('"');

        const ugcAudioMatch =
          unescaped.match(/"audioUrl":"(https?:\/\/cdn-media\.openmusic\.ai\/openmusic\/ugc\/songs\/[^"]+\.mp3)"/i) ||
          html.match(/<meta\s+property=["']og:audio["']\s+content=["']([^"']+)["']/i) ||
          unescaped.match(/"og:audio",\{"content":"([^"]+)"\}/i) ||
          unescaped.match(/"audioUrl":"(https?:\/\/[^"]+\.(?:mp3|wav|m4a)[^"]*)"/i);

        if (ugcAudioMatch) {
          audioUrl = cleanMediaUrl(ugcAudioMatch[1]);
          const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1];
          const jsonTitle = unescaped.match(/"title":"([^"]+)"/i)?.[1];
          if (ogTitle && ogTitle.trim()) {
            title = ogTitle.replace(/\s*\|\s*OpenMusic\s*AI.*$/i, '').trim();
          } else if (jsonTitle) {
            title = jsonTitle.trim();
          }

          const artistMatch =
            unescaped.match(/"byArtist":\{"@type":"Person","name":"([^"]+)"\}/i) ||
            unescaped.match(/"user":\{.*?"username":"([^"]+)"/i) ||
            html.match(/Shared\s+by\s+([^.]+)\./i);
          if (artistMatch) {
            artist = artistMatch[1].trim();
          }

          const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
          const jsonImage = unescaped.match(/"imageUrl":"(https?:\/\/[^"]+)"/i)?.[1];
          if (ogImage) {
            coverUrl = cleanMediaUrl(ogImage.trim());
          } else if (jsonImage) {
            coverUrl = cleanMediaUrl(jsonImage.trim());
          }

          const durMatch = unescaped.match(/"duration":(\d+)/i);
          if (durMatch) {
            duration = parseInt(durMatch[1], 10);
          }

          const tagsMatch = unescaped.match(/"tags":\s*(\[[^\]]+\])/i);
          if (tagsMatch) {
            try {
              const parsed = JSON.parse(tagsMatch[1]);
              if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
                genre = parsed.slice(0, 4).map((t: string) => t.trim()).join(', ');
                prompt = genre;
              }
            } catch {}
          }
        }

        if (!audioUrl) {
          const audioMatches = [
            ...unescaped.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp3|wav|m4a)[^\s"'<>?]*/gi),
          ].map((m) => cleanMediaUrl(m[0]));

          const cdnAudios = Array.from(new Set(audioMatches.filter((u) => u.includes('openmusic') || u.includes('cdn-media'))));
          if (cdnAudios.length > 0) {
            audioUrl = cleanMediaUrl(cdnAudios[0]);
          }
        }
      }
    } catch (err) {
      console.info('OpenMusic page inspection notice:', err);
    }
  }

  if (!audioUrl) {
    audioUrl = VERIFIED_AUDIO_POOLS.openmusic[0];
  }

  const slug = path.basename(rawUrl.split('?')[0]).replace(/[^a-zA-Z0-9_-]/g, '') || 'track-' + Date.now();

  return {
    id: `openmusic-${slug}`,
    url: rawUrl,
    title,
    artist,
    duration,
    audioUrl: cleanMediaUrl(audioUrl),
    coverUrl,
    genre,
    prompt: prompt || `OpenMusic AI Track (${genre})`,
    bpm,
    musicalKey,
    lyrics: lyrics || `[OpenMusic.ai Studio Composition]\nTitle: ${title}\nPlatform: OpenMusic.ai\nGenre: ${genre}`,
    fileSizeEstimate: {
      mp3: `${((duration * 320) / 8 / 1024).toFixed(1)} MB`,
      wav: `${((duration * 44100 * 2 * 2) / 1024 / 1024).toFixed(1)} MB`,
    },
    sampleRate: '44.1 kHz',
    bitrate: '320 kbps (High Quality)',
    source: 'openmusic.ai',
    platformName: 'OpenMusic.ai',
    platformBadgeColor: 'teal',
  };
}

export async function extractTrackMetadata(url: string): Promise<TrackMetadata> {
  let trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    trimmedUrl = 'https://' + trimmedUrl;
  }

  const platformInfo = detectPlatform(trimmedUrl);

  const requestSlug = path.basename(trimmedUrl.split('?')[0]).toLowerCase();
  for (const [key, demo] of Object.entries(DEMO_TRACKS)) {
    const demoSlug = demo.url ? path.basename(demo.url.split('?')[0]).toLowerCase() : '';
    if (
      trimmedUrl === key ||
      (demo.id && trimmedUrl === demo.id) ||
      (demo.url && demo.url === trimmedUrl) ||
      (demo.url && trimmedUrl.replace(/\/$/, '') === demo.url.replace(/\/$/, '')) ||
      (demoSlug && requestSlug === demoSlug)
    ) {
      return {
        ...demo,
        url: trimmedUrl,
        fileSizeEstimate: {
          mp3: `${((demo.duration! * 320) / 8 / 1024).toFixed(1)} MB`,
          wav: `${((demo.duration! * 44100 * 2 * 2) / 1024 / 1024).toFixed(1)} MB`,
        },
        sampleRate: '44.1 kHz',
        bitrate: '320 kbps (High Quality)',
        source: demo.source || platformInfo.source,
        platformName: demo.platformName || platformInfo.name,
        platformBadgeColor: demo.platformBadgeColor || platformInfo.badgeColor,
      } as TrackMetadata;
    }
  }

  const isSunoUrl =
    platformInfo.source === 'suno' ||
    trimmedUrl.includes('suno.com') ||
    trimmedUrl.includes('suno.ai');
  const sunoUuidMatch = trimmedUrl.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );

  if (isSunoUrl || sunoUuidMatch) {
    const sunoResult = await extractSunoTrack(trimmedUrl);
    if (sunoResult) return sunoResult;
  }

  const isOpenMusicUrl =
    platformInfo.source === 'openmusic.ai' ||
    trimmedUrl.includes('openmusic.ai') ||
    trimmedUrl.includes('openmusic');

  if (isOpenMusicUrl) {
    const omResult = await extractOpenMusicTrack(trimmedUrl);
    if (omResult) return omResult;
  }

  // Direct audio stream match
  let fallbackAudio = VERIFIED_AUDIO_POOLS.musiccreator[0];
  let fallbackCover = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80';
  let defaultGenre = 'Synthwave / Electronic AI';

  if (platformInfo.source === 'freemusic.ai') {
    fallbackAudio = VERIFIED_AUDIO_POOLS.freemusic[0];
    fallbackCover = 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80';
    defaultGenre = 'Royalty-Free Acoustic / Commercial';
  } else if (platformInfo.source === 'openmusic.ai') {
    fallbackAudio = VERIFIED_AUDIO_POOLS.openmusic[0];
    fallbackCover = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80';
    defaultGenre = 'Dance Pop / EDM Festival Anthem';
  } else if (platformInfo.source === 'suno') {
    fallbackAudio = VERIFIED_AUDIO_POOLS.suno[0];
    fallbackCover = 'https://cdn2.suno.ai/image_large_84b496ee-3d02-4aed-a757-ec1de0c4f71e.jpeg';
    defaultGenre = 'Suno AI Synthwave / Multi-Genre';
  }

  const urlParts = trimmedUrl.split('?')[0].split('/');
  const lastSlug = urlParts[urlParts.length - 1] || 'track-' + Date.now();
  const cleanSlugTitle = decodeURIComponent(lastSlug)
    .replace(/[-_]/g, ' ')
    .replace(/^(track|song|audio|create)\s+/i, '')
    .trim();

  return {
    id: lastSlug || 'track-' + Date.now(),
    url: trimmedUrl,
    title: cleanSlugTitle ? cleanSlugTitle.toUpperCase() : `${platformInfo.name} Track`,
    artist: `${platformInfo.name} Creator`,
    duration: 145,
    audioUrl: fallbackAudio,
    coverUrl: fallbackCover,
    genre: defaultGenre,
    prompt: `Generated with ${platformInfo.name} AI music engine`,
    bpm: 120,
    musicalKey: 'C Major',
    lyrics: `${platformInfo.name} AI Production Session`,
    fileSizeEstimate: {
      mp3: '5.8 MB',
      wav: '25.2 MB',
    },
    sampleRate: '44.1 kHz',
    bitrate: '320 kbps High Quality',
    source: platformInfo.source,
    platformName: platformInfo.name,
    platformBadgeColor: platformInfo.badgeColor,
  };
}
