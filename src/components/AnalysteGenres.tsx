// src/components/AnalysteGenres.tsx
"use client";

import React, { useState, useMemo } from "react";
import { getDominantTrackGenre, formatGenreLabel, mapTagToLevel } from "@/lib/genreResolver";
import { useTranslation } from "@/context/LanguageContext";

interface Track {
  id: string;
  name: string;
  artists: string;
  [key: string]: any;
}

interface AnalysteGenresProps {
  tracks: Track[];
  trackGenres: Record<string, string>; // Maps trackId -> comma-separated tags
  onSelectTrack?: (track: any) => void;
  selectedTrack?: any;
}

type ZoomLevel = "macro" | "meso" | "micro";

export default function AnalysteGenres({
  tracks = [],
  trackGenres = {},
  onSelectTrack,
  selectedTrack
}: AnalysteGenresProps) {
  const { t, language } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("macro");
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);

  // 1. Group tracks and calculate percentages at the selected zoom level
  const genreData = useMemo(() => {
    if (tracks.length === 0) return { list: [], totalResolved: 0 };

    const counts: Record<string, { count: number; tracks: Track[] }> = {};
    let totalResolved = 0;

    for (const track of tracks) {
      const tagsString = trackGenres[track.id] || track.genres;
      if (tagsString) {
        const tags = tagsString.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
        if (tags.length > 0) {
          totalResolved++;
          // Map each tag to the target zoom level
          const mappedTags: string[] = Array.from(new Set(tags.map((tag: string) => mapTagToLevel(tag, zoomLevel))));
          
          for (const genre of mappedTags) {
            if (!counts[genre]) {
              counts[genre] = { count: 0, tracks: [] };
            }
            if (!counts[genre].tracks.some(t => t.id === track.id)) {
              counts[genre].count++;
              counts[genre].tracks.push(track);
            }
          }
        } else {
          const dominant = "autre";
          if (!counts[dominant]) {
            counts[dominant] = { count: 0, tracks: [] };
          }
          counts[dominant].count++;
          counts[dominant].tracks.push(track);
        }
      } else {
        // Track doesn't have genres resolved yet
        const dominant = "autre";
        if (!counts[dominant]) {
          counts[dominant] = { count: 0, tracks: [] };
        }
        counts[dominant].count++;
        counts[dominant].tracks.push(track);
      }
    }

    // Convert to sorted array
    const list = Object.entries(counts)
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        tracks: data.tracks,
        percentage: Math.round((data.count / tracks.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);

    return { list, totalResolved };
  }, [tracks, trackGenres, zoomLevel]);

  // 2. Extract semantic mood characteristics based on dominant genres
  const semanticAttributes = useMemo(() => {
    const attributes = new Set<string>();
    
    // Check top 2 dominant genres
    const topGenres = genreData.list.slice(0, 2).map(g => g.genre);

    for (const g of topGenres) {
      if (g === "rock" || g === "metal" || g === "punk" || g === "hard rock") {
        attributes.add(`⚡ ${language === "fr" ? "Énergique" : "Energetic"}`);
        attributes.add(`✊ ${language === "fr" ? "Rebelle" : "Rebellious"}`);
        attributes.add(`🎸 ${language === "fr" ? "Brut" : "Raw"}`);
      } else if (g === "post-punk" || g === "coldwave" || g === "gothic rock") {
        attributes.add(`🌃 ${language === "fr" ? "Nocturne" : "Nocturnal"}`);
        attributes.add(`🖤 ${language === "fr" ? "Mélancolique" : "Melancholic"}`);
        attributes.add(`❄️ ${language === "fr" ? "Glacial" : "Chilly"}`);
      } else if (g === "pop" || g === "synthpop" || g === "dancepop" || g === "disco") {
        attributes.add(`☀️ ${language === "fr" ? "Solaire" : "Sunny"}`);
        attributes.add(`🕺 ${language === "fr" ? "Festif" : "Festive"}`);
        attributes.add(`📻 ${language === "fr" ? "Nostalgique" : "Nostalgic"}`);
      } else if (g === "hip-hop" || g === "rap" || g === "trap") {
        attributes.add(`🗣️ ${language === "fr" ? "Contestataire" : "Protest"}`);
        attributes.add(`🧱 ${language === "fr" ? "Urbain" : "Urban"}`);
        attributes.add(`🥁 ${language === "fr" ? "Rythmique" : "Rhythmic"}`);
      } else if (g === "electronic" || g === "techno" || g === "house" || g === "synthwave") {
        attributes.add(`🌀 ${language === "fr" ? "Hypnotique" : "Hypnotic"}`);
        attributes.add(`🌃 ${language === "fr" ? "Nocturne" : "Nocturnal"}`);
        attributes.add(`🎛️ ${language === "fr" ? "Répétitif" : "Repetitive"}`);
      } else if (g === "jazz" || g === "blues" || g === "soul" || g === "funk") {
        attributes.add(`🥃 ${language === "fr" ? "Intime" : "Intimate"}`);
        attributes.add(`🎷 ${language === "fr" ? "Sophistiqué" : "Sophisticated"}`);
        attributes.add(`🔥 ${language === "fr" ? "Chaleureux" : "Warm"}`);
      } else if (g === "classical" || g === "soundtrack") {
        attributes.add(`🎬 ${language === "fr" ? "Cinématique" : "Cinematic"}`);
        attributes.add(`👁️ ${language === "fr" ? "Contemplatif" : "Contemplative"}`);
        attributes.add(`🎻 ${language === "fr" ? "Majestueux" : "Majestic"}`);
      } else if (g === "folk" || g === "acoustic" || g === "country") {
        attributes.add(`🌳 ${language === "fr" ? "Organique" : "Organic"}`);
        attributes.add(`🪵 ${language === "fr" ? "Rustique" : "Rustic"}`);
        attributes.add(`☕ ${language === "fr" ? "Chaleureux" : "Warm"}`);
      } else if (g === "reggae" || g === "latin" || g === "world") {
        attributes.add(`☀️ ${language === "fr" ? "Ensoleillé" : "Sunny"}`);
        attributes.add(`🌴 ${language === "fr" ? "Tropical" : "Tropical"}`);
        attributes.add(`🥁 ${language === "fr" ? "Métissé" : "Folk-Infused"}`);
      }
    }

    if (attributes.size === 0) {
      attributes.add(`🎨 ${language === "fr" ? "Éclectique" : "Eclectic"}`);
      attributes.add(`🎵 ${language === "fr" ? "Curieux" : "Curious"}`);
    }

    return Array.from(attributes);
  }, [genreData, language]);

  // 3. Write a nice French text describing the general climate
  const climateDescription = useMemo(() => {
    if (genreData.list.length === 0) return t("genres.noData");
    
    const top = genreData.list[0];
    const second = genreData.list[1];
    
    if (language === "en") {
      let text = `The stylistic profile is primarily dominated by **${formatGenreLabel(top.genre)}** (${top.percentage}%).`;
      if (second && second.percentage > 10) {
        text += ` We also observe strong nuances of **${formatGenreLabel(second.genre)}** (${second.percentage}%).`;
      }
      if (genreData.list.length > 3) {
        text += ` The rest of the selection displays a nice diversity of secondary styles.`;
      }
      return text;
    } else {
      let text = `Le profil stylistique est principalement dominé par le **${formatGenreLabel(top.genre)}** (${top.percentage}%).`;
      if (second && second.percentage > 10) {
        text += ` On observe également de fortes nuances de **${formatGenreLabel(second.genre)}** (${second.percentage}%).`;
      }
      if (genreData.list.length > 3) {
        text += ` Le reste de la sélection présente une belle diversité de styles secondaires.`;
      }
      return text;
    }
  }, [genreData, language, t]);

  // Color assignments for progress bars
  const getGenreColor = (genre: string) => {
    const colors: Record<string, string> = {
      "rock": "var(--color-orange, #f97316)",
      "pop": "var(--color-pink, #ec4899)",
      "electronic": "var(--color-purple, #a855f7)",
      "hip-hop": "var(--color-yellow, #eab308)",
      "jazz_blues": "var(--color-blue, #3b82f6)",
      "classical_ambient": "#a7f3d0", // soft mint green
      "folk_acoustic": "#fbcfe8", // soft pink
      "reggae_latin_world": "var(--color-green, #22c55e)",
      "autre": "#cbd5e1" // slate gray
    };
    return colors[genre] || "var(--color-yellow, #eab308)";
  };

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
      {/* Header section with Zoom Stylistique slider */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.5rem",
        borderBottom: "2px solid #1c1917",
        paddingBottom: "1rem"
      }}>
        <div>
          <span className="neo-badge" style={{ backgroundColor: "var(--color-orange)" }}>
            {t("genres.profile")}
          </span>
          <h3 style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>{t("genres.title")}</h3>
        </div>

        {/* Zoom Stylistique */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          minWidth: "220px"
        }}>
          <label style={{ fontFamily: "monospace", fontSize: "0.75rem", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
            {t("genres.zoom")} : 
            <span style={{ color: "var(--color-purple)", fontWeight: 800 }}>
              {zoomLevel === "macro" ? t("genres.macroDesc") : zoomLevel === "meso" ? t("genres.mesoDesc") : t("genres.microDesc")}
            </span>
          </label>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>{t("genres.macro")}</span>
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="1"
              value={zoomLevel === "macro" ? 1 : zoomLevel === "meso" ? 2 : 3}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setZoomLevel(val === 1 ? "macro" : val === 2 ? "meso" : "micro");
                setExpandedGenre(null); // collapse track list on zoom level change
              }}
              style={{
                flex: 1,
                accentColor: "var(--color-purple)",
                cursor: "pointer"
              }}
            />
            <span style={{ fontSize: "0.7rem", fontWeight: "bold" }}>{t("genres.micro")}</span>
          </div>
        </div>
      </div>

      {/* Climate Description Card */}
      <div style={{
        padding: "0.75rem 1rem",
        backgroundColor: "#fbf8f3",
        border: "var(--border-thin)",
        borderRadius: "8px",
        marginBottom: "1.5rem",
        fontSize: "0.85rem",
        lineHeight: "1.5",
        boxShadow: "2px 2px 0px 0px #1c1917"
      }}>
        <p dangerouslySetInnerHTML={{ __html: climateDescription }} />
        
        {/* Semantic tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "0.75rem" }}>
          {semanticAttributes.map((attr, idx) => (
            <span 
              key={idx} 
              style={{
                fontSize: "0.7rem",
                fontWeight: "bold",
                backgroundColor: "#ffffff",
                border: "1.5px solid #1c1917",
                borderRadius: "4px",
                padding: "2px 6px",
                boxShadow: "1px 1px 0px 0px #1c1917"
              }}
            >
              {attr}
            </span>
          ))}
        </div>
      </div>

      {/* Progress Bars for Distribution */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {genreData.list.map(({ genre, count, percentage, tracks: genreTracks }) => {
          const isExpanded = expandedGenre === genre;
          const displayLabel = formatGenreLabel(genre);
          const barColor = getGenreColor(genre);

          return (
            <div 
              key={genre}
              style={{
                border: "2px solid #1c1917",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "3px 3px 0px 0px #1c1917",
                backgroundColor: "#ffffff"
              }}
            >
              {/* Genre Bar Header (Clickable to toggle track listing) */}
              <div 
                onClick={() => setExpandedGenre(isExpanded ? null : genre)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.8rem",
                  cursor: "pointer",
                  userSelect: "none",
                  backgroundColor: isExpanded ? "#fbf8f3" : "#ffffff",
                  transition: "background-color 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                    {isExpanded ? "▼" : "▶"} {displayLabel}
                  </span>
                  <span style={{ 
                    fontSize: "0.7rem", 
                    backgroundColor: "#1c1917", 
                    color: "#ffffff", 
                    padding: "1px 6px", 
                    borderRadius: "4px",
                    fontWeight: "bold"
                  }}>
                    {count} {language === "fr" ? `morceau${count > 1 ? "s" : ""}` : `track${count > 1 ? "s" : ""}`}
                  </span>
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{percentage}%</span>
              </div>

              {/* Progress Bar Body */}
              <div style={{ 
                height: "8px", 
                width: "100%", 
                backgroundColor: "#f1f5f9", 
                borderTop: "1.5px solid #1c1917" 
              }}>
                <div style={{
                  height: "100%",
                  width: `${percentage}%`,
                  backgroundColor: barColor,
                  transition: "width 0.4s ease-out"
                }} />
              </div>

              {/* Expandable Track List */}
              {isExpanded && (
                <div style={{
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "#fbf8f3",
                  borderTop: "1.5px solid #1c1917",
                  maxHeight: "180px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}>
                  {genreTracks.map((t) => {
                    const isCurrent = selectedTrack && selectedTrack.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onSelectTrack?.(t)}
                        style={{
                          padding: "0.3rem 0.5rem",
                          border: isCurrent ? "2px solid #1c1917" : "1px solid #e2e8f0",
                          borderRadius: "4px",
                          backgroundColor: isCurrent ? "var(--color-yellow, #fef08a)" : "#ffffff",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          alignItems: "center"
                        }}
                      >
                        <span style={{ fontWeight: isCurrent ? "bold" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name}
                        </span>
                        <span style={{ color: "#666", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginLeft: "10px" }}>
                          {t.artists}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
