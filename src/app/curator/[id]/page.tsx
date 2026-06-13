"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  trackCount: number;
  ownerId: string;
}

interface CuratorProfile {
  id: string;
  displayName: string;
  imageUrl: string | null;
}

export default function CuratorPassportPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [profile, setProfile] = useState<CuratorProfile | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchCuratorData = async () => {
      try {
        const res = await fetch(`/api/curator?id=${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Impossible de charger le passeport de ce curateur.");
        }

        setProfile(data.profile);
        setPlaylists(data.playlists);
        setStats(data.stats);
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || "Erreur de chargement.");
        setIsLoading(false);
      }
    };

    fetchCuratorData();
  }, [id]);

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
          borderTop: "5px solid var(--color-purple)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--foreground)" }}>
          Extraction du passeport curateur... 🕵️‍♂️
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

  if (error || !profile) {
    return (
      <div className="neo-container" style={{ maxWidth: "600px", marginTop: "4rem" }}>
        <div className="neo-card" style={{ backgroundColor: "var(--color-orange)", textAlign: "center" }}>
          <h2 style={{ marginBottom: "1rem" }}>Curateur introuvable ⚠️</h2>
          <p style={{ marginBottom: "1.5rem", fontWeight: 500 }}>{error || "Données indisponibles."}</p>
          <button onClick={() => router.push("/")} className="neo-btn neo-btn-secondary">
            &larr; Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const totalTracks = playlists.reduce((sum, pl) => sum + pl.trackCount, 0);

  return (
    <div className="neo-container animate-pop" style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      
      {/* Bouton de retour */}
      <button 
        onClick={() => router.push("/")} 
        className="neo-btn neo-btn-secondary" 
        style={{ alignSelf: "flex-start", fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}
      >
        &larr; Analyser un autre compte
      </button>

      {/* Profil Header Néo-brutaliste */}
      <section className="neo-card" style={{ 
        display: "flex", 
        gap: "2rem", 
        alignItems: "center", 
        flexWrap: "wrap",
        backgroundColor: "#ffffff",
        borderLeft: "12px solid var(--color-purple)"
      }}>
        {profile.imageUrl ? (
          <img 
            src={profile.imageUrl} 
            alt={profile.displayName} 
            style={{ 
              width: "120px", 
              height: "120px", 
              borderRadius: "50%", 
              border: "var(--border-thick)",
              boxShadow: "3px 3px 0px 0px var(--shadow-color)",
              objectFit: "cover"
            }}
          />
        ) : (
          <div style={{ 
            width: "120px", 
            height: "120px", 
            borderRadius: "50%", 
            border: "var(--border-thick)", 
            backgroundColor: "var(--color-purple)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3rem",
            boxShadow: "3px 3px 0px 0px var(--shadow-color)"
          }}>
            👤
          </div>
        )}

        <div style={{ flex: 1, minWidth: "250px" }}>
          <span className="neo-badge" style={{ backgroundColor: "var(--color-purple)", color: "white", marginBottom: "0.5rem" }}>
            Passeport Curateur Public 🪪
          </span>
          <h1 style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>
            {profile.displayName}
          </h1>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#666" }}>
            PLAYLISTS PUBLIQUES : <span style={{ color: "var(--foreground)" }}>{playlists.length}</span> &bull; TITRES CURÉS : <span style={{ color: "var(--foreground)" }}>{totalTracks}</span>
          </div>
        </div>
      </section>

      {/* Profil de curation (statistiques calculées si au moins une playlist est analysée) */}
      {stats ? (
        <section 
          className="neo-card animate-pop" 
          style={{ 
            backgroundColor: "#fbf8f3",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
            padding: "1.5rem",
            boxShadow: "var(--shadow-hard)"
          }}
        >
          {/* Spécialité */}
          <div style={{
            backgroundColor: "var(--color-purple)",
            border: "2px solid #1c1917",
            boxShadow: "2px 2px 0px 0px #1c1917",
            borderRadius: "8px",
            padding: "1rem",
            color: "#ffffff"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", textTransform: "uppercase", opacity: 0.9 }}>
              🎯 Spécialité Stylistique
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: "900", marginTop: "0.5rem" }}>
              {stats.specialty}
            </div>
            <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", fontFamily: "monospace", opacity: 0.8 }}>
              Basé sur {stats.analyzedCount} playlist(s) analysée(s)
            </div>
          </div>

          {/* Score de Cohérence */}
          <div style={{
            backgroundColor: "var(--color-pink)",
            border: "2px solid #1c1917",
            boxShadow: "2px 2px 0px 0px #1c1917",
            borderRadius: "8px",
            padding: "1rem",
            color: "#1c1917"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", textTransform: "uppercase" }}>
              🧹 Cohérence Acoustique
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "0.5rem" }}>
              {stats.maintenanceScore}%
            </div>
            <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", fontFamily: "monospace", opacity: 0.8 }}>
              Taux d'absence d'intrus stylistiques
            </div>
          </div>

          {/* Indice d'Obscurité */}
          <div style={{
            backgroundColor: "var(--color-yellow)",
            border: "2px solid #1c1917",
            boxShadow: "2px 2px 0px 0px #1c1917",
            borderRadius: "8px",
            padding: "1rem",
            color: "#1c1917"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", textTransform: "uppercase" }}>
              🏷️ Indice d'Obscurité
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", marginTop: "0.5rem" }}>
              {stats.obscurityIndex}%
            </div>
            <div style={{ fontSize: "0.7rem", marginTop: "0.5rem", fontFamily: "monospace", opacity: 0.8 }}>
              Proportion de morceaux / genres rares
            </div>
          </div>
        </section>
      ) : (
        <section 
          className="neo-card" 
          style={{ 
            backgroundColor: "#fbf8f3",
            padding: "1.25rem 1.5rem",
            border: "2px dashed #1c1917",
            borderRadius: "12px",
            boxShadow: "2px 2px 0px 0px #1c1917"
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "2.5rem" }}>🎨</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: "1.1rem", fontWeight: "900", margin: 0, marginBottom: "4px" }}>
                Révélez votre Profil Curateur !
              </h4>
              <p style={{ fontSize: "0.8rem", color: "#666", margin: 0, lineHeight: "1.4" }}>
                Vous n'avez pas encore de playlist analysée sur Cartobeat. Cliquez sur le bouton <strong>Analyser l'ambiance</strong> d'une de vos playlists ci-dessous. Dès qu'elle sera chargée, votre spécialité stylistique, votre score de cohérence et votre indice d'obscurité s'afficheront ici.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Grid de playlists */}
      <section>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "1.5rem" }}>
          Playlists de {profile.displayName}
        </h2>
        
        {playlists.length === 0 ? (
          <div className="neo-card" style={{ textAlign: "center", backgroundColor: "white", padding: "2rem" }}>
            <p style={{ fontWeight: 600, color: "#666" }}>
              Aucune playlist publique n'est visible sur ce profil.
            </p>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
            gap: "1.5rem" 
          }}>
            {playlists.map((pl) => (
              <div 
                key={pl.id} 
                className="neo-card animate-pop" 
                style={{ 
                  backgroundColor: "white",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1rem",
                  transition: "transform 0.2s ease"
                }}
              >
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  {pl.imageUrl ? (
                    <img 
                      src={pl.imageUrl} 
                      alt={pl.name}
                      style={{ 
                        width: "64px", 
                        height: "64px", 
                        borderRadius: "8px", 
                        border: "var(--border-thin)", 
                        objectFit: "cover",
                        boxShadow: "2px 2px 0px 0px #000"
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: "64px", 
                      height: "64px", 
                      borderRadius: "8px", 
                      border: "var(--border-thin)", 
                      backgroundColor: "var(--color-blue)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      boxShadow: "2px 2px 0px 0px #000"
                    }}>
                      🎵
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ 
                      fontSize: "1.1rem", 
                      margin: 0, 
                      whiteSpace: "nowrap", 
                      overflow: "hidden", 
                      textOverflow: "ellipsis" 
                    }}>
                      {pl.name}
                    </h3>
                    <span className="neo-badge" style={{ 
                      backgroundColor: "var(--bg-main)", 
                      fontSize: "0.7rem", 
                      padding: "2px 6px",
                      marginTop: "0.25rem"
                    }}>
                      {pl.trackCount} titres
                    </span>
                  </div>
                </div>

                {pl.description && (
                  <p 
                    style={{ fontSize: "0.8rem", color: "#666", lineHeight: 1.3, maxHeight: "50px", overflow: "hidden" }}
                    dangerouslySetInnerHTML={{ __html: pl.description }}
                  />
                )}

                <button
                  onClick={() => router.push(`/playlist/${pl.id}`)}
                  className="neo-btn"
                  style={{ 
                    width: "100%", 
                    padding: "0.4rem 1rem", 
                    fontSize: "0.9rem",
                    backgroundColor: "var(--color-yellow)" 
                  }}
                >
                  Analyser l'ambiance &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
