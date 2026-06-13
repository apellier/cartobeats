const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../dev.db'));

const playlistId = 'deezer:1404470955';
const unmappedTracks = db.prepare(`
  SELECT t.id, t.name, t.artists, t.previewUrl, t.isrc 
  FROM PlaylistTrack pt 
  JOIN Track t ON pt.trackId = t.id 
  WHERE pt.playlistId = ? AND t.valence IS NULL
`).all(playlistId);

console.log(`Found ${unmappedTracks.length} unmapped tracks in playlist ${playlistId}`);

async function processTrack(track) {
  let previewUrl = track.previewUrl;
  if (!previewUrl) {
    try {
      if (track.isrc) {
        const isrcRes = await fetch(`https://api.deezer.com/track/isrc:${track.isrc}`);
        if (isrcRes.ok) {
          const isrcData = await isrcRes.json();
          if (isrcData.preview && !isrcData.error) {
            previewUrl = isrcData.preview;
          }
        }
      }
      if (!previewUrl) {
        const query = `${track.artists} - ${track.name}`;
        const searchRes = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.data && searchData.data.length > 0) {
            previewUrl = searchData.data[0].preview;
          }
        }
      }
    } catch (e) {
      console.log(`[${track.name}] Error getting preview: ${e.message}`);
    }
  }

  if (!previewUrl) {
    console.log(`[${track.name}] No preview URL found.`);
    return { success: false, error: "No preview URL" };
  }

  try {
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      throw new Error(`Failed to download audio: ${audioRes.status}`);
    }
    const audioBuffer = await audioRes.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    
    const formData = new FormData();
    formData.append("audioFile", audioBlob, "preview.mp3");
    
    let attempts = 0;
    const maxAttempts = 6;
    while (attempts < maxAttempts) {
      const analysisRes = await fetch("https://api.reccobeats.com/v1/analysis/audio-features", {
        method: "POST",
        body: formData
      });
      
      if (analysisRes.status === 429) {
        attempts++;
        const errText = await analysisRes.text();
        let retryAfterSeconds = 5; // default fallback
        const match = errText.match(/retry after (\d+) seconds/i);
        if (match) {
          retryAfterSeconds = parseInt(match[1], 10);
        }
        console.log(`[${track.name}] Rate limited (429). Waiting ${retryAfterSeconds}s before retry (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, (retryAfterSeconds * 1000) + 500));
        continue;
      }
      
      if (analysisRes.ok) {
        const data = await analysisRes.json();
        db.prepare(`
          UPDATE Track 
          SET acousticness = ?, danceability = ?, energy = ?, instrumentalness = ?, 
              liveness = ?, loudness = ?, speechiness = ?, tempo = ?, valence = ?
          WHERE id = ?
        `).run(
          data.acousticness ?? null,
          data.danceability ?? null,
          data.energy ?? null,
          data.instrumentalness ?? null,
          data.liveness ?? null,
          data.loudness ?? null,
          data.speechiness ?? null,
          data.tempo ?? null,
          data.valence ?? null,
          track.id
        );
        console.log(`[${track.name}] Successfully analyzed: valence=${data.valence}, energy=${data.energy}`);
        return { success: true };
      } else {
        const errText = await analysisRes.text();
        console.log(`[${track.name}] ReccoBeats upload failed with status ${analysisRes.status}: ${errText}`);
        return { success: false, error: errText };
      }
    }
    return { success: false, error: "Max retry attempts exceeded due to rate limits" };
  } catch (err) {
    console.log(`[${track.name}] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function runPool(tracks, concurrencyLimit) {
  let index = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (index < tracks.length) {
      const currentIdx = index++;
      const track = tracks[currentIdx];
      console.log(`[Progress: ${currentIdx + 1}/${tracks.length}] Processing "${track.name}" by "${track.artists}"...`);
      const result = await processTrack(track);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
      // Brief delay between requests to be polite and avoid 429
      await new Promise(r => setTimeout(r, 600));
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(concurrencyLimit, tracks.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  console.log(`\nAll done! Succeeded: ${successCount}, Failed: ${failCount}`);
}

if (unmappedTracks.length > 0) {
  runPool(unmappedTracks, 1).then(() => {
    db.close();
  });
} else {
  console.log("No unmapped tracks found.");
  db.close();
}
