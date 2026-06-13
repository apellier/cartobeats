const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, '../dev.db'));

// Basic env reader
const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[parts[0].trim()] = val;
  }
});

async function getSystemAccessToken() {
  const row = db.prepare("SELECT value FROM SystemConfig WHERE key = ?").get("spotify_refresh_token");
  if (!row || !row.value) {
    throw new Error("No spotify_refresh_token found in SystemConfig table.");
  }
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: row.value,
    }),
  });
  const data = await response.json();
  return data.access_token;
}

async function run() {
  const playlistId = '1404470955'; // The user's playlist
  const token = await getSystemAccessToken();
  
  try {
    console.log(`Fetching playlist ${playlistId} from Deezer...`);
    const dzRes = await fetch(`https://api.deezer.com/playlist/${playlistId}`);
    const dzData = await dzRes.json();
    
    const tracks = dzData.tracks?.data || [];
    console.log(`Total tracks: ${tracks.length}`);
    
    // Take a sample of 10 tracks to analyze
    const sample = tracks.slice(0, 10);
    
    for (const t of sample) {
      console.log(`\n--------------------------------------`);
      console.log(`Track: "${t.title}" by "${t.artist?.name}" (ISRC: ${t.isrc})`);
      
      // Test 1: ISRC Search on Spotify
      if (t.isrc) {
        try {
          const searchUrl = `https://api.spotify.com/v1/search?q=isrc:${encodeURIComponent(t.isrc)}&type=track&limit=1`;
          const res = await fetch(searchUrl, { headers: { "Authorization": `Bearer ${token}` } });
          const data = await res.json();
          const match = data.tracks?.items?.[0];
          if (match) {
            console.log(`  [ISRC Match] Spotify: "${match.name}" by "${match.artists.map(a=>a.name).join(', ')}" (ID: ${match.id})`);
          } else {
            console.log(`  [ISRC Match] No match on Spotify. (Status: ${res.status})`);
          }
        } catch (e) {
          console.log(`  [ISRC Match] Error:`, e.message);
        }
      } else {
        console.log(`  [ISRC Match] Track has no ISRC.`);
      }
      
      // Test 2: Fallback Text Search on Spotify
      try {
        const cleanTitle = t.title.replace(/"/g, '');
        const cleanArtist = t.artist?.name?.replace(/"/g, '') || "";
        const query = `track:"${cleanTitle}" artist:"${cleanArtist}"`;
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
        const res = await fetch(searchUrl, { headers: { "Authorization": `Bearer ${token}` } });
        const data = await res.json();
        const match = data.tracks?.items?.[0];
        if (match) {
          console.log(`  [Text Match] Spotify: "${match.name}" by "${match.artists.map(a=>a.name).join(', ')}" (ID: ${match.id})`);
        } else {
          console.log(`  [Text Match] No match on Spotify. Query: "${query}". (Status: ${res.status})`);
          
          // Test 3: Simpler Text Search (just title + artist without track: and artist: fields)
          const simpleQuery = `${cleanArtist} ${cleanTitle}`;
          const simpleUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(simpleQuery)}&type=track&limit=1`;
          const simpleRes = await fetch(simpleUrl, { headers: { "Authorization": `Bearer ${token}` } });
          const simpleData = await simpleRes.json();
          const simpleMatch = simpleData.tracks?.items?.[0];
          if (simpleMatch) {
            console.log(`    [Simple Match] Spotify: "${simpleMatch.name}" by "${simpleMatch.artists.map(a=>a.name).join(', ')}" (ID: ${simpleMatch.id})`);
          } else {
            console.log(`    [Simple Match] No match on Spotify. Query: "${simpleQuery}".`);
          }
        }
      } catch (e) {
        console.log(`  [Text Match] Error:`, e.message);
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    db.close();
  }
}

run();
