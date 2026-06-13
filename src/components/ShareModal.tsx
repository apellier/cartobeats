"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/context/LanguageContext";
import { getDominantTrackGenre, formatGenreLabel } from "@/lib/genreResolver";

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

interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  imageUrl: string | null;
  trackCount: number;
  tracks: Track[];
  source?: string;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistData;
  countrySongCounts: Record<string, number>;
  trackGenres: Record<string, string>;
}

export default function ShareModal({
  isOpen,
  onClose,
  playlist,
  countrySongCounts,
  trackGenres
}: ShareModalProps) {
  const { t, language } = useTranslation();
  const [portraitTab, setPortraitTab] = useState<"ambiance" | "origins" | "genres">("ambiance");

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById("climate-card-svg");
    if (!svgElement) return;

    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = `cartobeat_${playlist.id}_carte.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    } catch (err) {
      console.error("Échec de la génération du fichier SVG :", err);
    }
  };

  return createPortal(
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "1rem"
    }}>
      <div className="neo-card animate-pop" style={{
        backgroundColor: "white",
        maxWidth: "400px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative"
      }}>
        {/* Bouton fermer */}
        <button 
          onClick={onClose}
          style={{
            position: "absolute",
            top: "12px",
            right: "15px",
            border: "none",
            background: "transparent",
            fontSize: "1.5rem",
            cursor: "pointer",
            fontWeight: 900
          }}
        >
          ✖️
        </button>

        <h3 style={{ fontSize: "1.3rem", margin: 0, fontFamily: "var(--font-heading)" }}>
          {t("share.title")}
        </h3>

        {/* Onglets interactifs */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #1c1917", paddingBottom: "0.5rem" }}>
          {(["ambiance", "origins", "genres"] as const).map((tab) => {
            const isActive = portraitTab === tab;
            const labels = {
              ambiance: t("playlist.tabAmbiance"),
              origins: t("playlist.tabOrigins"),
              genres: t("playlist.tabGenres")
            };
            return (
              <button
                key={tab}
                onClick={() => setPortraitTab(tab)}
                style={{
                  flex: 1,
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  border: "2px solid #1c1917",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "var(--color-yellow)" : "white",
                  boxShadow: isActive ? "1px 1px 0px 0px #1c1917" : "none",
                  cursor: "pointer",
                  transition: "all 0.1s"
                }}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Le SVG de la carte */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          border: "var(--border-thin)", 
          borderRadius: "12px", 
          overflow: "hidden", 
          backgroundColor: "var(--bg-main)",
          boxShadow: "2px 2px 0px 0px #000"
        }}>
          <svg 
            id="climate-card-svg"
            width="340" 
            height="450" 
            viewBox="0 0 340 450" 
            style={{ backgroundColor: "#fbf8f3" }}
          >
            {/* Style interne pour garantir le rendu lors de l'export */}
            <style>{`
              .card-text { font-family: 'Plus Jakarta Sans', sans-serif; }
              .card-title { font-family: 'Syne', sans-serif; font-weight: 800; }
            `}</style>

            {/* Cadre principal */}
            <rect x="5" y="5" width="330" height="440" fill="white" stroke="#1c1917" strokeWidth="4" rx="14" />
            <rect x="9" y="9" width="322" height="432" fill="transparent" stroke="#1c1917" strokeWidth="1" rx="11" />

            {/* Badge Cartobeat */}
            <rect x="20" y="25" width="90" height="24" fill="var(--color-yellow)" stroke="#1c1917" strokeWidth="2.5" rx="6" />
            <text x="65" y="41" textAnchor="middle" fill="#1c1917" fontSize="10" fontWeight="900" className="card-text">CARTOBEAT</text>

            {/* Nom Playlist avec Wrap */}
            {(() => {
              const limit = 18;
              if (playlist.name.length <= limit) {
                return (
                  <text x="20" y="80" fill="#1c1917" fontSize="18" fontWeight="900" className="card-title">
                    {playlist.name}
                  </text>
                );
              }
              const words = playlist.name.split(" ");
              let line1 = "";
              let line2 = "";
              for (const word of words) {
                if ((line1 + " " + word).trim().length <= limit && line2 === "") {
                  line1 = (line1 + " " + word).trim();
                } else {
                  line2 = (line2 + " " + word).trim();
                }
              }
              if (line2.length > limit) {
                line2 = line2.slice(0, limit - 3) + "...";
              }
              if (!line2) {
                line1 = playlist.name.slice(0, limit);
                line2 = playlist.name.slice(limit, limit * 2 - 3) + "...";
              }
              return (
                <text x="20" y="72" fill="#1c1917" fontSize="16" fontWeight="900" className="card-title">
                  <tspan x="20" dy="0">{line1}</tspan>
                  <tspan x="20" dy="18">{line2}</tspan>
                </text>
              );
            })()}

            {/* Curateur */}
            <text x="20" y={playlist.name.length > 18 ? 106 : 100} fill="#666" fontSize="10" fontWeight="800" className="card-text">
              CURATEUR : {playlist.ownerName ? playlist.ownerName.toUpperCase() : "INCONNU"}
            </text>

            <line x1="20" y1={playlist.name.length > 18 ? 118 : 115} x2="320" y2={playlist.name.length > 18 ? 118 : 115} stroke="#1c1917" strokeWidth="2" strokeDasharray="3,3" />

            {(() => {
              const rectY = playlist.name.length > 18 ? 132 : 130;
              const rectH = playlist.name.length > 18 ? 80 : 85;

              const mapped = playlist.tracks.filter(t => t.valence !== null && t.energy !== null);
              const avgTempo = Math.round(mapped.reduce((acc, t) => acc + (t.tempo || 0), 0) / (mapped.length || 1));
              const avgEnergy = Math.round((mapped.reduce((acc, t) => acc + (t.energy || 0), 0) / (mapped.length || 1)) * 100);

              if (portraitTab === "origins") {
                const counts = countrySongCounts;
                const dominantCountryIso = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, "");
                let countryName = language === "fr" ? "Inconnu" : "Unknown";
                if (dominantCountryIso) {
                  try {
                    const regionNames = new Intl.DisplayNames([language], { type: "region" });
                    countryName = regionNames.of(dominantCountryIso) || dominantCountryIso;
                  } catch {
                    countryName = dominantCountryIso;
                  }
                }
                const displayCountryName = countryName.length > 12 ? `${countryName.slice(0, 12)}...` : countryName;
                const pctCountry = playlist.tracks.length > 0 ? Math.round(((counts[dominantCountryIso] || 0) / playlist.tracks.length) * 100) : 0;
                const totalCountries = Object.keys(counts).length;

                return (
                  <>
                    <rect x="20" y={rectY} width="300" height={rectH} fill="#a0c4ff" stroke="#1c1917" strokeWidth="3" rx="10" />
                    <text x="35" y={rectY + 30} fill="#1c1917" fontSize="18" fontWeight="900" className="card-title">
                      {t("portrait.activeTabOrigins").toUpperCase()}
                    </text>
                    <text x="35" y={rectY + 54} fill="#1c1917" fontSize="10" fontWeight="700" className="card-text">
                      {pctCountry}% ({counts[dominantCountryIso] || 0} {language === "fr" ? "titres" : "tracks"})
                    </text>

                    {/* Illustration Globe */}
                    <g transform={`translate(0, ${rectY - 130})`}>
                      <circle cx="260" cy="172" r="24" fill="#e0f2fe" stroke="#1c1917" strokeWidth="2.5" />
                      <path d="M236,172 Q260,188 284,172 M236,172 Q260,156 284,172 M236,172 L284,172" fill="none" stroke="#1c1917" strokeWidth="1.5" strokeDasharray="2,2" />
                      <path d="M260,148 Q242,172 260,196 M260,148 Q278,172 260,196 M260,148 L260,196" fill="none" stroke="#1c1917" strokeWidth="1.5" strokeDasharray="2,2" />
                    </g>

                    {/* Stat 1: Countries represented */}
                    <rect x="20" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="30" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.countriesRepresented")}</text>
                    <text x="30" y="285" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {totalCountries}
                    </text>

                    {/* Stat 2: Top Country */}
                    <rect x="180" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="190" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.topCountry")}</text>
                    <text x="190" y="285" fill="#1c1917" fontSize={displayCountryName.length > 10 ? 11 : 16} fontWeight="900" className="card-title">
                      {displayCountryName.toUpperCase()}
                    </text>

                    {/* Stat 3: Tempo */}
                    <rect x="20" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="30" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.tempoMoyen")}</text>
                    <text x="30" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {avgTempo} <tspan fontSize="9" fontWeight="700">BPM</tspan>
                    </text>

                    {/* Stat 4: Énergie */}
                    <rect x="180" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="190" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.energie")}</text>
                    <text x="190" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {avgEnergy}%
                    </text>
                  </>
                );
              }

              if (portraitTab === "genres") {
                const genreCounts: Record<string, number> = {};
                playlist.tracks.forEach(track => {
                  const tagsString = trackGenres[track.id] || track.genres;
                  const dominant = getDominantTrackGenre(tagsString, "macro");
                  genreCounts[dominant] = (genreCounts[dominant] || 0) + 1;
                });
                const dominantGenreKey = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b, "");
                const dominantGenreName = formatGenreLabel(dominantGenreKey);
                const displayGenreName = dominantGenreName.length > 12 ? `${dominantGenreName.slice(0, 12)}...` : dominantGenreName;
                const pctGenre = playlist.tracks.length > 0 ? Math.round(((genreCounts[dominantGenreKey] || 0) / playlist.tracks.length) * 100) : 0;
                const totalGenres = Object.keys(genreCounts).filter(k => k !== "autre" && genreCounts[k] > 0).length;

                return (
                  <>
                    <rect x="20" y={rectY} width="300" height={rectH} fill="#c084fc" stroke="#1c1917" strokeWidth="3" rx="10" />
                    <text x="35" y={rectY + 30} fill="#1c1917" fontSize="18" fontWeight="900" className="card-title">
                      {t("portrait.activeTabGenres").toUpperCase()}
                    </text>
                    <text x="35" y={rectY + 54} fill="#1c1917" fontSize="10" fontWeight="700" className="card-text">
                      {pctGenre}% ({genreCounts[dominantGenreKey] || 0} {language === "fr" ? "titres" : "tracks"})
                    </text>

                    {/* Illustration Archipel */}
                    <g transform={`translate(0, ${rectY - 130})`}>
                      <line x1="248" y1="162" x2="272" y2="166" stroke="#1c1917" strokeWidth="2" strokeDasharray="3,3" />
                      <line x1="248" y1="162" x2="259" y2="186" stroke="#1c1917" strokeWidth="2" strokeDasharray="3,3" />
                      <line x1="272" y1="166" x2="259" y2="186" stroke="#1c1917" strokeWidth="2" strokeDasharray="3,3" />
                      <circle cx="248" cy="162" r="11" fill="#fbcfe8" stroke="#1c1917" strokeWidth="2.5" />
                      <circle cx="272" cy="166" r="9" fill="#fed7aa" stroke="#1c1917" strokeWidth="2.5" />
                      <circle cx="259" cy="186" r="8" fill="#bbf7d0" stroke="#1c1917" strokeWidth="2.5" />
                    </g>

                    {/* Stat 1: Top Genre */}
                    <rect x="20" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="30" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.topGenre")}</text>
                    <text x="30" y="285" fill="#1c1917" fontSize={displayGenreName.length > 10 ? 11 : 16} fontWeight="900" className="card-title">
                      {displayGenreName.toUpperCase()}
                    </text>

                    {/* Stat 2: Genres diversity */}
                    <rect x="180" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="190" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.diversityTitle")}</text>
                    <text x="190" y="285" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {totalGenres}
                    </text>

                    {/* Stat 3: Tempo */}
                    <rect x="20" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="30" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.tempoMoyen")}</text>
                    <text x="30" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {avgTempo} <tspan fontSize="9" fontWeight="700">BPM</tspan>
                    </text>

                    {/* Stat 4: Énergie */}
                    <rect x="180" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                    <text x="190" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.energie")}</text>
                    <text x="190" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                      {avgEnergy}%
                    </text>
                  </>
                );
              }

              // Default: Ambiance (Russell)
              let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
              mapped.forEach(t => {
                if (t.valence! >= 0.5 && t.energy! >= 0.5) q1++;
                else if (t.valence! < 0.5 && t.energy! >= 0.5) q2++;
                else if (t.valence! < 0.5 && t.energy! < 0.5) q3++;
                else q4++;
              });
              
              const maxVal = Math.max(q1, q2, q3, q4);
              let title = language === "fr" ? "Solaire ☀️" : "Sunny ☀️";
              let bg = "#ffa6c9"; // color-pink
              let desc = t("portrait.descSolaire");
              let weatherIcon = null;
              
              if (maxVal === q2) {
                title = language === "fr" ? "Tempétueux ⚡" : "Stormy ⚡";
                bg = "#fed7aa"; // color-orange
                desc = t("portrait.descTempete");
                weatherIcon = (
                  <path d="M265,152 L247,178 L260,178 L252,202 L273,172 L260,172 Z" fill="var(--color-yellow)" stroke="#1c1917" strokeWidth="2" strokeLinejoin="round" />
                );
              } else if (maxVal === q3) {
                title = language === "fr" ? "Brumeux 🌧️" : "Foggy 🌧️";
                bg = "#a0c4ff"; // color-blue
                desc = t("portrait.descBrumeux");
                weatherIcon = (
                  <g stroke="#1c1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M246,183 C242,183 238,179 239,173 C237,166 244,160 250,162 C253,155 264,155 267,162 C273,160 278,166 277,173 C278,179 274,183 270,183 Z" fill="white" />
                    <line x1="252" y1="188" x2="250" y2="193" />
                    <line x1="260" y1="188" x2="258" y2="193" />
                    <line x1="268" y1="188" x2="266" y2="193" />
                  </g>
                );
              } else if (maxVal === q4) {
                title = language === "fr" ? "Serein 🍃" : "Serene 🍃";
                bg = "#bbf7d0"; // color-green
                desc = t("portrait.descSerein");
                weatherIcon = (
                  <path d="M248,183 C248,166 269,157 273,157 C273,174 252,183 248,183 Z M248,183 L265,166" fill="#a7f3d0" stroke="#1c1917" strokeWidth="2" strokeLinejoin="round" />
                );
              } else {
                weatherIcon = (
                  <g stroke="#1c1917" strokeWidth="2" strokeLinecap="round" fill="none">
                    <circle cx="260" cy="172" r="13" fill="var(--color-yellow)" />
                    <line x1="260" y1="152" x2="260" y2="155" />
                    <line x1="260" y1="189" x2="260" y2="192" />
                    <line x1="240" y1="172" x2="243" y2="172" />
                    <line x1="277" y1="172" x2="280" y2="172" />
                  </g>
                );
              }

              const avgDance = Math.round((mapped.reduce((acc, t) => acc + (t.danceability || 0), 0) / (mapped.length || 1)) * 100);
              const avgAcoustic = Math.round((mapped.reduce((acc, t) => acc + (t.acousticness || 0), 0) / (mapped.length || 1)) * 100);

              return (
                <>
                  <rect x="20" y={rectY} width="300" height={rectH} fill={bg} stroke="#1c1917" strokeWidth="3" rx="10" />
                  <text x="35" y={rectY + 30} fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                    {title.toUpperCase()}
                  </text>
                  <text x="35" y={rectY + 54} fill="#1c1917" fontSize="10" fontWeight="700" className="card-text">
                    {desc}
                  </text>

                  {/* Weather Icon */}
                  <g transform={`translate(0, ${rectY - 130})`}>
                    {weatherIcon}
                  </g>

                  {/* Stats cards */}
                  <rect x="20" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                  <text x="30" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.tempoMoyen")}</text>
                  <text x="30" y="285" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                    {avgTempo} <tspan fontSize="9" fontWeight="700">BPM</tspan>
                  </text>

                  <rect x="180" y="235" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                  <text x="190" y="255" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("playlist.sortDance").toUpperCase()}</text>
                  <text x="190" y="285" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                    {avgDance}%
                  </text>

                  <rect x="20" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                  <text x="30" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("playlist.sortAcoustic").toUpperCase()}</text>
                  <text x="30" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                    {avgAcoustic}%
                  </text>

                  <rect x="180" y="315" width="140" height="65" fill="#ffffff" stroke="#1c1917" strokeWidth="2" rx="8" />
                  <text x="190" y="365" fill="#1c1917" fontSize="20" fontWeight="900" className="card-title">
                    {avgEnergy}%
                  </text>
                  <text x="190" y="335" fill="#666" fontSize="7" fontWeight="800" className="card-text">{t("portrait.energie")}</text>
                </>
              );
            })()}

            {/* Footer Brand */}
            <line x1="20" y1="400" x2="320" y2="400" stroke="#ddd" strokeWidth="1.5" />
            <text x="170" y="420" textAnchor="middle" fill="#999" fontSize="8" fontWeight="800" className="card-text">GÉNÉRÉ SUR CARTOBEAT.APP</text>
          </svg>
        </div>

        {/* Options de partage */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button 
            onClick={handleDownloadSvg}
            className="neo-btn neo-btn-pink"
            style={{ width: "100%", fontSize: "0.95rem", padding: "0.5rem" }}
          >
            💾 {t("share.download")}
          </button>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {typeof navigator !== "undefined" && !!navigator.share ? (
              <button
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: "Cartobeat",
                      text: t("share.text"),
                      url: window.location.href
                    });
                  } catch (err) {
                    console.error("Partage annulé ou échoué:", err);
                  }
                }}
                className="neo-btn"
                style={{ backgroundColor: "var(--color-blue)", fontSize: "0.85rem", padding: "0.4rem" }}
              >
                🔗 {language === "fr" ? "Partager 🔗" : "Share 🔗"}
              </button>
            ) : (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert(t("share.linkCopied"));
                }}
                className="neo-btn"
                style={{ backgroundColor: "var(--color-blue)", fontSize: "0.85rem", padding: "0.4rem" }}
              >
                📋 {language === "fr" ? "Lien d'analyse 📋" : "Analysis link 📋"}
              </button>
            )}
            
            <button
              onClick={() => {
                const shareText = encodeURIComponent(`${t("share.text")} ${window.location.href}`);
                window.open(`https://api.whatsapp.com/send?text=${shareText}`, "_blank");
              }}
              className="neo-btn"
              style={{ backgroundColor: "var(--color-green)", fontSize: "0.85rem", padding: "0.4rem" }}
            >
              🟢 WhatsApp
            </button>
          </div>

          {typeof navigator !== "undefined" && !!navigator.share && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert(t("share.linkCopied"));
              }}
              className="neo-btn"
              style={{ backgroundColor: "var(--color-yellow)", fontSize: "0.85rem", padding: "0.4rem" }}
            >
              📋 {t("share.copyLink")}
            </button>
          )}

          <p style={{ fontSize: "0.7rem", color: "#666", textAnchor: "middle", textAlign: "center", fontStyle: "italic", margin: 0 }}>
            📸 {t("share.instagramTip")}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
