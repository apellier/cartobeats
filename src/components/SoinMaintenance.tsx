// src/components/SoinMaintenance.tsx
"use client";

import React, { useMemo } from "react";
import { getDominantTrackGenre, formatGenreLabel } from "@/lib/genreResolver";

interface Track {
  id: string;
  name: string;
  artists: string;
  [key: string]: any;
}

interface SoinMaintenanceProps {
  tracks: Track[];
  trackGenres: Record<string, string>;
  hideIntruders: boolean;
  onToggleHideIntruders: (hide: boolean) => void;
  playlistName: string;
}

export default function SoinMaintenance({
  tracks = [],
  trackGenres = {},
  hideIntruders,
  onToggleHideIntruders,
  playlistName
}: SoinMaintenanceProps) {
  // 1. Calculate macro-genre distribution to identify outliers
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const track of tracks) {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      counts[dominant] = (counts[dominant] || 0) + 1;
    }
    return counts;
  }, [tracks, trackGenres]);

  // 2. Identify intruders (tracks whose macro-genre represents < 10% of the playlist)
  const intruders = useMemo(() => {
    if (tracks.length === 0) return [];
    
    return tracks.map(track => {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      const count = distribution[dominant] || 0;
      const percentage = (count / tracks.length) * 100;
      
      return {
        track,
        genre: dominant,
        percentage
      };
    }).filter(item => item.percentage < 10.0 && item.genre !== "autre") // Outliers represent < 10%
      .map(item => ({
        ...item.track,
        macroGenre: item.genre,
        mismatchScore: Math.round(100 - item.percentage)
      }));
  }, [tracks, distribution, trackGenres]);

  // Copy intruders text list to clipboard
  const handleCopyIntruders = () => {
    if (intruders.length === 0) return;
    const text = intruders
      .map(t => `${t.name} - ${t.artists} [Genre : ${formatGenreLabel(t.macroGenre)}]`)
      .join("\n");
    
    navigator.clipboard.writeText(text);
    alert("📋 La liste des morceaux intrus a été copiée dans votre presse-papiers !");
  };

  // Download purified playlist M3U file (excluding intruders)
  const handleDownloadPurifiedM3u = () => {
    const intruderIds = new Set(intruders.map(i => i.id));
    const cleanTracks = tracks.filter(t => !intruderIds.has(t.id));
    
    let m3uContent = "#EXTM3U\n";
    m3uContent += `#PLAYLIST:${playlistName} - Purifiée\n\n`;
    
    for (const track of cleanTracks) {
      m3uContent += `#EXTINF:-1,${track.artists} - ${track.name}\n`;
      m3uContent += `https://open.spotify.com/track/${track.id}\n\n`;
    }

    const blob = new Blob([m3uContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cartobeat_${playlistName.replace(/\s+/g, "_")}_purifiee.m3u`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obscurity and Health index calculations
  const healthScore = useMemo(() => {
    if (tracks.length === 0) return 100;
    const intruderRatio = intruders.length / tracks.length;
    return Math.round((1 - intruderRatio) * 100);
  }, [tracks, intruders]);

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
      {/* Header with Health Badge */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.5rem",
        borderBottom: "2px solid #1c1917",
        paddingBottom: "1rem"
      }}>
        <div>
          <span className="neo-badge" style={{ backgroundColor: "var(--color-pink)" }}>
            Maintenance & Soin 🧹
          </span>
          <h3 style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>Diagnostic de Cohérence Acoustique</h3>
        </div>

        {/* Index de Santé Acoustique */}
        <div style={{
          padding: "0.5rem 1rem",
          border: "2px solid #1c1917",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px 0px #1c1917",
          backgroundColor: healthScore > 80 ? "var(--color-green, #22c55e)" : healthScore > 50 ? "var(--color-yellow, #eab308)" : "var(--color-orange, #f97316)",
          textAlign: "center",
          fontWeight: "bold"
        }}>
          Score de Cohérence : {healthScore}%
        </div>
      </div>

      {/* Overview & Concept section */}
      <div style={{
        padding: "0.8rem 1rem",
        backgroundColor: "#fbf8f3",
        border: "var(--border-thin)",
        borderRadius: "8px",
        marginBottom: "1.5rem",
        fontSize: "0.85rem",
        lineHeight: "1.4"
      }}>
        <p style={{ margin: 0 }}>
          Ce module vous aide à analyser la cohérence stylistique de votre playlist en identifiant les <strong>intrusions ou anomalies de genre</strong> (les morceaux isolés qui s'écartent fortement du profil culturel global de votre sélection).
        </p>
      </div>

      {/* Outlier Alert / Summary */}
      {intruders.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "2rem",
          backgroundColor: "#f0fdf4",
          border: "2px dashed #16a34a",
          borderRadius: "12px",
          color: "#15803d",
          fontWeight: "bold",
          fontSize: "0.9rem"
        }}>
          🎉 Aucune intrusion stylistique majeure détectée ! Votre playlist a une cohérence acoustique parfaite.
        </div>
      ) : (
        <div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem"
          }}>
            <h4 style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--color-pink)" }}>
              ⚠️ {intruders.length} anomalie{intruders.length > 1 ? "s" : ""} de genre détectée{intruders.length > 1 ? "s" : ""} :
            </h4>
            
            {/* Simulation Toggle */}
            <button
              onClick={() => onToggleHideIntruders(!hideIntruders)}
              className="neo-btn"
              style={{
                fontSize: "0.75rem",
                padding: "0.3rem 0.6rem",
                backgroundColor: hideIntruders ? "var(--color-green)" : "#ffffff"
              }}
            >
              {hideIntruders ? "🟢 Simulation Active (Intrus masqués)" : "🧹 Simuler le Nettoyage (Masquer)"}
            </button>
          </div>

          {/* List of Intruders */}
          <div style={{
            maxHeight: "220px",
            overflowY: "auto",
            border: "2px solid #1c1917",
            borderRadius: "8px",
            boxShadow: "2px 2px 0px 0px #1c1917",
            marginBottom: "1.5rem"
          }}>
            {intruders.map((t) => (
              <div 
                key={t.id}
                style={{
                  padding: "0.5rem 0.8rem",
                  borderBottom: "1.5px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  fontSize: "0.8rem"
                }}
              >
                <div style={{ flex: 1, minWidth: "180px" }}>
                  <div style={{ fontWeight: "bold" }}>{t.name}</div>
                  <div style={{ color: "#666", fontSize: "0.75rem" }}>{t.artists}</div>
                </div>
                
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{
                    fontSize: "0.7rem",
                    backgroundColor: "#f3f4f6",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontWeight: "bold",
                    color: "#475569"
                  }}>
                    {formatGenreLabel(t.macroGenre)}
                  </span>
                  
                  <span style={{
                    fontSize: "0.65rem",
                    backgroundColor: "#fee2e2",
                    border: "1px solid #fca5a5",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontWeight: "extrabold",
                    color: "#dc2626"
                  }}>
                    Écart : {t.mismatchScore}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Cleaning Actions */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px"
          }}>
            <button
              onClick={handleCopyIntruders}
              className="neo-btn"
              style={{
                flex: 1,
                fontSize: "0.8rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#ffffff"
              }}
            >
              📋 Copier la liste des intrus
            </button>
            
            <button
              onClick={handleDownloadPurifiedM3u}
              className="neo-btn"
              style={{
                flex: 1,
                fontSize: "0.8rem",
                padding: "0.5rem 1rem",
                backgroundColor: "var(--color-yellow)",
                minWidth: "220px"
              }}
            >
              💾 Télécharger la playlist purifiée (.M3U)
            </button>
          </div>

          <p style={{
            fontSize: "0.7rem",
            color: "#666",
            fontStyle: "italic",
            marginTop: "1rem",
            textAlign: "center"
          }}>
            ℹ️ Les droits d'écriture de l'API de Spotify étant restreints en production, utilisez la liste copiée ou le fichier M3U purifié pour réorganiser votre espace sonore d'écoute.
          </p>
        </div>
      )}
    </div>
  );
}
