"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "fr" | "en";

const translations = {
  fr: {
    "navbar.brand": "CARTOBEAT",
    "navbar.home": "Accueil",
    "navbar.module": "Cartographe 🗺️",
    "home.title": "Explorez et habitez votre espace sonore",
    "home.subtitle": "Analysez l'ADN musical de vos playlists 🧪",
    "home.description": "Cartobeat vous aide à analyser l'ambiance de vos playlists, à cartographier vos habitudes d'écoute et à comprendre comment vous vous attachez aux sons.",
    "home.soloMode": "🔍 Mode Solo",
    "home.compareMode": "🆚 Mode Comparatif",
    "home.placeholder": "Lien de playlist Spotify/Deezer, ou profil utilisateur Spotify...",
    "home.btnAnalyze": "Analyser &rarr;",
    "home.demoTitle": "PLAYLIST DE DÉMONSTRATION DIRECTE :",
    "home.demoBtn": "🧪 Playlist démo : \"a trier\"",
    "home.curatorTitle": "Vos Playlists Personnelles (Mode Admin) 🎵",
    "home.curatorLoading": "Chargement de vos playlists Spotify...",
    "home.curatorEmpty": "Aucune playlist trouvée dans votre bibliothèque.",
    "home.card1Title": "L'Ambiance Sonore",
    "home.card1Desc": "Au lieu d'analyser vos morceaux de façon isolée, nous calculons l'ambiance générale (la Valence émotionnelle et l'Énergie physique) pour comprendre l'atmosphère de votre espace d'écoute.",
    "home.card2Title": "La Cartographie Visuelle",
    "home.card2Desc": "Visualisez vos habitudes musicales en repérant précisément où se situent vos morceaux préférés. Une cartographie 2D fixe vous permet de créer des repères spatiaux d'écoute.",
    "home.card3Title": "L'Analyse des Genres",
    "home.card3Desc": "Repérez la répartition stylistique de vos playlists. Visualisez les sous-genres et identifiez les morceaux décalés dans vos habitudes d'écoute.",
    "playlist.back": "&larr; Analyser une autre playlist",
    "playlist.passport": "Portrait Musical 🎨",
    "playlist.reconstruct": "🎛️ Cartographier les {count} morceaux manquants",
    "playlist.reconstructLoading": "⏳ Analyse : {current} / {total}...",
    "playlist.displayCount": "AFFICHAGE : {filtered} / {total} titres",
    "playlist.noMatch": "⚠️ Aucun titre ne correspond à vos filtres.",
    "playlist.tabAmbiance": "🗺️ Ambiance",
    "playlist.tabOrigins": "🌍 Origines",
    "playlist.tabGenres": "📊 Genres",
    "playlist.filterTitle": "Filtres & Exploration",
    "playlist.filterReset": "Réinitialiser les filtres",
    "playlist.filterSearch": "🔍 RECHERCHER UN TITRE OU ARTISTE",
    "playlist.filterSearchPlaceholder": "Taper un titre, un artiste...",
    "playlist.filterAtmosphere": "🗺️ FILTRER PAR AMBIANCE / QUADRANT",
    "playlist.filterAll": "Tous les morceaux",
    "playlist.filterQ1": "☀️ Solaire (Énergie +, Valence +)",
    "playlist.filterQ2": "⚡ Tempétueux (Énergie +, Valence -)",
    "playlist.filterQ3": "🌧️ Brumeux (Énergie -, Valence -)",
    "playlist.filterQ4": "🍃 Serein (Énergie -, Valence +)",
    "playlist.filterUnmapped": "⚠️ Non cartographiés (Données manquantes)",
    "playlist.filterAdvancedShow": "Afficher les filtres de métriques (Valence, Énergie, BPM...) ▼",
    "playlist.filterAdvancedHide": "Masquer les filtres de métriques ▲",
    "playlist.sortSelect": "Trier par...",
    "playlist.sortDefault": "Ordre initial",
    "playlist.sortTitle": "Titre",
    "playlist.sortArtist": "Artiste",
    "playlist.sortValence": "Valence",
    "playlist.sortEnergy": "Énergie",
    "playlist.sortDance": "Dansabilité",
    "playlist.sortAcoustic": "Acousticité",
    "playlist.sortTempo": "Tempo",
    "playlist.sortDuration": "Durée",
    "playlist.sortSpeech": "Parole",
    "playlist.sortInstr": "Instrumental",
    "playlist.sortLive": "Présence Live",
    "playlist.sortKey": "Tonalité",
    "playlist.unmappedWarning": "⚠️ {count} morceau(x) ne dispose(nt) pas de caractéristiques audio.",
    "playlist.flowTitle": "🎚️ Optimiseur de Flow (Transitions DJ)",
    "playlist.flowActive": "Actif",
    "playlist.flowDesc": "Cet outil réorganise vos morceaux selon les règles du mix DJ (Roue de Camelot) : il cherche à minimiser les transitions de BPM trop brusques et assure une continuité harmonique fluide entre chaque morceau.",
    "playlist.flowBtnActivate": "⚡ Activer l'Ordre Optimisé (DJ Flow)",
    "playlist.flowBtnRestoration": "↩️ Restaurer l'Ordre d'Origine",
    "playlist.flowBtnDownload": "💾 Télécharger la Playlist (.M3U)",
    "playlist.flowBtnCopy": "📋 Copier la Liste Triée",
    "playlist.flowCopiedAlert": "Ordre des pistes copié dans le presse-papiers !",
    "playlist.flowTransitionTitle": "Aperçu des Transitions Harmoniques :",
    "playlist.curationGenresTitle": "Analyse des Genres",
    "playlist.curationGenresTab": "🧭 Analyse des Genres",
    "playlist.metriqueMoyenneTitle": "Métriques moyennes de la playlist 🧪",
    "playlist.metriqueMoyenneSub": "Calculées sur les titres cartographiés",
    "inspector.title": "Inspecteur de Titre 🔎",
    "inspector.unmapped": "⚠️ Données audio indisponibles.",
    "inspector.reconstructBtn": "🎛️ Estimer l'ambiance (Deezer 30s)",
    "inspector.reconstructing": "⏳ En cours...",
    "inspector.valence": "Sombre / Positif ☀️ (Valence)",
    "inspector.energy": "Calme / Intense ⚡ (Énergie)",
    "inspector.acoustic": "🎻 Acousticité",
    "inspector.dance": "🕺 Dansabilité",
    "inspector.instr": "🎹 Instrumental",
    "inspector.speech": "🎙️ Parole",
    "inspector.live": "🍻 Présence Live",
    "inspector.tempo": "TEMPO",
    "inspector.key": "TONALITÉ",
    "inspector.genres": "🏷️ GENRES DE L'ARTISTE",
    "inspector.noGenre": "Aucun genre identifié.",
    "inspector.btnListen": "▶️ Écouter l'extrait (30s)",
    "inspector.btnPause": "⏸️ Mettre en pause",
    "inspector.btnLoading": "⏳ Chargement...",
    "tooltip.valence": "Humeur positive : les valeurs élevées sont joyeuses et lumineuses, les basses sont mélancoliques et sombres.",
    "tooltip.energy": "Intensité physique : les morceaux rapides, forts et dynamiques ont une valeur élevée.",
    "tooltip.dance": "Adaptation à la danse : basé sur le tempo, la régularité du rythme et le beat.",
    "tooltip.acoustic": "Probabilité acoustique : chance que le morceau soit joué sans instruments électriques/électroniques.",
    "tooltip.instr": "Probabilité instrumentale : chance que le morceau ne contienne pas de voix (parole ou chant).",
    "tooltip.speech": "Présence de parole : détecte la prédominance de mots parlés (ex. rap, talk-show, lofi).",
    "tooltip.live": "Présence live : détecte s'il s'agit d'un enregistrement public ou d'un concert.",
    "compare.title": "COMPARAISON ACOUSTIQUE DES PLAYLISTS ⚔️",
    "compare.badge": "MODE COMPARATIF 🆚",
    "compare.btnBack": "&larr; Lancer un autre comparatif",
    "compare.compatibility": "COMPATIBILITÉ ACOUSTIQUE DES PLAYLISTS",
    "compare.metricTitle": "Comparaison des Métriques 📊",
    "compare.winner": "Gagnant",
    "compare.climatSolaire": "Solaire ☀️",
    "compare.climatTempete": "Tempétueux ⚡",
    "compare.climatBrumeux": "Brumeux 🌧️",
    "compare.climatSerein": "Serein 🍃",
    "compare.topMetric": "MÉTRIQUE",
    "portrait.descSolaire": "Optimiste, festif & radieux",
    "portrait.descTempete": "Intense, électrique & rythmé",
    "portrait.descBrumeux": "Calme, introspectif & lofi",
    "portrait.descSerein": "Doux, apaisant & acoustique",
    "portrait.tempoMoyen": "TEMPO MOYEN",
    "portrait.energie": "ÉNERGIE GLOBALE",
    "portrait.download": "Portrait Musical téléchargé !",
    "portrait.activeTabRussell": "PORTRAIT D'AMBIANCE",
    "portrait.activeTabOrigins": "PASSEPORT DES ORIGINES",
    "portrait.activeTabGenres": "ARCHIPEL DES GENRES",
    "portrait.countriesRepresented": "PAYS REPRÉSENTÉS",
    "portrait.topCountry": "PAYS DOMINANT",
    "portrait.diversityTitle": "DIVERSITÉ DES GENRES",
    "portrait.topGenre": "GENRE PRINCIPAL",
    "portrait.cardOf": "PORTRAIT DE",
    
    // Share / Portrait Modal
    "share.title": "Partager le Portrait Musical 🎨",
    "share.button": "Partager 🎨",
    "share.download": "Télécharger le Portrait",
    "share.native": "Partager via le système 🔗",
    "share.whatsapp": "Partager sur WhatsApp 🟢",
    "share.copyLink": "Copier le lien d'analyse 📋",
    "share.linkCopied": "Lien d'analyse copié dans le presse-papiers !",
    "share.instagramTip": "Pour Instagram, téléchargez le Portrait et publiez-le dans votre Story 📸 !",
    "share.text": "Découvre le Portrait Musical de ma playlist sur Cartobeat ! 🧪",
    
    // Genres
    "genres.title": "Répartition des Genres Musicaux",
    "genres.profile": "Profil Stylistique 🧭",
    "genres.zoom": "ZOOM STYLISTIQUE",
    "genres.macro": "Macro",
    "genres.micro": "Micro",
    "genres.macroDesc": "Macro (10 Familles)",
    "genres.mesoDesc": "Méso (Styles Majeurs)",
    "genres.microDesc": "Micro (Niche / Tags Fins)",
    "genres.noData": "Aucune donnée de genre disponible.",
    
    // Map
    "map.helpText": "💡 Survolez les points pour identifier les titres. Cliquez sur un point pour le sélectionner et l'écouter.",
    "map.unmappedWarning": "⚠️ {count} titre(s) non cartographié(s) (données audio manquantes sur Spotify et ReccoBeats).",
    "map.legend": "Légende (Titres)",
    "map.noTracks": "Aucun titre trouvé."
  },
  en: {
    "navbar.brand": "CARTOBEAT",
    "navbar.home": "Home",
    "navbar.module": "Mapper 🗺️",
    "home.title": "Explore and inhabit your soundscape",
    "home.subtitle": "Analyze your playlists' musical DNA 🧪",
    "home.description": "Cartobeat helps you analyze the vibe of your playlists, map your listening habits, and understand how you attach to sounds.",
    "home.soloMode": "🔍 Solo Mode",
    "home.compareMode": "🆚 Comparison Mode",
    "home.placeholder": "Spotify/Deezer playlist link, or Spotify user profile...",
    "home.btnAnalyze": "Analyze &rarr;",
    "home.demoTitle": "DIRECT DEMO PLAYLIST:",
    "home.demoBtn": "🧪 Demo Playlist: \"a trier\"",
    "home.curatorTitle": "Your Personal Playlists (Admin Mode) 🎵",
    "home.curatorLoading": "Loading your Spotify playlists...",
    "home.curatorEmpty": "No playlists found in your library.",
    "home.card1Title": "The Sound Vibe",
    "home.card1Desc": "Instead of analyzing your songs in isolation, we calculate the general vibe (emotional Valence and physical Energy) to understand the atmosphere of your listening space.",
    "home.card2Title": "Visual Mapping",
    "home.card2Desc": "Visualize your musical habits by locating exactly where your favorite songs lie. A fixed 2D map helps you establish spatial listening cues.",
    "home.card3Title": "Genre Analysis",
    "home.card3Desc": "Observe the stylistic distribution of your playlists. Visualize subgenres and identify outlier tracks in your listening habits.",
    "playlist.back": "&larr; Analyze another playlist",
    "playlist.passport": "Musical Portrait 🎨",
    "playlist.reconstruct": "🎛️ Map the {count} missing tracks",
    "playlist.reconstructLoading": "⏳ Analyzing: {current} / {total}...",
    "playlist.displayCount": "DISPLAYING: {filtered} / {total} tracks",
    "playlist.noMatch": "⚠️ No tracks match your filters.",
    "playlist.tabAmbiance": "🗺️ Vibe",
    "playlist.tabOrigins": "🌍 Origins",
    "playlist.tabGenres": "📊 Genres",
    "playlist.filterTitle": "Filters & Exploration",
    "playlist.filterReset": "Reset filters",
    "playlist.filterSearch": "🔍 SEARCH FOR TITLE OR ARTIST",
    "playlist.filterSearchPlaceholder": "Type a title, artist...",
    "playlist.filterAtmosphere": "🗺️ FILTER BY VIBE / QUADRANT",
    "playlist.filterAll": "All tracks",
    "playlist.filterQ1": "☀️ Sunny (Energy +, Valence +)",
    "playlist.filterQ2": "⚡ Stormy (Energy +, Valence -)",
    "playlist.filterQ3": "🌧️ Foggy (Energy -, Valence -)",
    "playlist.filterQ4": "🍃 Serene (Energy -, Valence +)",
    "playlist.filterUnmapped": "⚠️ Unmapped (Missing data)",
    "playlist.filterAdvancedShow": "Show metrics filters (Valence, Energy, BPM...) ▼",
    "playlist.filterAdvancedHide": "Hide metrics filters ▲",
    "playlist.sortSelect": "Sort by...",
    "playlist.sortDefault": "Initial order",
    "playlist.sortTitle": "Title",
    "playlist.sortArtist": "Artist",
    "playlist.sortValence": "Valence",
    "playlist.sortEnergy": "Energy",
    "playlist.sortDance": "Danceability",
    "playlist.sortAcoustic": "Acousticness",
    "playlist.sortTempo": "Tempo",
    "playlist.sortDuration": "Duration",
    "playlist.sortSpeech": "Speechiness",
    "playlist.sortInstr": "Instrumentalness",
    "playlist.sortLive": "Liveness",
    "playlist.sortKey": "Key",
    "playlist.unmappedWarning": "⚠️ {count} track(s) do not have audio features.",
    "playlist.flowTitle": "🎚️ Flow Optimizer (DJ Transitions)",
    "playlist.flowActive": "Active",
    "playlist.flowDesc": "This tool reorganizes your tracks according to DJ mixing rules (Camelot Wheel): it aims to minimize abrupt BPM changes and ensures smooth harmonic transition between songs.",
    "playlist.flowBtnActivate": "⚡ Activate DJ Flow Order",
    "playlist.flowBtnRestoration": "↩️ Restore Original Order",
    "playlist.flowBtnDownload": "💾 Download Playlist (.M3U)",
    "playlist.flowBtnCopy": "📋 Copy Sorted List",
    "playlist.flowCopiedAlert": "Tracklist order copied to clipboard!",
    "playlist.flowTransitionTitle": "Harmonic Transitions Preview:",
    "playlist.curationGenresTitle": "Genre Analysis",
    "playlist.curationGenresTab": "🧭 Genre Analysis",
    "playlist.metriqueMoyenneTitle": "Average playlist metrics 🧪",
    "playlist.metriqueMoyenneSub": "Calculated on mapped tracks",
    "inspector.title": "Track Inspector 🔎",
    "inspector.unmapped": "⚠️ Audio data unavailable.",
    "inspector.reconstructBtn": "🎛️ Estimate vibe (Deezer 30s)",
    "inspector.reconstructing": "⏳ Estimating...",
    "inspector.valence": "Dark / Positive ☀️ (Valence)",
    "inspector.energy": "Calm / Intense ⚡ (Energy)",
    "inspector.acoustic": "🎻 Acousticness",
    "inspector.dance": "🕺 Danceability",
    "inspector.instr": "🎹 Instrumentalness",
    "inspector.speech": "🎙️ Speechiness",
    "inspector.live": "🍻 Liveness",
    "inspector.tempo": "TEMPO",
    "inspector.key": "KEY",
    "inspector.genres": "🏷️ ARTIST GENRES",
    "inspector.noGenre": "No genres identified.",
    "inspector.btnListen": "▶️ Listen to preview (30s)",
    "inspector.btnPause": "⏸️ Pause",
    "inspector.btnLoading": "⏳ Loading...",
    "tooltip.valence": "Positive mood: high values are happy and bright, low values are melancholic and dark.",
    "tooltip.energy": "Physical intensity: fast, loud, and dynamic songs have a high value.",
    "tooltip.dance": "Dance suitability: based on tempo, rhythm regularity, and beat.",
    "tooltip.acoustic": "Acoustic probability: chance that the track is played without electric/electronic instruments.",
    "tooltip.instr": "Instrumental probability: chance that the track contains no vocals (speech or singing).",
    "tooltip.speech": "Speech presence: detects the prevalence of spoken words (e.g., rap, talk-shows, lofi).",
    "tooltip.live": "Live presence: detects if it is a live recording or concert.",
    "compare.title": "PLAYLISTS COMPARISON ⚔️",
    "compare.badge": "COMPARATIVE MODE 🆚",
    "compare.btnBack": "&larr; Run another comparison",
    "compare.compatibility": "PLAYLISTS ACOUSTIC COMPATIBILITY",
    "compare.metricTitle": "Metrics Comparison 📊",
    "compare.winner": "Winner",
    "compare.climatSolaire": "Sunny ☀️",
    "compare.climatTempete": "Stormy ⚡",
    "compare.climatBrumeux": "Foggy 🌧️",
    "compare.climatSerein": "Serene 🍃",
    "compare.topMetric": "METRIC",
    "portrait.descSolaire": "Optimistic, festive & bright",
    "portrait.descTempete": "Intense, electric & rhythmic",
    "portrait.descBrumeux": "Calme, introspective & lofi",
    "portrait.descSerein": "Soft, relaxing & acoustic",
    "portrait.tempoMoyen": "AVERAGE TEMPO",
    "portrait.energie": "GLOBAL ENERGY",
    "portrait.download": "Musical Portrait downloaded!",
    "portrait.activeTabRussell": "VIBE PORTRAIT",
    "portrait.activeTabOrigins": "ORIGINS PASSPORT",
    "portrait.activeTabGenres": "GENRE ARCHIPELAGO",
    "portrait.countriesRepresented": "COUNTRIES REPRESENTED",
    "portrait.topCountry": "DOMINANT COUNTRY",
    "portrait.diversityTitle": "GENRES DIVERSITY",
    "portrait.topGenre": "PRIMARY GENRE",
    "portrait.cardOf": "PORTRAIT OF",
    
    // Share / Portrait Modal
    "share.title": "Share Musical Portrait 🎨",
    "share.button": "Share 🎨",
    "share.download": "Download Portrait",
    "share.native": "Share via system menu 🔗",
    "share.whatsapp": "Share on WhatsApp 🟢",
    "share.copyLink": "Copy analysis link 📋",
    "share.linkCopied": "Analysis link copied to clipboard!",
    "share.instagramTip": "For Instagram, download the Portrait and post it in your Story 📸 !",
    "share.text": "Check out the Musical Portrait of my playlist on Cartobeat! 🧪",
    
    // Genres
    "genres.title": "Musical Genres Distribution",
    "genres.profile": "Stylistic Profile 🧭",
    "genres.zoom": "STYLISTIC ZOOM",
    "genres.macro": "Macro",
    "genres.micro": "Micro",
    "genres.macroDesc": "Macro (10 Families)",
    "genres.mesoDesc": "Meso (Major Styles)",
    "genres.microDesc": "Micro (Niche / Fine Tags)",
    "genres.noData": "No genre data available.",
    
    // Map
    "map.helpText": "💡 Hover over the points to identify songs. Click a point to select and preview it.",
    "map.unmappedWarning": "⚠️ {count} track(s) not mapped (missing audio features on Spotify and ReccoBeats).",
    "map.legend": "Legend (Tracks)",
    "map.noTracks": "No tracks found."
  }
} as const;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.fr) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("cartobeat_lang") as Language;
      if (stored === "fr" || stored === "en") {
        setLanguageState(stored);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("cartobeat_lang", lang);
    }
  };

  const t = (key: keyof typeof translations.fr): string => {
    const dict = translations[language] || translations.fr;
    return dict[key] || translations.fr[key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}

/**
 * Utility function to format musical key & mode based on language
 */
export function formatKeyMode(
  key: number | null | undefined,
  mode: number | null | undefined,
  language: "fr" | "en"
): string {
  if (key === null || key === undefined || key === -1) return "--";
  if (language === "en") {
    const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = notes[key] || "?";
    const modeName = mode === 1 ? "Maj" : mode === 0 ? "Min" : "";
    return `${noteName} ${modeName}`.trim();
  } else {
    const notes = ["Do", "Do#", "Ré", "Ré#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
    const noteName = notes[key] || "?";
    const modeName = mode === 1 ? "maj" : mode === 0 ? "min" : "";
    return `${noteName} ${modeName}`.trim();
  }
}
