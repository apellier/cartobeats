import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { extractPlaylistId, extractDeezerPlaylistId, fetchPlaylistData, getSystemAccessToken, getAccessToken } from "@/lib/spotify";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session: any = await getServerSession(authOptions);
  let token = session?.accessToken;

  // Si l'utilisateur n'est pas connecté (visiteur invité), on utilise le token système
  if (!token) {
    try {
      token = await getSystemAccessToken();
    } catch (err: any) {
      console.warn("Échec de l'obtention du token système :", err.message);
      return NextResponse.json(
        { error: "Accès non autorisé. L'administrateur doit se connecter une fois en mode 'Connexion Admin' pour activer l'analyse publique." },
        { status: 401 }
      );
    }
  }

  const { searchParams } = new URL(request.url);
  const urlOrId = searchParams.get("url") || searchParams.get("id");

  if (!urlOrId) {
    return NextResponse.json(
      { error: "Veuillez fournir une URL de playlist ou un ID valide via le paramètre 'url' ou 'id'." },
      { status: 400 }
    );
  }

  let targetUrl = urlOrId;

  // Resolve shortened Deezer sharing links (e.g. link.deezer.com)
  if (urlOrId.includes("link.deezer.com") || urlOrId.includes("deezer.page.link")) {
    try {
      console.log(`[Analyze API] Resolving shortened Deezer link: ${urlOrId}`);
      const res = await fetch(urlOrId, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        targetUrl = res.url;
        console.log(`[Analyze API] Resolved shortened Deezer link to: ${targetUrl}`);
      }
    } catch (err: any) {
      console.warn("[Analyze API] Failed to resolve shortened Deezer link redirect:", err.message);
    }
  }

  const deezerPlaylistId = extractDeezerPlaylistId(targetUrl);
  const isDeezer = !!deezerPlaylistId;
  const playlistId = isDeezer ? `deezer:${deezerPlaylistId}` : extractPlaylistId(targetUrl);

  if (!playlistId) {
    return NextResponse.json(
      { error: "Format d'URL ou d'ID de playlist invalide (Spotify ou Deezer requis)." },
      { status: 400 }
    );
  }

  try {
    // 1. Vérifier si la playlist est déjà en cache en base de données
    const cachedPlaylist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          include: {
            track: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 heures

    if (
      cachedPlaylist &&
      cachedPlaylist.trackCount > 0 &&
      Date.now() - cachedPlaylist.updatedAt.getTime() < CACHE_EXPIRATION_MS
    ) {
      // Formater la réponse à partir du cache
      const formattedTracks = cachedPlaylist.tracks.map((pt) => ({
        id: pt.track.id,
        name: pt.track.name,
        artists: pt.track.artists,
        primaryArtist: pt.track.primaryArtist,
        primaryArtistId: pt.track.primaryArtistId,
        albumName: pt.track.albumName,
        albumImageUrl: pt.track.albumImageUrl,
        durationMs: pt.track.durationMs,
        previewUrl: pt.track.previewUrl,
        isrc: pt.track.isrc,
        danceability: pt.track.danceability,
        energy: pt.track.energy,
        key: pt.track.key,
        loudness: pt.track.loudness,
        mode: pt.track.mode,
        speechiness: pt.track.speechiness,
        acousticness: pt.track.acousticness,
        instrumentalness: pt.track.instrumentalness,
        liveness: pt.track.liveness,
        valence: pt.track.valence,
        tempo: pt.track.tempo,
      }));

      return NextResponse.json({
        id: cachedPlaylist.id,
        name: cachedPlaylist.name,
        description: cachedPlaylist.description,
        ownerName: cachedPlaylist.ownerName,
        imageUrl: cachedPlaylist.imageUrl,
        trackCount: cachedPlaylist.trackCount,
        tracks: formattedTracks,
        source: "cache",
      });
    }

    let playlistName = "";
    let playlistDescription = "";
    let playlistOwnerName = "";
    let playlistImageUrl = "";
    let playlistTrackCount = 0;
    let resolvedTracks: any[] = [];

    if (isDeezer) {
      // --- DEEZER IMPORT FLOW ---
      console.log(`[Analyze API] Fetching Deezer playlist details for: ${deezerPlaylistId}`);
      const dzRes = await fetch(`https://api.deezer.com/playlist/${deezerPlaylistId}`);
      if (!dzRes.ok) {
        return NextResponse.json(
          { error: `Playlist Deezer non trouvée ou inaccessible (${dzRes.status}).` },
          { status: 404 }
        );
      }
      
      const dzData = await dzRes.json();
      if (dzData.error) {
        return NextResponse.json(
          { error: `Erreur de l'API Deezer : ${dzData.error.message || JSON.stringify(dzData.error)}` },
          { status: 400 }
        );
      }

      playlistName = dzData.title;
      playlistDescription = dzData.description || "";
      playlistOwnerName = dzData.creator?.name || "Curateur Deezer";
      playlistImageUrl = dzData.picture_medium || dzData.picture_big || null;
      
      let rawTracks = [...(dzData.tracks?.data || [])];
      let nextUrl = dzData.tracks?.next;
      
      // Paginator if playlist is larger than 400 tracks
      while (nextUrl) {
        try {
          const nextRes = await fetch(nextUrl);
          if (!nextRes.ok) break;
          const nextData = await nextRes.json();
          rawTracks.push(...(nextData.data || []));
          nextUrl = nextData.next;
        } catch (err) {
          console.warn("[Analyze API] Failed to fetch next page of Deezer tracks:", err);
          break;
        }
      }
      
      playlistTrackCount = rawTracks.length;
      console.log(`[Analyze API] Total tracks found on Deezer: ${playlistTrackCount}. Starting Spotify ISRC resolution...`);

      // Resolve Spotify Token for ISRC searches
      let spotifyToken = token;
      if (!spotifyToken) {
        try {
          spotifyToken = await getSystemAccessToken();
        } catch (err) {
          try {
            spotifyToken = await getAccessToken();
          } catch (err2) {
            console.error("[Analyze API] Spotify Auth failed during Deezer import:", err2);
          }
        }
      }

      const spotifyTrackIdsToFetchFeatures: string[] = [];
      const spotifyIdToDeezerTrackIndexMap = new Map<string, number>();

      // Match tracks via Spotify Search in parallel batches of 15
      const CONCURRENCY_LIMIT = 15;
      for (let i = 0; i < rawTracks.length; i += CONCURRENCY_LIMIT) {
        const batch = rawTracks.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          batch.map(async (dzTrack, batchIdx) => {
            const overallIdx = i + batchIdx;
            let matchedSpotifyTrack = null;

            // 1. Search by ISRC
            if (dzTrack.isrc && spotifyToken) {
              try {
                const searchUrl = `https://api.spotify.com/v1/search?q=isrc:${encodeURIComponent(dzTrack.isrc)}&type=track&limit=1`;
                const searchRes = await fetch(searchUrl, {
                  headers: { "Authorization": `Bearer ${spotifyToken}` }
                });
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  matchedSpotifyTrack = searchData.tracks?.items?.[0];
                }
              } catch (err: any) {
                console.warn(`Spotify ISRC search error for "${dzTrack.title}":`, err.message);
              }
            }

            // 2. Fallback to title/artist text search
            if (!matchedSpotifyTrack && spotifyToken) {
              try {
                const cleanTitle = dzTrack.title.replace(/"/g, '');
                const cleanArtist = dzTrack.artist?.name?.replace(/"/g, '') || "";
                const query = `track:"${cleanTitle}" artist:"${cleanArtist}"`;
                const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
                
                const searchRes = await fetch(searchUrl, {
                  headers: { "Authorization": `Bearer ${spotifyToken}` }
                });
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  matchedSpotifyTrack = searchData.tracks?.items?.[0];
                }
              } catch (err: any) {
                console.warn(`Spotify text search fallback error for "${dzTrack.title}":`, err.message);
              }
            }

            if (matchedSpotifyTrack) {
              resolvedTracks[overallIdx] = {
                id: matchedSpotifyTrack.id,
                name: matchedSpotifyTrack.name,
                artists: matchedSpotifyTrack.artists.map((a: any) => a.name).join(", "),
                primaryArtist: matchedSpotifyTrack.artists[0]?.name || dzTrack.artist?.name || "",
                primaryArtistId: matchedSpotifyTrack.artists[0]?.id || null,
                albumName: matchedSpotifyTrack.album?.name || dzTrack.album?.title || "Inconnu",
                albumImageUrl: matchedSpotifyTrack.album?.images?.[0]?.url || dzTrack.album?.cover_medium || null,
                durationMs: matchedSpotifyTrack.duration_ms || (dzTrack.duration * 1000),
                previewUrl: matchedSpotifyTrack.preview_url || dzTrack.preview || null,
                isrc: matchedSpotifyTrack.external_ids?.isrc || dzTrack.isrc || null,
                danceability: null,
                energy: null,
                key: null,
                loudness: null,
                mode: null,
                speechiness: null,
                acousticness: null,
                instrumentalness: null,
                liveness: null,
                valence: null,
                tempo: null,
              };
              spotifyTrackIdsToFetchFeatures.push(matchedSpotifyTrack.id);
              spotifyIdToDeezerTrackIndexMap.set(matchedSpotifyTrack.id, overallIdx);
            } else {
              resolvedTracks[overallIdx] = {
                id: `deezer:${dzTrack.id}`,
                name: dzTrack.title,
                artists: dzTrack.artist?.name || "Artiste inconnu",
                primaryArtist: dzTrack.artist?.name || "Artiste inconnu",
                primaryArtistId: null,
                albumName: dzTrack.album?.title || "Inconnu",
                albumImageUrl: dzTrack.album?.cover_medium || null,
                durationMs: dzTrack.duration * 1000,
                previewUrl: dzTrack.preview || null,
                isrc: dzTrack.isrc || null,
                danceability: null,
                energy: null,
                key: null,
                loudness: null,
                mode: null,
                speechiness: null,
                acousticness: null,
                instrumentalness: null,
                liveness: null,
                valence: null,
                tempo: null,
              };
            }
          })
        );
      }

      // Batch fetch audio features for matched Spotify IDs (in groups of 20) from ReccoBeats
      const audioFeaturesMap = new Map<string, any>();
      for (let i = 0; i < spotifyTrackIdsToFetchFeatures.length; i += 20) {
        const batchIds = spotifyTrackIdsToFetchFeatures.slice(i, i + 20);
        try {
          const reccoRes = await fetch(
            `https://api.reccobeats.com/v1/audio-features?ids=${batchIds.join(",")}`,
            { cache: "no-store" }
          );
          if (reccoRes.ok) {
            const reccoData = await reccoRes.json();
            reccoData.content?.forEach((feat: any) => {
              if (feat && feat.href) {
                const spotifyId = feat.href.split("/").pop();
                if (spotifyId) {
                  audioFeaturesMap.set(spotifyId, feat);
                }
              }
            });
          }
        } catch (err: any) {
          console.warn("[Analyze API] Failed to fetch features from ReccoBeats during Deezer import:", err.message);
        }
      }

      // Merge resolved audio features
      for (const spotifyId of spotifyTrackIdsToFetchFeatures) {
        const trackIndex = spotifyIdToDeezerTrackIndexMap.get(spotifyId);
        if (trackIndex !== undefined) {
          const feat = audioFeaturesMap.get(spotifyId);
          if (feat) {
            resolvedTracks[trackIndex].danceability = feat.danceability ?? null;
            resolvedTracks[trackIndex].energy = feat.energy ?? null;
            resolvedTracks[trackIndex].key = feat.key ?? null;
            resolvedTracks[trackIndex].loudness = feat.loudness ?? null;
            resolvedTracks[trackIndex].mode = feat.mode ?? null;
            resolvedTracks[trackIndex].speechiness = feat.speechiness ?? null;
            resolvedTracks[trackIndex].acousticness = feat.acousticness ?? null;
            resolvedTracks[trackIndex].instrumentalness = feat.instrumentalness ?? null;
            resolvedTracks[trackIndex].liveness = feat.liveness ?? null;
            resolvedTracks[trackIndex].valence = feat.valence ?? null;
            resolvedTracks[trackIndex].tempo = feat.tempo ?? null;
          }
        }
      }

    } else {
      // --- SPOTIFY IMPORT FLOW ---
      const playlistData = await fetchPlaylistData(playlistId, token);
      playlistName = playlistData.name;
      playlistDescription = playlistData.description || "";
      playlistOwnerName = playlistData.ownerName || "";
      playlistImageUrl = playlistData.imageUrl || "";
      playlistTrackCount = playlistData.trackCount;
      resolvedTracks = playlistData.tracks;
    }

    // 3. Enregistrer/Mettre à jour les données dans la base SQLite
    await prisma.$transaction(async (tx) => {
      // Enregistrer la playlist
      await tx.playlist.upsert({
        where: { id: playlistId },
        update: {
          name: playlistName,
          description: playlistDescription,
          ownerName: playlistOwnerName,
          imageUrl: playlistImageUrl,
          trackCount: playlistTrackCount,
          updatedAt: new Date(),
        },
        create: {
          id: playlistId,
          name: playlistName,
          description: playlistDescription,
          ownerName: playlistOwnerName,
          imageUrl: playlistImageUrl,
          trackCount: playlistTrackCount,
        },
      });

      // Enregistrer/Mettre à jour chaque morceau
      for (const track of resolvedTracks) {
        await tx.track.upsert({
          where: { id: track.id },
          update: {
            name: track.name,
            artists: track.artists,
            primaryArtist: track.primaryArtist,
            primaryArtistId: track.primaryArtistId,
            albumName: track.albumName,
            albumImageUrl: track.albumImageUrl,
            durationMs: track.durationMs,
            previewUrl: track.previewUrl,
            isrc: track.isrc,
            danceability: track.danceability,
            energy: track.energy,
            key: track.key,
            loudness: track.loudness,
            mode: track.mode,
            speechiness: track.speechiness,
            acousticness: track.acousticness,
            instrumentalness: track.instrumentalness,
            liveness: track.liveness,
            valence: track.valence,
            tempo: track.tempo,
          },
          create: {
            id: track.id,
            name: track.name,
            artists: track.artists,
            primaryArtist: track.primaryArtist,
            primaryArtistId: track.primaryArtistId,
            albumName: track.albumName,
            albumImageUrl: track.albumImageUrl,
            durationMs: track.durationMs,
            previewUrl: track.previewUrl,
            isrc: track.isrc,
            danceability: track.danceability,
            energy: track.energy,
            key: track.key,
            loudness: track.loudness,
            mode: track.mode,
            speechiness: track.speechiness,
            acousticness: track.acousticness,
            instrumentalness: track.instrumentalness,
            liveness: track.liveness,
            valence: track.valence,
            tempo: track.tempo,
          },
        });
      }

      // Supprimer les anciennes relations
      await tx.playlistTrack.deleteMany({
        where: { playlistId: playlistId },
      });

      // Créer les nouvelles relations de liaison (en évitant les doublons de morceaux)
      const insertedTrackIds = new Set<string>();
      for (let index = 0; index < resolvedTracks.length; index++) {
        const track = resolvedTracks[index];
        if (insertedTrackIds.has(track.id)) {
          continue; // Éviter la contrainte unique (playlistId, trackId) si le morceau est en double
        }
        insertedTrackIds.add(track.id);

        await tx.playlistTrack.create({
          data: {
            playlistId: playlistId,
            trackId: track.id,
            position: index,
          },
        });
      }
    });

    return NextResponse.json({
      id: playlistId,
      name: playlistName,
      description: playlistDescription,
      ownerName: playlistOwnerName,
      imageUrl: playlistImageUrl,
      trackCount: playlistTrackCount,
      tracks: resolvedTracks,
      source: isDeezer ? "api_deezer" : "api",
    });
  } catch (error: any) {
    console.error("Erreur lors de l'analyse de la playlist :", error);
    return NextResponse.json(
      { error: `Erreur interne du serveur : ${error.message || error}` },
      { status: 500 }
    );
  }
}
