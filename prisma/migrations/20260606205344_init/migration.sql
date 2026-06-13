-- CreateTable
CREATE TABLE "Playlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT,
    "imageUrl" TEXT,
    "trackCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumImageUrl" TEXT,
    "durationMs" INTEGER NOT NULL,
    "previewUrl" TEXT,
    "danceability" REAL NOT NULL,
    "energy" REAL NOT NULL,
    "key" INTEGER NOT NULL,
    "loudness" REAL NOT NULL,
    "mode" INTEGER NOT NULL,
    "speechiness" REAL NOT NULL,
    "acousticness" REAL NOT NULL,
    "instrumentalness" REAL NOT NULL,
    "liveness" REAL NOT NULL,
    "valence" REAL NOT NULL,
    "tempo" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "playlistId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("playlistId", "trackId"),
    CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlaylistTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
