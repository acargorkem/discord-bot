import { Discord, generateState } from "arctic";
import { config } from "../config.js";
import type { DiscordUser, OAuthProvider } from "./auth.js";

const SCOPES = ["identify", "guilds"];

/** Arctic tabanlı gerçek Discord OAuth2 sağlayıcısı. */
export function createDiscordProvider(): OAuthProvider {
  const discord = new Discord(
    config.clientId,
    config.panel.clientSecret,
    config.panel.redirectUri,
  );

  return {
    createAuthUrl(state) {
      // Discord confidential client → PKCE yok (codeVerifier null).
      return discord.createAuthorizationURL(state, null, SCOPES).toString();
    },
    async handleCallback(code): Promise<DiscordUser> {
      const tokens = await discord.validateAuthorizationCode(code, null);
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` },
      });
      if (!response.ok) {
        throw new Error("Discord kullanıcı bilgisi alınamadı.");
      }
      const user = (await response.json()) as { id: string; username: string };
      return { id: user.id, username: user.username };
    },
  };
}

export { generateState };
