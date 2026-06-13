import { prisma } from "./db";

export const CACHE_VALIDITY_DAYS = 30;

interface CachedArtistInfoDB {
  country: string | null;
  mbid: string | null;
  nameFound: string | null;
}

export async function getCachedArtistInfoFromDB(
  artistNameQuery: string,
  spotifyArtistId?: string | null
): Promise<CachedArtistInfoDB | null> {
  const queryKey = artistNameQuery.toLowerCase();
  try {
    let cachedEntry = null;

    if (spotifyArtistId) {
      cachedEntry = await prisma.artistCache.findUnique({
        where: { spotifyArtistId },
      });
    }

    if (!cachedEntry) {
      cachedEntry = await prisma.artistCache.findUnique({
        where: { artistNameQuery: queryKey },
      });
    }

    if (cachedEntry) {
      const ageInDays = (Date.now() - new Date(cachedEntry.lastFetched).getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < CACHE_VALIDITY_DAYS) {
        return {
          country: cachedEntry.countryCode,
          mbid: cachedEntry.mbid,
          nameFound: cachedEntry.nameFound,
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching from DB cache:", error);
    return null;
  }
}

export async function setCachedArtistInfoInDB(
  artistNameQuery: string,
  country: string | null,
  mbid: string | null,
  nameFound: string | null,
  spotifyArtistId?: string | null
): Promise<void> {
  const queryKey = artistNameQuery.toLowerCase();
  try {
    const existing = await prisma.artistCache.findFirst({
      where: {
        OR: [
          { artistNameQuery: queryKey },
          ...(spotifyArtistId ? [{ spotifyArtistId }] : []),
        ],
      },
    });

    if (existing) {
      await prisma.artistCache.update({
        where: { id: existing.id },
        data: {
          countryCode: country,
          mbid: mbid,
          nameFound: nameFound,
          spotifyArtistId: spotifyArtistId || existing.spotifyArtistId,
          lastFetched: new Date(),
        },
      });
    } else {
      await prisma.artistCache.create({
        data: {
          artistNameQuery: queryKey,
          countryCode: country,
          mbid: mbid,
          nameFound: nameFound,
          spotifyArtistId: spotifyArtistId || null,
        },
      });
    }
  } catch (error) {
    console.error("Error saving to DB cache:", error);
  }
}
