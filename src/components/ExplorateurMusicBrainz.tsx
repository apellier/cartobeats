// src/components/ExplorateurMusicBrainz.tsx
"use client";

import React, { useState } from "react";

interface ReleaseResult {
  id: string;
  title: string;
  artist: string;
  label: string;
  year: string;
  trackCount: number;
}

export default function ExplorateurMusicBrainz() {
  const [genre, setGenre] = useState("post-punk");
  const [label, setLabel] = useState("Factory Records");
  const [startYear, setStartYear] = useState("1979");
  const [endYear, setEndYear] = useState("1982");
  
  const [results, setResults] = useState<ReleaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genre.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        genre: genre.trim(),
        label: label.trim(),
        startYear: startYear.trim(),
        endYear: endYear.trim()
      });
      
      const res = await fetch(`/api/explore-musicbrainz?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Échec de la recherche MusicBrainz.");
      }
      
      const data = await res.json();
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'exploration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (item: ReleaseResult) => {
    const text = `${item.artist} - ${item.title} (${item.year}) [Label: ${item.label}]`;
    navigator.clipboard.writeText(text);
    alert(`📋 '${item.artist} - ${item.title}' copié dans le presse-papiers !`);
  };

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ borderBottom: "2px solid #1c1917", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
        <span className="neo-badge" style={{ backgroundColor: "var(--color-blue)" }}>
          Exploration Hors-Algorithme 🧭
        </span>
        <h3 style={{ fontSize: "1.2rem", marginTop: "0.5rem" }}>Découverte Sémantique & Archéologie Musicale</h3>
      </div>

      <p style={{ fontSize: "0.8rem", color: "#666", lineHeight: "1.4", marginBottom: "1rem" }}>
        Explorez directement les archives de <strong>MusicBrainz</strong> pour dénicher des pépites historiques de labels indépendants, en dehors des circuits de recommandation Spotify habituels.
      </p>

      {/* Form filters */}
      <form onSubmit={handleSearch} style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        backgroundColor: "#fbf8f3",
        border: "var(--border-thin)",
        borderRadius: "8px",
        padding: "1rem",
        boxShadow: "2px 2px 0px 0px #1c1917",
        marginBottom: "1.5rem"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {/* Genre */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", marginBottom: "4px" }}>
              🏷️ GENRE (TAG MB)
            </label>
            <input 
              type="text" 
              value={genre} 
              onChange={e => setGenre(e.target.value)} 
              placeholder="ex: post-punk"
              style={{
                width: "100%",
                padding: "0.4rem 0.6rem",
                border: "1.5px solid #1c1917",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.8rem"
              }}
              required
            />
          </div>

          {/* Label */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", marginBottom: "4px" }}>
              🏢 LABEL D'ÉDITION
            </label>
            <input 
              type="text" 
              value={label} 
              onChange={e => setLabel(e.target.value)} 
              placeholder="ex: Factory Records"
              style={{
                width: "100%",
                padding: "0.4rem 0.6rem",
                border: "1.5px solid #1c1917",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.8rem"
              }}
            />
          </div>

          {/* Years */}
          <div style={{ display: "flex", gap: "6px", width: "160px" }}>
            <div style={{ width: "50%" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", marginBottom: "4px" }}>
                DE
              </label>
              <input 
                type="number" 
                value={startYear} 
                onChange={e => setStartYear(e.target.value)} 
                placeholder="1979"
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  border: "1.5px solid #1c1917",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "0.8rem"
                }}
              />
            </div>
            <div style={{ width: "50%" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "bold", fontFamily: "monospace", marginBottom: "4px" }}>
                À
              </label>
              <input 
                type="number" 
                value={endYear} 
                onChange={e => setEndYear(e.target.value)} 
                placeholder="1982"
                style={{
                  width: "100%",
                  padding: "0.4rem 0.6rem",
                  border: "1.5px solid #1c1917",
                  borderRadius: "4px",
                  fontFamily: "monospace",
                  fontSize: "0.8rem"
                }}
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="neo-btn"
          style={{
            backgroundColor: "var(--color-blue)",
            padding: "0.5rem 1rem",
            fontSize: "0.8rem"
          }}
        >
          {loading ? "⏳ Recherche archéologique..." : "🔍 Lancer l'exploration"}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div style={{
          padding: "0.6rem",
          backgroundColor: "#fee2e2",
          border: "2px solid #ef4444",
          color: "#b91c1c",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "0.8rem",
          marginBottom: "1rem"
        }}>
          {error}
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div style={{
          border: "2px solid #1c1917",
          borderRadius: "8px",
          boxShadow: "2px 2px 0px 0px #1c1917",
          maxHeight: "240px",
          overflowY: "auto",
          backgroundColor: "#ffffff"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.75rem", fontFamily: "monospace" }}>
            <thead>
              <tr style={{ backgroundColor: "#fbf8f3", borderBottom: "2px solid #1c1917" }}>
                <th style={{ padding: "0.4rem 0.6rem", fontWeight: "bold" }}>Titre</th>
                <th style={{ padding: "0.4rem 0.6rem", fontWeight: "bold" }}>Artiste</th>
                <th style={{ padding: "0.4rem 0.6rem", fontWeight: "bold" }}>Label</th>
                <th style={{ padding: "0.4rem 0.6rem", fontWeight: "bold" }}>Année</th>
                <th style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((res) => (
                <tr key={res.id} style={{ borderBottom: "1.5px solid #e2e8f0" }}>
                  <td style={{ padding: "0.4rem 0.6rem", fontWeight: "bold" }}>{res.title}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{res.artist}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{res.label}</td>
                  <td style={{ padding: "0.4rem 0.6rem" }}>{res.year}</td>
                  <td style={{ padding: "0.4rem 0.6rem", textAlign: "right" }}>
                    <button 
                      onClick={() => handleCopyText(res)}
                      style={{
                        padding: "2px 6px",
                        border: "1px solid #1c1917",
                        borderRadius: "4px",
                        backgroundColor: "#ffffff",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "0.65rem",
                        boxShadow: "1px 1px 0px 0px #1c1917"
                      }}
                    >
                      Copier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#666", fontSize: "0.75rem", fontStyle: "italic" }}>
          Aucun résultat affiché. Modifiez les filtres et lancez l'exploration.
        </div>
      )}
    </div>
  );
}
