// src/components/ArchipelMap.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { getDominantTrackGenre, formatGenreLabel } from "@/lib/genreResolver";

interface Track {
  id: string;
  name: string;
  artists: string;
  [key: string]: any;
}

interface ArchipelMapProps {
  tracks: Track[];
  trackGenres: Record<string, string>;
  onSelectTrack?: (track: any) => void;
  selectedTrack?: any;
  onSelectGenreFilter?: (genre: string | null) => void;
  selectedGenreFilter?: string | null;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  trackName: string;
  artist: string;
  dominantGenre: string;
}

// Deterministic string hashing function to position tracks inside the bubbles safely
const getDeterministicCoords = (trackId: string, centerX: number, centerY: number, maxRadius: number) => {
  let hash = 0;
  for (let i = 0; i < trackId.length; i++) {
    hash = trackId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const seed = Math.abs(hash);
  const angle = (seed % 360) * (Math.PI / 180);
  
  // Distribute dots within 15% to 70% of the bubble's radius so they don't leak or touch the borders
  const r = maxRadius * (0.15 + (seed % 55) / 100);
  
  return {
    x: centerX + Math.cos(angle) * r,
    y: centerY + Math.sin(angle) * r
  };
};

export default function ArchipelMap({
  tracks = [],
  trackGenres = {},
  onSelectTrack,
  selectedTrack,
  onSelectGenreFilter,
  selectedGenreFilter
}: ArchipelMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    trackName: "",
    artist: "",
    dominantGenre: ""
  });
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

  // 1. Calculate the track counts per macro genre
  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const track of tracks) {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      counts[dominant] = (counts[dominant] || 0) + 1;
    }
    return counts;
  }, [tracks, trackGenres]);

  // 2. Generate center coordinates and dynamic radii for the bubbles based on counts
  const bubbleCenters = useMemo(() => {
    const outerGenres = [
      { key: "pop", name: "Pop", color: "var(--color-pink, #ec4899)" },
      { key: "electronic", name: "Électronique", color: "var(--color-purple, #a855f7)" },
      { key: "reggae_latin_world", name: "Reggae & Monde", color: "var(--color-green, #22c55e)" },
      { key: "hip-hop", name: "Hip-Hop", color: "var(--color-yellow, #eab308)" },
      { key: "jazz_blues", name: "Jazz & Blues", color: "var(--color-blue, #3b82f6)" },
      { key: "folk_acoustic", name: "Folk & Acoustique", color: "#fbcfe8" },
      { key: "classical_ambient", name: "Classique & B.O.", color: "#86efac" },
      { key: "rock", name: "Rock", color: "var(--color-orange, #f97316)" }
    ];

    const centers: Record<string, { x: number; y: number; name: string; color: string; radius: number }> = {};

    outerGenres.forEach((g, idx) => {
      const angle = (idx * Math.PI) / 4 - Math.PI / 2; // top center is Pop
      const R = 330; // Orbit radius
      const count = genreCounts[g.key] || 0;
      
      // Radius ranges from 65px (empty/few tracks) to 135px (highly populated)
      const radius = Math.max(65, Math.min(135, 65 + Math.sqrt(count) * 16));

      centers[g.key] = {
        x: Math.round(500 + R * Math.cos(angle)),
        y: Math.round(500 + R * Math.sin(angle)),
        name: g.name,
        color: g.color,
        radius
      };
    });

    // Add central "autre"
    const countAutre = genreCounts.autre || 0;
    const radiusAutre = Math.max(65, Math.min(135, 65 + Math.sqrt(countAutre) * 16));
    centers.autre = {
      x: 500,
      y: 500,
      name: "Autre",
      color: "#cbd5e1",
      radius: radiusAutre
    };

    return centers;
  }, [genreCounts]);

  // 3. Map tracks to 2D points inside their respective bubbles
  const mappedPoints = useMemo(() => {
    return tracks.map((track) => {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      const bubble = bubbleCenters[dominant] || bubbleCenters.autre;
      
      const coords = getDeterministicCoords(track.id, bubble.x, bubble.y, bubble.radius);
      
      return {
        track,
        genre: dominant,
        x: coords.x,
        y: coords.y
      };
    });
  }, [tracks, trackGenres, bubbleCenters]);

  const handleDotMouseEnter = (e: React.MouseEvent, point: typeof mappedPoints[0]) => {
    if (isTouchDevice) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mapContainer = e.currentTarget.closest(".map-container-relative");
    const containerRect = mapContainer?.getBoundingClientRect();
    
    const x = rect.left - (containerRect?.left || 0) + rect.width / 2;
    const y = rect.top - (containerRect?.top || 0);

    const tagsString = trackGenres[point.track.id] || point.track.genres;
    const microGenre = tagsString ? tagsString.split(",")[0].trim() : "inconnu";

    setTooltip({
      visible: true,
      x,
      y,
      trackName: point.track.name,
      artist: point.track.artists,
      dominantGenre: microGenre
    });
  };

  const handleDotMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleIslandClick = (genre: string) => {
    if (selectedGenreFilter === genre) {
      onSelectGenreFilter?.(null);
    } else {
      onSelectGenreFilter?.(genre);
    }
  };

  return (
    <div 
      className="map-container-relative animate-pop"
      style={{
        position: "relative",
        height: "500px",
        width: "100%",
        backgroundColor: "#fbf8f3",
        border: "var(--border-thick)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-hard)",
        overflow: "hidden"
      }}
    >
      {/* SVG Viewport */}
      <svg 
        viewBox="0 0 1000 1000"
        style={{
          width: "100%",
          height: "100%",
          userSelect: "none"
        }}
      >
        {/* Orbital ring line */}
        <circle
          cx="500"
          cy="500"
          r="330"
          fill="none"
          stroke="#1c1917"
          strokeWidth="1.5"
          strokeDasharray="8 8"
          opacity="0.3"
        />

        {/* Radial grid lines linking bubbles */}
        {Object.entries(bubbleCenters).map(([genre, center]) => {
          if (genre === "autre") return null;
          return (
            <line
              key={`line-${genre}`}
              x1="500"
              y1="500"
              x2={center.x}
              y2={center.y}
              stroke="#1c1917"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.2"
            />
          );
        })}

        {/* Draw Genre Bubbles (Background) */}
        {Object.entries(bubbleCenters).map(([genre, center]) => {
          const isFiltered = selectedGenreFilter === genre;
          const isAnyFiltered = selectedGenreFilter !== null && selectedGenreFilter !== undefined;
          
          // Opacity calculations for Soft Neo-Brutalist highlight
          const fillOpacity = isAnyFiltered ? (isFiltered ? 0.35 : 0.04) : 0.15;
          const strokeOpacity = isAnyFiltered ? (isFiltered ? 1.0 : 0.15) : 0.7;
          const count = genreCounts[genre] || 0;

          return (
            <g 
              key={genre} 
              onClick={() => handleIslandClick(genre)}
              style={{ cursor: "pointer" }}
            >
              {/* Main bubble circle */}
              <circle
                cx={center.x}
                cy={center.y}
                r={center.radius}
                fill={center.color}
                fillOpacity={fillOpacity}
                stroke="#1c1917"
                strokeWidth={isFiltered ? "4" : "2.5"}
                strokeOpacity={strokeOpacity}
                style={{ 
                  transition: "fill-opacity 0.25s, stroke-width 0.25s, r 0.3s",
                }}
              />
              
              {/* Badge for Genre Name & count */}
              <g 
                style={{ 
                  opacity: isAnyFiltered ? (isFiltered ? 1.0 : 0.25) : 0.9,
                  transition: "opacity 0.25s"
                }}
              >
                {/* Badge card background */}
                <rect
                  x={center.x - 70}
                  y={center.y - 22}
                  width="140"
                  height="44"
                  rx="8"
                  fill="#ffffff"
                  stroke="#1c1917"
                  strokeWidth="2"
                  style={{
                    filter: "drop-shadow(2px 2px 0px #1c1917)"
                  }}
                />
                
                {/* Genre Label */}
                <text
                  x={center.x}
                  y={center.y - 3}
                  textAnchor="middle"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "12px",
                    fontWeight: "900",
                    fill: "#1c1917"
                  }}
                >
                  {center.name}
                </text>
                
                {/* Count Label */}
                <text
                  x={center.x}
                  y={center.y + 14}
                  textAnchor="middle"
                  style={{
                    fontFamily: "monospace",
                    fontSize: "10px",
                    fontWeight: "bold",
                    fill: "#666666"
                  }}
                >
                  {count} titre{count > 1 ? "s" : ""}
                </text>
              </g>
            </g>
          );
        })}

        {/* Draw Track Dots */}
        {mappedPoints.map((point) => {
          const isSelected = selectedTrack && selectedTrack.id === point.track.id;
          const isFiltered = selectedGenreFilter === null || selectedGenreFilter === undefined || selectedGenreFilter === point.genre;
          const color = bubbleCenters[point.genre]?.color || "#cbd5e1";
          
          if (!isFiltered) return null;

          return (
            <g key={point.track.id}>
              {/* Cible de toucher transparente de 44px de diamètre (rayon 22) */}
              <circle
                cx={point.x}
                cy={point.y}
                r="22"
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => handleDotMouseEnter(e, point)}
                onMouseLeave={handleDotMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTrack?.(point.track);
                }}
              />
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="18"
                  fill="var(--color-yellow, #fef08a)"
                  fillOpacity="0.45"
                  stroke="#1c1917"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                  style={{ pointerEvents: "none" }}
                  className="animate-pulse"
                />
              )}
              {/* Solid track dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isSelected ? "9" : "6.5"}
                fill={isSelected ? "var(--color-yellow, #fef08a)" : color}
                stroke="#1c1917"
                strokeWidth={isSelected ? "3.2" : "2"}
                style={{
                  pointerEvents: "none",
                  transition: "r 0.2s, stroke-width 0.2s"
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {!isTouchDevice && tooltip.visible && (
        <div
          style={{
            position: "absolute",
            top: `${tooltip.y - 8}px`,
            left: `${tooltip.x}px`,
            transform: "translate(-50%, -100%)",
            backgroundColor: "#ffffff",
            border: "var(--border-thin)",
            boxShadow: "3px 3px 0px 0px var(--foreground)",
            padding: "0.4rem 0.8rem",
            fontSize: "0.8rem",
            fontWeight: "bold",
            borderRadius: "8px",
            color: "var(--foreground)",
            fontFamily: "monospace",
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap"
          }}
        >
          <div style={{ fontWeight: "extrabold", borderBottom: "1.5px solid #1c1917", paddingBottom: "2px", marginBottom: "4px" }}>
            {tooltip.trackName}
          </div>
          <div style={{ color: "#666", fontSize: "0.7rem" }}>
            👤 {tooltip.artist}
          </div>
          <div style={{ color: "var(--color-purple)", fontSize: "0.7rem", marginTop: "2px" }}>
            🏷️ Genre : {tooltip.dominantGenre}
          </div>
        </div>
      )}

      {/* Filter Badge reset */}
      {selectedGenreFilter && (
        <div 
          onClick={() => onSelectGenreFilter?.(null)}
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            backgroundColor: "var(--color-orange)",
            border: "2.5px solid #1c1917",
            boxShadow: "2px 2px 0px 0px #1c1917",
            borderRadius: "6px",
            padding: "4px 10px",
            fontFamily: "monospace",
            fontSize: "0.75rem",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 10
          }}
        >
          <span>📍 Filtre : {formatGenreLabel(selectedGenreFilter)}</span>
          <span style={{
            backgroundColor: "#ffffff",
            width: "16px",
            height: "16px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            border: "1px solid #1c1917"
          }}>x</span>
        </div>
      )}
    </div>
  );
}
