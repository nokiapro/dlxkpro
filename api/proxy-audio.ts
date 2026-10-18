import { cleanMediaUrl } from '../src/server/extractor.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = (req.query?.url as string) || '';
    const format = ((req.query?.format as string) || '').toLowerCase();
    const isWav = format === 'wav';

    // On Vercel Serverless, FFmpeg is not installed.
    // Return 501 so the browser client immediately uses its Web Audio API to synthesize Lossless PCM WAV (~35MB).
    if (isWav) {
      return res.status(501).json({
        error: 'FFMPEG_UNAVAILABLE',
        message: 'FFmpeg is not available on Vercel Serverless. Your browser will synthesize the Lossless WAV via Web Audio API.',
        requiresClientTranscode: true,
      });
    }

    const cleanUrl = cleanMediaUrl(rawUrl);
    if (!cleanUrl || !cleanUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Missing or invalid audio URL parameter' });
    }

    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'audio/*,*/*;q=0.9',
    };

    if (req.headers?.range) {
      fetchHeaders['Range'] = req.headers.range;
    }

    const audioResp = await fetch(cleanUrl, { headers: fetchHeaders });
    if (!audioResp.ok && audioResp.status !== 206) {
      return res.status(audioResp.status || 502).json({ error: 'Failed to fetch audio stream' });
    }

    res.status(audioResp.status);
    res.setHeader('Content-Type', audioResp.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    const contentLength = audioResp.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = audioResp.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (req.query?.download === '1') {
      const filename = (req.query?.filename as string) || 'audio_track.mp3';
      const cleanName = filename.replace(/[\r\n\t"]/g, '_').trim();
      res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
    }

    const buf = Buffer.from(await audioResp.arrayBuffer());
    return res.end(buf);
  } catch (error: any) {
    console.error('Vercel proxy-audio error:', error);
    return res.status(500).json({ error: error?.message || 'Error streaming audio' });
  }
}
