import dotenv from "dotenv";
dotenv.config();
import { prisma } from "./db";

let cachedToken: string | null = null;
let cachedTokenExpiresAt: number = 0; // timestamp en millisecondes

export interface SpotifyTrackData {
  id: string;
  name: string;
  artists: string; // Artistes séparés par des virgules
  primaryArtist: string | null; // Premier artiste sans split textuel
  primaryArtistId: string | null; // ID Spotify de l'artiste principal
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  previewUrl: string | null;
  isrc: string | null;
  danceability: number | null;
  energy: number | null;
  key: number | null;
  loudness: number | null;
  mode: number | null;
  speechiness: number | null;
  acousticness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  valence: number | null;
  tempo: number | null;
}

export interface SpotifyPlaylistData {
  id: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  imageUrl: string | null;
  trackCount: number;
  tracks: SpotifyTrackData[];
}

/**
 * Récupère le token d'accès Spotify via le flux Client Credentials.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60000) {
    return cachedToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Les variables d'environnement SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET sont manquantes.");
  }

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
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Échec de l'obtention du token Spotify : ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken!;
}

/**
 * Extrait l'ID de la playlist à partir d'un lien Spotify.
 */
export function extractPlaylistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  
  // Si c'est directement un ID de 22 caractères alphanumériques
  if (/^[a-zA-Z0-9]{22}$/.test(urlOrId)) {
    return urlOrId;
  }

  // Si c'est un lien URL
  try {
    const match = urlOrId.match(/playlist\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Extrait l'ID de la playlist à partir d'un lien Deezer.
 */
export function extractDeezerPlaylistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (urlOrId.startsWith("deezer:")) return urlOrId.split(":")[1];
  
  // Si c'est directement un ID numérique
  if (/^\d+$/.test(urlOrId)) {
    return urlOrId;
  }

  // Si c'est un lien URL (ex: deezer.com/playlist/908622995)
  try {
    const match = urlOrId.match(/deezer\.com\/(?:\w{2}\/)?playlist\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Génère une valeur déterministe entre 0 et 1 pour une clé de morceau et une caractéristique données.
 * Cela permet de garantir que les caractéristiques (valence, énergie...) restent identiques pour un même morceau.
 */
function getDeterministicFeature(trackId: string, seed: string): number {
  let hash = 0;
  const str = trackId + seed;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convertit en entier 32 bits
  }
  const val = Math.abs(hash) / 2147483647;
  return Math.max(0, Math.min(1, val));
}

/**
 * Récupère les données complètes d'une playlist publique et ses caractéristiques audio.
 */
export async function fetchPlaylistData(playlistId: string, token: string): Promise<SpotifyPlaylistData> {
  // 1. Récupérer les détails de la playlist
  const playlistRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,owner.display_name,images,tracks.total,items.total`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!playlistRes.ok) {
    throw new Error(`Impossible de récupérer la playlist (${playlistRes.status}): ${playlistRes.statusText}`);
  }

  const playlistData = await playlistRes.json();
  
  // Extraire l'image principale de la playlist
  const imageUrl = playlistData.images && playlistData.images.length > 0 
    ? playlistData.images[0].url 
    : null;

  const totalTracks = playlistData.tracks?.total || playlistData.items?.total || 0;
  const tracksList: any[] = [];
  
  // 2. Récupérer toutes les pistes de la playlist (pagination par 100) via l'endpoint /items plus robuste
  let offset = 0;
  while (offset < totalTracks) {
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100&offset=${offset}&fields=items(track(id,name,duration_ms,preview_url,artists(id,name),album(name,images)),item(id,name,duration_ms,preview_url,artists(id,name),album(name,images)))`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );

    if (!tracksRes.ok) {
      throw new Error(`Erreur lors de la récupération des pistes (${tracksRes.status})`);
    }

    const pageData = await tracksRes.json();
    if (pageData.items) {
      tracksList.push(...pageData.items);
    }
    
    offset += 100;
  }

  // Filtrer les pistes valides (gère track ou item, et ignore les pistes locales ou nuls sans ID)
  const validTracks = tracksList
    .map((item: any) => item.track || item.item)
    .filter((track: any) => track && track.id);

  if (validTracks.length === 0) {
    return {
      id: playlistId,
      name: playlistData.name,
      description: playlistData.description,
      ownerName: playlistData.owner?.display_name || null,
      imageUrl,
      trackCount: 0,
      tracks: []
    };
  }

  // 3. Récupérer les caractéristiques audio (audio features) par lots de 100
  const trackIds = validTracks.map((t: any) => t.id);
  const audioFeaturesMap = new Map<string, any>();

  for (let i = 0; i < trackIds.length; i += 100) {
    const batchIds = trackIds.slice(i, i + 100);
    try {
      const featuresRes = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${batchIds.join(",")}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );

      if (featuresRes.ok) {
        const featuresData = await featuresRes.json();
        if (featuresData.audio_features) {
          featuresData.audio_features.forEach((feat: any) => {
            if (feat && feat.id) {
              audioFeaturesMap.set(feat.id, feat);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Échec de la récupération des caractéristiques via Spotify :", err);
    }
  }

  // 3.5 Si l'API officielle Spotify a échoué (403 Forbidden depuis nov 2024), récupérer les caractéristiques réelles via ReccoBeats API
  if (audioFeaturesMap.size === 0 && trackIds.length > 0) {
    console.log(`Tentative de récupération des caractéristiques pour ${trackIds.length} morceaux via ReccoBeats API...`);
    for (let i = 0; i < trackIds.length; i += 20) {
      const batchIds = trackIds.slice(i, i + 20);
      try {
        const reccoRes = await fetch(
          `https://api.reccobeats.com/v1/audio-features?ids=${batchIds.join(",")}`,
          { cache: "no-store" }
        );
        if (reccoRes.ok) {
          const reccoData = await reccoRes.json();
          if (reccoData.content) {
            reccoData.content.forEach((feat: any) => {
              if (feat && feat.href) {
                const spotifyId = feat.href.split("/").pop();
                if (spotifyId) {
                  audioFeaturesMap.set(spotifyId, feat);
                }
              }
            });
          }
        }
      } catch (err) {
        console.warn("Échec de la récupération des caractéristiques via ReccoBeats :", err);
      }
    }
    console.log(`Caractères audio récupérés via ReccoBeats : ${audioFeaturesMap.size}/${trackIds.length}`);
  }

  // 4. Fusionner les métadonnées et les caractéristiques audio
  const tracks: SpotifyTrackData[] = validTracks
    .map((t: any) => {
      const feat = audioFeaturesMap.get(t.id);
      
      const artists = t.artists.map((a: any) => a.name).join(", ");
      const primaryArtist = t.artists && t.artists.length > 0 ? t.artists[0].name : null;
      const primaryArtistId = t.artists && t.artists.length > 0 ? t.artists[0].id : null;
      const albumImageUrl = t.album?.images && t.album.images.length > 0 
        ? t.album.images[0].url 
        : null;

      return {
        id: t.id,
        name: t.name,
        artists,
        primaryArtist,
        primaryArtistId,
        albumName: t.album.name,
        albumImageUrl,
        durationMs: t.duration_ms,
        previewUrl: t.preview_url || null,
        isrc: t.external_ids?.isrc || null,
        danceability: feat ? feat.danceability : null,
        energy: feat ? feat.energy : null,
        key: feat ? feat.key : null,
        loudness: feat ? feat.loudness : null,
        mode: feat ? feat.mode : null,
        speechiness: feat ? feat.speechiness : null,
        acousticness: feat ? feat.acousticness : null,
        instrumentalness: feat ? feat.instrumentalness : null,
        liveness: feat ? feat.liveness : null,
        valence: feat ? feat.valence : null,
        tempo: feat ? feat.tempo : null
      };
    });

  return {
    id: playlistId,
    name: playlistData.name,
    description: playlistData.description || null,
    ownerName: playlistData.owner?.display_name || null,
    imageUrl,
    trackCount: tracks.length,
    tracks
  };
}

export interface SpotifyUserPlaylist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
}

/**
 * Récupère les playlists de l'utilisateur connecté via OAuth.
 */
export async function fetchUserPlaylists(token: string): Promise<SpotifyUserPlaylist[]> {
  const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Impossible de récupérer vos playlists (${response.status})`);
  }

  const data = await response.json();
  if (!data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description || null,
    imageUrl: item.images && item.images.length > 0 ? item.images[0].url : null,
    trackCount: item.tracks?.total || 0
  }));
}

let cachedSystemAccessToken: string | null = null;
let cachedSystemAccessTokenExpiresAt: number = 0;

/**
 * Renouvelle et renvoie un token d'accès utilisateur à partir du refresh_token système.
 */
export async function getSystemAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedSystemAccessToken && now < cachedSystemAccessTokenExpiresAt - 60000) {
    return cachedSystemAccessToken;
  }

  const config = await prisma.systemConfig.findUnique({
    where: { key: "spotify_refresh_token" }
  });

  if (!config || !config.value) {
    throw new Error("Aucun jeton de connexion système configuré. Veuillez vous connecter en mode Admin au moins une fois pour initialiser le système.");
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Identifiants SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET manquants.");
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.value,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Échec du rafraîchissement du token système : ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  cachedSystemAccessToken = data.access_token;
  cachedSystemAccessTokenExpiresAt = now + data.expires_in * 1000;

  if (data.refresh_token && data.refresh_token !== config.value) {
    await prisma.systemConfig.update({
      where: { key: "spotify_refresh_token" },
      data: { value: data.refresh_token }
    }).catch(err => console.error("Échec de la mise à jour du refresh token système :", err));
  }

  return cachedSystemAccessToken!;
}
