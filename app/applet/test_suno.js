async function test() {
  const pageUrl = "https://suno.com/song/84b496ee-3d02-4aed-a757-ec1de0c4f71e";
  const res = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const unescaped = html.split('\\/').join('/').split('\\\\').join('');
  const matches = unescaped.match(/https?:\/\/[^\s"'<>]+\.(?:mp4|m4a|mp3|wav)[^\s"'<>]*/g);
  console.log("Direct matches:", Array.from(new Set(matches || [])));
}
test();
