import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Cartobeat 🧪 - L'Écologie de tes Habitudes Musicales",
  description: "Explorez, cartographiez et habitez vos playlists Spotify/Deezer. Un outil d'analyse de vos habitudes d'écoute musicale.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <footer style={{ 
            textAlign: "center", 
            padding: "2rem", 
            borderTop: "var(--border-thick)", 
            backgroundColor: "#ffffff",
            marginTop: "4rem",
            fontWeight: 600,
            fontSize: "0.9rem"
          }}>
            Cartobeat &copy; {new Date().getFullYear()}
          </footer>
        </Providers>
      </body>
    </html>
  );
}
