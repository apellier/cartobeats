import React, { useState, useMemo, useEffect } from "react";

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

interface TrackListProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  selectedTrack: Track | null;
  playingTrackId: string | null;
  onPlayToggle: (track: Track) => void;
  loadingTrackId?: string | null;
}

type SortField = "name" | "artists" | "valence" | "energy" | "danceability" | "acousticness" | "tempo" | "durationMs" | "speechiness" | "instrumentalness" | "liveness" | "key" | null;
type SortDirection = "asc" | "desc";

export default function TrackList({
  tracks,
  onSelectTrack,
  selectedTrack,
  playingTrackId,
  onPlayToggle,
  loadingTrackId,
}: TrackListProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
      
      const media = window.matchMedia("(max-width: 767px)");
      const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  // Formater la durée (ms en m:ss)
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? "0" : ""}${seconds}`;
  };

  // Formater la tonalité (Key & Mode)
  const formatKeyMode = (key: number | null, mode: number | null) => {
    if (key === null || key === undefined) return "--";
    const notes = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
    const noteName = notes[key] || "?";
    const modeName = mode === 1 ? "maj" : mode === 0 ? "min" : "";
    return `${noteName} ${modeName}`.trim();
  };

  // Déterminer le quadrant d'un morceau
  const getTrackQuadrant = (t: Track) => {
    if (t.valence === null || t.energy === null) {
      return { name: "⚠️ Non cartographié", color: "#e2e8f0" };
    }
    if (t.valence >= 0.5 && t.energy >= 0.5) {
      return { name: "☀️ Solaire", color: "var(--color-pink)" };
    } else if (t.valence < 0.5 && t.energy >= 0.5) {
      return { name: "⚡ Tempétueux", color: "var(--color-orange)" };
    } else if (t.valence < 0.5 && t.energy < 0.5) {
      return { name: "🌧️ Brumeux", color: "var(--color-blue)" };
    } else {
      return { name: "🍃 Serein", color: "var(--color-green)" };
    }
  };

  // Gérer le clic sur l'en-tête pour le tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si on clique sur le même champ, on inverse la direction ou on réinitialise le tri
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null); // Annuler le tri
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Trier les morceaux
  const sortedTracks = useMemo(() => {
    if (!sortField) return tracks;

    return [...tracks].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Placer les valeurs nulles à la fin dans tous les cas
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Tri numérique
      return sortDirection === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
  }, [tracks, sortField, sortDirection]);

  // Rendu de l'indicateur de tri
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return " ↕️";
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  if (isMobile) {
    return (
      <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
        <h3 style={{ marginBottom: "0.5rem", fontSize: "1.25rem" }}>
          Espace de Tri & Analyse 🧹
        </h3>
        <p style={{ fontSize: "0.8rem", color: "#666", marginBottom: "1rem" }}>
          Sélectionnez un titre pour l'inspecter et afficher ses caractéristiques ou l'écouter.
        </p>

        {/* Sélecteur de Tri Mobile */}
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, fontFamily: "monospace" }}>TRIER PAR :</span>
          <select
            value={sortField || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setSortField(null);
              } else {
                setSortField(val as SortField);
                setSortDirection("desc"); // Par défaut descendant pour les métriques
              }
            }}
            className="neo-input"
            style={{ flex: 1, padding: "0.3rem 0.5rem", fontSize: "0.8rem", cursor: "pointer" }}
          >
            <option value="">Ordre d'origine</option>
            <option value="name">Titre (A-Z)</option>
            <option value="artists">Artiste (A-Z)</option>
            <option value="valence">☀️ Valence (Positivité)</option>
            <option value="energy">⚡ Énergie</option>
            <option value="danceability">🕺 Dansabilité</option>
            <option value="acousticness">🎻 Acousticité</option>
            <option value="tempo">⏱️ Tempo (BPM)</option>
            <option value="durationMs">⏳ Durée</option>
          </select>
          
          {sortField && (
            <button
              onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
              className="neo-btn"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
            >
              {sortDirection === "asc" ? "▲" : "▼"}
            </button>
          )}
        </div>

        {/* Liste Mobile en Cartes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sortedTracks.map((track, index) => {
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playingTrackId === track.id;
            const quad = getTrackQuadrant(track);

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "0.75rem",
                  border: isSelected ? "3px solid var(--foreground)" : "2px solid var(--foreground)",
                  borderRadius: "10px",
                  backgroundColor: isSelected ? "#fef8e8" : "#fbf8f3",
                  boxShadow: isSelected 
                    ? "2px 2px 0px 0px var(--foreground)" 
                    : "4px 4px 0px 0px var(--foreground)",
                  transform: isSelected ? "translate(2px, 2px)" : "none",
                  transition: "all 0.15s ease",
                  gap: "0.5rem"
                }}
              >
                {/* Ligne du haut : Pochette, Titre/Artiste, Play */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {track.albumImageUrl ? (
                    <img 
                      src={track.albumImageUrl} 
                      alt={track.name} 
                      style={{ width: "40px", height: "40px", borderRadius: "6px", border: "1px solid #000", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ 
                      width: "40px", 
                      height: "40px", 
                      borderRadius: "6px", 
                      border: "1px solid #000", 
                      backgroundColor: "var(--color-blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem"
                    }}>
                      🎵
                    </div>
                  )}
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 800, 
                      fontSize: "0.85rem", 
                      textOverflow: "ellipsis", 
                      overflow: "hidden", 
                      whiteSpace: "nowrap",
                      color: "var(--foreground)" 
                    }}>
                      {track.name}
                    </div>
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "#666", 
                      textOverflow: "ellipsis", 
                      overflow: "hidden", 
                      whiteSpace: "nowrap" 
                    }}>
                      {track.artists}
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => onPlayToggle(track)}
                      className="neo-btn"
                      style={{ 
                        padding: "0.3rem 0.5rem", 
                        fontSize: "0.8rem", 
                        borderRadius: "6px",
                        borderWidth: "1.5px",
                        boxShadow: isPlaying ? "1px 1px 0px 0px #000" : "2px 2px 0px 0px #000",
                        transform: isPlaying ? "translate(1px, 1px)" : "none",
                        backgroundColor: isPlaying 
                          ? "var(--color-pink)" 
                          : loadingTrackId === track.id 
                            ? "var(--color-orange)" 
                            : "var(--color-yellow)"
                      }}
                      disabled={loadingTrackId === track.id}
                    >
                      {loadingTrackId === track.id ? "⏳" : isPlaying ? "⏸️" : "▶️"}
                    </button>
                  </div>
                </div>

                {/* Ligne du bas : Badges Métriques */}
                <div style={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  gap: "0.3rem", 
                  alignItems: "center",
                  borderTop: "1px dashed #ddd",
                  paddingTop: "0.4rem"
                }}>
                  <span className="neo-badge" style={{ 
                    backgroundColor: quad.color, 
                    fontSize: "0.65rem",
                    padding: "1px 4px",
                    borderWidth: "1px",
                    boxShadow: "1px 1px 0px 0px var(--shadow-color)"
                  }}>
                    {quad.name}
                  </span>

                  {track.valence !== null && (
                    <span className="neo-badge" style={{ 
                      backgroundColor: "var(--color-pink)", 
                      fontSize: "0.65rem",
                      padding: "1px 4px",
                      borderWidth: "1px",
                      boxShadow: "1px 1px 0px 0px var(--shadow-color)"
                    }}>
                      ☀️ Positivité: {Math.round(track.valence * 100)}%
                    </span>
                  )}

                  {track.energy !== null && (
                    <span className="neo-badge" style={{ 
                      backgroundColor: "var(--color-orange)", 
                      fontSize: "0.65rem",
                      padding: "1px 4px",
                      borderWidth: "1px",
                      boxShadow: "1px 1px 0px 0px var(--shadow-color)"
                    }}>
                      ⚡ Énergie: {Math.round(track.energy * 100)}%
                    </span>
                  )}

                  {track.tempo !== null && (
                    <span className="neo-badge" style={{ 
                      backgroundColor: "var(--color-yellow)", 
                      fontSize: "0.65rem",
                      padding: "1px 4px",
                      borderWidth: "1px",
                      boxShadow: "1px 1px 0px 0px var(--shadow-color)"
                    }}>
                      ⏱️ {Math.round(track.tempo)} BPM
                    </span>
                  )}

                  {track.key !== null && (
                    <span className="neo-badge" style={{ 
                      backgroundColor: "var(--color-blue)", 
                      fontSize: "0.65rem",
                      padding: "1px 4px",
                      borderWidth: "1px",
                      boxShadow: "1px 1px 0px 0px var(--shadow-color)"
                    }}>
                      🎹 {formatKeyMode(track.key, track.mode)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff", overflowX: "auto" }}>
      <h3 style={{ marginBottom: "0.5rem", fontSize: "1.4rem" }}>
        Espace de Tri & Analyse Unidimensionnelle 🧹
      </h3>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
        Cliquez sur les en-têtes de colonne pour trier vos morceaux. Sélectionnez un titre pour l'écouter ou l'inspecter.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
        <thead>
          <tr style={{ borderBottom: "var(--border-thick)", textAlign: "left" }}>
            <th style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem" }}>#</th>
            
            <th 
              onClick={() => handleSort("name")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}
            >
              TITRE{renderSortIcon("name")}
            </th>
            
            <th 
              onClick={() => handleSort("artists")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}
            >
              ARTISTE{renderSortIcon("artists")}
            </th>
            
            <th style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem" }}>
              ATMOSPHÈRE
            </th>

            <th 
              onClick={() => handleSort("valence")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              ☀️ VALENCE{renderSortIcon("valence")}
            </th>

            <th 
              onClick={() => handleSort("energy")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              ⚡ ÉNERGIE{renderSortIcon("energy")}
            </th>

            <th 
              onClick={() => handleSort("danceability")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🕺 DANCE{renderSortIcon("danceability")}
            </th>

            <th 
              onClick={() => handleSort("acousticness")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🎻 ACOUST.{renderSortIcon("acousticness")}
            </th>

            <th 
              onClick={() => handleSort("instrumentalness")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🎹 INSTR.{renderSortIcon("instrumentalness")}
            </th>

            <th 
              onClick={() => handleSort("speechiness")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🎙️ SPEECH.{renderSortIcon("speechiness")}
            </th>

            <th 
              onClick={() => handleSort("liveness")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🍻 LIVE{renderSortIcon("liveness")}
            </th>



            <th 
              onClick={() => handleSort("key")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              🎵 TON.{renderSortIcon("key")}
            </th>
            
            <th 
              onClick={() => handleSort("tempo")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              ⏱️ TEMPO{renderSortIcon("tempo")}
            </th>
            
            <th 
              onClick={() => handleSort("durationMs")}
              style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", userSelect: "none", textAlign: "center" }}
            >
              ⏳ DURÉE{renderSortIcon("durationMs")}
            </th>

            <th style={{ padding: "0.75rem 0.5rem", fontWeight: 800, fontSize: "0.85rem", textAlign: "center" }}>
              EXTRAIT
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedTracks.map((track, index) => {
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playingTrackId === track.id;
            const quad = getTrackQuadrant(track);

            return (
              <tr 
                key={track.id}
                onClick={() => onSelectTrack(track)}
                style={{ 
                  borderBottom: "1px solid #ddd", 
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#fef8e8" : "transparent",
                  transition: "background-color 0.1s ease",
                  fontWeight: isSelected ? 600 : 500
                }}
                className="track-row"
              >
                {/* Index original dans la liste filtrée */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "#888" }}>
                  {index + 1}
                </td>
                
                {/* Titre */}
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {track.albumImageUrl && (
                      <img 
                        src={track.albumImageUrl} 
                        alt={track.name} 
                        style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid #000" }}
                      />
                    )}
                    <span style={{ fontSize: "0.9rem" }}>{track.name}</span>
                  </div>
                </td>
                
                {/* Artiste */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "#444" }}>
                  {track.artists}
                </td>
                
                {/* Quadrant */}
                <td style={{ padding: "0.75rem 0.5rem" }}>
                  <span className="neo-badge" style={{ 
                    backgroundColor: quad.color, 
                    fontSize: "0.75rem",
                    padding: "2px 6px",
                    borderWidth: "1.5px",
                    boxShadow: "1.5px 1.5px 0px 0px var(--shadow-color)"
                  }}>
                    {quad.name}
                  </span>
                </td>

                {/* Valence */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700 }}>
                  {track.valence !== null ? `${Math.round(track.valence * 100)}%` : "--"}
                </td>

                {/* Énergie */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 700 }}>
                  {track.energy !== null ? `${Math.round(track.energy * 100)}%` : "--"}
                </td>

                {/* Danceability */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.danceability !== null ? `${Math.round(track.danceability * 100)}%` : "--"}
                </td>

                {/* Acousticness */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.acousticness !== null ? `${Math.round(track.acousticness * 100)}%` : "--"}
                </td>

                {/* Instrumentalness */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.instrumentalness !== null ? `${Math.round(track.instrumentalness * 100)}%` : "--"}
                </td>

                {/* Speechiness */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.speechiness !== null ? `${Math.round(track.speechiness * 100)}%` : "--"}
                </td>

                {/* Liveness */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.liveness !== null ? `${Math.round(track.liveness * 100)}%` : "--"}
                </td>



                {/* Tonalité */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center", fontWeight: 600 }}>
                  {formatKeyMode(track.key, track.mode)}
                </td>
                
                {/* Tempo */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center" }}>
                  {track.tempo !== null ? `${Math.round(track.tempo)} BPM` : "--"}
                </td>
                
                {/* Durée */}
                <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", textAlign: "center", color: "#444" }}>
                  {formatDuration(track.durationMs)}
                </td>

                {/* Extrait */}
                <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => onPlayToggle(track)}
                    className="neo-btn"
                    style={{ 
                      padding: "0.25rem 0.5rem", 
                      fontSize: "0.8rem", 
                      borderRadius: "6px",
                      borderWidth: "2px",
                      boxShadow: isPlaying ? "1px 1px 0px 0px #000" : "2.5px 2.5px 0px 0px #000",
                      transform: isPlaying ? "translate(1.5px, 1.5px)" : "none",
                      backgroundColor: isPlaying 
                        ? "var(--color-pink)" 
                        : loadingTrackId === track.id 
                          ? "var(--color-orange)" 
                          : "var(--color-yellow)"
                    }}
                    disabled={loadingTrackId === track.id}
                  >
                    {loadingTrackId === track.id ? "⏳" : isPlaying ? "⏸️" : "▶️"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style jsx>{`
        .track-row:hover {
          background-color: #f7f7f7 !important;
        }
      `}</style>
    </div>
  );
}
