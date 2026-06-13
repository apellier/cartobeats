async function resolveDeezerRedirect(url) {
  try {
    console.log(`Resolving redirect for: ${url}`);
    
    // We fetch the URL with redirect: 'manual' to intercept the Location header,
    // or redirect: 'follow' (default) and check the final response URL.
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow', // Fetch will automatically follow redirects
      headers: {
        // Some services require a normal User-Agent to avoid blocking
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Final URL: ${response.url}`);
    
    // Check if final URL matches standard Deezer playlist URL
    const match = response.url.match(/playlist\/(\d+)/);
    if (match) {
      console.log(`Successfully matched playlist ID: ${match[1]}`);
      return match[1];
    } else {
      console.log(`No playlist ID found in final URL.`);
      return null;
    }
  } catch (err) {
    console.error(`Error resolving redirect:`, err.message);
    return null;
  }
}

async function run() {
  const shortUrl = 'https://link.deezer.com/s/33xFZmasMxUFJfiQqYsDM';
  const playlistId = await resolveDeezerRedirect(shortUrl);
  console.log(`Resulting Playlist ID: ${playlistId}`);
}

run();
