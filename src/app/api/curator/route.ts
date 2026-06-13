import { NextRequest, NextResponse } from "next/server";
import { getSystemAccessToken } from "@/lib/spotify";
import { prisma } from "@/lib/db";
import { getDominantTrackGenre } from "@/lib/genreResolver";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return NextResponse.json(
      { error: "Veuillez fournir un identifiant utilisateur." },
      { status: 400 }
    );
  }

  let token: string;
  try {
    token = await getSystemAccessToken();
  } catch (err: any) {
    console.error("Échec de l'obtention du token système pour l'API Curator :", err.message);
    return NextResponse.json(
      { error: "Authentification système Spotify indisponible." },
      { status: 500 }
    );
  }

  try {
    // 1. Récupérer le profil public de l'utilisateur
    const userRes = await fetch(`https://api.spotify.com/v1/users/${userId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    let profile = {
      id: userId,
      displayName: userId,
      imageUrl: null as string | null
    };

    if (userRes.ok) {
      const userData = await userRes.json();
      profile.displayName = userData.display_name || userData.id || userId;
      profile.imageUrl = userData.images && userData.images.length > 0 ? userData.images[0].url : null;
    } else {
      console.warn(`Impossible de charger le profil de ${userId} (Code ${userRes.status}). Utilisation des données de secours.`);
    }

    // 2. Récupérer les playlists publiques de l'utilisateur
    const playlistsRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!playlistsRes.ok) {
      throw new Error(`Erreur lors de la récupération des playlists de l'utilisateur (${playlistsRes.status})`);
    }

    const playlistsData = await playlistsRes.json();
    const playlists = (playlistsData.items || [])
      .filter((item: any) => item !== null) // Parfois des éléments nuls apparaissent
      .map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || null,
        imageUrl: item.images && item.images.length > 0 ? item.images[0].url : null,
        trackCount: item.tracks?.total || 0,
        ownerId: item.owner?.id || userId
      }));

    // 3. Récupérer les données d'analyse locales pour ces playlists
    const playlistIds = playlists.map((p: any) => p.id);
    const analyzedPlaylists = await prisma.playlist.findMany({
      where: { id: { in: playlistIds } },
      include: {
        tracks: {
          include: {
            track: true
          }
        }
      }
    });

    let stats = null;

    if (analyzedPlaylists.length > 0) {
      const allTracks: any[] = [];
      const trackMap = new Map<string, any>();
      
      for (const pl of analyzedPlaylists) {
        for (const plt of pl.tracks) {
          if (!trackMap.has(plt.track.id)) {
            trackMap.set(plt.track.id, plt.track);
            allTracks.push(plt.track);
          }
        }
      }

      if (allTracks.length > 0) {
        const genreCounts: Record<string, number> = {};
        let totalWithGenres = 0;
        
        for (const track of allTracks) {
          if (track.genres) {
            totalWithGenres++;
            const dominantMacro = getDominantTrackGenre(track.genres, "macro");
            genreCounts[dominantMacro] = (genreCounts[dominantMacro] || 0) + 1;
          }
        }

        let topGenre = "autre";
        let maxCount = 0;
        for (const [genre, count] of Object.entries(genreCounts)) {
          if (count > maxCount && genre !== "autre") {
            maxCount = count;
            topGenre = genre;
          }
        }

        const topGenreRatio = totalWithGenres > 0 ? (maxCount / totalWithGenres) : 0;
        
        let specialty = "Sélecteur Éclectique";
        if (topGenreRatio > 0.35) {
          const specialtyLabels: Record<string, string> = {
            "rock": "Archiviste Rock & Métal",
            "pop": "Conservateur Pop & Mélodies",
            "electronic": "Explorateur Électronique",
            "hip-hop": "Spécialiste Hip-Hop & Beats",
            "jazz_blues": "Mélomane Jazz & Soul",
            "classical_ambient": "Esthète Classique & B.O.",
            "folk_acoustic": "Gardien Folk & Acoustique",
            "reggae_latin_world": "Curateur Reggae & World"
          };
          specialty = specialtyLabels[topGenre] || specialty;
        }

        // Calculate Maintenance Score (percentage of non-outliers)
        const globalDist: Record<string, number> = {};
        for (const track of allTracks) {
          if (track.genres) {
            const dom = getDominantTrackGenre(track.genres, "macro");
            globalDist[dom] = (globalDist[dom] || 0) + 1;
          }
        }
        
        let intruderCount = 0;
        for (const track of allTracks) {
          if (track.genres) {
            const dom = getDominantTrackGenre(track.genres, "macro");
            const count = globalDist[dom] || 0;
            const pct = (count / allTracks.length) * 100;
            if (pct < 12.0 && dom !== "autre") {
              intruderCount++;
            }
          }
        }
        
        const maintenanceScore = Math.max(10, Math.round((1 - (intruderCount / allTracks.length)) * 100));

        // Obscurity Index
        let nicheCount = 0;
        for (const track of allTracks) {
          if (track.genres) {
            const tags = track.genres.split(",").map((t: string) => t.trim().toLowerCase());
            const hasNicheTag = tags.some((t: string) => 
              t !== "rock" && t !== "pop" && t !== "rap" && t !== "electronic" && t !== "house" && t !== "hip hop"
            );
            if (hasNicheTag) nicheCount++;
          }
        }
        const obscurityIndex = Math.min(98, Math.max(30, Math.round((nicheCount / allTracks.length) * 100)));

        stats = {
          specialty,
          maintenanceScore,
          obscurityIndex,
          analyzedCount: analyzedPlaylists.length
        };
      }
    }

    return NextResponse.json({
      profile,
      playlists,
      stats
    });

  } catch (err: any) {
    console.error("Erreur dans l'API api/curator :", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de la récupération des données curateur." },
      { status: 500 }
    );
  }
}
