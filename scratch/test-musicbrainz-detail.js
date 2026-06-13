// scratch/test-musicbrainz-detail.js
const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";
const APP_USER_AGENT = "SpotilabApp/0.1.0 (test-genres-agent)";

async function inspectGetLucky() {
  const query = 'recording:"Get Lucky" AND artist:"Daft Punk"';
  const url = `${MUSICBRAINZ_API_BASE_URL}/recording/?query=${encodeURIComponent(query)}&limit=1&fmt=json`;
  
  console.log("Fetching:", url);
  const response = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
  const data = await response.json();
  
  console.log("Full recording search response structure for first match:");
  const recording = data.recordings[0];
  if (!recording) {
    console.log("No recording found.");
    return;
  }
  
  console.log("Recording keys:", Object.keys(recording));
  console.log("Artist credit:", JSON.stringify(recording["artist-credit"], null, 2));
  console.log("Releases keys & count:", recording.releases ? recording.releases.length : 0);
  if (recording.releases && recording.releases[0]) {
    console.log("First release:", JSON.stringify(recording.releases[0], null, 2));
  }
}

inspectGetLucky();
