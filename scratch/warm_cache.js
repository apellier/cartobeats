// scratch/warm_cache.js
// Script utilitaire pour pré-peupler la base de données SQLite en masse.
// Instructions :
// 1. Lancez votre serveur en local (`npm run dev`)
// 2. Modifiez le tableau `PLAYLIST_URLS` ci-dessous avec vos liens Spotify ou Deezer
// 3. Exécutez le script : `node scratch/warm_cache.js`

const PLAYLIST_URLS = [
  // Ajoutez vos liens de playlists publiques ci-dessous :
  "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGmq7X7Z", // Hits du Moment (Spotify)
  "https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva", // Viva Latino (Spotify)
  // "https://www.deezer.com/fr/playlist/1479858361", // Exemple Deezer
];

const LOCAL_SERVER = "http://127.0.0.1:3000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmCache() {
  console.log("=== DÉBUT DU PEUPLEMENT DE LA BASE DE DONNÉES ===");
  console.log(`Cible : ${LOCAL_SERVER}`);
  console.log(`Nombre de playlists à traiter : ${PLAYLIST_URLS.length}\n`);

  for (let i = 0; i < PLAYLIST_URLS.length; i++) {
    const url = PLAYLIST_URLS[i];
    console.log(`[${i + 1}/${PLAYLIST_URLS.length}] Traitement de la playlist : ${url}`);
    
    try {
      // 1. Appeler l'API d'analyse pour importer la playlist et charger les métriques tracks
      const analyzeResponse = await fetch(`${LOCAL_SERVER}/api/analyze?url=${encodeURIComponent(url)}`);
      
      if (!analyzeResponse.ok) {
        const errText = await analyzeResponse.text();
        console.error(`❌ Échec de l'analyse : ${analyzeResponse.status} - ${errText}`);
        continue;
      }
      
      const playlistData = await analyzeResponse.json();
      console.log(`✅ Playlist "${playlistData.name}" importée avec succès (${playlistData.trackCount} titres).`);
      
      // Récupérer les IDs des morceaux
      const trackIds = playlistData.tracks.map((t) => t.id);
      
      if (trackIds.length === 0) continue;
      
      // 2. Déclencher la résolution des genres en arrière-plan
      console.log(`⏳ Résolution en cours des genres pour les ${trackIds.length} titres...`);
      const genresResponse = await fetch(`${LOCAL_SERVER}/api/track-genres/batch-resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds })
      });
      
      if (genresResponse.ok) {
        console.log(`✅ Genres résolus et stockés en cache.`);
      } else {
        console.warn(`⚠️ Échec de la résolution en masse des genres.`);
      }
      
      // 3. Petit temps de pause pour éviter de surcharger les API de Spotify / MusicBrainz
      await sleep(2000);
      
    } catch (err) {
      console.error(`❌ Erreur réseau lors du traitement :`, err.message);
    }
    console.log("--------------------------------------------------");
  }
  
  console.log("\n=== FIN DU PROCESSUS DE PRÉ-PEUPLEMENT ===");
  console.log("Votre base local `dev.db` est désormais enrichie !");
  console.log("Vous pouvez copier ce fichier `dev.db` sur votre serveur de production persistant.");
}

warmCache();
