-- CreateTable
CREATE TABLE "ArtistCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistNameQuery" TEXT NOT NULL,
    "mbid" TEXT,
    "nameFound" TEXT,
    "countryCode" TEXT,
    "lastFetched" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'MusicBrainzAPI'
);

-- CreateIndex
CREATE UNIQUE INDEX "ArtistCache_artistNameQuery_key" ON "ArtistCache"("artistNameQuery");

-- CreateIndex
CREATE INDEX "ArtistCache_artistNameQuery_idx" ON "ArtistCache"("artistNameQuery");
