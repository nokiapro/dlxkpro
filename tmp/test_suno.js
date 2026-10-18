async function test() {
  const pageUrl = "https://suno.com/song/84b496ee-3d02-4aed-a757-ec1de0c4f71e";
  const res = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();
  const unescaped = html.replace(/\\\//g, "/").replace(/\\\\/g, "");
  const directUrls = [...unescaped.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|m4a|mp3|wav)[^\s"'<>]*/g)].map(m => m[0]);
  console.log("Direct audio URLs:", Array.from(new Set(directUrls)));
}
test();
