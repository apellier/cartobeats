"use client";

import React from "react";
import { useTranslation, formatKeyMode } from "@/context/LanguageContext";

interface Track {
  id: string;
  name: string;
  artists: string;
  primaryArtist?: string | null;
  primaryArtistId?: string | null;
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
  genres?: string | null;
}

interface TrackInspectorProps {
  selectedTrack: Track;
  playingTrackId: string | null;
  loadingTrackId: string | null;
  isReconstructing: boolean;
  onPlayToggle: (track: Track) => void;
  onReconstructFeatures: (trackId: string) => void;
  trackGenres: Record<string, string>;
}

export default function TrackInspector({
  selectedTrack,
  playingTrackId,
  loadingTrackId,
  isReconstructing,
  onPlayToggle,
  onReconstructFeatures,
  trackGenres
}: TrackInspectorProps) {
  const { t, language } = useTranslation();

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
      <span className="neo-badge" style={{ backgroundColor: "var(--color-yellow)", marginBottom: "0.75rem" }}>
        Inspecteur de Titre 🔎
      </span>
      
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
        {selectedTrack.albumImageUrl && (
          <img 
            src={selectedTrack.albumImageUrl} 
            alt={selectedTrack.name}
            style={{ width: "70px", height: "70px", borderRadius: "8px", border: "var(--border-thin)" }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <h4 style={{ fontSize: "1.1rem", marginBottom: "0.25rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedTrack.name}
          </h4>
          <p style={{ fontSize: "0.9rem", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedTrack.artists}
          </p>
          <p style={{ fontSize: "0.8rem", color: "#888", fontStyle: "italic" }}>
            Album : {selectedTrack.albumName}
          </p>
        </div>
      </div>

      {/* Barre de métriques */}
      {selectedTrack.valence === null || selectedTrack.energy === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            padding: "1rem",
            backgroundColor: "var(--bg-main)",
            border: "var(--border-thin)",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#666",
            lineHeight: 1.5,
            textAlign: "center"
          }}>
            ⚠️ Données audio indisponibles.<br />
            Ce titre n'a pas pu être analysé acoustiquement (non répertorié dans Spotify/ReccoBeats) et ne figure pas sur la carte.
          </div>
          
          <button
            onClick={() => onReconstructFeatures(selectedTrack.id)}
            className="neo-btn"
            style={{ backgroundColor: "var(--color-orange)", fontSize: "0.85rem", padding: "0.5rem" }}
            disabled={isReconstructing}
          >
            {isReconstructing ? "⏳ Analyse acoustique en cours..." : "🎛️ Estimer l'ambiance (via Deezer 30s)"}
          </button>
          <p style={{ fontSize: "0.75rem", color: "#888", fontStyle: "italic", textAlign: "center", margin: 0 }}>
            Note : l'estimation se base sur un extrait de 30s et peut être légèrement moins précise.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* Valence */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.valence")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.valence")} ℹ️
              </span>
              <span>{Math.round(selectedTrack.valence * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${selectedTrack.valence * 100}%`, backgroundColor: "var(--color-pink)" }} />
            </div>
          </div>

          {/* Énergie */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.energy")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.energy")} ℹ️
              </span>
              <span>{Math.round(selectedTrack.energy * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${selectedTrack.energy * 100}%`, backgroundColor: "var(--color-orange)" }} />
            </div>
          </div>

          {/* Acousticness */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.acoustic")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.acoustic")} ℹ️
              </span>
              <span>{Math.round((selectedTrack.acousticness ?? 0) * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${(selectedTrack.acousticness ?? 0) * 100}%`, backgroundColor: "var(--color-blue)" }} />
            </div>
          </div>

          {/* Danceability */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.dance")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.dance")} ℹ️
              </span>
              <span>{Math.round((selectedTrack.danceability ?? 0) * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${(selectedTrack.danceability ?? 0) * 100}%`, backgroundColor: "var(--color-green)" }} />
            </div>
          </div>

          {/* Instrumentalness */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.instr")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.instr")} ℹ️
              </span>
              <span>{Math.round((selectedTrack.instrumentalness ?? 0) * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${(selectedTrack.instrumentalness ?? 0) * 100}%`, backgroundColor: "var(--color-yellow)" }} />
            </div>
          </div>

          {/* Speechiness */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.speech")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.speech")} ℹ️
              </span>
              <span>{Math.round((selectedTrack.speechiness ?? 0) * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${(selectedTrack.speechiness ?? 0) * 100}%`, backgroundColor: "#e2e8f0" }} />
            </div>
          </div>

          {/* Liveness */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.live")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.live")} ℹ️
              </span>
              <span>{Math.round((selectedTrack.liveness ?? 0) * 100)}%</span>
            </div>
            <div style={{ height: "8px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${(selectedTrack.liveness ?? 0) * 100}%`, backgroundColor: "#fecdd3" }} />
            </div>
          </div>

          {/* Informations Textuelles Supplémentaires (Tempo, Tonalité) */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "0.5rem", 
            marginTop: "0.5rem",
            borderTop: "1.5px dashed #ccc",
            paddingTop: "0.5rem"
          }}>
            <div style={{ textAlign: "center", backgroundColor: "var(--bg-main)", border: "1px solid #000", borderRadius: "6px", padding: "4px" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>TEMPO</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800 }}>
                {selectedTrack.tempo !== null ? `${Math.round(selectedTrack.tempo)} BPM` : "--"}
              </div>
            </div>

            <div style={{ textAlign: "center", backgroundColor: "var(--bg-main)", border: "1px solid #000", borderRadius: "6px", padding: "4px" }}>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666" }}>{t("playlist.sortKey")}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800 }}>
                {formatKeyMode(selectedTrack.key, selectedTrack.mode, language)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genres Section */}
      <div style={{ marginTop: "1.25rem", borderTop: "1.5px dashed #ccc", paddingTop: "0.75rem" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#666", marginBottom: "6px", fontFamily: "monospace" }}>
          🏷️ GENRES DE L'ARTISTE (SPOTIFY)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {(() => {
            const genresStr = trackGenres[selectedTrack.id] || selectedTrack.genres;
            if (!genresStr) {
              return <span style={{ fontSize: "0.75rem", color: "#888", fontStyle: "italic" }}>Aucun genre identifié.</span>;
            }
            return genresStr.split(",").map((g: string) => g.trim()).filter(Boolean).map((g: string, idx: number) => (
              <span 
                key={idx} 
                style={{ 
                  fontSize: "0.7rem", 
                  fontWeight: "bold", 
                  backgroundColor: "#f3f4f6", 
                  border: "1.5px solid #1c1917", 
                  borderRadius: "4px", 
                  padding: "2px 6px",
                  boxShadow: "1px 1px 0px 0px #1c1917",
                  fontFamily: "monospace"
                }}
              >
                {g}
              </span>
            ));
          })()}
        </div>
      </div>

      {/* Contrôle audio sous l'inspecteur */}
      {(selectedTrack.previewUrl || selectedTrack.isrc || (selectedTrack.artists && selectedTrack.name)) && (
        <button 
          onClick={() => onPlayToggle(selectedTrack)}
          className="neo-btn"
          style={{ 
            width: "100%", 
            marginTop: "1.25rem", 
            fontSize: "0.9rem", 
            padding: "0.5rem 1rem",
            backgroundColor: playingTrackId === selectedTrack.id 
              ? "var(--color-pink)" 
              : loadingTrackId === selectedTrack.id 
                ? "var(--color-orange)" 
                : "var(--color-yellow)"
          }}
          disabled={loadingTrackId === selectedTrack.id}
        >
          {loadingTrackId === selectedTrack.id 
            ? "⏳ Chargement de l'extrait..." 
            : playingTrackId === selectedTrack.id 
              ? "⏸️ Pause l'extrait" 
              : "▶️ Écouter un extrait (30s)"}
        </button>
      )}
    </div>
  );
}
