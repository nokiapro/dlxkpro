import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('https://openmusic.ai', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    console.log('Title:', titleMatch ? titleMatch[1] : 'none');
    const audioMatches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp3|wav|m4a|mp4)[^\s"'<>]*/g)].map(m => m[0]);
    console.log('Audios:', audioMatches.slice(0, 10));
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      console.log('Found NEXT_DATA, length:', nextDataMatch[1].length);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

check();
