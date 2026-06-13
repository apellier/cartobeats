import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId } = body;

    if (!trackId) {
      return NextResponse.json({ error: "Identifiant du morceau manquant." }, { status: 400 });
    }

    // 1. Récupérer le morceau en base de données
    const track = await prisma.track.findUnique({
      where: { id: trackId }
    });

    if (!track) {
      return NextResponse.json({ error: "Morceau non trouvé." }, { status: 404 });
    }

    // 2. Trouver la preview Deezer du morceau
    let previewUrl = track.previewUrl;
    
    if (!previewUrl) {
      // Rechercher la preview sur Deezer via ISRC ou text query
      const artistsEncoded = encodeURIComponent(track.artists);
      const nameEncoded = encodeURIComponent(track.name);
      const isrcParam = track.isrc ? `&isrc=${track.isrc}` : "";
      
      // Construire l'URL absolue interne vers notre route proxy
      const previewProxyUrl = `${request.nextUrl.origin}/api/preview?artists=${artistsEncoded}&name=${nameEncoded}${isrcParam}`;
      
      const proxyRes = await fetch(previewProxyUrl);
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        previewUrl = proxyData.previewUrl;
      }
    }

    if (!previewUrl) {
      return NextResponse.json({ 
        error: "Impossible de trouver un extrait audio de 30 secondes pour ce morceau sur Spotify ou Deezer." 
      }, { status: 404 });
    }

    // 3. Télécharger l'extrait audio en tant que Blob
    console.log(`Téléchargement de l'extrait audio : ${previewUrl}`);
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      throw new Error(`Échec du téléchargement du fichier audio (${audioRes.status})`);
    }
    const audioBlob = await audioRes.blob();

    // 4. Envoyer le fichier audio à ReccoBeats pour analyse
    console.log("Envoi du fichier audio à ReccoBeats pour analyse...");
    const formData = new FormData();
    formData.append("audioFile", audioBlob, "preview.mp3");

    let attempts = 0;
    const maxAttempts = 5;
    let analysisData = null;

    while (attempts < maxAttempts) {
      const analysisRes = await fetch("https://api.reccobeats.com/v1/analysis/audio-features", {
        method: "POST",
        body: formData
      });

      if (analysisRes.status === 429) {
        attempts++;
        const errText = await analysisRes.text();
        let retryAfterSeconds = 5;
        const match = errText.match(/retry after (\d+) seconds/i);
        if (match) {
          retryAfterSeconds = parseInt(match[1], 10);
        }
        console.warn(`[Reconstruct API] ReccoBeats 429 rate limit. Waiting ${retryAfterSeconds}s before retry (attempt ${attempts}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, (retryAfterSeconds * 1000) + 500));
        continue;
      }

      if (!analysisRes.ok) {
        const errText = await analysisRes.text();
        throw new Error(`Échec de l'analyse ReccoBeats (${analysisRes.status}) : ${errText}`);
      }

      analysisData = await analysisRes.json();
      break;
    }

    if (!analysisData) {
      throw new Error("L'analyse ReccoBeats a échoué après plusieurs tentatives de contournement du taux limite (429).");
    }
    console.log("Caractéristiques estimées reçues :", analysisData);

    // 5. Enregistrer les caractéristiques dans la base SQLite
    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        acousticness: analysisData.acousticness ?? null,
        danceability: analysisData.danceability ?? null,
        energy: analysisData.energy ?? null,
        instrumentalness: analysisData.instrumentalness ?? null,
        liveness: analysisData.liveness ?? null,
        loudness: analysisData.loudness ?? null,
        speechiness: analysisData.speechiness ?? null,
        tempo: analysisData.tempo ?? null,
        valence: analysisData.valence ?? null
      }
    });

    return NextResponse.json({
      success: true,
      track: updatedTrack
    });

  } catch (error: any) {
    console.error("Erreur lors de la reconstruction du morceau :", error);
    return NextResponse.json({ 
      error: error.message || "Échec de l'estimation des caractéristiques acoustiques." 
    }, { status: 500 });
  }
}
