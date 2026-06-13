"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslation } from "@/context/LanguageContext";

function detectTypeAndId(input: string): { type: "playlist" | "user" | null; id: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { type: null, id: null };

  // Détection de lien Deezer
  const deezerUrlMatch = trimmed.match(/deezer\.com\/(?:\w{2}\/)?playlist\/(\d+)/);
  if (deezerUrlMatch) {
    return { type: "playlist", id: `deezer:${deezerUrlMatch[1]}` };
  }
  if (trimmed.startsWith("deezer:") && /^\d+$/.test(trimmed.split(":")[1])) {
    return { type: "playlist", id: trimmed };
  }
  if (trimmed.includes("link.deezer.com") || trimmed.includes("deezer.page.link")) {
    return { type: "playlist", id: "deezer-short" };
  }

  // Détection de lien utilisateur
  const userUrlMatch = trimmed.match(/user\/([a-zA-Z0-9_.-]+)/);
  const userUriMatch = trimmed.match(/spotify:user:([a-zA-Z0-9_.-]+)/);
  if (userUrlMatch) {
    return { type: "user", id: userUrlMatch[1] };
  }
  if (userUriMatch) {
    return { type: "user", id: userUriMatch[1] };
  }

  // Détection de lien playlist Spotify
  const playlistUrlMatch = trimmed.match(/playlist\/([a-zA-Z0-9]{22})/);
  const playlistUriMatch = trimmed.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
  if (playlistUrlMatch) {
    return { type: "playlist", id: playlistUrlMatch[1] };
  }
  if (playlistUriMatch) {
    return { type: "playlist", id: playlistUriMatch[1] };
  }

  // ID brut de 22 caractères alphanumériques (Playlist Spotify)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { type: "playlist", id: trimmed };
  }

  // Si c'est un ID simple sans caractères spéciaux, on présume que c'est un profil
  if (/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { type: "user", id: trimmed };
  }

  return { type: null, id: null };
}

export default function Home() {
  const { data: session, status } = useSession();
  const { t, language } = useTranslation();
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistUrl2, setPlaylistUrl2] = useState("");
  const [isDuelMode, setIsDuelMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const router = useRouter();

  const loadingSteps = [
    "Analyse de la playlist...",
    "Chargement de la bibliothèque musicale...",
    "Analyse des caractéristiques audio (BPM, Valence, Énergie)...",
    "Cartographie de l'ambiance sonore en cours...",
    "Génération de vos visualisations..."
  ];

  const triggerLoadingMessages = () => {
    let step = 0;
    setLoadingMessage(loadingSteps[0]);
    const interval = setInterval(() => {
      step++;
      if (step < loadingSteps.length) {
        setLoadingMessage(loadingSteps[step]);
      } else {
        clearInterval(interval);
      }
    }, 1800);
    return interval;
  };

  // Charger les playlists de l'administrateur s'il est connecté
  useEffect(() => {
    if (status === "authenticated") {
      setPlaylistsLoading(true);
      fetch("/api/playlists")
        .then((res) => {
          if (!res.ok) throw new Error("Erreur HTTP");
          return res.json();
        })
        .then((data) => {
          if (data.playlists) {
            setUserPlaylists(data.playlists);
          }
          setPlaylistsLoading(false);
        })
        .catch((err) => {
          console.error("Erreur lors de la récupération des playlists :", err);
          setPlaylistsLoading(false);
        });
    }
  }, [status]);

  const handleAnalyze = async (url: string) => {
    if (isDuelMode) {
      if (!playlistUrl.trim() || !playlistUrl2.trim()) {
        setError("Veuillez saisir les deux URLs de playlists pour lancer le duel.");
        return;
      }

      const p1 = detectTypeAndId(playlistUrl);
      const p2 = detectTypeAndId(playlistUrl2);

      if (p1.type !== "playlist" || !p1.id || p2.type !== "playlist" || !p2.id) {
        setError("Le mode Duel nécessite deux playlists Spotify valides.");
        return;
      }

      router.push(`/compare?id1=${p1.id}&id2=${p2.id}`);
      return;
    }

    if (!url.trim()) {
      setError("Veuillez saisir une URL ou un ID de playlist / profil.");
      return;
    }

    const res = detectTypeAndId(url);
    if (!res.type || !res.id) {
      setError("Format de lien invalide (Spotify ou Deezer requis).");
      return;
    }

    if (res.type === "user") {
      // Redirection vers le Passeport Curateur
      router.push(`/curator/${res.id}`);
      return;
    }

    // Sinon, c'est une playlist (comportement d'origine)
    setIsLoading(true);
    setError(null);
    const intervalId = triggerLoadingMessages();

    try {
      const response = await fetch(`/api/analyze?url=${encodeURIComponent(url.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'analyse.");
      }

      clearInterval(intervalId);
      router.push(`/playlist/${data.id}`);
    } catch (err: any) {
      clearInterval(intervalId);
      setError(err.message || "Impossible de charger la playlist. Assurez-vous qu'elle soit bien publique.");
      setIsLoading(false);
    }
  };

  const handleDemoClick = (playlistId: string) => {
    setPlaylistUrl(playlistId);
    // Forcer le mode solo pour la démo
    setIsDuelMode(false);
    
    // Déclencher directement l'analyse standard de la démo
    setIsLoading(true);
    setError(null);
    const intervalId = triggerLoadingMessages();
    fetch(`/api/analyze?url=${playlistId}`)
      .then(res => res.json())
      .then(data => {
        clearInterval(intervalId);
        router.push(`/playlist/${data.id}`);
      })
      .catch(err => {
        clearInterval(intervalId);
        setError("Impossible de charger la playlist de démo.");
        setIsLoading(false);
      });
  };

  if (status === "loading") {
    return (
      <div className="neo-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "5px solid #eee",
          borderTop: "5px solid var(--color-purple)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="neo-container animate-pop">
      {/* Hero Section */}
      <section style={{ 
        textAlign: "center", 
        margin: "3rem 0 4rem 0", 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center",
        gap: "1.5rem" 
      }}>
        <div className="neo-badge" style={{ backgroundColor: "var(--color-yellow)", transform: "rotate(-1.5deg)", fontSize: "1rem" }}>
          {t("home.subtitle")}
        </div>
        <h1 style={{ fontSize: "3.5rem", maxWidth: "800px" }}>
          {t("home.title")}
        </h1>
        <p style={{ fontSize: "1.2rem", maxWidth: "600px", color: "#444", fontWeight: 500, lineHeight: 1.5 }}>
          {t("home.description")}
        </p>
      </section>

      {/* Main Analysis Form (Affiché à tout le monde d'emblée) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
        
        {/* Formulaire manual public */}
        <section style={{ maxWidth: "680px", margin: "0 auto", width: "100%" }}>
          <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
            
            {status === "authenticated" && session ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h2 style={{ fontSize: "1.3rem" }}>Bonjour, {session.user?.name || "Admin"} 👋</h2>
                  <span className="neo-badge" style={{ backgroundColor: "var(--color-green)", fontSize: "0.75rem" }}>
                    Token Système Actif 🧪
                  </span>
                </div>
                <button 
                  onClick={() => signOut()} 
                  className="neo-btn" 
                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", backgroundColor: "white" }}
                >
                  Déconnexion Admin
                </button>
              </div>
            ) : (
              <h2 style={{ marginBottom: "1rem", fontSize: "1.75rem" }}>
                {language === "fr" ? "Prêt pour l'exploration ? 🗺️" : "Ready to explore? 🗺️"}
              </h2>
            )}
            
            <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem", color: "#555" }}>
              {language === "fr" ? (
                <>Collez le lien d'une <strong>playlist publique (Spotify ou Deezer)</strong> ou d'un <strong>profil utilisateur Spotify</strong> pour en explorer l'espace sonore, ou comparez deux sélections.</>
              ) : (
                <>Paste the link of a <strong>public playlist (Spotify or Deezer)</strong> or a <strong>Spotify user profile</strong> to explore its soundscape, or run a comparison between two selections.</>
              )}
            </p>

            {/* Toggle Mode Solo / Duel */}
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              gap: "1rem", 
              marginBottom: "1.5rem",
              borderBottom: "2px dashed #ddd",
              paddingBottom: "1.25rem"
            }}>
              <button
                type="button"
                onClick={() => { setIsDuelMode(false); setError(null); }}
                className="neo-btn"
                style={{ 
                  padding: "0.4rem 0.8rem", 
                  fontSize: "0.9rem",
                  backgroundColor: !isDuelMode ? "var(--color-pink)" : "white",
                  boxShadow: !isDuelMode ? "2px 2px 0px 0px #000" : "none",
                  transform: !isDuelMode ? "translate(-1px, -1px)" : "none",
                  borderRadius: "6px",
                  borderWidth: "2px"
                }}
              >
                {t("home.soloMode")}
              </button>
              <button
                type="button"
                onClick={() => { setIsDuelMode(true); setError(null); }}
                className="neo-btn"
                style={{ 
                  padding: "0.4rem 0.8rem", 
                  fontSize: "0.9rem",
                  backgroundColor: isDuelMode ? "var(--color-yellow)" : "white",
                  boxShadow: isDuelMode ? "2px 2px 0px 0px #000" : "none",
                  transform: isDuelMode ? "translate(-1px, -1px)" : "none",
                  borderRadius: "6px",
                  borderWidth: "2px"
                }}
              >
                {t("home.compareMode")}
              </button>
            </div>

            {error && (
              <div className="neo-card" style={{ 
                backgroundColor: "var(--color-orange)", 
                boxShadow: "2px 2px 0px 0px var(--shadow-color)",
                padding: "0.75rem 1rem", 
                marginBottom: "1.5rem",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.9rem"
              }}>
                ⚠️ {error}
              </div>
            )}

            {isLoading ? (
              <div style={{ 
                textAlign: "center", 
                padding: "2rem 1rem", 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center", 
                gap: "1.5rem" 
              }}>
                <div style={{
                  width: "50px",
                  height: "50px",
                  border: "5px solid var(--bg-main)",
                  borderTop: "5px solid var(--color-purple)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                <p style={{ fontStyle: "italic", fontWeight: 700, fontSize: "1.1rem", color: "var(--color-purple)" }}>
                  {loadingMessage}
                </p>
              </div>
            ) : (
              <div>
                {!isDuelMode ? (
                  /* Mode Solo Input */
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexDirection: "column" }}>
                    <input
                      type="text"
                      placeholder={t("home.placeholder")}
                      className="neo-input"
                      value={playlistUrl}
                      onChange={(e) => setPlaylistUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze(playlistUrl)}
                    />
                    <button 
                      className="neo-btn neo-btn-pink"
                      onClick={() => handleAnalyze(playlistUrl)}
                      style={{ width: "100%", fontSize: "1.1rem" }}
                    >
                      {language === "fr" ? "Analyser →" : "Analyze →"}
                    </button>
                  </div>
                ) : (
                  /* Mode Duel Inputs */
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexDirection: "column" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.3rem" }}>
                        {language === "fr" ? "PLAYLIST COMMUNE 1 🆚" : "COMMON PLAYLIST 1 🆚"}
                      </label>
                      <input
                        type="text"
                        placeholder={language === "fr" ? "Lien ou ID de la première playlist..." : "Link or ID of the first playlist..."}
                        className="neo-input"
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.3rem" }}>
                        {language === "fr" ? "PLAYLIST COMMUNE 2 🆚" : "COMMON PLAYLIST 2 🆚"}
                      </label>
                      <input
                        type="text"
                        placeholder={language === "fr" ? "Lien ou ID de la deuxième playlist..." : "Link or ID of the second playlist..."}
                        className="neo-input"
                        value={playlistUrl2}
                        onChange={(e) => setPlaylistUrl2(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAnalyze("")}
                      />
                    </div>
                    <button 
                      className="neo-btn neo-btn-yellow"
                      onClick={() => handleAnalyze("")}
                      style={{ width: "100%", fontSize: "1.1rem", marginTop: "0.5rem" }}
                    >
                      {language === "fr" ? "Lancer la Comparaison ⚔️" : "Start Comparison ⚔️"}
                    </button>
                  </div>
                )}

                {/* Boutons démos */}
                <div style={{ 
                  borderTop: "2px dashed #ddd", 
                  paddingTop: "1.5rem", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "0.75rem" 
                }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#777" }}>
                    {t("home.demoTitle")}
                  </span>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button 
                      onClick={() => handleDemoClick("625mhXnoZ8Xtj0Vm3u2M8p")} 
                      className="neo-btn neo-btn-yellow" 
                      style={{ fontSize: "0.9rem", padding: "0.5rem 1.25rem" }}
                    >
                      {t("home.demoBtn")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Liste des playlists de l'utilisateur (Visible uniquement par l'admin connecté) */}
        {status === "authenticated" && (
          <section>
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.75rem", textAlign: "center" }}>
              Vos Playlists Personnelles (Mode Admin) 🎵
            </h2>
            
            {playlistsLoading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ fontWeight: 600, color: "#666" }}>Chargement de vos playlists Spotify...</p>
              </div>
            ) : userPlaylists.length === 0 ? (
              <div className="neo-card" style={{ textAlign: "center", backgroundColor: "white", maxWidth: "500px", margin: "0 auto" }}>
                <p style={{ fontWeight: 600 }}>Aucune playlist trouvée dans votre bibliothèque.</p>
              </div>
            ) : (
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", 
                gap: "1.5rem" 
              }}>
                {userPlaylists.map((pl) => (
                  <div key={pl.id} className="neo-card animate-pop" style={{ 
                    backgroundColor: "white",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem"
                  }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      {pl.imageUrl ? (
                        <img 
                          src={pl.imageUrl} 
                          alt={pl.name}
                          style={{ width: "50px", height: "50px", borderRadius: "6px", border: "1px solid #000", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ 
                          width: "50px", 
                          height: "50px", 
                          borderRadius: "6px", 
                          border: "1px solid #000", 
                          backgroundColor: "var(--color-blue)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem"
                        }}>
                          🎵
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ 
                          fontSize: "0.95rem", 
                          fontWeight: 700,
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis" 
                        }}>
                          {pl.name}
                        </h4>
                        <p style={{ fontSize: "0.75rem", color: "#666" }}>
                          {pl.trackCount} titres
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAnalyze(pl.id)}
                      className="neo-btn neo-btn-blue"
                      style={{ width: "100%", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      {language === "fr" ? "Analyser 🗺️" : "Analyze 🗺️"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Concept Explanations */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem", marginTop: "4rem" }}>
        <div className="neo-card" style={{ borderLeft: "8px solid var(--color-pink)", backgroundColor: "white" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
          <h3 style={{ marginBottom: "0.75rem" }}>{t("home.card1Title")}</h3>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "#555" }}>
            {t("home.card1Desc")}
          </p>
        </div>
        
        <div className="neo-card" style={{ borderLeft: "8px solid var(--color-blue)", backgroundColor: "white" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📍</div>
          <h3 style={{ marginBottom: "0.75rem" }}>{t("home.card2Title")}</h3>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "#555" }}>
            {t("home.card2Desc")}
          </p>
        </div>

        <div className="neo-card" style={{ borderLeft: "8px solid var(--color-green)", backgroundColor: "white" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <h3 style={{ marginBottom: "0.75rem" }}>{t("home.card3Title")}</h3>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.5, color: "#555" }}>
            {t("home.card3Desc")}
          </p>
        </div>
      </section>

      {/* Discret Login link for admin / developer */}
      {status !== "authenticated" && (
        <div style={{ textAlign: "center", marginTop: "4rem", opacity: 0.7 }}>
          <button 
            onClick={() => signIn("spotify")} 
            className="neo-btn neo-btn-secondary" 
            style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", borderWidth: "1.5px" }}
          >
            Connexion Admin 🧪
          </button>
        </div>
      )}
    </div>
  );
}
