const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";
const APP_USER_AGENT = "SpotilabApp/0.1.0 (test-hybrid-agent)";

const NOISE_TAGS = new Set([
  "remastered", "stereo", "mono", "british", "american", "uk", "usa", "english", "french", "canadian",
  "80s", "90s", "00s", "70s", "60s", "2000s", "1980s", "1990s", "electronic; ambient; hiphop; jazz",
  "soundtracks", "compilation", "various artists", "mix", "remix", "single", "album", "live", "bootleg"
]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTagsForMBID(type, mbid) {
  try {
    const url = `${MUSICBRAINZ_API_BASE_URL}/${type}/${mbid}?inc=tags&fmt=json`;
    const response = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.tags || []).map(t => [t.name.toLowerCase(), t.count || 1]);
  } catch (err) {
    return [];
  }
}

async function resolveMusicBrainzGenres(trackName, artistName) {
  try {
    const query = `recording:"${trackName.replace(/"/g, '')}" AND artist:"${artistName.replace(/"/g, '')}"`;
    const searchUrl = `${MUSICBRAINZ_API_BASE_URL}/recording/?query=${encodeURIComponent(query)}&limit=3&fmt=json`;
    
    const res = await fetch(searchUrl, { headers: { "User-Agent": APP_USER_AGENT } });
    if (!res.ok) return [];
    
    const data = await res.json();
    const recordings = data.recordings || [];
    if (recordings.length === 0) return [];
    
    const topRec = recordings[0];
    let rawTags = [];
    
    // 1. Direct recording tags
    if (topRec.tags && topRec.tags.length > 0) {
      rawTags = topRec.tags.map(t => [t.name.toLowerCase(), t.count || 1]);
    }
    
    // 2. Release Group tags
    if (rawTags.length === 0 && topRec.releases && topRec.releases[0]) {
      const rg = topRec.releases[0]["release-group"];
      if (rg && rg.id) {
        await delay(1200);
        rawTags = await fetchTagsForMBID("release-group", rg.id);
      }
    }
    
    // 3. Artist tags
    if (rawTags.length === 0 && topRec["artist-credit"] && topRec["artist-credit"][0]) {
      const artist = topRec["artist-credit"][0].artist;
      if (artist && artist.id) {
        await delay(1200);
        rawTags = await fetchTagsForMBID("artist", artist.id);
      }
    }
    
    const cleanTags = rawTags
      .filter(([tag]) => !NOISE_TAGS.has(tag) && tag.length > 2 && !/^\d+$/.test(tag))
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
      
    return cleanTags;
  } catch (err) {
    return [];
  }
}

async function run() {
  const tracks = [
    { name: "La Rumba Experimental - Motor City Drum Ensemble Remix", artist: "Gilles Peterson's Havana Cultura Band" },
    { name: "Queen St. Gang", artist: "Arzachel" },
    { name: "Sembilu", artist: "Jamal Mirdad" },
    { name: "Disco Night", artist: "Nightlife Unlimited" }
  ];
  
  for (const track of tracks) {
    await delay(1200);
    const genres = await resolveMusicBrainzGenres(track.name, track.artist);
    console.log(`Track: "${track.name}" by "${track.artist}" -> Genres:`, genres);
  }
}

run();
