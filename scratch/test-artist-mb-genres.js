const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";
const APP_USER_AGENT = "SpotilabApp/0.1.0 (test-artist-agent)";

const NOISE_TAGS = new Set([
  "remastered", "stereo", "mono", "british", "american", "uk", "usa", "english", "french", "canadian",
  "80s", "90s", "00s", "70s", "60s", "2000s", "1980s", "1990s", "electronic; ambient; hiphop; jazz",
  "soundtracks", "compilation", "various artists", "mix", "remix", "single", "album", "live", "bootleg"
]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchArtistGenres(artistName) {
  const url = `${MUSICBRAINZ_API_BASE_URL}/artist/?query=artist:${encodeURIComponent(artistName)}&limit=3&fmt=json`;
  const response = await fetch(url, { 
    headers: { "User-Agent": APP_USER_AGENT } 
  });
  
  if (!response.ok) {
    console.error(`Error fetching from MusicBrainz: ${response.status}`);
    return [];
  }
  
  const data = await response.json();
  const artists = data.artists || [];
  if (artists.length === 0) {
    return [];
  }
  
  // Find best match or use first
  const bestMatch = artists.find(a => a.name.toLowerCase() === artistName.toLowerCase()) || artists[0];
  const tags = bestMatch.tags || [];
  
  const cleanTags = tags
    .map(t => [t.name.toLowerCase(), t.count || 1])
    .filter(([tag]) => !NOISE_TAGS.has(tag) && tag.length > 2 && !/^\d+$/.test(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
    
  return cleanTags;
}

async function run() {
  const testArtists = ["Kokoroko", "Arzachel", "Jamal Mirdad", "Nightlife Unlimited", "Bembeya Jazz National"];
  for (const artist of testArtists) {
    await delay(1200);
    const genres = await fetchArtistGenres(artist);
    console.log(`Artist: "${artist}" -> Genres:`, genres);
  }
}

run();
