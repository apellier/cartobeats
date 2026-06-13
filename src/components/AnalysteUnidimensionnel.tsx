import React, { useState, useMemo } from "react";

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

interface AnalysteUnidimensionnelProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  selectedTrack: Track | null;
  onFilterChange: (filter: { metric: string; min: number; max: number; label: string; bucketIndex: number } | null) => void;
  activeFilter: { metric: string; min: number; max: number; bucketIndex: number } | null;
}

interface MetricConfig {
  key: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  explanation: string;
  formatValue: (val: number) => string;
  getRawValue: (t: Track) => number | null;
  getBucketMinMax: (bucketIndex: number) => { min: number; max: number; label: string };
}

export default function AnalysteUnidimensionnel({
  tracks,
  onSelectTrack,
  selectedTrack,
  onFilterChange,
  activeFilter,
}: AnalysteUnidimensionnelProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>("valence");
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  // Configuration des différentes métriques
  const METRICS: { [key: string]: MetricConfig } = {
    valence: {
      key: "valence",
      name: "Valence",
      emoji: "☀️",
      color: "var(--color-pink)",
      description: "Positivité musicale, luminosité",
      explanation: "Décrit la positivité musicale transmise par un titre. Les morceaux à valence élevée sonnent de manière joyeuse, optimiste et festive (ex: pop, funk), tandis que ceux à faible valence sonnent sombres, tristes ou mélancoliques (ex: blues, lofi).",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.valence,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    energy: {
      key: "energy",
      name: "Énergie",
      emoji: "⚡",
      color: "var(--color-orange)",
      description: "Intensité, dynamisme et tension",
      explanation: "Représente l'intensité physique et l'activité du morceau. Les titres à haute énergie sont rapides, bruyants et intenses (ex: Rock, Techno, Metal). Les titres à basse énergie sont calmes et détendus (ex: acoustique, ambient).",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.energy,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    tempo: {
      key: "tempo",
      name: "Tempo (BPM)",
      emoji: "⏱️",
      color: "var(--color-purple)",
      description: "Vitesse rythmique (battements par minute)",
      explanation: "Estime la vitesse globale d'un morceau en Battements Par Minute (BPM). C'est un excellent critère unidimensionnel pour filtrer les morceaux selon le rythme de votre humeur ou de vos activités.",
      formatValue: (val: number) => `${Math.round(val)} BPM`,
      getRawValue: (t: Track) => t.tempo,
      getBucketMinMax: (idx: number) => {
        // Tranches de 50 à 200 BPM
        const minBpm = 50 + idx * 15;
        const maxBpm = minBpm + 15;
        if (idx === 0) return { min: 0, max: 65, label: "< 65 BPM" };
        if (idx === 9) return { min: 185, max: 999, label: ">= 185 BPM" };
        return { min: minBpm, max: maxBpm, label: `${minBpm} - ${maxBpm} BPM` };
      }
    },
    danceability: {
      key: "danceability",
      name: "Dansabilité",
      emoji: "🕺",
      color: "var(--color-green)",
      description: "Aptitude d'un morceau à faire danser",
      explanation: "Évalue à quel point un morceau est adapté à la danse en fonction d'éléments rythmiques : tempo, régularité du tempo, force du beat. Une valeur élevée caractérise le Disco, le Reggaeton ou la House.",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.danceability,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    acousticness: {
      key: "acousticness",
      name: "Acousticité",
      emoji: "🎻",
      color: "var(--color-blue)",
      description: "Présence d'instruments acoustiques",
      explanation: "Mesure la probabilité que le morceau utilise uniquement des instruments acoustiques plutôt qu'électriques ou synthétiques. Une valeur proche de 100% indique du piano solo, de la folk pure ou du classique.",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.acousticness,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    instrumentalness: {
      key: "instrumentalness",
      name: "Instrumentalité",
      emoji: "🎹",
      color: "var(--color-yellow)",
      description: "Absence de chant et de voix parlées",
      explanation: "Estime si le morceau ne contient pas de chant. Les voix parlées ou bruitages légers sont acceptés, mais plus la valeur approche 100%, plus la piste est purement instrumentale (ex: Synthwave, Techno, Jazz instrumental).",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.instrumentalness,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    speechiness: {
      key: "speechiness",
      name: "Paroles (Speech)",
      emoji: "🎙️",
      color: "#e2e8f0",
      description: "Présence de mots parlés",
      explanation: "Détecte la présence de voix parlées. Une valeur supérieure à 66% correspond à des podcasts ou des livres audio. Entre 33% et 66%, on retrouve généralement des morceaux de Rap/Slam à forte concentration parlée.",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.speechiness,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    },
    liveness: {
      key: "liveness",
      name: "Présence Live",
      emoji: "🍻",
      color: "#fecdd3",
      description: "Probabilité d'enregistrement public/live",
      explanation: "Détecte la présence d'un public dans l'enregistrement. Une valeur supérieure à 80% donne une très forte assurance que le morceau a été enregistré en concert, avec des applaudissements ou des bruits de salle.",
      formatValue: (val: number) => `${Math.round(val * 100)}%`,
      getRawValue: (t: Track) => t.liveness,
      getBucketMinMax: (idx: number) => ({
        min: idx / 10,
        max: idx === 9 ? 1.0 : (idx + 1) / 10,
        label: `${idx * 10}% - ${(idx + 1) * 10}%`
      })
    }
  };

  const activeConfig = METRICS[selectedMetric];

  // Extraire les morceaux disposant de la métrique choisie
  const validTracks = useMemo(() => {
    return tracks.filter(t => activeConfig.getRawValue(t) !== null);
  }, [tracks, selectedMetric, activeConfig]);

  // Répartition par buckets (10 tranches)
  const buckets = useMemo(() => {
    const list = Array(10).fill(null).map((_, idx) => ({
      index: idx,
      config: activeConfig.getBucketMinMax(idx),
      tracks: [] as Track[]
    }));

    validTracks.forEach(track => {
      const val = activeConfig.getRawValue(track) as number;
      
      // Trouver le bon bucket
      for (let i = 0; i < 10; i++) {
        const { min, max } = list[i].config;
        // Gérer les cas limites et s'assurer que tout morceau entre dans une tranche
        if (selectedMetric === "tempo") {
          if (val >= min && val < max) {
            list[i].tracks.push(track);
            break;
          }
          if (i === 0 && val < min) {
            list[0].tracks.push(track);
            break;
          }
          if (i === 9 && val >= max) {
            list[9].tracks.push(track);
            break;
          }
        } else {
          // Pour les métriques de 0 à 1
          if (val >= min && val <= max) {
            // Empêcher le doublon si pile sur la frontière (ex: 0.1)
            // Sauf s'il s'agit de la dernière tranche ou si le tableau est vide
            if (val === max && i < 9) {
              // On laisse le suivant le choper
              continue;
            }
            list[i].tracks.push(track);
            break;
          }
        }
      }
    });

    return list;
  }, [validTracks, selectedMetric, activeConfig]);

  // Nombre maximum de pistes dans un bucket pour calculer la hauteur relative
  const maxBucketCount = useMemo(() => {
    const counts = buckets.map(b => b.tracks.length);
    return Math.max(...counts, 1);
  }, [buckets]);

  // Trier les morceaux pour le Top 3 / Bottom 3
  const sortedValidTracks = useMemo(() => {
    return [...validTracks].sort((a, b) => {
      const valA = activeConfig.getRawValue(a) as number;
      const valB = activeConfig.getRawValue(b) as number;
      return valA - valB;
    });
  }, [validTracks, activeConfig]);

  const bottomTracks = useMemo(() => sortedValidTracks.slice(0, 3), [sortedValidTracks]);
  const topTracks = useMemo(() => [...sortedValidTracks].reverse().slice(0, 3), [sortedValidTracks]);

  // Moyenne de la playlist pour la métrique
  const averageValue = useMemo(() => {
    if (validTracks.length === 0) return 0;
    const sum = validTracks.reduce((acc, t) => acc + (activeConfig.getRawValue(t) as number), 0);
    return sum / validTracks.length;
  }, [validTracks, activeConfig]);

  // Gérer le clic sur une colonne de l'histogramme
  const handleBucketClick = (bucketIndex: number, tracksInBucket: Track[]) => {
    if (tracksInBucket.length === 0) return;

    const config = activeConfig.getBucketMinMax(bucketIndex);
    
    // Si déjà actif, on désactive
    if (activeFilter && activeFilter.metric === selectedMetric && activeFilter.bucketIndex === bucketIndex) {
      onFilterChange(null);
    } else {
      onFilterChange({
        metric: selectedMetric,
        min: config.min,
        max: config.max,
        label: `${activeConfig.emoji} ${activeConfig.name} (${config.label})`,
        bucketIndex
      });
    }
  };

  return (
    <div className="neo-card" style={{ backgroundColor: "#ffffff", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      
      {/* En-tête du composant */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <span className="neo-badge" style={{ backgroundColor: activeConfig.color, marginBottom: "0.5rem" }}>
            Analyse Unidimensionnelle 📊
          </span>
          <h3 style={{ fontSize: "1.6rem", margin: 0 }}>
            Profil de Répartition Musicale
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.25rem" }}>
            Visualisez la distribution de vos titres et filtrez instantanément la playlist sur une tranche spécifique.
          </p>
        </div>

        {/* Sélecteur de métrique neo-brutaliste */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 800, whiteSpace: "nowrap" }}>
            MÉTRIQUE :
          </label>
          <select
            value={selectedMetric}
            onChange={(e) => {
              setSelectedMetric(e.target.value);
              onFilterChange(null); // Réinitialiser le filtre lors du changement de métrique
            }}
            className="neo-input"
            style={{ 
              padding: "0.4rem 0.75rem", 
              fontSize: "0.9rem", 
              fontWeight: 700,
              width: "200px", 
              cursor: "pointer",
              backgroundColor: "var(--bg-main)"
            }}
          >
            {Object.values(METRICS).map(m => (
              <option key={m.key} value={m.key}>
                {m.emoji} {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid d'analyse : Description + Histogramme SVG */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "1.5rem",
        alignItems: "stretch"
      }}>
        
        {/* Description de la métrique */}
        <div style={{ 
          border: "var(--border-thin)", 
          borderRadius: "12px", 
          padding: "1rem", 
          backgroundColor: "var(--bg-main)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "1rem"
        }}>
          <div>
            <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              <span>{activeConfig.emoji}</span>
              <span>{activeConfig.name}</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "#666" }}>
                ({activeConfig.description})
              </span>
            </h4>
            <p style={{ fontSize: "0.85rem", lineHeight: 1.4, color: "#444" }}>
              {activeConfig.explanation}
            </p>
          </div>

          <div style={{ borderTop: "2px dashed #ccc", paddingTop: "0.75rem", fontSize: "0.85rem" }}>
            <div style={{ fontWeight: 800, display: "flex", justifyContent: "space-between" }}>
              <span>VALEUR MOYENNE :</span>
              <span style={{ color: activeConfig.color, filter: "brightness(0.7)", fontSize: "1rem" }}>
                {activeConfig.formatValue(averageValue)}
              </span>
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem", fontStyle: "italic" }}>
              Calculée sur {validTracks.length} titres cartographiés via ReccoBeats.
            </div>
          </div>
        </div>

        {/* Histogramme SVG Néo-brutaliste */}
        <div style={{ 
          border: "var(--border-thin)", 
          borderRadius: "12px", 
          padding: "1rem", 
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          minHeight: "220px",
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800 }}>
              DISTRIBUTION DES TITRES
            </span>
            {activeFilter && activeFilter.metric === selectedMetric && (
              <button
                onClick={() => onFilterChange(null)}
                className="neo-btn"
                style={{ 
                  padding: "2px 8px", 
                  fontSize: "0.75rem", 
                  backgroundColor: "var(--color-orange)",
                  borderRadius: "4px",
                  borderWidth: "1.5px",
                  boxShadow: "1.5px 1.5px 0px 0px #000"
                }}
              >
                ✖️ Effacer le filtre
              </button>
            )}
          </div>

          {validTracks.length === 0 ? (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              color: "#999", 
              fontSize: "0.9rem",
              textAlign: "center",
              padding: "2rem"
            }}>
              Aucun titre de cette playlist n'a de caractéristiques audio pour {activeConfig.name}.
            </div>
          ) : (
            <div style={{ flex: 1, position: "relative", minHeight: "150px" }}>
              <svg 
                viewBox="0 0 500 160" 
                style={{ width: "100%", height: "100%", overflow: "visible" }}
              >
                {/* Lignes de repère Y */}
                <line x1="0" y1="120" x2="500" y2="120" stroke="#ddd" strokeWidth="1.5" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#eee" strokeWidth="1" strokeDasharray="3,3" />
                <line x1="0" y1="20" x2="500" y2="20" stroke="#eee" strokeWidth="1" strokeDasharray="3,3" />

                {/* Barres */}
                {buckets.map((b, idx) => {
                  const barWidth = 40;
                  const gap = 10;
                  const barX = idx * (barWidth + gap) + 5;
                  
                  const count = b.tracks.length;
                  const barHeight = (count / maxBucketCount) * 100; // max 100px de haut
                  const barY = 120 - barHeight;

                  const isHovered = hoveredBucket === idx;
                  const isFiltered = activeFilter && activeFilter.metric === selectedMetric && activeFilter.bucketIndex === idx;

                  return (
                    <g 
                      key={idx} 
                      style={{ cursor: count > 0 ? "pointer" : "default" }}
                      onMouseEnter={() => count > 0 && setHoveredBucket(idx)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      onClick={() => handleBucketClick(idx, b.tracks)}
                    >
                      {/* En-tête invisible pour agrandir la zone interactive */}
                      <rect 
                        x={barX - 2} 
                        y="0" 
                        width={barWidth + 4} 
                        height="135" 
                        fill="transparent" 
                      />

                      {count > 0 && (
                        <>
                          {/* Ombre Néo-Brutaliste de la barre */}
                          <rect 
                            x={barX + (isFiltered ? 4 : 2)} 
                            y={barY + (isFiltered ? 4 : 2)} 
                            width={barWidth - 4} 
                            height={barHeight} 
                            fill="#1c1917" 
                            rx="4"
                            style={{ transition: "all 0.1s ease" }}
                          />
                          
                          {/* Barre principale */}
                          <rect 
                            x={barX} 
                            y={barY} 
                            width={barWidth - 4} 
                            height={barHeight} 
                            fill={isFiltered ? "var(--color-yellow)" : activeConfig.color} 
                            stroke="#1c1917" 
                            strokeWidth={isFiltered || isHovered ? "2.5" : "1.5"}
                            rx="4"
                            style={{ 
                              transition: "all 0.1s ease",
                              filter: isHovered ? "brightness(1.05)" : "none"
                            }}
                          />

                          {/* Affichage du compte de pistes survolé / filtré */}
                          {(isHovered || isFiltered) && (
                            <text
                              x={barX + barWidth / 2 - 2}
                              y={barY - 6}
                              textAnchor="middle"
                              fill="#000"
                              fontSize="9"
                              fontWeight="900"
                            >
                              {count}
                            </text>
                          )}
                        </>
                      )}

                      {/* Libellé de l'axe X (Index de tranche) */}
                      <text
                        x={barX + barWidth / 2 - 2}
                        y="135"
                        textAnchor="middle"
                        fill={isFiltered ? "var(--color-purple)" : "#777"}
                        fontSize="8"
                        fontWeight={isFiltered ? "900" : "700"}
                      >
                        {selectedMetric === "tempo" 
                          ? (idx === 0 ? "slow" : idx === 9 ? "fast" : `${50 + idx * 15}`)
                          : `${idx * 10}%`
                        }
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Info-bulle interactive pour la tranche survolée */}
              {hoveredBucket !== null && (
                <div style={{
                  position: "absolute",
                  bottom: "5px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "var(--foreground)",
                  color: "#ffffff",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  boxShadow: "2px 2px 0px 0px #000",
                  pointerEvents: "none",
                  zIndex: 10
                }}>
                  {buckets[hoveredBucket].config.label} : {buckets[hoveredBucket].tracks.length} titre(s)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section Tops / Bottoms pour la métrique */}
      {validTracks.length > 0 && (
        <div style={{ 
          borderTop: "2px dashed #ddd", 
          paddingTop: "1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}>
          {/* Bottom 3 (Les plus bas) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#666", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ⬇️ TOP BASSE VALEURS ({activeConfig.name})
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {bottomTracks.map((t, idx) => (
                <div 
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "0.5rem",
                    border: "1.5px solid #000",
                    borderRadius: "8px",
                    backgroundColor: selectedTrack?.id === t.id ? "#fef8e8" : "#ffffff",
                    cursor: "pointer",
                    boxShadow: "1.5px 1.5px 0px 0px #000",
                    transition: "all 0.1s ease"
                  }}
                  className="top-item-row"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888" }}>#{idx + 1}</span>
                    {t.albumImageUrl && (
                      <img 
                        src={t.albumImageUrl} 
                        alt={t.name}
                        style={{ width: "24px", height: "24px", borderRadius: "3px", border: "1px solid #000" }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.artists}
                      </div>
                    </div>
                  </div>
                  <span className="neo-badge" style={{ 
                    backgroundColor: activeConfig.color, 
                    fontSize: "0.75rem", 
                    padding: "1px 5px",
                    borderWidth: "1px",
                    boxShadow: "1px 1px 0px 0px #000",
                    fontWeight: 800
                  }}>
                    {activeConfig.formatValue(activeConfig.getRawValue(t) as number)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 (Les plus hauts) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#666", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ⬆️ TOP HAUTE VALEURS ({activeConfig.name})
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {topTracks.map((t, idx) => (
                <div 
                  key={t.id}
                  onClick={() => onSelectTrack(t)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "0.5rem",
                    border: "1.5px solid #000",
                    borderRadius: "8px",
                    backgroundColor: selectedTrack?.id === t.id ? "#fef8e8" : "#ffffff",
                    cursor: "pointer",
                    boxShadow: "1.5px 1.5px 0px 0px #000",
                    transition: "all 0.1s ease"
                  }}
                  className="top-item-row"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888" }}>#{idx + 1}</span>
                    {t.albumImageUrl && (
                      <img 
                        src={t.albumImageUrl} 
                        alt={t.name}
                        style={{ width: "24px", height: "24px", borderRadius: "3px", border: "1px solid #000" }}
                      />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.artists}
                      </div>
                    </div>
                  </div>
                  <span className="neo-badge" style={{ 
                    backgroundColor: activeConfig.color, 
                    fontSize: "0.75rem", 
                    padding: "1px 5px",
                    borderWidth: "1px",
                    boxShadow: "1px 1px 0px 0px #000",
                    fontWeight: 800
                  }}>
                    {activeConfig.formatValue(activeConfig.getRawValue(t) as number)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes et interactions de style */}
      <style jsx>{`
        .top-item-row:hover {
          background-color: #f7f7f7 !important;
          transform: translate(-1px, -1px);
          box-shadow: 2.5px 2.5px 0px 0px #000 !important;
        }
      `}</style>
    </div>
  );
}
