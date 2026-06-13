import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "@/context/LanguageContext";

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

interface CartographeMapProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  selectedTrack: Track | null;
  playingTrackId: string | null;
  onPlayToggle: (track: Track) => void;
  secondaryTracks?: Track[];
  primaryLabel?: string;
  secondaryLabel?: string;
  showFlowPath?: boolean;
}

export default function CartographeMap({
  tracks,
  onSelectTrack,
  selectedTrack,
  playingTrackId,
  onPlayToggle,
  secondaryTracks,
  primaryLabel,
  secondaryLabel,
  showFlowPath = false,
}: CartographeMapProps) {
  const { t, language } = useTranslation();
  const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  // Gérer le placement du tooltip par rapport au conteneur
  const handleMouseEnterCircle = (track: Track, e: React.MouseEvent<SVGCircleElement>) => {
    if (isTouchDevice) return;
    setHoveredTrack(track);
    updateTooltipPosition(e);
  };

  const handleMouseMoveCircle = (e: React.MouseEvent<SVGCircleElement>) => {
    if (isTouchDevice) return;
    updateTooltipPosition(e);
  };

  const handleMouseLeaveCircle = () => {
    setHoveredTrack(null);
  };

  const updateTooltipPosition = (e: React.MouseEvent<SVGCircleElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Positionner le tooltip un peu au-dessus du curseur
      setTooltipPos({
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top - 100,
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="neo-card" 
      style={{ 
        backgroundColor: "#ffffff", 
        padding: "1rem", 
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}
    >
      <h3 style={{ alignSelf: "flex-start", marginBottom: "1rem", fontSize: "1.3rem" }}>
        {language === "fr" ? "Le Plan Émotionnel (Valence & Énergie)" : "The Emotional Plane (Valence & Energy)"} 🗺️
      </h3>

      {/* Légende rapide des axes */}
      <div style={{ 
        width: "100%", 
        height: "100%", 
        aspectRatio: "1", 
        maxWidth: "480px", 
        position: "relative",
        border: "var(--border-thin)",
        borderRadius: "8px",
        overflow: "hidden"
      }}>
        <svg 
          ref={svgRef}
          viewBox="0 0 500 500" 
          style={{ 
            width: "100%", 
            height: "100%", 
            display: "block",
            cursor: "crosshair"
          }}
        >
          {/* Quadrant 2: Tempétueux (Top-Left) */}
          <rect x="0" y="0" width="250" height="250" fill="var(--color-orange)" fillOpacity="0.25" />
          
          {/* Quadrant 1: Solaire (Top-Right) */}
          <rect x="250" y="0" width="250" height="250" fill="var(--color-pink)" fillOpacity="0.25" />
          
          {/* Quadrant 3: Brumeux (Bottom-Left) */}
          <rect x="0" y="250" width="250" height="250" fill="var(--color-blue)" fillOpacity="0.25" />
          
          {/* Quadrant 4: Serein (Bottom-Right) */}
          <rect x="250" y="250" width="250" height="250" fill="var(--color-green)" fillOpacity="0.25" />

          {/* Ligne des Axes médiane */}
          <line x1="250" y1="0" x2="250" y2="500" stroke="#1c1917" strokeWidth="2" strokeDasharray="4" />
          <line x1="0" y1="250" x2="500" y2="250" stroke="#1c1917" strokeWidth="2" strokeDasharray="4" />

          {/* Libellés des Quadrants (Gros texte discret en fond) */}
          <text x="70" y="50" fill="rgba(0,0,0,0.15)" fontSize="16" fontWeight="800" fontFamily="var(--font-heading)">{language === "fr" ? "TEMPÉTUEUX" : "STORMY"}</text>
          <text x="340" y="50" fill="rgba(0,0,0,0.15)" fontSize="16" fontWeight="800" fontFamily="var(--font-heading)">{language === "fr" ? "SOLAIRE" : "SUNNY"}</text>
          <text x="80" y="460" fill="rgba(0,0,0,0.15)" fontSize="16" fontWeight="800" fontFamily="var(--font-heading)">{language === "fr" ? "BRUMEUX" : "FOGGY"}</text>
          <text x="350" y="460" fill="rgba(0,0,0,0.15)" fontSize="16" fontWeight="800" fontFamily="var(--font-heading)">{language === "fr" ? "SEREIN" : "SERENE"}</text>

          {/* Chemin du Flow DJ (reliant les morceaux consécutifs) */}
          {showFlowPath && tracks.length > 1 && (
            <path
              d={tracks
                .filter((t) => t.valence !== null && t.energy !== null)
                .map((track, idx) => {
                  const x = (track.valence as number) * 500;
                  const y = (1 - (track.energy as number)) * 500;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="var(--color-purple)"
              strokeWidth="3"
              strokeDasharray="6,6"
              strokeOpacity="0.85"
            />
          )}

          {/* Points des morceaux principaux */}
          {tracks
            .filter((t) => t.valence !== null && t.energy !== null)
            .map((track) => {
              const x = (track.valence as number) * 500;
              // Inverser l'axe Y car SVG Y = 0 est en haut, mais Énergie = 1 doit être en haut
              const y = (1 - (track.energy as number)) * 500;
              const isSelected = selectedTrack?.id === track.id;
              const isPlaying = playingTrackId === track.id;
              
              // Couleur par défaut = noir, mais rose si mode duel comparatif
              const defaultColor = secondaryTracks ? "var(--color-pink)" : "var(--foreground)";

              return (
                <g key={track.id}>
                  {/* Cible de toucher transparente de 44px de diamètre (rayon 22) */}
                  <circle
                    cx={x}
                    cy={y}
                    r="22"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnterCircle(track, e)}
                    onMouseMove={handleMouseMoveCircle}
                    onMouseLeave={handleMouseLeaveCircle}
                    onClick={() => onSelectTrack(track)}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 10 : isPlaying ? 9 : 7}
                    fill={isSelected ? "var(--color-yellow)" : isPlaying ? "var(--color-purple)" : defaultColor}
                    stroke="#ffffff"
                    strokeWidth={isSelected || isPlaying ? 3 : 1.5}
                    style={{
                      pointerEvents: "none",
                      transition: "r 0.15s ease, fill 0.15s ease",
                    }}
                  />
                </g>
              );
            })}

          {/* Points des morceaux secondaires (Duel) */}
          {secondaryTracks && secondaryTracks
            .filter((t) => t.valence !== null && t.energy !== null)
            .map((track) => {
              const x = (track.valence as number) * 500;
              const y = (1 - (track.energy as number)) * 500;
              const isSelected = selectedTrack?.id === track.id;
              const isPlaying = playingTrackId === track.id;

              return (
                <g key={track.id}>
                  {/* Cible de toucher transparente de 44px de diamètre (rayon 22) */}
                  <circle
                    cx={x}
                    cy={y}
                    r="22"
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => handleMouseEnterCircle(track, e)}
                    onMouseMove={handleMouseMoveCircle}
                    onMouseLeave={handleMouseLeaveCircle}
                    onClick={() => onSelectTrack(track)}
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 10 : isPlaying ? 9 : 7}
                    fill={isSelected ? "var(--color-yellow)" : isPlaying ? "var(--color-purple)" : "var(--color-blue)"}
                    stroke="#ffffff"
                    strokeWidth={isSelected || isPlaying ? 3 : 1.5}
                    style={{
                      pointerEvents: "none",
                      transition: "r 0.15s ease, fill 0.15s ease",
                    }}
                  />
                </g>
              );
            })}
        </svg>

        {/* Labels des Axes sur les bords de la boîte */}
        <div style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", fontWeight: 800, backgroundColor: "#fff", padding: "1px 6px", border: "1px solid #000", borderRadius: "4px" }}>
          ⚡ {language === "fr" ? "ÉNERGIE" : "ENERGY"} +
        </div>
        <div style={{ position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", fontWeight: 800, backgroundColor: "#fff", padding: "1px 6px", border: "1px solid #000", borderRadius: "4px" }}>
          💤 {language === "fr" ? "ÉNERGIE" : "ENERGY"} -
        </div>
        <div style={{ position: "absolute", top: "50%", right: "8px", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 800, backgroundColor: "#fff", padding: "1px 6px", border: "1px solid #000", borderRadius: "4px" }}>
          ☀️ {language === "fr" ? "VALENCE" : "VALENCE"} +
        </div>
        <div style={{ position: "absolute", top: "50%", left: "8px", transform: "translateY(-50%)", fontSize: "0.75rem", fontWeight: 800, backgroundColor: "#fff", padding: "1px 6px", border: "1px solid #000", borderRadius: "4px" }}>
          🌧️ {language === "fr" ? "VALENCE" : "VALENCE"} -
        </div>
      </div>

      {/* Tooltip flottant Soft Neo-Brutaliste */}
      {hoveredTrack && !isTouchDevice && (
        <div 
          className="neo-card animate-pop"
          style={{
            position: "absolute",
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            width: "240px",
            padding: "0.75rem",
            zIndex: 10,
            pointerEvents: "none", // Pour éviter que le tooltip bloque le curseur
            boxShadow: "3px 3px 0px 0px var(--shadow-color)",
            border: "var(--border-thin)",
            borderRadius: "10px",
            backgroundColor: "#ffffff",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {hoveredTrack.albumImageUrl && (
              <img 
                src={hoveredTrack.albumImageUrl} 
                alt={hoveredTrack.name}
                style={{ width: "40px", height: "40px", borderRadius: "4px", border: "1px solid #000" }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: 700, 
                fontSize: "0.85rem", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis" 
              }}>
                {hoveredTrack.name}
              </div>
              <div style={{ 
                fontSize: "0.75rem", 
                color: "#666", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis" 
              }}>
                {hoveredTrack.artists}
              </div>
            </div>
          </div>
          
          <div style={{ 
            marginTop: "0.5rem", 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "0.4rem",
            fontSize: "0.7rem",
            fontWeight: 700
          }}>
            <div style={{ backgroundColor: "var(--color-pink)", padding: "2px 6px", borderRadius: "4px", border: "1px solid #000" }}>
              {t("playlist.sortValence")}: {hoveredTrack.valence !== null ? hoveredTrack.valence.toFixed(2) : "N/A"}
            </div>
            <div style={{ backgroundColor: "var(--color-orange)", padding: "2px 6px", borderRadius: "4px", border: "1px solid #000" }}>
              {t("playlist.sortEnergy")}: {hoveredTrack.energy !== null ? hoveredTrack.energy.toFixed(2) : "N/A"}
            </div>
          </div>
        </div>
      )}
      {/* Légende comparative (Duel) */}
      {secondaryTracks && (
        <div style={{ 
          display: "flex", 
          gap: "1.5rem", 
          marginTop: "1rem", 
          fontSize: "0.85rem", 
          fontWeight: 800,
          border: "var(--border-thin)",
          borderRadius: "6px",
          padding: "6px 12px",
          backgroundColor: "var(--bg-main)",
          boxShadow: "2px 2px 0px 0px #000"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--color-pink)", border: "1px solid #000" }}></span>
            <span>{primaryLabel || "Playlist A"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "var(--color-blue)", border: "1px solid #000" }}></span>
            <span>{secondaryLabel || "Playlist B"}</span>
          </div>
        </div>
      )}
      
      {/* Messages explicatifs */}
      <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "#666", fontWeight: 600, textAlign: "center" }}>
        {t("map.helpText")}
      </p>

      {/* Alerte titres non cartographiables */}
      {tracks.length - tracks.filter(t => t.valence !== null && t.energy !== null).length > 0 && (
        <div className="animate-pop" style={{
          marginTop: "0.75rem",
          width: "100%",
          padding: "0.6rem 0.8rem",
          backgroundColor: "var(--color-orange)",
          boxShadow: "2px 2px 0px 0px var(--shadow-color)",
          border: "var(--border-thin)",
          borderRadius: "8px",
          fontSize: "0.8rem",
          fontWeight: 700,
          textAlign: "center"
        }}>
          {t("map.unmappedWarning").replace("{count}", String(tracks.length - tracks.filter(t => t.valence !== null && t.energy !== null).length))}
        </div>
      )}
    </div>
  );
}
