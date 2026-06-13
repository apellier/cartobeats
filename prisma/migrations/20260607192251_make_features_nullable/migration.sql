-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "artists" TEXT NOT NULL,
    "albumName" TEXT NOT NULL,
    "albumImageUrl" TEXT,
    "durationMs" INTEGER NOT NULL,
    "previewUrl" TEXT,
    "danceability" REAL,
    "energy" REAL,
    "key" INTEGER,
    "loudness" REAL,
    "mode" INTEGER,
    "speechiness" REAL,
    "acousticness" REAL,
    "instrumentalness" REAL,
    "liveness" REAL,
    "valence" REAL,
    "tempo" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Track" ("acousticness", "albumImageUrl", "albumName", "artists", "createdAt", "danceability", "durationMs", "energy", "id", "instrumentalness", "key", "liveness", "loudness", "mode", "name", "previewUrl", "speechiness", "tempo", "valence") SELECT "acousticness", "albumImageUrl", "albumName", "artists", "createdAt", "danceability", "durationMs", "energy", "id", "instrumentalness", "key", "liveness", "loudness", "mode", "name", "previewUrl", "speechiness", "tempo", "valence" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
