// src/app/api/track-genres/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    // Fetch tracks matching the IDs that have genres cached
    const tracks = await prisma.track.findMany({
      where: {
        id: { in: trackIds },
        genres: { not: null }
      },
      select: {
        id: true,
        genres: true
      }
    });

    // Convert to a dictionary: { trackId: genresString }
    const cacheMap: Record<string, string> = {};
    for (const track of tracks) {
      if (track.genres) {
        cacheMap[track.id] = track.genres;
      }
    }

    return NextResponse.json({
      genres: cacheMap
    });
  } catch (error: any) {
    console.error("[Track Genres Batch API] Error fetching batch genres:", error);
    return NextResponse.json(
      { error: `Erreur interne : ${error.message || error}` },
      { status: 500 }
    );
  }
}
