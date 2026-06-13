// src/app/api/track-genres/batch-resolve/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { getAccessToken, getSystemAccessToken } from "@/lib/spotify";
import { resolveMusicBrainzGenres } from "@/lib/genreResolver";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trackIds } = body;

    if (!trackIds || !Array.isArray(trackIds)) {
      return NextResponse.json(
        { error: "Paramètre manquant ou invalide : trackIds doit être un tableau." },
        { status: 400 }
      );
    }

    // 1. Fetch the requested tracks from DB
    const tracks = await prisma.track.findMany({
      where: { id: { in: trackIds } }
    });

    const responseGenres: Record<string, string> = {};
    const missingTracks = [];

    // Check which tracks have genres cached in DB, and which are missing
    for (const track of tracks) {
      if (track.genres) {
        responseGenres[track.id] = track.genres;
      } else {
        missingTracks.push(track);
      }
    }

    if (missingTracks.length > 0) {
      console.log(`[Batch Resolve API] Found ${missingTracks.length} tracks without genres. Starting batch Spotify resolution...`);
      
      // Get user session or admin system token to prevent 403 Forbidden on Spotify API
      const session: any = await getServerSession(authOptions);
      let spotifyToken = session?.accessToken;
      if (!spotifyToken) {
        try {
          spotifyToken = await getSystemAccessToken();
        } catch (err: any) {
          console.warn("[Batch Resolve API] System admin token not configured yet, falling back to Client Credentials...");
          spotifyToken = await getAccessToken();
        }
      }

      // Collect unique artist names to search on Spotify
      const uniqueArtistNames = Array.from(new Set(
        missingTracks.map(track => {
          return track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "");
        }).filter(Boolean)
      ));

      const artistResultsMap: Record<string, { spotifyArtistId: string | null }> = {};
      const artistGenresMap: Record<string, string> = {};

      // 1. Process Spotify artist searches in parallel batches of 15 to resolve Spotify Artist IDs
      const CONCURRENCY_LIMIT = 15;
      for (let i = 0; i < uniqueArtistNames.length; i += CONCURRENCY_LIMIT) {
        const batchNames = uniqueArtistNames.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(
          batchNames.map(async (artistName) => {
            try {
              // Search Spotify by raw artist name (without strict filters)
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
                  artistResultsMap[artistName.toLowerCase()] = {
                    spotifyArtistId: artistItem.id || null
                  };
                  console.log(`[Batch Resolve API] Resolved Spotify ID for "${artistName}": ${artistItem.id}`);
                } else {
                  artistResultsMap[artistName.toLowerCase()] = { spotifyArtistId: null };
                }
              } else {
                const errText = await searchRes.text();
                console.warn(`[Batch Resolve API] Spotify search failed for "${artistName}": ${searchRes.status} - ${errText}`);
                artistResultsMap[artistName.toLowerCase()] = { spotifyArtistId: null };
              }
            } catch (err: any) {
              console.error(`[Batch Resolve API] Error searching artist "${artistName}" on Spotify:`, err.message);
              artistResultsMap[artistName.toLowerCase()] = { spotifyArtistId: null };
            }
          })
        );
      }

      // 2. Resolve genres and update database for each missing track
      for (const track of missingTracks) {
        const artistName = track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "");
        const artistKey = artistName.toLowerCase();
        
        const spotifyResult = artistResultsMap[artistKey] || { spotifyArtistId: null };
        const resolvedSpotifyArtistId = spotifyResult.spotifyArtistId || track.primaryArtistId;

        let genresString = "";

        // Check if we already resolved genres for this artist in-memory
        if (artistGenresMap[artistKey] !== undefined) {
          genresString = artistGenresMap[artistKey];
        } else {
          // Check if there is an existing track by the same artist in the DB that already has genres
          const existingDbTrack = await prisma.track.findFirst({
            where: {
              artists: { contains: artistName },
              genres: { not: "" }
            }
          });

          if (existingDbTrack && existingDbTrack.genres) {
            genresString = existingDbTrack.genres;
            artistGenresMap[artistKey] = genresString;
            console.log(`[Batch Resolve API] Reused DB cached genres for "${artistName}": ${genresString}`);
          } else {
            // Resolve genres using MusicBrainz as a fallback
            try {
              console.log(`[Batch Resolve API] DB cache miss for genres of "${artistName}". Querying MusicBrainz...`);
              const mbGenres = await resolveMusicBrainzGenres(track.name, artistName);
              genresString = mbGenres.join(", ");
              artistGenresMap[artistKey] = genresString;
              console.log(`[Batch Resolve API] Resolved MusicBrainz genres for "${track.name}" by "${artistName}": ${genresString}`);
            } catch (err: any) {
              console.error(`[Batch Resolve API] Error resolving MusicBrainz genres for "${artistName}":`, err.message);
              artistGenresMap[artistKey] = "";
            }
          }
        }

        responseGenres[track.id] = genresString;
        
        await prisma.track.update({
          where: { id: track.id },
          data: {
            genres: genresString,
            primaryArtistId: resolvedSpotifyArtistId
          }
        });
      }
    }

    return NextResponse.json({
      genres: responseGenres
    });

  } catch (error: any) {
    console.error("[Batch Resolve API] Error:", error);
    return NextResponse.json(
      { error: `Erreur interne : ${error.message || error}` },
      { status: 500 }
    );
  }
}
