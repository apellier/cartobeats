import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

interface MobileTrackDrawerProps {
  selectedTrack: Track;
  playingTrackId: string | null;
  loadingTrackId: string | null;
  isReconstructing: boolean;
  onPlayToggle: (track: Track) => void;
  onReconstructFeatures: (trackId: string) => void;
  trackGenres: Record<string, string>;
  onClose: () => void;
}

export default function MobileTrackDrawer({
  selectedTrack,
  playingTrackId,
  loadingTrackId,
  isReconstructing,
  onPlayToggle,
  onReconstructFeatures,
  trackGenres,
  onClose
}: MobileTrackDrawerProps) {
  const { t, language } = useTranslation();
  
  // Animation states
  const [active, setActive] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    // Slide up on mount
    const timer = setTimeout(() => setActive(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setActive(false);
    setTimeout(() => {
      onClose();
    }, 250); // wait for slide down transition
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only allow swipe down if content is not scrolled
    if (e.currentTarget.scrollTop > 0) return;
    setStartY(e.touches[0].clientY);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwiping || startY === null) return;
    const currentTouchY = e.touches[0].clientY;
    const diffY = currentTouchY - startY;

    // Only allow dragging down (positive translation)
    if (diffY > 0) {
      setTranslateY(diffY);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    // If dragged down far enough, close it. Otherwise animate back to 0.
    if (translateY > 100) {
      handleClose();
    } else {
      setTranslateY(0);
    }
    setStartY(null);
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div 
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#ffffff",
        borderTop: "4px solid #1c1917",
        borderLeft: "2px solid #1c1917",
        borderRight: "2px solid #1c1917",
        borderTopLeftRadius: "20px",
        borderTopRightRadius: "20px",
        boxShadow: "0px -4px 10px rgba(0,0,0,0.15)",
        padding: "1rem",
        zIndex: 1000,
        maxHeight: "85vh",
        overflowY: "auto",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        transform: `translateY(${active ? translateY : 100}%)`,
        transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.1)"
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe handle indicator */}
      <div style={{
        width: "40px",
        height: "5px",
        backgroundColor: "#ccc",
        borderRadius: "3px",
        alignSelf: "center",
        marginBottom: "0.25rem",
        cursor: "grab"
      }} />

      {/* Header: Title, Close button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <span className="neo-badge" style={{ backgroundColor: "var(--color-yellow)" }}>
          Inspecteur de Titre 🔎
        </span>
        <button 
          onClick={handleClose}
          style={{
            border: "2px solid #1c1917",
            backgroundColor: "var(--color-pink)",
            borderRadius: "50%",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.8rem",
            boxShadow: "1.5px 1.5px 0px 0px #1c1917"
          }}
        >
          x
        </button>
      </div>

      {/* Track Details */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.25rem" }}>
        {selectedTrack.albumImageUrl && (
          <img 
            src={selectedTrack.albumImageUrl} 
            alt={selectedTrack.name}
            style={{ width: "56px", height: "56px", borderRadius: "6px", border: "1.5px solid #000", objectFit: "cover" }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <h4 style={{ fontSize: "0.95rem", margin: "0 0 2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedTrack.name}
          </h4>
          <p style={{ fontSize: "0.8rem", color: "#555", margin: "0 0 2px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {selectedTrack.artists}
          </p>
          <p style={{ fontSize: "0.7rem", color: "#888", fontStyle: "italic", margin: 0 }}>
            Album : {selectedTrack.albumName}
          </p>
        </div>
      </div>

      {/* Metrics / Progress bars */}
      {selectedTrack.valence === null || selectedTrack.energy === null ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{
            padding: "0.75rem",
            backgroundColor: "var(--bg-main)",
            border: "var(--border-thin)",
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#666",
            textAlign: "center"
          }}>
            ⚠️ Données audio indisponibles.
          </div>
          <button
            onClick={() => onReconstructFeatures(selectedTrack.id)}
            className="neo-btn"
            style={{ backgroundColor: "var(--color-orange)", fontSize: "0.8rem", padding: "0.4rem" }}
            disabled={isReconstructing}
          >
            {isReconstructing ? "⏳ En cours..." : "🎛️ Estimer l'ambiance (Deezer 30s)"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Valence */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.valence")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.valence")} ℹ️
              </span>
              <span>{Math.round(selectedTrack.valence * 100)}%</span>
            </div>
            <div style={{ height: "6px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${selectedTrack.valence * 100}%`, backgroundColor: "var(--color-pink)" }} />
            </div>
          </div>

          {/* Energy */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, marginBottom: "2px" }}>
              <span title={t("tooltip.energy")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                {t("inspector.energy")} ℹ️
              </span>
              <span>{Math.round(selectedTrack.energy * 100)}%</span>
            </div>
            <div style={{ height: "6px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
              <div style={{ height: "100%", width: `${selectedTrack.energy * 100}%`, backgroundColor: "var(--color-orange)" }} />
            </div>
          </div>

          {/* Grid for other features */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700, marginBottom: "1px" }}>
                <span title={t("tooltip.acoustic")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                  {t("inspector.acoustic")} ℹ️
                </span>
                <span>{Math.round((selectedTrack.acousticness ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: "5px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
                <div style={{ height: "100%", width: `${(selectedTrack.acousticness ?? 0) * 100}%`, backgroundColor: "var(--color-blue)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700, marginBottom: "1px" }}>
                <span title={t("tooltip.dance")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                  {t("inspector.dance")} ℹ️
                </span>
                <span>{Math.round((selectedTrack.danceability ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: "5px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
                <div style={{ height: "100%", width: `${(selectedTrack.danceability ?? 0) * 100}%`, backgroundColor: "var(--color-green)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700, marginBottom: "1px" }}>
                <span title={t("tooltip.instr")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                  {t("inspector.instr")} ℹ️
                </span>
                <span>{Math.round((selectedTrack.instrumentalness ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: "5px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
                <div style={{ height: "100%", width: `${(selectedTrack.instrumentalness ?? 0) * 100}%`, backgroundColor: "var(--color-yellow)" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700, marginBottom: "1px" }}>
                <span title={t("tooltip.speech")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                  {t("inspector.speech")} ℹ️
                </span>
                <span>{Math.round((selectedTrack.speechiness ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: "5px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
                <div style={{ height: "100%", width: `${(selectedTrack.speechiness ?? 0) * 100}%`, backgroundColor: "#e2e8f0" }} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", fontWeight: 700, marginBottom: "1px" }}>
                <span title={t("tooltip.live")} style={{ borderBottom: "1px dashed #666", cursor: "help" }}>
                  {t("inspector.live")} ℹ️
                </span>
                <span>{Math.round((selectedTrack.liveness ?? 0) * 100)}%</span>
              </div>
              <div style={{ height: "5px", border: "1px solid #000", borderRadius: "3px", overflow: "hidden", backgroundColor: "#eee" }}>
                <div style={{ height: "100%", width: `${(selectedTrack.liveness ?? 0) * 100}%`, backgroundColor: "#fecdd3" }} />
              </div>
            </div>
          </div>

          {/* Textual Metadata Info */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "0.3rem", 
            marginTop: "0.25rem",
            borderTop: "1px dashed #ccc",
            paddingTop: "0.4rem"
          }}>
            <div style={{ textAlign: "center", backgroundColor: "var(--bg-main)", border: "1px solid #000", borderRadius: "4px", padding: "2px" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#666" }}>TEMPO</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800 }}>
                {selectedTrack.tempo !== null ? `${Math.round(selectedTrack.tempo)} BPM` : "--"}
              </div>
            </div>
            
            <div style={{ textAlign: "center", backgroundColor: "var(--bg-main)", border: "1px solid #000", borderRadius: "4px", padding: "2px" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 800, color: "#666" }}>{t("playlist.sortKey")}</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800 }}>
                {formatKeyMode(selectedTrack.key, selectedTrack.mode, language)}
              </div>
            </div>
          </div>

          {/* Genres */}
          <div style={{ borderTop: "1px dashed #ccc", paddingTop: "0.4rem" }}>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#666", marginBottom: "4px", fontFamily: "monospace" }}>
              🏷️ GENRES DE L'ARTISTE
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {(() => {
                const genresStr = trackGenres[selectedTrack.id] || selectedTrack.genres;
                if (!genresStr) {
                  return <span style={{ fontSize: "0.7rem", color: "#888", fontStyle: "italic" }}>Aucun genre identifié.</span>;
                }
                return genresStr.split(",").map((g: string) => g.trim()).filter(Boolean).slice(0, 4).map((g: string, idx: number) => (
                  <span 
                    key={idx} 
                    style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: "bold", 
                      backgroundColor: "#f3f4f6", 
                      border: "1px solid #1c1917", 
                      borderRadius: "4px", 
                      padding: "1px 4px",
                      boxShadow: "1px 1px 0px 0px #1c1917"
                    }}
                  >
                    {g}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Audio control button */}
      {(selectedTrack.previewUrl || selectedTrack.isrc || (selectedTrack.artists && selectedTrack.name)) && (
        <button 
          onClick={() => onPlayToggle(selectedTrack)}
          className="neo-btn"
          style={{ 
            width: "100%", 
            marginTop: "0.25rem", 
            fontSize: "0.85rem", 
            padding: "0.4rem",
            backgroundColor: playingTrackId === selectedTrack.id 
              ? "var(--color-pink)" 
              : loadingTrackId === selectedTrack.id 
                ? "var(--color-orange)" 
                : "var(--color-yellow)"
          }}
          disabled={loadingTrackId === selectedTrack.id}
        >
          {loadingTrackId === selectedTrack.id 
            ? "⏳ Chargement..." 
            : playingTrackId === selectedTrack.id 
              ? "⏸️ Mettre en pause" 
              : "▶️ Écouter l'extrait (30s)"}
        </button>
      )}
    </div>,
    document.body
  );
}
