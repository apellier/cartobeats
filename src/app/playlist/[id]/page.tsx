"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import PlaylistHeader from "@/components/PlaylistHeader";
import CartographeMap from "@/components/CartographeMap";
import ClimatSummary from "@/components/ClimatSummary";
import TrackList from "@/components/TrackList";
import AnalysteUnidimensionnel from "@/components/AnalysteUnidimensionnel";
import MapOrigines from "@/components/MapOrigines";
import AnalysteGenres from "@/components/AnalysteGenres";
import ArchipelMap from "@/components/ArchipelMap";
import SoinMaintenance from "@/components/SoinMaintenance";
import ExplorateurMusicBrainz from "@/components/ExplorateurMusicBrainz";
import { getDominantTrackGenre, formatGenreLabel } from "@/lib/genreResolver";
import DoubleRangeSlider from "@/components/DoubleRangeSlider";
import { useTranslation, formatKeyMode } from "@/context/LanguageContext";

import DJFlowPanel from "@/components/DJFlowPanel";
import TrackInspector from "@/components/TrackInspector";
import MobileTrackDrawer from "@/components/MobileTrackDrawer";
import ShareModal from "@/components/ShareModal";

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


export default function PlaylistPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { t, language } = useTranslation();

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobileInitial = window.matchMedia("(max-width: 767px)").matches;
      setIsMobile(isMobileInitial);
      if (isMobileInitial) {
        setIsControlPanelOpen(false);
      }
      
      const media = window.matchMedia("(max-width: 767px)");
      const listener = (e: MediaQueryListEvent) => {
        setIsMobile(e.matches);
        if (e.matches) {
          setIsControlPanelOpen(false);
        } else {
          setIsControlPanelOpen(true);
        }
      };
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  // États résolutions géographiques
  const [artistCountries, setArtistCountries] = useState<Record<string, string | null>>({});
  const [isLoadingArtistCountries, setIsLoadingArtistCountries] = useState(false);
  const [processedArtistCountForLoader, setProcessedArtistCountForLoader] = useState(0);
  const [totalUniqueArtistsInCurrentSet, setTotalUniqueArtistsInCurrentSet] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [activeMapTab, setActiveMapTab] = useState<"russell" | "origins" | "archipels">("russell");

  // États résolutions de genres
  const [trackGenres, setTrackGenres] = useState<Record<string, string>>({});
  const [isLoadingGenres, setIsLoadingGenres] = useState(false);
  const [genresProgress, setGenresProgress] = useState(0);
  const [genresTotal, setGenresTotal] = useState(0);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [hideIntruders, setHideIntruders] = useState(false);
  const [activeCurationTab, setActiveCurationTab] = useState<"genres" | "soin" | "explore">("genres");

  // Traduction française du pays sélectionné
  const selectedCountryName = useMemo(() => {
    if (!selectedCountry) return "";
    try {
      const regionNames = new Intl.DisplayNames(["fr"], { type: "region" });
      return regionNames.of(selectedCountry) || selectedCountry;
    } catch (e) {
      return selectedCountry;
    }
  }, [selectedCountry]);



  // Résoudre les origines géographiques des artistes
  useEffect(() => {
    if (!playlist || playlist.tracks.length === 0) {
      setArtistCountries({});
      setProcessedArtistCountForLoader(0);
      setTotalUniqueArtistsInCurrentSet(0);
      setSelectedCountry(null);
      return;
    }

    const uniqueArtists = new Set<string>();
    playlist.tracks.forEach((track) => {
      const firstArtist = track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "");
      if (firstArtist) {
        uniqueArtists.add(firstArtist);
      }
    });

    const artistNamesToFetch = Array.from(uniqueArtists);
    if (artistNamesToFetch.length === 0) {
      setArtistCountries({});
      setProcessedArtistCountForLoader(0);
      setTotalUniqueArtistsInCurrentSet(0);
      return;
    }

    const resolveOrigins = async () => {
      setIsLoadingArtistCountries(true);
      setProcessedArtistCountForLoader(0);
      setTotalUniqueArtistsInCurrentSet(artistNamesToFetch.length);

      const resolvedMap: Record<string, string | null> = {};
      const cacheMisses: string[] = [];

      try {
        const batchResponse = await fetch("/api/artist-info/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistNames: artistNamesToFetch }),
        });

        if (batchResponse.ok) {
          const cachedData = await batchResponse.json();
          artistNamesToFetch.forEach((name) => {
            const nameKey = name.toLowerCase();
            if (cachedData[nameKey]) {
              resolvedMap[nameKey] = cachedData[nameKey].country;
            } else {
              cacheMisses.push(name);
            }
          });

          setArtistCountries({ ...resolvedMap });
          setProcessedArtistCountForLoader(artistNamesToFetch.length - cacheMisses.length);
        } else {
          cacheMisses.push(...artistNamesToFetch);
        }
      } catch (err) {
        console.error("Error batch fetching artist info:", err);
        cacheMisses.push(...artistNamesToFetch);
      }

      if (cacheMisses.length > 0) {
        let count = artistNamesToFetch.length - cacheMisses.length;
        for (const artistName of cacheMisses) {
          try {
            const res = await fetch(`/api/artist-info?artistName=${encodeURIComponent(artistName)}`);
            if (res.ok) {
              const data = await res.json();
              resolvedMap[artistName.toLowerCase()] = data.country;
            } else {
              resolvedMap[artistName.toLowerCase()] = null;
            }
          } catch (err) {
            console.error(`Error fetching country for ${artistName}:`, err);
            resolvedMap[artistName.toLowerCase()] = null;
          }
          count++;
          setProcessedArtistCountForLoader(count);
          setArtistCountries({ ...resolvedMap });
        }
      }

      setIsLoadingArtistCountries(false);
    };

    resolveOrigins();
  }, [playlist?.id]);

  // Résoudre les genres des morceaux par chunks de 15 pour une mise à jour en temps réel
  useEffect(() => {
    if (!playlist || playlist.tracks.length === 0) {
      setTrackGenres({});
      setGenresProgress(0);
      setGenresTotal(0);
      setGenreFilter(null);
      setHideIntruders(false);
      return;
    }

    const trackIds = playlist.tracks.map(t => t.id);
    let active = true;
    
    const resolveGenres = async () => {
      setIsLoadingGenres(true);
      setGenresProgress(0);
      setGenresTotal(trackIds.length);

      const chunkSize = 15;
      for (let i = 0; i < trackIds.length; i += chunkSize) {
        if (!active) break;
        const chunk = trackIds.slice(i, i + chunkSize);
        try {
          const batchResponse = await fetch("/api/track-genres/batch-resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackIds: chunk }),
          });

          if (batchResponse.ok && active) {
            const data = await batchResponse.json();
            const genresMap = data.genres || {};
            setTrackGenres(prev => ({ ...prev, ...genresMap }));
            setGenresProgress(prev => Math.min(trackIds.length, prev + chunk.length));
          } else if (!batchResponse.ok) {
            console.error("Failed to batch resolve genres chunk.");
          }
        } catch (err) {
          console.error("Error batch resolving genres chunk:", err);
        }
      }

      if (active) {
        setIsLoadingGenres(false);
      }
    };

    resolveGenres();

    return () => {
      active = false;
    };
  }, [playlist?.id]);

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Consultation de l'hôte algorithmique...");
  
  // États DJ Flow
  const [isDjFlowApplied, setIsDjFlowApplied] = useState(false);
  const [optimizedTracks, setOptimizedTracks] = useState<Track[]>([]);
  const [isDjFlowPanelOpen, setIsDjFlowPanelOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Previews Deezer fallback
  const [deezerPreviews, setDeezerPreviews] = useState<Record<string, string | null>>({});
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // États pour les filtres interactifs
  const [searchText, setSearchText] = useState("");
  const [quadrantFilter, setQuadrantFilter] = useState("all");
  const [minBpm, setMinBpm] = useState(0);
  const [maxBpm, setMaxBpm] = useState(250);
  const [minValence, setMinValence] = useState(0);
  const [maxValence, setMaxValence] = useState(100);
  const [minEnergy, setMinEnergy] = useState(0);
  const [maxEnergy, setMaxEnergy] = useState(100);
  
  // États supplémentaires pour les métriques ReccoBeats
  const [minDanceability, setMinDanceability] = useState(0);
  const [maxDanceability, setMaxDanceability] = useState(100);
  const [minAcousticness, setMinAcousticness] = useState(0);
  const [maxAcousticness, setMaxAcousticness] = useState(100);
  const [minInstrumentalness, setMinInstrumentalness] = useState(0);
  const [maxInstrumentalness, setMaxInstrumentalness] = useState(100);
  const [minLiveness, setMinLiveness] = useState(0);
  const [maxLiveness, setMaxLiveness] = useState(100);
  const [minSpeechiness, setMinSpeechiness] = useState(0);
  const [maxSpeechiness, setMaxSpeechiness] = useState(100);

  // Filtre unidimensionnel issu de l'histogramme
  const [unidimensionalFilter, setUnidimensionalFilter] = useState<{
    metric: string;
    min: number;
    max: number;
    label: string;
    bucketIndex: number;
  } | null>(null);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [portraitTab, setPortraitTab] = useState<"ambiance" | "origins" | "genres">("ambiance");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleDownloadSvg = () => {
    const svgElement = document.getElementById("climate-card-svg");
    if (!svgElement || !playlist) return;

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

  // Initialiser l'audio
  useEffect(() => {
    audioRef.current = new Audio();
    
    const handleEnded = () => {
      setPlayingTrackId(null);
    };

    audioRef.current.addEventListener("ended", handleEnded);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, []);

  // Charger les données de la playlist
  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/analyze?id=${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Impossible de charger les données de la playlist.");
        }

        setPlaylist(data);
        // Sélectionner par défaut le premier morceau pour l'inspecteur sur desktop uniquement
        if (data.tracks && data.tracks.length > 0) {
          const isMobileInitial = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
          if (!isMobileInitial) {
            setSelectedTrack(data.tracks[0]);
          }
        }
        setIsLoading(false);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement.");
        setIsLoading(false);
      }
    };

    // Messages de chargement progressifs
    const loadingSteps = [
      "Analyse de la playlist...",
      "Calcul des caractéristiques de votre playlist...",
      "Chargement des caractéristiques audio...",
      "Génération de la carte d'ambiance...",
      "Calcul des ambiances musicales..."
    ];
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < loadingSteps.length) {
        setLoadingMessage(loadingSteps[step]);
      }
    }, 1200);

    fetchDetails();

    return () => clearInterval(interval);
  }, [id]);

  // Calculer la liste des IDs des morceaux identifiés comme intrus
  const intruderIds = useMemo(() => {
    if (!playlist) return new Set<string>();

    const distribution: Record<string, number> = {};
    for (const track of playlist.tracks) {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      distribution[dominant] = (distribution[dominant] || 0) + 1;
    }

    const intruders = playlist.tracks.map(track => {
      const tagsString = trackGenres[track.id] || track.genres;
      const dominant = getDominantTrackGenre(tagsString, "macro");
      const count = distribution[dominant] || 0;
      const percentage = (count / playlist.tracks.length) * 100;
      return { id: track.id, genre: dominant, percentage };
    }).filter(item => item.percentage < 10.0 && item.genre !== "autre");

    return new Set(intruders.map(i => i.id));
  }, [playlist, trackGenres]);

  // Fonction de filtrage réutilisable pour éviter la duplication de code
  const filterTrack = (track: Track, ignore: { country?: boolean; genre?: boolean } = {}) => {
    // Soin & Maintenance : masquer les intrus si l'option est cochée
    if (hideIntruders && intruderIds.has(track.id)) {
      return false;
    }

    // Filtre par genre (ArchipelMap)
    if (!ignore.genre && genreFilter) {
      const tagsString = trackGenres[track.id] || track.genres;
      if (getDominantTrackGenre(tagsString, "macro") !== genreFilter) {
        return false;
      }
    }

    // 1. Recherche textuelle
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      const matchName = track.name.toLowerCase().includes(query);
      const matchArtist = track.artists.toLowerCase().includes(query);
      if (!matchName && !matchArtist) return false;
    }

    // 2. Quadrant / Climat (Ambiance)
    if (quadrantFilter !== "all") {
      const isUnmapped = track.valence === null || track.energy === null;
      if (quadrantFilter === "unmapped" && !isUnmapped) return false;
      if (quadrantFilter !== "unmapped" && isUnmapped) return false;
      
      if (!isUnmapped) {
        const v = track.valence as number;
        const e = track.energy as number;
        if (quadrantFilter === "q1" && (v < 0.5 || e < 0.5)) return false; // Solaire
        if (quadrantFilter === "q2" && (v >= 0.5 || e < 0.5)) return false; // Tempétueux
        if (quadrantFilter === "q3" && (v >= 0.5 || e >= 0.5)) return false; // Brumeux
        if (quadrantFilter === "q4" && (v < 0.5 || e >= 0.5)) return false; // Serein
      }
    }

    // 3. Métriques
    if (track.valence !== null) {
      const vVal = track.valence * 100;
      if (vVal < minValence || vVal > maxValence) return false;
    } else if (minValence > 0 || maxValence < 100) {
      return false;
    }

    if (track.energy !== null) {
      const eVal = track.energy * 100;
      if (eVal < minEnergy || eVal > maxEnergy) return false;
    } else if (minEnergy > 0 || maxEnergy < 100) {
      return false;
    }

    if (track.tempo !== null) {
      if (track.tempo < minBpm || track.tempo > maxBpm) return false;
    } else if (minBpm > 0 || maxBpm < 250) {
      return false;
    }

    if (track.danceability !== null) {
      const dVal = track.danceability * 100;
      if (dVal < minDanceability || dVal > maxDanceability) return false;
    } else if (minDanceability > 0 || maxDanceability < 100) {
      return false;
    }

    if (track.acousticness !== null) {
      const aVal = track.acousticness * 100;
      if (aVal < minAcousticness || aVal > maxAcousticness) return false;
    } else if (minAcousticness > 0 || maxAcousticness < 100) {
      return false;
    }

    if (track.instrumentalness !== null) {
      const iVal = track.instrumentalness * 100;
      if (iVal < minInstrumentalness || iVal > maxInstrumentalness) return false;
    } else if (minInstrumentalness > 0 || maxInstrumentalness < 100) {
      return false;
    }

    if (track.liveness !== null) {
      const lVal = track.liveness * 100;
      if (lVal < minLiveness || lVal > maxLiveness) return false;
    } else if (minLiveness > 0 || maxLiveness < 100) {
      return false;
    }

    if (track.speechiness !== null) {
      const sVal = track.speechiness * 100;
      if (sVal < minSpeechiness || sVal > maxSpeechiness) return false;
    } else if (minSpeechiness > 0 || maxSpeechiness < 100) {
      return false;
    }

    // 4. Filtre Unidimensionnel
    if (unidimensionalFilter) {
      const { metric, min, max } = unidimensionalFilter;
      const trackVal = (track as any)[metric];
      
      if (metric === "tempo" || metric === "loudness") {
        if (trackVal === null || trackVal === undefined || trackVal < min || trackVal >= max) {
          if (metric === "tempo" && max === 999 && trackVal >= min) {
            // ok
          } else if (metric === "loudness" && max === 99 && trackVal >= min) {
            // ok
          } else {
            return false;
          }
        }
      } else {
        if (trackVal === null || trackVal === undefined || trackVal < min || trackVal > max) {
          return false;
        }
      }
    }

    // 5. Filtre géographique par Pays d'origine
    if (!ignore.country && selectedCountry) {
      const firstArtist = (track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "")).toLowerCase();
      if (!firstArtist) return false;
      const artistCountry = artistCountries[firstArtist];
      if (artistCountry?.toUpperCase() !== selectedCountry.toUpperCase()) return false;
    }

    return true;
  };

  // Filtrer sans la restriction géographique pour alimenter la carte d'origine
  const tracksFilteredWithoutCountry = useMemo(() => {
    if (!playlist) return [];
    const tracksToFilter = (isDjFlowApplied && optimizedTracks.length > 0) ? optimizedTracks : playlist.tracks;
    return tracksToFilter.filter(track => filterTrack(track, { country: true }));
  }, [
    playlist, searchText, quadrantFilter, minBpm, maxBpm, minValence, maxValence, minEnergy, maxEnergy,
    minDanceability, maxDanceability, minAcousticness, maxAcousticness, minInstrumentalness, maxInstrumentalness,
    minLiveness, maxLiveness, minSpeechiness, maxSpeechiness, unidimensionalFilter, isDjFlowApplied, optimizedTracks,
    artistCountries, genreFilter, hideIntruders, trackGenres, intruderIds
  ]);

  // Filtrer sans la restriction de genre pour alimenter l'archipel des genres
  const tracksFilteredWithoutGenre = useMemo(() => {
    if (!playlist) return [];
    const tracksToFilter = (isDjFlowApplied && optimizedTracks.length > 0) ? optimizedTracks : playlist.tracks;
    return tracksToFilter.filter(track => filterTrack(track, { genre: true }));
  }, [
    playlist, searchText, quadrantFilter, minBpm, maxBpm, minValence, maxValence, minEnergy, maxEnergy,
    minDanceability, maxDanceability, minAcousticness, maxAcousticness, minInstrumentalness, maxInstrumentalness,
    minLiveness, maxLiveness, minSpeechiness, maxSpeechiness, unidimensionalFilter, isDjFlowApplied, optimizedTracks,
    selectedCountry, artistCountries, hideIntruders, trackGenres, intruderIds
  ]);

  // Filtrage complet final pour la liste et les autres visualisations
  const filteredTracks = useMemo(() => {
    if (!playlist) return [];
    const tracksToFilter = (isDjFlowApplied && optimizedTracks.length > 0) ? optimizedTracks : playlist.tracks;
    return tracksToFilter.filter(track => filterTrack(track));
  }, [
    playlist, searchText, quadrantFilter, minBpm, maxBpm, minValence, maxValence, minEnergy, maxEnergy,
    minDanceability, maxDanceability, minAcousticness, maxAcousticness, minInstrumentalness, maxInstrumentalness,
    minLiveness, maxLiveness, minSpeechiness, maxSpeechiness, unidimensionalFilter, isDjFlowApplied, optimizedTracks,
    selectedCountry, artistCountries, genreFilter, hideIntruders, trackGenres, intruderIds
  ]);

  // Agrégation dynamique des origines géographiques
  const countrySongCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tracksFilteredWithoutCountry.forEach((track) => {
      const firstArtist = (track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "")).toLowerCase();
      if (firstArtist) {
        const country = artistCountries[firstArtist];
        if (country) {
          const upperCountry = country.toUpperCase();
          counts[upperCountry] = (counts[upperCountry] || 0) + 1;
        }
      }
    });
    return counts;
  }, [tracksFilteredWithoutCountry, artistCountries]);

  // Synchroniser la sélection après filtrage
  useEffect(() => {
    if (selectedTrack && filteredTracks.length > 0) {
      if (!filteredTracks.some(t => t.id === selectedTrack.id)) {
        setSelectedTrack(filteredTracks[0]);
      }
    } else if (filteredTracks.length === 0) {
      setSelectedTrack(null);
    }
  }, [filteredTracks, selectedTrack]);

  // Gérer la lecture / pause de l'extrait
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

  const handleReconstructFeatures = async (trackId: string) => {
    setIsReconstructing(true);
    try {
      const res = await fetch("/api/analyze/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la reconstruction.");
      }
      
      if (data.success && data.track) {
        if (playlist) {
          const updatedTracks = playlist.tracks.map((t) => {
            if (t.id === trackId) {
              return { ...t, ...data.track };
            }
            return t;
          });
          
          setPlaylist({
            ...playlist,
            tracks: updatedTracks
          });

          if (optimizedTracks.length > 0) {
            const updatedOptimized = optimizedTracks.map((t) => {
              if (t.id === trackId) {
                return { ...t, ...data.track };
              }
              return t;
            });
            setOptimizedTracks(updatedOptimized);
          }

          setSelectedTrack({ ...selectedTrack, ...data.track } as Track);
        }
        alert("Ambiance estimée et enregistrée avec succès ! Le morceau est désormais cartographié.");
      }
    } catch (err: any) {
      console.error("Erreur de reconstruction :", err);
      alert(err.message || "Impossible de reconstruire les caractéristiques de ce morceau.");
    } finally {
      setIsReconstructing(false);
    }
  };

  const handleBatchReconstruct = async () => {
    if (!playlist) return;
    
    const unmapped = playlist.tracks.filter(t => t.valence === null || t.energy === null);
    if (unmapped.length === 0) return;

    if (!confirm(`Voulez-vous lancer l'analyse acoustique estimée pour les ${unmapped.length} morceaux manquants de cette playlist ? Les morceaux seront analysés en parallèle par groupes de 3 pour accélérer le processus.`)) {
      return;
    }

    setBatchProgress({ current: 0, total: unmapped.length });
    
    let successCount = 0;
    let processedCount = 0;
    const updatedTracksMap = new Map<string, any>();

    // Concurrency pool of size 3
    const CONCURRENCY = 3;
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < unmapped.length) {
        const currentIndex = nextIndex++;
        const track = unmapped[currentIndex];
        
        try {
          const res = await fetch("/api/analyze/reconstruct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackId: track.id })
          });
          const data = await res.json();
          if (res.ok && data.success && data.track) {
            updatedTracksMap.set(track.id, data.track);
            successCount++;
          }
        } catch (err) {
          console.error(`Erreur de reconstruction pour ${track.name}:`, err);
        } finally {
          processedCount++;
          setBatchProgress({ current: processedCount, total: unmapped.length });
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(CONCURRENCY, unmapped.length); i++) {
      workers.push(runWorker());
    }
    await Promise.all(workers);

    if (successCount > 0) {
      const updatedTracks = playlist.tracks.map((t) => {
        if (updatedTracksMap.has(t.id)) {
          return { ...t, ...updatedTracksMap.get(t.id) };
        }
        return t;
      });

      setPlaylist({
        ...playlist,
        tracks: updatedTracks
      });

      if (optimizedTracks.length > 0) {
        const updatedOptimized = optimizedTracks.map((t) => {
          if (updatedTracksMap.has(t.id)) {
            return { ...t, ...updatedTracksMap.get(t.id) };
          }
          return t;
        });
        setOptimizedTracks(updatedOptimized);
      }
      
      alert(`Analyse terminée ! ${successCount} morceau(x) ont été cartographié(s) avec succès.`);
    } else {
      alert("L'analyse a échoué pour tous les morceaux manquants.");
    }
    
    setBatchProgress(null);
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
          borderTop: "5px solid var(--color-pink)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--foreground)" }}>
          {loadingMessage}
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

  if (error || !playlist) {
    return (
      <div className="neo-container" style={{ maxWidth: "600px", marginTop: "4rem" }}>
        <div className="neo-card" style={{ backgroundColor: "var(--color-orange)", textAlign: "center" }}>
          <h2 style={{ marginBottom: "1rem" }}>Une erreur est survenue ⚠️</h2>
          <p style={{ marginBottom: "1.5rem", fontWeight: 500 }}>{error || "Données indisponibles."}</p>
          <button onClick={() => router.push("/")} className="neo-btn neo-btn-secondary">
            &larr; Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-container animate-pop" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Bouton de retour et action modale */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignSelf: "flex-start", alignItems: "center" }}>
        <button onClick={() => router.push("/")} className="neo-btn neo-btn-secondary" style={{ fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}>
          &larr; Analyser une autre playlist
        </button>
        <button 
          onClick={() => setShowIdCardModal(true)} 
          className="neo-btn" 
          style={{ backgroundColor: "var(--color-pink)", fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}
        >
          {t("share.button")}
        </button>
        
        {playlist && playlist.tracks.filter(t => t.valence === null || t.energy === null).length > 0 && (
          <button 
            onClick={handleBatchReconstruct} 
            className="neo-btn animate-pop" 
            style={{ 
              backgroundColor: "var(--color-orange)", 
              fontSize: "0.9rem", 
              padding: "0.4rem 0.8rem" 
            }}
            disabled={batchProgress !== null}
          >
            {batchProgress 
              ? `⏳ Analyse : ${batchProgress.current} / ${batchProgress.total}...` 
              : `🎛️ Cartographier les ${playlist.tracks.filter(t => t.valence === null || t.energy === null).length} morceaux manquants`
            }
          </button>
        )}
      </div>

      {/* En-tête */}
      <PlaylistHeader playlist={playlist} />

      {/* Panneau de Contrôle Interactif (Filtres) */}
      <section className="neo-card" style={{ backgroundColor: "#ffffff" }}>
        <div 
          onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}
          style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: "1rem", 
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <h3 style={{ fontSize: "1.4rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🎛️ {t("playlist.filterTitle")}
            <span style={{ fontSize: "1.1rem", fontWeight: "900" }}>
              {isControlPanelOpen ? "▲" : "▼"}
            </span>
          </h3>
          <div onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => {
                setSearchText("");
                setQuadrantFilter("all");
                setMinBpm(0);
                setMaxBpm(250);
                setMinValence(0);
                setMaxValence(100);
                setMinEnergy(0);
                setMaxEnergy(100);
                setMinDanceability(0);
                setMaxDanceability(100);
                setMinAcousticness(0);
                setMaxAcousticness(100);
                setMinInstrumentalness(0);
                setMaxInstrumentalness(100);
                setMinLiveness(0);
                setMaxLiveness(100);
                setMinSpeechiness(0);
                setMaxSpeechiness(100);
                setUnidimensionalFilter(null);
                setSelectedCountry(null);
              }}
              className="neo-btn"
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.85rem", backgroundColor: "var(--bg-main)" }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        {isControlPanelOpen && (
          <div className="animate-pop" style={{ marginTop: "1.25rem", borderTop: "2px dashed #ddd", paddingTop: "1.25rem" }}>

        {/* Ligne 1 : Recherche + Catégorie */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              🔍 RECHERCHER UN TITRE OU ARTISTE
            </label>
            <input 
              type="text" 
              placeholder="Taper un titre, un artiste..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="neo-input"
              style={{ width: "100%", padding: "0.4rem 0.75rem", fontSize: "0.9rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              🗺️ FILTRER PAR ATMOSPHÈRE / QUADRANT
            </label>
            <select
              value={quadrantFilter}
              onChange={(e) => setQuadrantFilter(e.target.value)}
              className="neo-input"
              style={{ width: "100%", padding: "0.4rem 0.75rem", fontSize: "0.9rem", cursor: "pointer" }}
            >
              <option value="all">Tous les morceaux</option>
              <option value="q1">☀️ Solaire (Énergie +, Valence +)</option>
              <option value="q2">⚡ Tempétueux (Énergie +, Valence -)</option>
              <option value="q3">🌧️ Brumeux (Énergie -, Valence -)</option>
              <option value="q4">🍃 Serein (Énergie -, Valence +)</option>
              <option value="unmapped">⚠️ Non cartographiés (Données manquantes)</option>
            </select>
          </div>
        </div>

        {/* Bouton Filtres Avancés */}
        <div style={{ marginBottom: "1rem" }}>
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="neo-btn neo-btn-secondary"
            style={{ fontSize: "0.85rem", padding: "0.25rem 0.5rem" }}
          >
            {showAdvancedFilters ? "Masquer les filtres de métriques ▲" : "Afficher les filtres de métriques (Valence, Énergie, BPM...) ▼"}
          </button>
        </div>

        {/* Filtres Avancés (Sliders) */}
        {showAdvancedFilters && (
          <div className="animate-pop" style={{ 
            borderTop: "2px dashed #ddd", 
            paddingTop: "1.25rem", 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
            gap: "1.5rem" 
          }}>
            {/* Valence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>☀️ VALENCE (Positivité)</span>
                <span>{minValence}% - {maxValence}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minValence}
                maxValue={maxValence}
                onChange={(min, max) => {
                  setMinValence(min);
                  setMaxValence(max);
                }}
                accentColor="var(--color-pink)"
              />
            </div>

            {/* Énergie */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>⚡ ÉNERGIE (Intensité)</span>
                <span>{minEnergy}% - {maxEnergy}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minEnergy}
                maxValue={maxEnergy}
                onChange={(min, max) => {
                  setMinEnergy(min);
                  setMaxEnergy(max);
                }}
                accentColor="var(--color-orange)"
              />
            </div>

            {/* Tempo (BPM) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>⏱️ TEMPO (BPM)</span>
                <span>{minBpm} - {maxBpm} BPM</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={250}
                minValue={minBpm}
                maxValue={maxBpm}
                onChange={(min, max) => {
                  setMinBpm(min);
                  setMaxBpm(max);
                }}
                accentColor="var(--color-purple)"
              />
            </div>

            {/* Danceability */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>🕺 DANSABILITÉ</span>
                <span>{minDanceability}% - {maxDanceability}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minDanceability}
                maxValue={maxDanceability}
                onChange={(min, max) => {
                  setMinDanceability(min);
                  setMaxDanceability(max);
                }}
                accentColor="var(--color-green)"
              />
            </div>

            {/* Acousticness */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>🎻 ACOUSTICITÉ</span>
                <span>{minAcousticness}% - {maxAcousticness}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minAcousticness}
                maxValue={maxAcousticness}
                onChange={(min, max) => {
                  setMinAcousticness(min);
                  setMaxAcousticness(max);
                }}
                accentColor="var(--color-blue)"
              />
            </div>

            {/* Instrumentalness */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>🎹 INSTRUMENTALITÉ</span>
                <span>{minInstrumentalness}% - {maxInstrumentalness}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minInstrumentalness}
                maxValue={maxInstrumentalness}
                onChange={(min, max) => {
                  setMinInstrumentalness(min);
                  setMaxInstrumentalness(max);
                }}
                accentColor="var(--color-yellow)"
              />
            </div>

            {/* Liveness */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>🍻 PRÉSENCE LIVE</span>
                <span>{minLiveness}% - {maxLiveness}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minLiveness}
                maxValue={maxLiveness}
                onChange={(min, max) => {
                  setMinLiveness(min);
                  setMaxLiveness(max);
                }}
                accentColor="#fecdd3"
              />
            </div>

            {/* Speechiness */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                <span>🎙️ PAROLE (SPEECHINESS)</span>
                <span>{minSpeechiness}% - {maxSpeechiness}%</span>
              </div>
              <DoubleRangeSlider
                min={0}
                max={100}
                minValue={minSpeechiness}
                maxValue={maxSpeechiness}
                onChange={(min, max) => {
                  setMinSpeechiness(min);
                  setMaxSpeechiness(max);
                }}
                accentColor="#e2e8f0"
              />
            </div>
          </div>
        )}

            {/* Résumé de l'état actuel */}
            <div style={{ 
              marginTop: "1.25rem", 
              borderTop: "2px solid var(--foreground)", 
              paddingTop: "0.75rem", 
              fontSize: "0.85rem", 
              fontWeight: 700, 
              display: "flex", 
              justifyContent: "space-between" 
            }}>
              <span>AFFICHAGE : {filteredTracks.length} / {playlist.tracks.length} titres</span>
              {filteredTracks.length === 0 && (
                <span style={{ color: "var(--color-orange)" }}>⚠️ Aucun titre ne correspond à vos filtres.</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Grid Principal : Carte vs Climat & Inspecteur */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: "2rem",
        alignItems: "start"
      }}>
        {/* Colonne de Gauche : Cartes (Modèle Émotionnel / Planisphère des Origines) */}
        <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Onglets des Cartes */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveMapTab("russell")}
              className="neo-btn"
              style={{
                flex: 1,
                fontSize: "0.85rem",
                padding: "0.5rem 0.5rem",
                backgroundColor: activeMapTab === "russell" ? "var(--color-pink)" : "#ffffff",
                borderStyle: activeMapTab === "russell" ? "solid" : "dashed",
                minWidth: "120px"
              }}
            >
              {t("playlist.tabAmbiance")}
            </button>
            <button
              onClick={() => setActiveMapTab("origins")}
              className="neo-btn"
              style={{
                flex: 1,
                fontSize: "0.85rem",
                padding: "0.5rem 0.5rem",
                backgroundColor: activeMapTab === "origins" ? "var(--color-blue)" : "#ffffff",
                borderStyle: activeMapTab === "origins" ? "solid" : "dashed",
                minWidth: "120px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.2rem",
              }}
            >
              {t("playlist.tabOrigins")}
              {Object.keys(countrySongCounts).length > 0 && (
                <span className="neo-badge" style={{ backgroundColor: "var(--color-orange)", fontSize: "0.7rem", padding: "1px 4px" }}>
                  {Object.keys(countrySongCounts).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveMapTab("archipels")}
              className="neo-btn"
              style={{
                flex: 1,
                fontSize: "0.85rem",
                padding: "0.5rem 0.5rem",
                backgroundColor: activeMapTab === "archipels" ? "var(--color-purple)" : "#ffffff",
                borderStyle: activeMapTab === "archipels" ? "solid" : "dashed",
                minWidth: "120px"
              }}
            >
              {t("playlist.tabGenres")}
            </button>
          </div>

          {activeMapTab === "russell" ? (
            <CartographeMap 
              tracks={filteredTracks}
              onSelectTrack={setSelectedTrack}
              selectedTrack={selectedTrack}
              playingTrackId={playingTrackId}
              onPlayToggle={handlePlayToggle}
              showFlowPath={isDjFlowApplied}
            />
          ) : activeMapTab === "origins" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {isLoadingArtistCountries && Object.keys(artistCountries).length === 0 ? (
                <div className="neo-card" style={{ 
                  backgroundColor: "var(--bg-main)", 
                  textAlign: "center", 
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1.5rem",
                  height: "450px"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    border: "5px solid #eee",
                    borderTop: "5px solid var(--color-blue)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <p style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: "var(--font-heading)" }}>
                    Identification des pays d'origine...
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>
                    Résolution : {processedArtistCountForLoader} / {totalUniqueArtistsInCurrentSet} artistes
                  </p>
                </div>
              ) : (
                <>
                  {isLoadingArtistCountries && (
                    <div style={{ 
                      fontSize: "0.85rem", 
                      fontWeight: 700, 
                      backgroundColor: "var(--color-yellow)", 
                      padding: "0.5rem 1rem", 
                      border: "var(--border-thin)", 
                      borderRadius: "8px",
                      boxShadow: "2px 2px 0px 0px #000",
                      textAlign: "center"
                    }}>
                      ⏳ Résolution des artistes restants en arrière-plan : {processedArtistCountForLoader} / {totalUniqueArtistsInCurrentSet}...
                    </div>
                  )}
                  <MapOrigines
                    countrySongCounts={countrySongCounts}
                    onCountryClick={(iso, name) => {
                      setSelectedCountry(iso);
                    }}
                    selectedCountry={selectedCountry}
                    tracks={tracksFilteredWithoutCountry}
                    artistCountries={artistCountries}
                    onTrackSelect={setSelectedTrack}
                    selectedTrack={selectedTrack}
                  />
                  {selectedCountry && (
                    <div className="neo-card animate-pop" style={{ 
                      backgroundColor: "var(--color-orange)", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      padding: "0.75rem 1rem",
                      border: "var(--border-thin)",
                      boxShadow: "var(--shadow-hard-active)"
                    }}>
                      <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                        📍 Filtrage actif : {countrySongCounts[selectedCountry] || 0} titre(s) provenant de {selectedCountryName} ({selectedCountry})
                      </span>
                      <button
                        onClick={() => setSelectedCountry(null)}
                        className="neo-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", backgroundColor: "#ffffff" }}
                      >
                        Effacer le filtre
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {isLoadingGenres && Object.keys(trackGenres).length === 0 ? (
                <div className="neo-card" style={{ 
                  backgroundColor: "var(--bg-main)", 
                  textAlign: "center", 
                  padding: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "1.5rem",
                  height: "450px"
                }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    border: "5px solid #eee",
                    borderTop: "5px solid var(--color-purple)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  <p style={{ fontWeight: 700, fontSize: "1.1rem", fontFamily: "var(--font-heading)" }}>
                    Analyse stylistique des morceaux...
                  </p>
                  <p style={{ fontSize: "0.9rem", color: "#666", fontWeight: 500 }}>
                    Résolution : {genresProgress} / {genresTotal} titres
                  </p>
                </div>
              ) : (
                <>
                  {isLoadingGenres && (
                    <div style={{ 
                      fontSize: "0.85rem", 
                      fontWeight: 700, 
                      backgroundColor: "var(--color-yellow)", 
                      padding: "0.5rem 1rem", 
                      border: "var(--border-thin)", 
                      borderRadius: "8px",
                      boxShadow: "2px 2px 0px 0px #000",
                      textAlign: "center"
                    }}>
                      ⏳ Analyse des morceaux restants en arrière-plan : {genresProgress} / {genresTotal}...
                    </div>
                  )}
                  <ArchipelMap
                    tracks={tracksFilteredWithoutGenre}
                    trackGenres={trackGenres}
                    onSelectTrack={setSelectedTrack}
                    selectedTrack={selectedTrack}
                    onSelectGenreFilter={setGenreFilter}
                    selectedGenreFilter={genreFilter}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Colonne de Droite : Climat et Inspecteur de morceau */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Inspecteur de morceau sélectionné (Desktop uniquement) */}
          {selectedTrack && !isMobile && (
            <TrackInspector
              selectedTrack={selectedTrack}
              playingTrackId={playingTrackId}
              loadingTrackId={loadingTrackId}
              isReconstructing={isReconstructing}
              onPlayToggle={handlePlayToggle}
              onReconstructFeatures={handleReconstructFeatures}
              trackGenres={trackGenres}
            />
          )}

          {/* Résumé du Climat */}
          <ClimatSummary tracks={filteredTracks} />
        </div>
      </div>

      {/* Analyse de distribution unidimensionnelle */}
      <div style={{ marginTop: "1rem" }}>
        <AnalysteUnidimensionnel
          tracks={playlist.tracks}
          onSelectTrack={setSelectedTrack}
          selectedTrack={selectedTrack}
          onFilterChange={setUnidimensionalFilter}
          activeFilter={unidimensionalFilter}
        />
      </div>

      {playlist && (
        <DJFlowPanel
          tracks={playlist.tracks}
          playlistId={playlist.id}
          isDjFlowApplied={isDjFlowApplied}
          setIsDjFlowApplied={setIsDjFlowApplied}
          optimizedTracks={optimizedTracks}
          setOptimizedTracks={setOptimizedTracks}
          isDjFlowPanelOpen={isDjFlowPanelOpen}
          setIsDjFlowPanelOpen={setIsDjFlowPanelOpen}
          isOptimizing={isOptimizing}
          setIsOptimizing={setIsOptimizing}
        />
      )}

      {/* Espace de Curation & Tri */}
      <section className="neo-card" style={{ backgroundColor: "#ffffff", marginTop: "1rem" }}>
        <AnalysteGenres
          tracks={playlist.tracks}
          trackGenres={trackGenres}
          onSelectTrack={setSelectedTrack}
          selectedTrack={selectedTrack}
        />
      </section>

      {/* Liste complète des morceaux */}
      <div style={{ marginTop: "1rem" }}>
        <TrackList 
          tracks={filteredTracks}
          onSelectTrack={setSelectedTrack}
          selectedTrack={selectedTrack}
          playingTrackId={playingTrackId}
          onPlayToggle={handlePlayToggle}
          loadingTrackId={loadingTrackId}
        />
      </div>

      {/* Bouton de Partage en Bas de Page */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem", marginBottom: "3rem" }}>
        <button
          onClick={() => setShowIdCardModal(true)}
          className="neo-btn"
          style={{
            backgroundColor: "var(--color-pink)",
            fontSize: "1.1rem",
            padding: "0.8rem 2rem",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            boxShadow: "4px 4px 0px 0px #1c1917"
          }}
        >
          {language === "fr" ? "Partager mon analyse 🎨" : "Share my analysis 🎨"}
        </button>
      </div>

      {/* Modale Portrait Musical / Partage */}
      {playlist && (
        <ShareModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          playlist={playlist}
          countrySongCounts={countrySongCounts}
          trackGenres={trackGenres}
        />
      )}

      {/* Mobile Bottom Sheet Drawer */}
      {isMobile && selectedTrack && (
        <MobileTrackDrawer
          selectedTrack={selectedTrack}
          playingTrackId={playingTrackId}
          loadingTrackId={loadingTrackId}
          isReconstructing={isReconstructing}
          onPlayToggle={handlePlayToggle}
          onReconstructFeatures={handleReconstructFeatures}
          trackGenres={trackGenres}
          onClose={() => setSelectedTrack(null)}
        />
      )}
    </div>
  );
}
