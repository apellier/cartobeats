"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import CartographeMap from "@/components/CartographeMap";
import { useTranslation, formatKeyMode } from "@/context/LanguageContext";

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

interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  imageUrl: string | null;
  trackCount: number;
  tracks: Track[];
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");
  const { t, language } = useTranslation();

  const [playlist1, setPlaylist1] = useState<PlaylistData | null>(null);
  const [playlist2, setPlaylist2] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [deezerPreviews, setDeezerPreviews] = useState<Record<string, string | null>>({});
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio();
    const handleEnded = () => setPlayingTrackId(null);
    audioRef.current.addEventListener("ended", handleEnded);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, []);

  useEffect(() => {
    if (!id1 || !id2) {
      setError("Deux identifiants de playlists sont nécessaires pour effectuer la comparaison.");
      setIsLoading(false);
      return;
    }

    const loadPlaylists = async () => {
      try {
        const [res1, res2] = await Promise.all([
          fetch(`/api/analyze?id=${id1}`),
          fetch(`/api/analyze?id=${id2}`)
        ]);

        const data1 = await res1.json();
        const data2 = await res2.json();

        if (!res1.ok) throw new Error(data1.error || `Impossible de charger la playlist 1 (${id1})`);
        if (!res2.ok) throw new Error(data2.error || `Impossible de charger la playlist 2 (${id2})`);

        setPlaylist1(data1);
        setPlaylist2(data2);

        // Sélectionner par défaut le premier morceau de la playlist 1 sur desktop uniquement
        if (data1.tracks && data1.tracks.length > 0) {
          const isMobileInitial = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
          if (!isMobileInitial) {
            setSelectedTrack(data1.tracks[0]);
          }
        } else if (data2.tracks && data2.tracks.length > 0) {
          const isMobileInitial = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
          if (!isMobileInitial) {
            setSelectedTrack(data2.tracks[0]);
          }
        }

        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des playlists du duel.");
        setIsLoading(false);
      }
    };

    loadPlaylists();
  }, [id1, id2]);

  // Moyennes de la playlist 1
  const stats1 = useMemo(() => {
    if (!playlist1 || playlist1.tracks.length === 0) return null;
    const mapped = playlist1.tracks.filter(t => t.valence !== null && t.energy !== null);
    if (mapped.length === 0) return null;

    const total = mapped.length;
    return {
      valence: mapped.reduce((acc, t) => acc + (t.valence || 0), 0) / total,
      energy: mapped.reduce((acc, t) => acc + (t.energy || 0), 0) / total,
      danceability: mapped.reduce((acc, t) => acc + (t.danceability || 0), 0) / total,
      acousticness: mapped.reduce((acc, t) => acc + (t.acousticness || 0), 0) / total,
      tempo: mapped.reduce((acc, t) => acc + (t.tempo || 0), 0) / total,
      instrumentalness: mapped.reduce((acc, t) => acc + (t.instrumentalness || 0), 0) / total,
    };
  }, [playlist1]);

  // Moyennes de la playlist 2
  const stats2 = useMemo(() => {
    if (!playlist2 || playlist2.tracks.length === 0) return null;
    const mapped = playlist2.tracks.filter(t => t.valence !== null && t.energy !== null);
    if (mapped.length === 0) return null;

    const total = mapped.length;
    return {
      valence: mapped.reduce((acc, t) => acc + (t.valence || 0), 0) / total,
      energy: mapped.reduce((acc, t) => acc + (t.energy || 0), 0) / total,
      danceability: mapped.reduce((acc, t) => acc + (t.danceability || 0), 0) / total,
      acousticness: mapped.reduce((acc, t) => acc + (t.acousticness || 0), 0) / total,
      tempo: mapped.reduce((acc, t) => acc + (t.tempo || 0), 0) / total,
      instrumentalness: mapped.reduce((acc, t) => acc + (t.instrumentalness || 0), 0) / total,
    };
  }, [playlist2]);

  // Score de compatibilité acoustique
  const compatibility = useMemo(() => {
    if (!stats1 || !stats2) return 0;
    const diffValence = Math.abs(stats1.valence - stats2.valence);
    const diffEnergy = Math.abs(stats1.energy - stats2.energy);
    const diffDance = Math.abs(stats1.danceability - stats2.danceability);
    const diffAcoustic = Math.abs(stats1.acousticness - stats2.acousticness);
    const diffTempo = Math.abs(stats1.tempo - stats2.tempo) / 150; // BPM normalisé

    const rawScore = 100 - (diffValence + diffEnergy + diffDance + diffAcoustic + diffTempo) * 20;
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }, [stats1, stats2]);

  // Commentaire sur le score de compatibilité
  const compatibilityComment = useMemo(() => {
    if (compatibility >= 85) return "🔗 Ambiances jumelles ! Vos goûts sont fusionnels, vous pourriez partager le même casque sans aucune friction.";
    if (compatibility >= 65) return "🌤️ Harmonie modérée. Vos playlists partagent un espace tempéré commun avec quelques ambiances distinctes.";
    if (compatibility >= 45) return "🌬️ Ambiances changeantes. Plusieurs univers se croisent. Une belle complémentarité, mais attention aux chocs rythmiques.";
    return "❄️ Contraste total ! Vos playlists sont aux antipodes sensoriels. L'une préfère le calme absolu, l'autre l'intensité électrique.";
  }, [compatibility]);

  // Gérer la lecture de l'extrait
  const handlePlayToggle = async (track: Track) => {
    if (!audioRef.current) return;

    if (playingTrackId === track.id) {
      audioRef.current.pause();
      setPlayingTrackId(null);
      return;
    }

    let url = track.previewUrl;

    if (!url) {
      if (deezerPreviews[track.id]) {
        url = deezerPreviews[track.id];
      } else if (deezerPreviews[track.id] === null) {
        alert("Extrait audio indisponible pour ce morceau.");
        return;
      } else {
        setLoadingTrackId(track.id);
        try {
          const res = await fetch(`/api/preview?isrc=${track.isrc || ""}&artists=${encodeURIComponent(track.artists)}&name=${encodeURIComponent(track.name)}`);
          const data = await res.json();
          if (data.previewUrl) {
            url = data.previewUrl;
            setDeezerPreviews((prev) => ({ ...prev, [track.id]: data.previewUrl }));
          } else {
            setDeezerPreviews((prev) => ({ ...prev, [track.id]: null }));
            alert("Extrait audio indisponible sur Spotify et Deezer.");
            setLoadingTrackId(null);
            return;
          }
        } catch (err) {
          console.error("Erreur Deezer preview", err);
          alert("Erreur lors de la récupération de l'extrait.");
          setLoadingTrackId(null);
          return;
        }
        setLoadingTrackId(null);
      }
    }

    if (url) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.play().catch(e => console.error("Erreur lecture audio", e));
      setPlayingTrackId(track.id);
    }
  };

  if (isLoading) {
    return (
      <div className="neo-container" style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "60vh",
        gap: "1.5rem" 
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "5px solid #eee",
          borderTop: "5px solid var(--color-yellow)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--foreground)" }}>
          Calcul des forces acoustiques en présence... ⚔️
        </p>
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !playlist1 || !playlist2 || !stats1 || !stats2) {
    return (
      <div className="neo-container" style={{ maxWidth: "600px", marginTop: "4rem" }}>
        <div className="neo-card" style={{ backgroundColor: "var(--color-orange)", textAlign: "center" }}>
          <h2 style={{ marginBottom: "1rem" }}>Duel impossible ⚠️</h2>
          <p style={{ marginBottom: "1.5rem", fontWeight: 500 }}>{error || "Une erreur inconnue est survenue."}</p>
          <button onClick={() => router.push("/")} className="neo-btn neo-btn-secondary">
            &larr; Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-container animate-pop" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      
      {/* Retour accueil */}
      <button 
        onClick={() => router.push("/")} 
        className="neo-btn neo-btn-secondary" 
        style={{ alignSelf: "flex-start", fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}
      >
        {t("compare.btnBack")}
      </button>

      {/* Titre du Duel */}
      <section style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <span className="neo-badge" style={{ backgroundColor: "var(--color-orange)" }}>
          {t("compare.badge")}
        </span>
        <h1 style={{ fontSize: "2.8rem", wordBreak: "break-word" }}>
          {playlist1.name} <span style={{ color: "#888", fontSize: "2rem" }}>VS</span> {playlist2.name}
        </h1>
      </section>

      {/* Cartes des playlists curatées */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
        {/* Playlist 1 - Rose */}
        <div className="neo-card" style={{ backgroundColor: "white", borderLeft: "12px solid var(--color-pink)", display: "flex", gap: "1rem", alignItems: "center" }}>
          {playlist1.imageUrl && (
            <img src={playlist1.imageUrl} alt={playlist1.name} style={{ width: "80px", height: "80px", borderRadius: "8px", border: "var(--border-thin)" }} />
          )}
          <div>
            <h3 style={{ fontSize: "1.2rem", margin: 0 }}>{playlist1.name}</h3>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "2px 0" }}>Curateur : {playlist1.ownerName || "Inconnu"}</p>
            <span className="neo-badge" style={{ backgroundColor: "var(--color-pink)", fontSize: "0.75rem", padding: "1px 6px" }}>{playlist1.trackCount} titres</span>
          </div>
        </div>

        {/* Playlist 2 - Bleue */}
        <div className="neo-card" style={{ backgroundColor: "white", borderLeft: "12px solid var(--color-blue)", display: "flex", gap: "1rem", alignItems: "center" }}>
          {playlist2.imageUrl && (
            <img src={playlist2.imageUrl} alt={playlist2.name} style={{ width: "80px", height: "80px", borderRadius: "8px", border: "var(--border-thin)" }} />
          )}
          <div>
            <h3 style={{ fontSize: "1.2rem", margin: 0 }}>{playlist2.name}</h3>
            <p style={{ fontSize: "0.85rem", color: "#666", margin: "2px 0" }}>Curateur : {playlist2.ownerName || "Inconnu"}</p>
            <span className="neo-badge" style={{ backgroundColor: "var(--color-blue)", fontSize: "0.75rem", padding: "1px 6px" }}>{playlist2.trackCount} titres</span>
          </div>
        </div>
      </div>

      {/* Section Compatibilité & Score */}
      <section className="neo-card" style={{ backgroundColor: "white", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <h3 style={{ fontSize: "1.2rem", margin: 0 }}>{t("compare.compatibility")}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            border: "var(--border-thick)",
            backgroundColor: "var(--color-yellow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            fontWeight: 900,
            boxShadow: "3px 3px 0px 0px #000"
          }}>
            {compatibility}%
          </div>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, maxWidth: "500px", lineHeight: 1.5, textAlign: "left" }}>
            {compatibilityComment}
          </p>
        </div>
      </section>

      {/* Grid Principal : Carte 2D partagée vs Profils acoustiques */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", gap: "2.5rem", alignItems: "start" }}>
        
        {/* Colonne de Gauche : Carte SVG partagée */}
        <div>
          <CartographeMap 
            tracks={playlist1.tracks}
            secondaryTracks={playlist2.tracks}
            primaryLabel={playlist1.name}
            secondaryLabel={playlist2.name}
            onSelectTrack={setSelectedTrack}
            selectedTrack={selectedTrack}
            playingTrackId={playingTrackId}
            onPlayToggle={handlePlayToggle}
          />
        </div>

        {/* Colonne de Droite : Tableau Comparatif & Inspecteur */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {/* Tableau Comparatif des Métriques */}
          <div className="neo-card" style={{ backgroundColor: "white" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>{t("compare.metricTitle")}</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "var(--border-thin)", textAlign: "left" }}>
                  <th style={{ padding: "0.5rem", fontWeight: 800 }}>{t("compare.topMetric")}</th>
                  <th style={{ padding: "0.5rem", fontWeight: 800, color: "var(--color-pink)", filter: "brightness(0.7)" }}>{playlist1.name.slice(0, 15)}</th>
                  <th style={{ padding: "0.5rem", fontWeight: 800, color: "var(--color-blue)", filter: "brightness(0.7)" }}>{playlist2.name.slice(0, 15)}</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>☀️ {t("playlist.sortValence")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.valence >= stats2.valence ? 900 : 500 }}>
                    {Math.round(stats1.valence * 100)}% {stats1.valence >= stats2.valence && "✨"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.valence >= stats1.valence ? 900 : 500 }}>
                    {Math.round(stats2.valence * 100)}% {stats2.valence >= stats1.valence && "✨"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>⚡ {t("playlist.sortEnergy")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.energy >= stats2.energy ? 900 : 500 }}>
                    {Math.round(stats1.energy * 100)}% {stats1.energy >= stats2.energy && "🔥"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.energy >= stats1.energy ? 900 : 500 }}>
                    {Math.round(stats2.energy * 100)}% {stats2.energy >= stats1.energy && "🔥"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>⏱️ {t("playlist.sortTempo")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.tempo >= stats2.tempo ? 900 : 500 }}>
                    {Math.round(stats1.tempo)} BPM {stats1.tempo >= stats2.tempo && "⚡"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.tempo >= stats1.tempo ? 900 : 500 }}>
                    {Math.round(stats2.tempo)} BPM {stats2.tempo >= stats1.tempo && "⚡"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>🕺 {t("playlist.sortDance")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.danceability >= stats2.danceability ? 900 : 500 }}>
                    {Math.round(stats1.danceability * 100)}% {stats1.danceability >= stats2.danceability && "🕺"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.danceability >= stats1.danceability ? 900 : 500 }}>
                    {Math.round(stats2.danceability * 100)}% {stats2.danceability >= stats1.danceability && "🕺"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>🎻 {t("playlist.sortAcoustic")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.acousticness >= stats2.acousticness ? 900 : 500 }}>
                    {Math.round(stats1.acousticness * 100)}% {stats1.acousticness >= stats2.acousticness && "🎻"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.acousticness >= stats1.acousticness ? 900 : 500 }}>
                    {Math.round(stats2.acousticness * 100)}% {stats2.acousticness >= stats1.acousticness && "🎻"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 700 }}>🎹 {t("playlist.sortInstr")}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats1.instrumentalness >= stats2.instrumentalness ? 900 : 500 }}>
                    {Math.round(stats1.instrumentalness * 100)}% {stats1.instrumentalness >= stats2.instrumentalness && "🎹"}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: stats2.instrumentalness >= stats1.instrumentalness ? 900 : 500 }}>
                    {Math.round(stats2.instrumentalness * 100)}% {stats2.instrumentalness >= stats1.instrumentalness && "🎹"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Inspecteur de morceau sélectionné (Duel - Desktop uniquement) */}
          {selectedTrack && !isMobile && (
            <div className="neo-card" style={{ backgroundColor: "white" }}>
              <span className="neo-badge" style={{ backgroundColor: "var(--color-yellow)", marginBottom: "0.75rem" }}>
                {t("inspector.title")}
              </span>
              
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                {selectedTrack.albumImageUrl && (
                  <img src={selectedTrack.albumImageUrl} alt={selectedTrack.name} style={{ width: "50px", height: "50px", borderRadius: "6px", border: "var(--border-thin)" }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: "1rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedTrack.name}
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "#666", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {selectedTrack.artists}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
                  <span>{t("playlist.sortValence")} : {Math.round((selectedTrack.valence ?? 0) * 100)}%</span>
                  <span>{t("playlist.sortEnergy")} : {Math.round((selectedTrack.energy ?? 0) * 100)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
                  <span>{t("playlist.sortDance")} : {Math.round((selectedTrack.danceability ?? 0) * 100)}%</span>
                  <span>{t("playlist.sortAcoustic")} : {Math.round((selectedTrack.acousticness ?? 0) * 100)}%</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
                  <span>{t("playlist.sortTempo")} : {selectedTrack.tempo ? Math.round(selectedTrack.tempo) : "--"} BPM</span>
                  <span>{t("playlist.sortKey")} : {formatKeyMode(selectedTrack.key, selectedTrack.mode, language)}</span>
                </div>
              </div>

              {(selectedTrack.previewUrl || selectedTrack.isrc || (selectedTrack.artists && selectedTrack.name)) && (
                <button 
                  onClick={() => handlePlayToggle(selectedTrack)}
                  className="neo-btn"
                  style={{ 
                    width: "100%", 
                    marginTop: "1rem", 
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
                      ? "⏸️ Pause" 
                      : "▶️ Écouter un extrait"}
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Mobile Bottom Sheet Drawer */}
      {isMobile && selectedTrack && typeof document !== "undefined" && createPortal(
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
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards"
          }}
        >
          {/* Style tag for slideUp animation */}
          <style jsx>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>

          {/* Swipe handle indicator */}
          <div style={{
            width: "40px",
            height: "5px",
            backgroundColor: "#ccc",
            borderRadius: "3px",
            alignSelf: "center",
            marginBottom: "0.25rem"
          }} />

          {/* Header: Title, Close button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
            <span className="neo-badge" style={{ backgroundColor: "var(--color-yellow)" }}>
              Inspecteur de Titre 🔎
            </span>
            <button 
              onClick={() => setSelectedTrack(null)}
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
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
              <span>{t("playlist.sortValence")} : {selectedTrack.valence !== null ? `${Math.round(selectedTrack.valence * 100)}%` : "--"}</span>
              <span>{t("playlist.sortEnergy")} : {selectedTrack.energy !== null ? `${Math.round(selectedTrack.energy * 100)}%` : "--"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
              <span>{t("playlist.sortDance")} : {selectedTrack.danceability !== null ? `${Math.round(selectedTrack.danceability * 100)}%` : "--"}</span>
              <span>{t("playlist.sortAcoustic")} : {selectedTrack.acousticness !== null ? `${Math.round(selectedTrack.acousticness * 100)}%` : "--"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700 }}>
              <span>{t("playlist.sortTempo")} : {selectedTrack.tempo ? `${Math.round(selectedTrack.tempo)} BPM` : "--"}</span>
              <span>{t("playlist.sortKey")} : {formatKeyMode(selectedTrack.key, selectedTrack.mode, language)}</span>
            </div>
          </div>

          {/* Audio control button */}
          {(selectedTrack.previewUrl || selectedTrack.isrc || (selectedTrack.artists && selectedTrack.name)) && (
            <button 
              onClick={() => handlePlayToggle(selectedTrack)}
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
                ? `⏳ ${t("inspector.btnLoading")}` 
                : playingTrackId === selectedTrack.id 
                  ? `⏸️ ${t("inspector.btnPause")}` 
                  : `▶️ ${t("inspector.btnListen")}`}
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="neo-container" style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "60vh",
        gap: "1.5rem" 
      }}>
        <div style={{
          width: "60px",
          height: "60px",
          border: "5px solid #eee",
          borderTop: "5px solid var(--color-yellow)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--foreground)" }}>
          Chargement du duel acoustique...
        </p>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
