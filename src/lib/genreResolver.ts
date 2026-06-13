// src/lib/genreResolver.ts
import taxonomyData from "@/data/genre-taxonomy.json";
import { fetchMusicBrainz } from "./musicbrainz";

const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";

// Unwanted tags to filter out to keep only clean musical style tags
const NOISE_TAGS = new Set([
  "remastered", "stereo", "mono", "british", "american", "uk", "usa", "english", "french", "canadian",
  "80s", "90s", "00s", "70s", "60s", "2000s", "1980s", "1990s", "electronic; ambient; hiphop; jazz",
  "soundtracks", "compilation", "various artists", "mix", "remix", "single", "album", "live", "bootleg"
]);

interface TaxonomyRelation {
  meso: string;
  macro: string;
}

interface TaxonomyData {
  macro: string[];
  relations: Record<string, TaxonomyRelation>;
}

const taxonomy = taxonomyData as TaxonomyData;

/**
 * Helper to fetch tags from MusicBrainz for a given entity type (e.g., release-group, artist)
 */
async function fetchTagsForMBID(type: string, mbid: string): Promise<[string, number][]> {
  try {
    const url = `${MUSICBRAINZ_API_BASE_URL}/${type}/${mbid}?inc=tags&fmt=json`;
    const response = await fetchMusicBrainz(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    const tags = data.tags || [];
    return tags.map((t: any) => [t.name.toLowerCase(), t.count || 1]);
  } catch (error: any) {
    console.error(`[MusicBrainz API] Error fetching tags for ${type}/${mbid}:`, error.message);
    return [];
  }
}

/**
 * Main cascading resolver to find clean genre tags for a track
 */
export async function resolveMusicBrainzGenres(trackName: string, artistName: string): Promise<string[]> {
  try {
    // 1. Search recording on MusicBrainz
    const query = `recording:"${trackName.replace(/"/g, '')}" AND artist:"${artistName.replace(/"/g, '')}"`;
    const searchUrl = `${MUSICBRAINZ_API_BASE_URL}/recording/?query=${encodeURIComponent(query)}&limit=3&fmt=json`;
    
    const searchResponse = await fetchMusicBrainz(searchUrl);
    if (!searchResponse.ok) {
      console.warn(`[MusicBrainz API] Search failed with status ${searchResponse.status}`);
      return [];
    }
    
    const searchData = await searchResponse.json();
    const recordings = searchData.recordings || [];
    
    if (recordings.length === 0) {
      console.log(`[MusicBrainz API] No recordings found for "${trackName}" by ${artistName}`);
      return [];
    }

    let rawTags: [string, number][] = [];
    const topRec = recordings[0];

    // Cascade 1: Direct recording tags
    if (topRec.tags && topRec.tags.length > 0) {
      console.log(`[MusicBrainz API] Found direct tags on recording for "${trackName}"`);
      rawTags = topRec.tags.map((t: any) => [t.name.toLowerCase(), t.count || 1]);
    }

    // Cascade 2: Release Group (Album) tags
    if (rawTags.length === 0 && topRec.releases && topRec.releases[0]) {
      const releaseGroup = topRec.releases[0]["release-group"];
      if (releaseGroup && releaseGroup.id) {
        console.log(`[MusicBrainz API] Recording tags empty. Fetching Release Group tags (${releaseGroup.title})...`);
        rawTags = await fetchTagsForMBID("release-group", releaseGroup.id);
      }
    }

    // Cascade 3: Artist tags
    if (rawTags.length === 0 && topRec["artist-credit"] && topRec["artist-credit"][0]) {
      const artist = topRec["artist-credit"][0].artist;
      if (artist && artist.id) {
        console.log(`[MusicBrainz API] Release Group tags empty. Fetching Artist tags (${artist.name})...`);
        rawTags = await fetchTagsForMBID("artist", artist.id);
      }
    }

    // Filter noise, sort by count descending, and return cleaned tag strings
    const cleanTags = rawTags
      .filter(([tag]) => !NOISE_TAGS.has(tag) && tag.length > 2 && !/^\d+$/.test(tag))
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return Array.from(new Set(cleanTags));
  } catch (error: any) {
    console.error(`[MusicBrainz API] Error resolving genres for "${trackName}":`, error.message);
    return [];
  }
}

/**
 * Maps micro-genres (fine tags) onto macro or meso levels according to the taxonomy.
 * If a tag is not present, maps it to a fallback parent category if it contains key terms.
 */
export function mapTagToLevel(tag: string, level: "macro" | "meso" | "micro"): string {
  const cleanTag = tag.trim().toLowerCase();
  
  // Micro level: keep original
  if (level === "micro") return cleanTag;

  // Exact match in taxonomy
  const rel = taxonomy.relations[cleanTag];
  if (rel) {
    return level === "macro" ? rel.macro : rel.meso;
  }

  // Fuzzy word matching falls back to parents if the tag has words like "rock", "pop", "house", "rap"
  if (cleanTag.includes("rock") || cleanTag.includes("metal") || cleanTag.includes("punk") || cleanTag.includes("grunge")) {
    return level === "macro" ? "rock" : (cleanTag.includes("metal") ? "metal" : (cleanTag.includes("punk") ? "punk" : "alternative rock"));
  }
  if (cleanTag.includes("pop") || cleanTag.includes("disco")) {
    return level === "macro" ? "pop" : (cleanTag.includes("synth") ? "synthpop" : "pop");
  }
  if (cleanTag.includes("house") || cleanTag.includes("techno") || cleanTag.includes("trance") || cleanTag.includes("electro") || cleanTag.includes("wave")) {
    return level === "macro" ? "electronic" : (cleanTag.includes("house") ? "house" : (cleanTag.includes("techno") ? "techno" : "electronic"));
  }
  if (cleanTag.includes("rap") || cleanTag.includes("hip hop") || cleanTag.includes("hip-hop") || cleanTag.includes("trap") || cleanTag.includes("r&b")) {
    return level === "macro" ? "hip-hop" : (cleanTag.includes("trap") ? "trap" : "rap");
  }
  if (cleanTag.includes("jazz")) {
    return level === "macro" ? "jazz_blues" : "jazz";
  }
  if (cleanTag.includes("blues")) {
    return level === "macro" ? "jazz_blues" : "blues";
  }
  if (cleanTag.includes("folk") || cleanTag.includes("acoustic") || cleanTag.includes("country")) {
    return level === "macro" ? "folk_acoustic" : (cleanTag.includes("folk") ? "folk" : "acoustic");
  }
  if (cleanTag.includes("ambient")) {
    return level === "macro" ? "electronic" : "ambient";
  }
  if (cleanTag.includes("classical") || cleanTag.includes("orchestral") || cleanTag.includes("symphon")) {
    return level === "macro" ? "classical_ambient" : "classical";
  }
  if (cleanTag.includes("reggae") || cleanTag.includes("ska") || cleanTag.includes("latin") || cleanTag.includes("salsa")) {
    return level === "macro" ? "reggae_latin_world" : "reggae";
  }

  // Final fallback: return the original tag, or "indéterminé" if too obscure
  return cleanTag;
}

/**
 * Resolves a list of tags for a song down to a single representative genre at a specific taxonomy level.
 */
export function getDominantTrackGenre(tagsString: string | null | undefined, level: "macro" | "meso" | "micro"): string {
  if (!tagsString) return "autre";
  
  const tags = tagsString.split(",").map(t => t.trim()).filter(Boolean);
  if (tags.length === 0) return "autre";

  // Map each tag to the target level
  const mappedTags = tags.map(tag => mapTagToLevel(tag, level));

  // Count occurrences
  const counts: Record<string, number> = {};
  let maxCount = 0;
  let dominant = "autre";

  for (const mapped of mappedTags) {
    counts[mapped] = (counts[mapped] || 0) + 1;
    if (counts[mapped] > maxCount) {
      maxCount = counts[mapped];
      dominant = mapped;
    }
  }

  return dominant;
}

/**
 * Format raw taxonomy keys to beautiful French labels
 */
export function formatGenreLabel(genre: string): string {
  const labels: Record<string, string> = {
    "rock": "Rock",
    "alternative rock": "Rock Alternatif",
    "indie rock": "Indie Rock",
    "punk": "Punk / Hardcore",
    "metal": "Heavy Metal",
    "hard rock": "Hard Rock",
    "post-punk": "Post-Punk / Coldwave",
    
    "pop": "Pop",
    "indie pop": "Indie Pop / Dream Pop",
    "synthpop": "Synthpop / Electropop",
    "dancepop": "Dance-Pop",
    "disco": "Disco / Funk",
    "pop rap": "Pop Rap",
    
    "electronic": "Électronique",
    "house": "House / Tech-House",
    "techno": "Techno / Acid",
    "synthwave": "Synthwave / Outrun",
    "trance": "Trance / Progressive",
    "ambient": "Ambient / Chill",
    "drum and bass": "Drum & Bass / Breaks",
    "dubstep": "Dubstep / Bass",
    
    "hip-hop": "Hip-Hop",
    "hip hop": "Hip-Hop",
    "rap": "Rap / Gangsta",
    "trap": "Trap / Drill",
    "r&b": "R&B / Neo-Soul",
    "soul": "Soul / Motown",
    "funk": "Funk / Boogie",
    
    "jazz_blues": "Jazz & Blues",
    "jazz": "Jazz / Swing",
    "blues": "Blues / Delta",
    
    "classical_ambient": "Classique & B.O.",
    "classical": "Musique Classique",
    "soundtrack": "Bandes Originales",
    
    "folk_acoustic": "Folk & Acoustique",
    "folk": "Folk / Indie Folk",
    "acoustic": "Acoustique / Songwriter",
    "country": "Country / Americana",
    
    "reggae_latin_world": "Reggae & Monde",
    "reggae": "Reggae / Dub / Ska",
    "latin": "Musique Latine / Reggaeton",
    "world": "Musique du Monde / Afrobeat",
    "autre": "Autre"
  };

  return labels[genre.toLowerCase()] || genre.charAt(0).toUpperCase() + genre.slice(1);
}
