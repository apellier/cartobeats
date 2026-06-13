// src/lib/musicbrainz.ts

const APP_USER_AGENT = `CartobeatApp/0.1.0 (${process.env.NEXTAUTH_URL || "http://127.0.0.1:3000"})`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A global Promise chain to serialize all MusicBrainz API requests
// and ensure a strict minimum delay between queries across all API calls.
let queueChain = Promise.resolve();

export async function fetchMusicBrainz(url: string, options: RequestInit = {}): Promise<Response> {
  const result = new Promise<Response>((resolve, reject) => {
    // Append the request to the global serialization queue
    queueChain = queueChain
      .then(async () => {
        let retries = 3;
        let delayTime = 2000;

        while (retries >= 0) {
          // Always introduce a 1.2s delay before sending a request to MusicBrainz
          await delay(1200);

          try {
            console.log(`[MusicBrainz HTTP Queue] Fetching: ${url}`);
            const response = await fetch(url, {
              ...options,
              headers: {
                ...options.headers,
                "User-Agent": APP_USER_AGENT,
              },
            });

            if (response.status === 503) {
              console.warn(
                `[MusicBrainz HTTP Queue] 503 Service Unavailable for: ${url}. Retrying in ${delayTime}ms... (${retries} retries left)`
              );
              retries--;
              await delay(delayTime);
              delayTime *= 2; // Exponential backoff
              continue;
            }

            if (response.status === 429) {
              console.warn(
                `[MusicBrainz HTTP Queue] 429 Rate Limited for: ${url}. Retrying in ${delayTime}ms... (${retries} retries left)`
              );
              retries--;
              await delay(delayTime);
              delayTime *= 2;
              continue;
            }

            resolve(response);
            return;
          } catch (error: any) {
            if (retries === 0) {
              reject(error);
              return;
            }
            console.warn(
              `[MusicBrainz HTTP Queue] Request failed: ${error.message}. Retrying in ${delayTime}ms... (${retries} retries left)`
            );
            retries--;
            await delay(delayTime);
            delayTime *= 2;
          }
        }
        reject(new Error("MusicBrainz request failed after 3 retries due to rate limit/errors."));
      });
  });

  return result;
}
