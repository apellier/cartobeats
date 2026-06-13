import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { prisma } from "@/lib/db";

export const authOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "playlist-read-private playlist-read-collaborative user-read-email user-read-private",
          show_dialog: true,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: any) {
      // Connexion initiale : stocker les jetons
      if (account) {
        token.accessToken = account.access_token;
        token.expiresAt = account.expires_at; // timestamp en secondes
        token.refreshToken = account.refresh_token;

        if (account.refresh_token) {
          try {
            await prisma.systemConfig.upsert({
              where: { key: "spotify_refresh_token" },
              update: { value: account.refresh_token },
              create: { key: "spotify_refresh_token", value: account.refresh_token },
            });
            console.log("Token de rafraîchissement système enregistré en base.");
          } catch (err) {
            console.error("Erreur enregistrement token système :", err);
          }
        }
        return token;
      }

      // Si le jeton n'a pas encore expiré, on le renvoie tel quel
      if (token.expiresAt && Date.now() < (token.expiresAt * 1000) - 60000) {
        return token;
      }

      // Le jeton a expiré, on doit le renouveler
      try {
        console.log("Renouvellement du jeton d'accès utilisateur expiré...");
        const response = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken || "",
          }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
          throw refreshedTokens;
        }

        console.log("Jeton d'accès utilisateur renouvelé avec succès.");
        return {
          ...token,
          accessToken: refreshedTokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
          // Conserver l'ancien refresh token si le nouveau n'est pas fourni
          refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Erreur lors du renouvellement du jeton utilisateur :", error);
        return {
          ...token,
          error: "RefreshAccessTokenError",
        };
      }
    },
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/", // Rediriger vers la page d'accueil pour la connexion
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
