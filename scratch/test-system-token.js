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

async function getClientCredentialsToken() {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh system token: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function testEndpoints(tokenName, token) {
  console.log(`\n=== Testing endpoints with ${tokenName} ===`);
  const artistId = "3u9rbdcmA6CxjxOAkjaeFr"; // Kokoroko
  
  // 1. Search endpoint
  try {
    const searchUrl = `https://api.spotify.com/v1/search?q=Kokoroko&type=artist&limit=1`;
    const res = await fetch(searchUrl, { headers: { "Authorization": `Bearer ${token}` } });
    console.log(`  1. Search: Status ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const artist = data.artists?.items?.[0];
      console.log(`     Artist Name: "${artist?.name}"`);
      console.log(`     Artist Keys:`, Object.keys(artist || {}));
      console.log(`     Artist Genres:`, artist?.genres);
    } else {
      console.log(`     Error:`, await res.text());
    }
  } catch (e) {
    console.log(`     Search caught error:`, e.message);
  }

  // 2. Direct single artist /v1/artists/{id}
  try {
    const directUrl = `https://api.spotify.com/v1/artists/${artistId}`;
    const res = await fetch(directUrl, { headers: { "Authorization": `Bearer ${token}` } });
    console.log(`  2. Single Artist: Status ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`     Artist Name: "${data.name}"`);
      console.log(`     Artist Keys:`, Object.keys(data));
      console.log(`     Artist Genres:`, data.genres);
    } else {
      console.log(`     Error:`, await res.text());
    }
  } catch (e) {
    console.log(`     Single Artist caught error:`, e.message);
  }

  // 3. Batch artists /v1/artists?ids={ids}
  try {
    const batchUrl = `https://api.spotify.com/v1/artists?ids=${artistId}`;
    const res = await fetch(batchUrl, { headers: { "Authorization": `Bearer ${token}` } });
    console.log(`  3. Batch Artists: Status ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const artist = data.artists?.[0];
      console.log(`     Artist Name: "${artist?.name}"`);
      console.log(`     Artist Keys:`, Object.keys(artist || {}));
      console.log(`     Artist Genres:`, artist?.genres);
    } else {
      console.log(`     Error:`, await res.text());
    }
  } catch (e) {
    console.log(`     Batch Artists caught error:`, e.message);
  }
}

async function run() {
  try {
    const clientToken = await getClientCredentialsToken();
    await testEndpoints("Client Credentials Token", clientToken);
  } catch (err) {
    console.error("Client Credentials testing failed:", err.message);
  }

  try {
    const systemToken = await getSystemAccessToken();
    await testEndpoints("System OAuth Token", systemToken);
  } catch (err) {
    console.error("System OAuth testing failed:", err.message);
  }

  db.close();
}

run();

