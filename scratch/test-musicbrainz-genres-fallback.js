// scratch/test-musicbrainz-genres-fallback.js
const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";
const APP_USER_AGENT = "SpotilabApp/0.1.0 (test-genres-agent)";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleTracks = [
  { name: "Get Lucky", artist: "Daft Punk" },
  { name: "Creep", artist: "Radiohead" },
  { name: "Blue Monday", artist: "New Order" },
  { name: "Lose Yourself", artist: "Eminem" },
  { name: "Nightcall", artist: "Kavinsky" },
  { name: "Billie Jean", artist: "Michael Jackson" }
];

async function fetchTagsForMBID(type, mbid) {
  try {
    const url = `${MUSICBRAINZ_API_BASE_URL}/${type}/${mbid}?inc=tags&fmt=json`;
    const response = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
    if (!response.ok) return [];
    const data = await response.json();
    const tags = data.tags || [];
    return tags.map(t => [t.name.toLowerCase(), t.count || 1]);
  } catch (error) {
    console.error(`Error fetching tags for ${type}/${mbid}:`, error.message);
    return [];
  }
}

async function resolveTrackGenres(trackName, artistName) {
  console.log(`\n--- Resolving: "${trackName}" by ${artistName} ---`);
  
  // Step 1: Search recording
  const query = `recording:"${trackName.replace(/"/g, '')}" AND artist:"${artistName.replace(/"/g, '')}"`;
  const searchUrl = `${MUSICBRAINZ_API_BASE_URL}/recording/?query=${encodeURIComponent(query)}&limit=3&fmt=json`;
  
  const searchResponse = await fetch(searchUrl, { headers: { "User-Agent": APP_USER_AGENT } });
  if (!searchResponse.ok) {
    console.log(`Search failed with status ${searchResponse.status}`);
    return [];
  }
  const searchData = await searchResponse.json();
  const recordings = searchData.recordings || [];
  
  if (recordings.length === 0) {
    console.log("No recording found.");
    return [];
  }

  // Look for recording tags first
  let tags = [];
  const topRec = recordings[0];
  if (topRec.tags && topRec.tags.length > 0) {
    console.log("-> Found tags directly on the recording!");
    tags = topRec.tags.map(t => [t.name.toLowerCase(), t.count || 1]);
  }

  // Step 2: Fallback to Release Group (Album) tags
  if (tags.length === 0 && topRec.releases && topRec.releases[0]) {
    const releaseGroup = topRec.releases[0]["release-group"];
    if (releaseGroup && releaseGroup.id) {
      console.log(`-> Recording tags empty. Fetching Release Group tags (${releaseGroup.title} / MBID: ${releaseGroup.id})...`);
      await delay(1100);
      tags = await fetchTagsForMBID("release-group", releaseGroup.id);
    }
  }

  // Step 3: Fallback to Artist tags
  if (tags.length === 0 && topRec["artist-credit"] && topRec["artist-credit"][0]) {
    const artist = topRec["artist-credit"][0].artist;
    if (artist && artist.id) {
      console.log(`-> Release Group tags empty. Fetching Artist tags (${artist.name} / MBID: ${artist.id})...`);
      await delay(1100);
      tags = await fetchTagsForMBID("artist", artist.id);
    }
  }

  // Sort tags by count
  tags.sort((a, b) => b[1] - a[1]);
  console.log("Resolved tags:", JSON.stringify(tags.slice(0, 8)));
  return tags;
}

async function runTest() {
  for (const track of sampleTracks) {
    await resolveTrackGenres(track.name, track.artist);
    // Be gentle to MusicBrainz API between tracks
    await delay(1100);
  }
}

runTest();
