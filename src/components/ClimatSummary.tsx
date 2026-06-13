import React from "react";
import { useTranslation } from "../context/LanguageContext";

interface Track {
  id: string;
  name: string;
  artists: string;
  albumName: string;
  albumImageUrl: string | null;
  durationMs: number;
  previewUrl: string | null;
  isrc: string | null;
  valence: number | null;
  energy: number | null;
  danceability: number | null;
  acousticness: number | null;
  tempo: number | null;
  loudness: number | null;
  speechiness: number | null;
  instrumentalness: number | null;
  liveness: number | null;
  key: number | null;
  mode: number | null;
}

interface ClimatSummaryProps {
  tracks: Track[];
}

export default function ClimatSummary({ tracks }: ClimatSummaryProps) {
  const { t } = useTranslation();

  if (tracks.length === 0) return null;

  // Filtrer les morceaux valides (qui ont des caractéristiques audio)
  const mappedTracks = tracks.filter((t) => t.valence !== null && t.energy !== null) as (Track & { valence: number; energy: number; danceability: number; acousticness: number; tempo: number; instrumentalness: number | null })[];
  
  if (mappedTracks.length === 0) {
    return (
      <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
        <span className="neo-badge" style={{ backgroundColor: "var(--color-orange)", marginBottom: "0.5rem" }}>
          Ambiance Indéterminée 🌧️
        </span>
        <h3 style={{ marginBottom: "0.75rem", fontSize: "1.2rem" }}>Ambiance de la Playlist</h3>
        <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.5 }}>
          Aucun morceau de cette playlist n'a pu être cartographié (données indisponibles sur Spotify et ReccoBeats). L'ambiance sonore ne peut pas être déterminée.
        </p>
      </div>
    );
  }

  // 1. Calculer les moyennes sur les morceaux cartographiés
  const total = mappedTracks.length;
  let sumValence = 0;
  let sumEnergy = 0;
  let sumAcousticness = 0;
  let sumTempo = 0;
  let sumDanceability = 0;
  let sumInstrumentalness = 0;
  let tracksWithInstrumentalness = 0;

  // Compteurs par quadrant
  let q1 = 0; // Solaire (Valence >= 0.5, Energy >= 0.5)
  let q2 = 0; // Tempétueux (Valence < 0.5, Energy >= 0.5)
  let q3 = 0; // Brumeux (Valence < 0.5, Energy < 0.5)
  let q4 = 0; // Serein (Valence >= 0.5, Energy < 0.5)

  mappedTracks.forEach((t) => {
    sumValence += t.valence;
    sumEnergy += t.energy;
    sumAcousticness += t.acousticness;
    sumTempo += t.tempo;
    sumDanceability += t.danceability;
    if (t.instrumentalness !== null) {
      sumInstrumentalness += t.instrumentalness;
      tracksWithInstrumentalness++;
    }

    if (t.valence >= 0.5 && t.energy >= 0.5) q1++;
    else if (t.valence < 0.5 && t.energy >= 0.5) q2++;
    else if (t.valence < 0.5 && t.energy < 0.5) q3++;
    else q4++;
  });

  const avgValence = sumValence / total;
  const avgEnergy = sumEnergy / total;
  const avgAcousticness = sumAcousticness / total;
  const avgTempo = sumTempo / total;
  const avgDanceability = sumDanceability / total;
  const avgInstrumentalness = tracksWithInstrumentalness > 0 ? sumInstrumentalness / tracksWithInstrumentalness : 0;

  const pctQ1 = Math.round((q1 / total) * 100);
  const pctQ2 = Math.round((q2 / total) * 100);
  const pctQ3 = Math.round((q3 / total) * 100);
  const pctQ4 = Math.round((q4 / total) * 100);

  // Déterminer le climat dominant
  let dominantClimat = "Indéterminé";
  let dominantColor = "var(--color-yellow)";
  let description = "";

  const maxVal = Math.max(q1, q2, q3, q4);

  if (maxVal === q1) {
    dominantClimat = "Solaire / Radieux ☀️";
    dominantColor = "var(--color-pink)";
    description = "Votre playlist est majoritairement optimiste, entraînante et chaleureuse. Elle convient parfaitement aux activités dynamiques, aux moments de partage festif, ou pour instaurer une ambiance énergique et positive.";
  } else if (maxVal === q2) {
    dominantClimat = "Tempétueux / Électrisant ⚡";
    dominantColor = "var(--color-orange)";
    description = "Dominée par une énergie forte et des sonorités sombres ou mélancoliques, votre playlist insuffle de l'intensité. Elle est idéale pour le sport, la concentration sous haute tension, ou pour s'immerger dans des récits musicaux complexes (Rock, Rap alternatif, Techno).";
  } else if (maxVal === q3) {
    dominantClimat = "Brumeux / Mélancolique 🌧️";
    dominantColor = "var(--color-blue)";
    description = "L'ambiance générale est calme, introspective et empreinte de nostalgie. Composé de sons lofi, acoustiques ou ambiants, cet espace d'écoute est un refuge propice à la détente solitaire, à la lecture ou à l'apaisement.";
  } else {
    dominantClimat = "Serein / Apaisant 🍃";
    dominantColor = "var(--color-green)";
    description = "Une brise apaisante et lumineuse traverse votre sélection. Calme mais chaleureuse, elle réunit des morceaux doux (Jazz chill, acoustique pop, lofi lumineux) pour accompagner le travail tranquille ou la transition vers le sommeil.";
  }

  // Analyser la diversité (friction algorithmique du climat)
  const quadrantsWithTracks = [q1, q2, q3, q4].filter(q => q > 0).length;
  let coherenceScore = "";
  if (quadrantsWithTracks === 1) {
    coherenceScore = "Ambiance Monofocale (Très cohérente, aucune dissonance). Idéale pour un usage très ciblé (ex: travailler en fond).";
  } else if (quadrantsWithTracks === 2) {
    coherenceScore = "Ambiance Tempérée (Bonne transition, transitions douces).";
  } else if (quadrantsWithTracks === 3) {
    coherenceScore = "Ambiance Changeante (Hybride, plusieurs moods se côtoient).";
  } else {
    coherenceScore = "Ambiance Éclectique / Instable (Forte variété, risque de friction sensorielle). Rappelle l'imprévisibilité de la Discover Weekly.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Climat Dominant */}
      <div className="neo-card animate-pop" style={{ 
        backgroundColor: "#ffffff", 
        borderLeft: `12px solid ${dominantColor}`
      }}>
        <span className="neo-badge" style={{ backgroundColor: dominantColor, marginBottom: "0.5rem" }}>
          Ambiance Dominante
        </span>
        <h2 style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
          {dominantClimat}
        </h2>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "#444", marginBottom: "1rem" }}>
          {description}
        </p>
        <div style={{ 
          fontSize: "0.85rem", 
          fontWeight: 700, 
          color: "#666",
          borderTop: "2px dashed #eee",
          paddingTop: "0.75rem"
        }}>
          COHÉRENCE SENSORIELLE : <span style={{ color: "var(--foreground)" }}>{coherenceScore}</span>
        </div>
      </div>

      {/* Distribution des Quadrants */}
      <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
          Distribution des Atmosphères 📊
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Solaire */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>
              <span>☀️ SOLAIRE (Énergie +, Valence +)</span>
              <span>{pctQ1}%</span>
            </div>
            <div style={{ height: "16px", border: "var(--border-thin)", borderRadius: "4px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${pctQ1}%`, backgroundColor: "var(--color-pink)" }} />
            </div>
          </div>

          {/* Tempétueux */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>
              <span>⚡ TEMPÉTUEUX (Énergie +, Valence -)</span>
              <span>{pctQ2}%</span>
            </div>
            <div style={{ height: "16px", border: "var(--border-thin)", borderRadius: "4px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${pctQ2}%`, backgroundColor: "var(--color-orange)" }} />
            </div>
          </div>

          {/* Brumeux */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>
              <span>🌧️ BRUMEUX (Énergie -, Valence -)</span>
              <span>{pctQ3}%</span>
            </div>
            <div style={{ height: "16px", border: "var(--border-thin)", borderRadius: "4px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${pctQ3}%`, backgroundColor: "var(--color-blue)" }} />
            </div>
          </div>

          {/* Serein */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 700, marginBottom: "2px" }}>
              <span>🍃 SEREIN (Énergie -, Valence +)</span>
              <span>{pctQ4}%</span>
            </div>
            <div style={{ height: "16px", border: "var(--border-thin)", borderRadius: "4px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${pctQ4}%`, backgroundColor: "var(--color-green)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Caractéristiques Audio Moyennes */}
      <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
        <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
          {t("playlist.metriqueMoyenneTitle")}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1rem" }}>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>VALENCE MOYENNE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgValence * 100)}%</div>
          </div>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>ÉNERGIE GLOBALE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgEnergy * 100)}%</div>
          </div>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>TEMPO MOYEN</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgTempo)} <span style={{ fontSize: "0.85rem" }}>BPM</span></div>
          </div>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>DANCEABILITY</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgDanceability * 100)}%</div>
          </div>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>ACOUSTICNESS</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgAcousticness * 100)}%</div>
          </div>
          <div style={{ border: "var(--border-thin)", padding: "0.5rem 0.75rem", borderRadius: "8px", backgroundColor: "var(--bg-main)", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#666" }}>INSTRUMENTALITÉ</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{Math.round(avgInstrumentalness * 100)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
