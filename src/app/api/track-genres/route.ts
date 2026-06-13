// src/app/api/track-genres/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAccessToken } from "@/lib/spotify";
import { resolveMusicBrainzGenres } from "@/lib/genreResolver";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get("trackId");
  const trackName = searchParams.get("trackName");
  const artistName = searchParams.get("artistName");

  if (!trackId || !trackName || !artistName) {
    return NextResponse.json(
      { error: "Paramètres manquants : trackId, trackName et artistName sont requis." },
      { status: 400 }
    );
  }

  try {
    // 1. Check database first
    const dbTrack = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (dbTrack && dbTrack.genres) {
      return NextResponse.json({
        trackId,
        genres: dbTrack.genres,
        source: "cache"
      });
    }

    // 2. Resolve via Spotify Artist Search (for ID) and MusicBrainz (for Genres)
    console.log(`[Track Genres API] Cache miss. Fetching Spotify artist ID and MusicBrainz genres for: "${artistName}"`);
    let resolvedSpotifyArtistId: string | null = null;
    let resolvedGenres: string[] = [];
    
    // 2.1 Fetch Spotify ID
    try {
      const spotifyToken = await getAccessToken();
      const query = artistName;
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1`;
      
      const searchRes = await fetch(searchUrl, {
        headers: {
          "Authorization": `Bearer ${spotifyToken}`
        }
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const artistItem = searchData.artists?.items?.[0];
        if (artistItem) {
          resolvedSpotifyArtistId = artistItem.id || null;
          console.log(`[Track Genres API] Found Spotify ID for "${artistName}": ${resolvedSpotifyArtistId}`);
        }
      } else {
        console.warn(`[Track Genres API] Spotify search failed with status ${searchRes.status}`);
      }
    } catch (err: any) {
      console.error(`[Track Genres API] Spotify request error:`, err.message);
    }

    // 2.2 Fetch MusicBrainz Genres
    try {
      resolvedGenres = await resolveMusicBrainzGenres(trackName, artistName);
      console.log(`[Track Genres API] Resolved MusicBrainz genres for "${trackName}" by "${artistName}":`, resolvedGenres);
    } catch (err: any) {
      console.error(`[Track Genres API] MusicBrainz resolution error:`, err.message);
    }

    const genresString = resolvedGenres.join(", ");

    // 3. Update database if track exists, or create a stub if not
    if (dbTrack) {
      await prisma.track.update({
        where: { id: trackId },
        data: {
          genres: genresString,
          primaryArtistId: resolvedSpotifyArtistId || dbTrack.primaryArtistId
        }
      });
    } else {
      await prisma.track.create({
        data: {
          id: trackId,
          name: trackName,
          artists: artistName,
          albumName: "Inconnu",
          durationMs: 0,
          genres: genresString,
          primaryArtistId: resolvedSpotifyArtistId
        }
      });
    }

    return NextResponse.json({
      trackId,
      genres: genresString,
      source: "api_spotify"
    });
  } catch (error: any) {
    console.error(`[Track Genres API] Error resolving genres for ${trackId}:`, error);
    return NextResponse.json(
      { error: `Erreur interne : ${error.message || error}` },
      { status: 500 }
    );
  }
}
