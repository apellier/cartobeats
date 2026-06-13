const http = require('https');

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const playlistId = '908622995'; // A popular public Deezer playlist
  const url = `https://api.deezer.com/playlist/${playlistId}`;
  
  try {
    console.log(`Fetching Deezer Playlist: ${playlistId}...`);
    const data = await getJson(url);
    console.log(`Playlist Title: "${data.title}"`);
    console.log(`Creator: "${data.creator?.name}"`);
    console.log(`Track Count: ${data.nb_tracks}`);
    
    const tracks = data.tracks?.data || [];
    console.log(`Fetched tracks count in payload: ${tracks.length}`);
    if (tracks.length > 0) {
      const firstTrack = tracks[0];
      console.log(`First Track keys:`, Object.keys(firstTrack));
      console.log(`First Track Title: "${firstTrack.title}"`);
      console.log(`First Track Artist: "${firstTrack.artist?.name}"`);
      console.log(`First Track ISRC: "${firstTrack.isrc}"`);
      console.log(`First Track Preview URL: "${firstTrack.preview}"`);
      console.log(`First Track object sample:`, JSON.stringify(firstTrack, null, 2));
    }
  } catch (err) {
    console.error("Error fetching Deezer playlist:", err.message);
  }
}

run();
