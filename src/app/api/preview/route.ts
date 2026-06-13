import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isrc = searchParams.get("isrc");
  const artists = searchParams.get("artists") || "";
  const name = searchParams.get("name") || "";

  if (!isrc && !artists && !name) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  try {
    // 1. Essayer d'abord la recherche exacte par ISRC si disponible
    if (isrc) {
      const isrcUrl = `https://api.deezer.com/track/isrc:${isrc}`;
      const res = await fetch(isrcUrl);
      if (res.ok) {
        const track = await res.json();
        if (track && track.preview && !track.error) {
          // Vérification simple de cohérence (titre ou artiste similaire)
          const cleanTrackTitle = (track.title || "").toLowerCase();
          const cleanQueryTitle = name.toLowerCase();
          const cleanTrackArtist = (track.artist?.name || "").toLowerCase();
          const cleanQueryArtist = artists.toLowerCase();

          const titleMatch = cleanTrackTitle.includes(cleanQueryTitle) || cleanQueryTitle.includes(cleanTrackTitle);
          const artistMatch = cleanTrackArtist.includes(cleanQueryArtist) || cleanQueryArtist.includes(cleanTrackArtist);

          // Si le titre ou l'artiste concorde, on fait confiance à l'ISRC
          if (titleMatch || artistMatch) {
            return NextResponse.json({ previewUrl: track.preview, source: "deezer_isrc" });
          }
        }
      }
    }

    // 2. Si l'ISRC échoue ou n'est pas cohérent, fallback sur la recherche textuelle
    const query = `${artists} - ${name}`;
    const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}`;
    const resSearch = await fetch(searchUrl);
    
    if (resSearch.ok) {
      const searchData = await resSearch.json();
      if (searchData.data && searchData.data.length > 0) {
        const match = searchData.data[0];
        if (match.preview) {
          return NextResponse.json({ previewUrl: match.preview, source: "deezer_search" });
        }
      }
    }

    return NextResponse.json({ previewUrl: null, source: "none" });
  } catch (error) {
    console.error("Erreur lors de la récupération de la preview Deezer :", error);
    return NextResponse.json({ previewUrl: null, error: "Deezer lookup failed" });
  }
}
