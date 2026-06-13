// scratch/test-spotify-search.js
const fs = require('fs');
const path = require('path');

// Basic env reader
const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    let val = parts.slice(1).join('=').trim();
    // remove surrounding quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[parts[0].trim()] = val;
  }
});

async function getAccessToken() {
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
      grant_type: "client_credentials",
    }),
  });
  const data = await response.json();
  return data.access_token;
}

async function testSearch(token, queryDesc, query) {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1`;
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  const artist = data.artists?.items?.[0];
  console.log(`${queryDesc} -> Query: "${query}"`);
  if (artist) {
    console.log(`  Match: "${artist.name}" (ID: ${artist.id})`);
    console.log(`  Artist object keys:`, Object.keys(artist));
    console.log(`  Genres:`, artist.genres);
    // Let's try to fetch the single artist endpoint to see if that works
    try {
      const directUrl = `https://api.spotify.com/v1/artists/${artist.id}`;
      const directRes = await fetch(directUrl, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      console.log(`  Direct artist API status: ${directRes.status}`);
      if (directRes.ok) {
        const directData = await directRes.json();
        console.log(`  Direct artist genres:`, directData.genres);
        console.log(`  Direct artist keys:`, Object.keys(directData));
      } else {
        const directErr = await directRes.text();
        console.log(`  Direct artist error:`, directErr);
      }
    } catch (e) {
      console.log(`  Direct artist fetch caught error:`, e.message);
    }
  } else {
    console.log(`  No Match! (Status: ${res.status})`, JSON.stringify(data));
  }
}

async function run() {
  try {
    const token = await getAccessToken();
    console.log("Got access token.");
    
    await testSearch(token, "1. Strict artist prefix with quotes", 'artist:"Kokoroko"');
    await testSearch(token, "2. Strict artist prefix without quotes", 'artist:Kokoroko');
    await testSearch(token, "3. Raw artist name only", 'Kokoroko');
    await testSearch(token, "4. Raw artist name with special characters (Bembeya Jazz)", 'Bembeya Jazz National');
    await testSearch(token, "5. Strict Bembeya Jazz National", 'artist:"Bembeya Jazz National"');
    
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
