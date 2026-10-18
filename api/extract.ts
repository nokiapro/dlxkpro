import { extractTrackMetadata } from '../src/server/extractor.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }
    const url = body?.url;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Vui lòng cung cấp liên kết hợp lệ.' });
    }

    const track = await extractTrackMetadata(url);
    return res.status(200).json(track);
  } catch (error: any) {
    console.error('Vercel extract error:', error);
    return res.status(500).json({
      error: error?.message || 'Không thể phân tích URL này.',
    });
  }
}
