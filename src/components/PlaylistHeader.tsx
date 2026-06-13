import React from "react";

interface PlaylistHeaderProps {
  playlist: {
    name: string;
    description: string | null;
    ownerName: string | null;
    imageUrl: string | null;
    trackCount: number;
    source?: string;
  };
}

export default function PlaylistHeader({ playlist }: PlaylistHeaderProps) {
  return (
    <div className="neo-card animate-pop" style={{ 
      display: "flex", 
      gap: "2rem", 
      alignItems: "center",
      flexWrap: "wrap",
      backgroundColor: "#ffffff",
      marginBottom: "2rem"
    }}>
      {playlist.imageUrl ? (
        <img 
          src={playlist.imageUrl} 
          alt={playlist.name} 
          style={{ 
            width: "140px", 
            height: "140px", 
            borderRadius: "12px", 
            border: "var(--border-thick)",
            boxShadow: "3px 3px 0px 0px var(--shadow-color)",
            objectFit: "cover"
          }}
        />
      ) : (
        <div style={{ 
          width: "140px", 
          height: "140px", 
          borderRadius: "12px", 
          border: "var(--border-thick)",
          backgroundColor: "var(--color-yellow)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "3rem",
          boxShadow: "3px 3px 0px 0px var(--shadow-color)"
        }}>
          🎵
        </div>
      )}
      <div style={{ flex: 1, minWidth: "250px" }}>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem", alignItems: "center" }}>
          <span className="neo-badge" style={{ backgroundColor: "var(--color-yellow)" }}>
            Playlist Publique
          </span>
        </div>
        
        <h1 style={{ fontSize: "2.2rem", marginBottom: "0.5rem", wordBreak: "break-word" }}>
          {playlist.name}
        </h1>
        
        {playlist.description && (
          <p style={{ 
            fontSize: "0.95rem", 
            color: "#555", 
            marginBottom: "0.75rem",
            lineHeight: 1.4,
            maxWidth: "700px" 
          }} dangerouslySetInnerHTML={{ __html: playlist.description }} />
        )}
        
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#777" }}>
          CURATEUR : <span style={{ color: "var(--foreground)" }}>{playlist.ownerName || "Inconnu"}</span> &bull; MORCEAUX CARTOGRAPHIÉS : <span style={{ color: "var(--foreground)" }}>{playlist.trackCount}</span>
        </div>
      </div>
    </div>
  );
}
