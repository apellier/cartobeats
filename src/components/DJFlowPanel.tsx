"use client";

import React from "react";
import { useTranslation } from "@/context/LanguageContext";

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

interface DJFlowPanelProps {
  tracks: Track[];
  playlistId: string;
  isDjFlowApplied: boolean;
  setIsDjFlowApplied: (applied: boolean) => void;
  optimizedTracks: Track[];
  setOptimizedTracks: (tracks: Track[]) => void;
  isDjFlowPanelOpen: boolean;
  setIsDjFlowPanelOpen: (open: boolean) => void;
  isOptimizing: boolean;
  setIsOptimizing: (optimizing: boolean) => void;
}

// --- HELPER CAMELOT / DJ FLOW ---
interface CamelotKey {
  value: number;
  letter: "A" | "B";
  label: string;
}

function getCamelotKey(key: number | null, mode: number | null): CamelotKey | null {
  if (key === null || mode === null) return null;
  const minorMap: Record<number, number> = {
    8: 1,  // G# min
    3: 2,  // Eb min
    10: 3, // Bb min
    5: 4,  // F min
    0: 5,  // C min
    7: 6,  // G min
    2: 7,  // D min
    9: 8,  // A min
    4: 9,  // E min
    11: 10,// B min
    6: 11, // F# min
    1: 12  // C# min
  };

  const majorMap: Record<number, number> = {
    11: 1, // B Maj
    6: 2,  // F# Maj
    1: 3,  // Db Maj
    8: 4,  // Ab Maj
    3: 5,  // Eb Maj
    10: 6, // Bb Maj
    5: 7,  // F Maj
    0: 8,  // C Maj
    7: 9,  // G Maj
    2: 10, // D Maj
    9: 11, // A Maj
    4: 12  // E Maj
  };

  if (mode === 0) {
    const val = minorMap[key];
    return val ? { value: val, letter: "A", label: `${val}A` } : null;
  } else {
    const val = majorMap[key];
    return val ? { value: val, letter: "B", label: `${val}B` } : null;
  }
}

function optimizeDjFlow(tracks: Track[]): Track[] {
  if (tracks.length <= 1) return [...tracks];

  const mappedTracks = tracks.filter(t => t.tempo !== null && t.key !== null && t.mode !== null);
  const unmappedTracks = tracks.filter(t => t.tempo === null || t.key === null || t.mode === null);

  if (mappedTracks.length === 0) return [...tracks];

  const avgTempo = mappedTracks.reduce((sum, t) => sum + (t.tempo || 120), 0) / mappedTracks.length;
  const avgValence = mappedTracks.reduce((sum, t) => sum + (t.valence || 0.5), 0) / mappedTracks.length;
  const avgEnergy = mappedTracks.reduce((sum, t) => sum + (t.energy || 0.5), 0) / mappedTracks.length;

  let startIdx = 0;
  let minDistance = Infinity;
  for (let i = 0; i < mappedTracks.length; i++) {
    const t = mappedTracks[i];
    const dValence = (t.valence || 0.5) - avgValence;
    const dEnergy = (t.energy || 0.5) - avgEnergy;
    const dTempo = ((t.tempo || 120) - avgTempo) / 100;
    const dist = dValence * dValence + dEnergy * dEnergy + dTempo * dTempo;
    if (dist < minDistance) {
      minDistance = dist;
      startIdx = i;
    }
  }

  const result: Track[] = [mappedTracks[startIdx]];
  const pool = [...mappedTracks];
  pool.splice(startIdx, 1);

  while (pool.length > 0) {
    const current = result[result.length - 1];
    let bestIdx = 0;
    let bestCost = Infinity;

    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i];
      const bpmA = current.tempo || 120;
      const bpmB = candidate.tempo || 120;
      const bpmDiff = Math.abs(bpmA - bpmB);

      let keyCost = 15;
      const camA = getCamelotKey(current.key, current.mode);
      const camB = getCamelotKey(candidate.key, candidate.mode);

      if (camA && camB) {
        const numDiff = Math.abs(camA.value - camB.value);
        const isAdjacent = numDiff === 1 || numDiff === 11;
        const sameLetter = camA.letter === camB.letter;

        if (camA.value === camB.value && sameLetter) {
          keyCost = 0;
        } else if (isAdjacent && sameLetter) {
          keyCost = 2;
        } else if (camA.value === camB.value && !sameLetter) {
          keyCost = 3;
        } else if (numDiff === 2 || numDiff === 10) {
          keyCost = 7;
        } else if (isAdjacent && !sameLetter) {
          keyCost = 5;
        } else {
          keyCost = 12;
        }
      }

      const cost = bpmDiff + keyCost;
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = i;
      }
    }

    result.push(pool[bestIdx]);
    pool.splice(bestIdx, 1);
  }

  return [...result, ...unmappedTracks];
}

function getTransitionDetails(trackA: Track, trackB: Track) {
  if (trackA.tempo === null || trackB.tempo === null) {
    return { type: "unknown", label: "Données manquantes", color: "#666" };
  }
  
  const bpmDiff = Math.round(Math.abs(trackA.tempo - trackB.tempo));
  const camA = getCamelotKey(trackA.key, trackA.mode);
  const camB = getCamelotKey(trackB.key, trackB.mode);
  
  if (!camA || !camB) {
    return { 
      type: "unknown", 
      label: `Transition rythmique seule (${bpmDiff > 0 ? `BPM diff: +${bpmDiff}` : "BPM identique"})`, 
      color: "#888" 
    };
  }
  
  const numDiff = Math.abs(camA.value - camB.value);
  const isAdjacent = numDiff === 1 || numDiff === 11;
  const sameLetter = camA.letter === camB.letter;
  
  if (camA.value === camB.value && sameLetter) {
    return { 
      type: "perfect", 
      label: `Transition parfaite (Même tonalité ${camA.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-green)" 
    };
  } else if (isAdjacent && sameLetter) {
    return { 
      type: "perfect", 
      label: `Enchaînement harmonique parfait (${camA.label} → ${camB.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-green)" 
    };
  } else if (camA.value === camB.value && !sameLetter) {
    return { 
      type: "perfect", 
      label: `Enchaînement relatif parfait (${camA.label} → ${camB.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-green)" 
    };
  } else if (numDiff === 2 || numDiff === 10) {
    return { 
      type: "moderate", 
      label: `Transition d'énergie modérée (${camA.label} → ${camB.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-yellow)" 
    };
  } else if (isAdjacent && !sameLetter) {
    return { 
      type: "moderate", 
      label: `Transition diagonale (${camA.label} → ${camB.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-yellow)" 
    };
  } else {
    return { 
      type: "jarring", 
      label: `Saut harmonique (${camA.label} → ${camB.label}) | ΔBPM: ${bpmDiff}`, 
      color: "var(--color-orange)" 
    };
  }
}

const generateM3u = (tracks: Track[]) => {
  let content = "#EXTM3U\n";
  tracks.forEach((track) => {
    const durationSeconds = Math.round(track.durationMs / 1000);
    content += `#EXTINF:${durationSeconds},${track.artists} - ${track.name}\n`;
    content += `https://open.spotify.com/track/${track.id}\n`;
  });
  return content;
};

export default function DJFlowPanel({
  tracks,
  playlistId,
  isDjFlowApplied,
  setIsDjFlowApplied,
  optimizedTracks,
  setOptimizedTracks,
  isDjFlowPanelOpen,
  setIsDjFlowPanelOpen,
  isOptimizing,
  setIsOptimizing
}: DJFlowPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="neo-card" style={{ backgroundColor: "#ffffff", borderStyle: isDjFlowApplied ? "solid" : "dashed", marginTop: "1rem" }}>
      <div 
        onClick={() => setIsDjFlowPanelOpen(!isDjFlowPanelOpen)} 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        <h3 style={{ fontSize: "1.4rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🎛️ Optimiseur de Flow (Transitions DJ)
          {isDjFlowApplied && (
            <span className="neo-badge" style={{ backgroundColor: "var(--color-purple)", fontSize: "0.75rem", color: "var(--foreground)", border: "var(--border-thin)" }}>
              Actif
            </span>
          )}
        </h3>
        <span style={{ fontSize: "1.5rem", fontWeight: "900" }}>
          {isDjFlowPanelOpen ? "▲" : "▼"}
        </span>
      </div>

      {isDjFlowPanelOpen && (
        <div className="animate-pop" style={{ marginTop: "1.25rem", borderTop: "2px dashed #ddd", paddingTop: "1.25rem" }}>
          <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1.25rem", fontWeight: 500, lineHeight: 1.4 }}>
            Cet outil réorganise vos morceaux selon les règles du mix DJ (Roue de Camelot) : il cherche à minimiser les transitions de BPM trop brusques et assure une continuité harmonique fluide entre chaque morceau.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            {!isDjFlowApplied ? (
              <button
                onClick={() => {
                  setIsOptimizing(true);
                  setTimeout(() => {
                    const optimized = optimizeDjFlow(tracks);
                    setOptimizedTracks(optimized);
                    setIsDjFlowApplied(true);
                    setIsOptimizing(false);
                  }, 600);
                }}
                className="neo-btn"
                style={{ backgroundColor: "var(--color-purple)" }}
                disabled={isOptimizing}
              >
                {isOptimizing ? "Optimisation en cours..." : "⚡ Activer l'Ordre Optimisé (DJ Flow)"}
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsDjFlowApplied(false);
                  }}
                  className="neo-btn neo-btn-secondary"
                >
                  ↩️ Restaurer l'Ordre d'Origine
                </button>
                
                <button
                  onClick={() => {
                    const m3uContent = generateM3u(optimizedTracks);
                    const blob = new Blob([m3uContent], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `cartobeat_${playlistId}_flow.m3u`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  }}
                  className="neo-btn"
                  style={{ backgroundColor: "var(--color-green)" }}
                >
                  💾 Télécharger la Playlist (.M3U)
                </button>

                <button
                  onClick={() => {
                    const text = optimizedTracks.map((t, idx) => `${idx + 1}. ${t.artists} - ${t.name} (${t.tempo ? `${Math.round(t.tempo)} BPM` : ""}${t.key !== null ? ` | ${getCamelotKey(t.key, t.mode)?.label || ""}` : ""})`).join("\n");
                    navigator.clipboard.writeText(text);
                    alert("Ordre des pistes copié dans le presse-papiers !");
                  }}
                  className="neo-btn"
                  style={{ backgroundColor: "var(--color-yellow)" }}
                >
                  📋 Copier la Liste Triée
                </button>
              </>
            )}
          </div>

          {isDjFlowApplied && optimizedTracks.length > 0 && (
            <div>
              <h4 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Aperçu des Transitions Harmoniques :</h4>
              <div style={{ 
                maxHeight: "300px", 
                overflowY: "auto", 
                border: "var(--border-thin)", 
                borderRadius: "8px", 
                padding: "0.5rem",
                backgroundColor: "var(--bg-main)"
              }}>
                {optimizedTracks.map((track, idx) => {
                  const nextTrack = optimizedTracks[idx + 1];
                  const cam = getCamelotKey(track.key, track.mode);
                  const transition = nextTrack ? getTransitionDetails(track, nextTrack) : null;
                  
                  return (
                    <div key={track.id} style={{ marginBottom: "0.5rem" }}>
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        backgroundColor: "#ffffff", 
                        padding: "0.5rem", 
                        border: "1px solid #ccc", 
                        borderRadius: "6px" 
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 800, fontSize: "0.85rem", marginRight: "0.5rem", color: "var(--color-purple)" }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{track.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "#666", marginLeft: "0.5rem" }}>— {track.artists}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <span style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: 800, 
                            backgroundColor: "var(--bg-main)", 
                            padding: "2px 6px", 
                            borderRadius: "4px", 
                            border: "1px solid #ddd" 
                          }}>
                            {track.tempo ? `${Math.round(track.tempo)} BPM` : "N/A"}
                          </span>
                          {cam && (
                            <span style={{ 
                              fontSize: "0.75rem", 
                              fontWeight: 800, 
                              backgroundColor: "var(--color-blue)", 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              border: "1px solid #ddd" 
                            }}>
                              {cam.label}
                            </span>
                          )}
                        </div>
                      </div>

                      {transition && (
                        <div style={{ 
                          padding: "0.25rem 0.5rem 0.25rem 1.5rem", 
                          fontSize: "0.75rem", 
                          fontWeight: 700, 
                          color: "#333",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.3rem"
                        }}>
                          <span style={{ 
                            display: "inline-block", 
                            width: "8px", 
                            height: "8px", 
                            borderRadius: "50%", 
                            backgroundColor: transition.color, 
                            border: "1px solid #000" 
                          }} />
                          {transition.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
