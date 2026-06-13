const Database = require('better-sqlite3');
const path = require('path');

async function testAnalyze() {
  const url = 'https://link.deezer.com/s/33xFZmasMxUFJfiQqYsDM';
  const analyzeUrl = `http://127.0.0.1:3000/api/analyze?url=${encodeURIComponent(url)}`;
  
  console.log(`Calling `/api/analyze` for: ${url}`);
  try {
    const res = await fetch(analyzeUrl);
    if (!res.ok) {
      console.error(`API failed with status: ${res.status}`);
      const text = await res.text();
      console.error(text);
      return;
    }
    
    const data = await res.json();
    console.log(`Import successful!`);
    console.log(`Playlist Title: "${data.name}"`);
    console.log(`Total tracks: ${data.trackCount}`);
    
    const tracks = data.tracks || [];
    const mapped = tracks.filter(t => t.valence !== null && t.energy !== null);
    const unmapped = tracks.filter(t => t.valence === null || t.energy === null);
    
    console.log(`Mapped tracks (with features): ${mapped.length}`);
    console.log(`Unmapped tracks (valence/energy is null): ${unmapped.length}`);
    
    if (unmapped.length > 0) {
      console.log("Sample unmapped tracks:");
      unmapped.slice(0, 5).forEach(t => {
        console.log(`  - "${t.name}" by "${t.artists}" (Spotify ID: ${t.id}, Has previewUrl: ${t.previewUrl ? 'Yes' : 'No'}, ISRC: ${t.isrc})`);
      });
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

testAnalyze();
