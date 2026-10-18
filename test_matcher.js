import fs from 'fs';

const html = fs.readFileSync('/tmp/mc_page.html', 'utf8');
const cleanText = html.replace(/\\\//g, '/').replace(/\\u002F/g, '/').replace(/\\"/g, '"');

// Extract all (image, audio) pairs with title
const pairRegex = /(?:\{"id":"([^"]+)",)?"title":"([^"]+)"[^}]*?"imageUrl":"([^"]+)","audioUrl":"([^"]+)"/g;
let m;
const tracks = [];
while ((m = pairRegex.exec(cleanText)) !== null) {
  tracks.push({
    id: m[1] || '',
    title: m[2],
    image: m[3],
    audio: m[4],
  });
}

console.log('Total structured tracks:', tracks.length);

// Test matching by image hash
const testImage = 'https://cdn-images.musiccreator.ai/musiccreator/showcases/1765849966585-yqiabg-23bcf99a7214bca8.jpeg';
const matchedByImage = tracks.find(t => t.image.includes('1765849966585') || testImage.includes(t.image));
console.log('Matched by image:', matchedByImage?.title);
console.log('Audio for that image:', matchedByImage?.audio);

// Test matching by title keyword
const testTitle = 'Progressive House Anthem';
const matchedByTitle = tracks.find(t => t.title.toLowerCase().includes(testTitle.toLowerCase()));
console.log('Matched by title:', matchedByTitle?.title);
console.log('Audio for that title:', matchedByTitle?.audio);
