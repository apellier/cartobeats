const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../dev.db'));

async function testReconstruct() {
  // Find a track from the playlist that has valence = null (unmapped)
  const track = db.prepare("SELECT * FROM Track WHERE genres IS NOT NULL AND valence IS NULL LIMIT 1").get();
  
  if (!track) {
    console.log("No unmapped tracks found with genres in DB.");
    // Try to find any track with valence = null
    const anyTrack = db.prepare("SELECT * FROM Track WHERE valence IS NULL LIMIT 1").get();
    if (!anyTrack) {
      console.log("No unmapped tracks at all in DB.");
      db.close();
      return;
    }
    runReconstructFor(anyTrack);
  } else {
    runReconstructFor(track);
  }
}

async function runReconstructFor(track) {
  console.log(`Testing reconstruction for: "${track.name}" by "${track.artists}" (ID: ${track.id})`);
  
  let previewUrl = track.previewUrl;
  
  if (!previewUrl) {
    console.log("Track has no previewUrl. Fetching preview directly from Deezer...");
    try {
      if (track.isrc) {
        console.log(`Trying ISRC: ${track.isrc}`);
        const isrcRes = await fetch(`https://api.deezer.com/track/isrc:${track.isrc}`);
        if (isrcRes.ok) {
          const isrcData = await isrcRes.json();
          if (isrcData.preview && !isrcData.error) {
            previewUrl = isrcData.preview;
          }
        }
      }
      
      if (!previewUrl) {
        console.log(`ISRC fallback. Searching text: "${track.artists} - ${track.name}"`);
        const query = `${track.artists} - ${track.name}`;
        const searchRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.data && searchData.data.length > 0) {
            previewUrl = searchData.data[0].preview;
          }
        }
      }
      
      console.log(`Resolved preview URL: ${previewUrl}`);
    } catch (err) {
      console.error("Failed to fetch preview from Deezer:", err.message);
    }
  } else {
    console.log(`Track already has previewUrl: ${previewUrl}`);
  }
  
  if (!previewUrl) {
    console.log("Could not find any preview URL. Aborting.");
    db.close();
    return;
  }
  
  try {
    console.log("Downloading preview...");
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to download audio: ${audioRes.status}`);
    }
    const audioBuffer = await audioRes.arrayBuffer();
    console.log(`Audio downloaded. Size: ${audioBuffer.byteLength} bytes.`);
    
    console.log("Uploading to ReccoBeats for analysis...");
    const formData = new FormData();
    // FormData requires a Blob or File in newer Node.js, or we can use a Blob
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append("audioFile", audioBlob, "preview.mp3");
    
    const analysisRes = await fetch("https://api.reccobeats.com/v1/analysis/audio-features", {
      method: "POST",
      body: formData
    });
    
    console.log(`Analysis Status: ${analysisRes.status}`);
    if (analysisRes.ok) {
      const data = await analysisRes.json();
      console.log("Analysis Result:", JSON.stringify(data, null, 2));
    } else {
      const errText = await analysisRes.text();
      console.log("Analysis Failed:", errText);
    }
  } catch (err) {
    console.error("Error during analysis:", err.message);
  } finally {
    db.close();
  }
}

testReconstruct();
