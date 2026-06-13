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
  try {
    const token = await getSystemAccessToken();
    console.log("Got system access token.");
    
    // Kokoroko - Sé Miimii ID: 46BNhNbHZi98svu6pFwYVq
    const url = `https://api.spotify.com/v1/audio-features?ids=46BNhNbHZi98svu6pFwYVq`;
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    db.close();
  }
}

run();
