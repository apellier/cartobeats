// src/app/api/explore-musicbrainz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchMusicBrainz } from "@/lib/musicbrainz";

const MUSICBRAINZ_API_BASE_URL = "https://musicbrainz.org/ws/2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre");
  const label = searchParams.get("label");
  const startYear = searchParams.get("startYear") || "1970";
  const endYear = searchParams.get("endYear") || "1990";

  if (!genre) {
    return NextResponse.json(
      { error: "Le paramètre 'genre' est requis." },
      { status: 400 }
    );
  }

  try {
    // Build Lucene query
    let queryParts = [`tag:"${genre.replace(/"/g, '')}"`];
    
    if (label) {
      queryParts.push(`label:"${label.replace(/"/g, '')}"`);
    }
    
    queryParts.push(`date:[${startYear} TO ${endYear}]`);
    
    const query = queryParts.join(" AND ");
    const url = `${MUSICBRAINZ_API_BASE_URL}/release/?query=${encodeURIComponent(query)}&limit=15&fmt=json`;
    
    console.log(`[Explore MusicBrainz API] Querying: ${url}`);
    
    const response = await fetchMusicBrainz(url);
    
    if (!response.ok) {
      throw new Error(`MusicBrainz API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    const releases = data.releases || [];

    // Map releases to a clean, simplified format
    const results = releases.map((rel: any) => {
      const artist = rel["artist-credit"]?.[0]?.name || "Inconnu";
      const releaseLabel = rel["label-info-list"]?.[0]?.label?.name || label || "Indépendant";
      const year = rel.date ? rel.date.substring(0, 4) : "Inconnu";
      
      return {
        id: rel.id,
        title: rel.title,
        artist,
        label: releaseLabel,
        year,
        trackCount: rel["track-count"] || 0
      };
    });

    return NextResponse.json({
      query,
      results
    });
  } catch (error: any) {
    console.error("[Explore MusicBrainz API] Error:", error);
    return NextResponse.json(
      { error: `Erreur d'exploration : ${error.message || error}` },
      { status: 500 }
    );
  }
}
