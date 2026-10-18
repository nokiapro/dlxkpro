import fs from 'fs';

const html = fs.readFileSync('/tmp/mc_page.html', 'utf8');

// Unescape everything: slashes, unicode, AND backslash-escaped quotes!
let cleanText = html.replace(/\\\//g, '/').replace(/\\u002F/g, '/');
// Also create a fully normalized version where \" is turned into "
const fullyUnquoted = cleanText.replace(/\\"/g, '"');

const pairRegex = /"imageUrl":"([^"]+)","audioUrl":"([^"]+)"/g;
let m;
const pairs = [];
while ((m = pairRegex.exec(fullyUnquoted)) !== null) {
  pairs.push({ image: m[1], audio: m[2] });
}

console.log('Pairs found after unescaping \\":', pairs.length);
if (pairs.length > 0) {
  console.log('Sample pair:', pairs[0]);
}

// Now let us match title too!
const songRegex = /"id":"([^"]+)","title":"([^"]+)".*?"imageUrl":"([^"]+)","audioUrl":"([^"]+)"/g;
let sm;
const songs = [];
while ((sm = songRegex.exec(fullyUnquoted)) !== null && songs.length < 5) {
  songs.push({ id: sm[1], title: sm[2], image: sm[3], audio: sm[4] });
}
console.log('Songs found with title and audio:', songs.length);
console.log('Sample song:', songs.slice(0, 3));
