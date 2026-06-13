import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchUserPlaylists } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session: any = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    return NextResponse.json(
      { error: "Non autorisé. Veuillez vous connecter." },
      { status: 401 }
    );
  }

  try {
    const playlists = await fetchUserPlaylists(token);
    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des playlists :", error);
    return NextResponse.json(
      { error: `Erreur serveur : ${error.message || error}` },
      { status: 500 }
    );
  }
}
