import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createSession, deleteSession, getSession } from "./sessions.js";

export interface DiscordUser {
  id: string;
  username: string;
}

/** OAuth sağlayıcı soyutlaması — testlerde sahte bir uygulamayla değiştirilebilir. */
export interface OAuthProvider {
  createAuthUrl(state: string): string;
  handleCallback(code: string): Promise<DiscordUser>;
}

export interface AuthConfig {
  provider: OAuthProvider;
  /** Panele girebilecek Discord kullanıcı ID'leri. */
  allowedUserIds: string[];
  generateState: () => string;
  /** Üretimde (HTTPS) true olmalı. */
  cookieSecure: boolean;
  /** Girişten sonra yönlendirilecek panel adresi. */
  panelUrl: string;
}

const SESSION_COOKIE = "session";
const STATE_COOKIE = "oauth_state";

function currentSession(c: Parameters<MiddlewareHandler>[0]) {
  const id = getCookie(c, SESSION_COOKIE);
  return id ? getSession(id) : null;
}

/** İstek bağlamındaki oturum kullanıcısını döner (yoksa null). */
export function sessionUser(
  c: Parameters<MiddlewareHandler>[0],
): { id: string; username: string } | null {
  const session = currentSession(c);
  return session ? { id: session.userId, username: session.username } : null;
}

/** Oturum yoksa 401 döndüren middleware. */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!currentSession(c)) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
};

/** /login, /callback, /me, /logout rotalarını üretir. */
export function createAuthRoutes(cfg: AuthConfig): Hono {
  const app = new Hono();

  app.get("/login", (c) => {
    const state = cfg.generateState();
    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      secure: cfg.cookieSecure,
      sameSite: "Lax",
      path: "/",
      maxAge: 600,
    });
    return c.redirect(cfg.provider.createAuthUrl(state));
  });

  app.get("/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const storedState = getCookie(c, STATE_COOKIE);
    deleteCookie(c, STATE_COOKIE, { path: "/" });

    // state doğrulaması (OAuth CSRF koruması). Hatalarda panele anlaşılır bir
    // mesajla yönlendir (ham JSON yerine).
    if (!code || !state || !storedState || state !== storedState) {
      return c.redirect(`${cfg.panelUrl}?error=invalid_state`);
    }

    let user: DiscordUser;
    try {
      user = await cfg.provider.handleCallback(code);
    } catch {
      return c.redirect(`${cfg.panelUrl}?error=oauth_failed`);
    }

    // Yalnızca izinli kullanıcılar.
    if (!cfg.allowedUserIds.includes(user.id)) {
      return c.redirect(`${cfg.panelUrl}?error=forbidden`);
    }

    const session = createSession(user.id, user.username);
    setCookie(c, SESSION_COOKIE, session.id, {
      httpOnly: true,
      secure: cfg.cookieSecure,
      sameSite: "Lax",
      path: "/",
      maxAge: Math.floor((session.expiresAt - Date.now()) / 1000),
    });
    return c.redirect(cfg.panelUrl);
  });

  app.get("/me", (c) => {
    const session = currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    return c.json({ id: session.userId, username: session.username });
  });

  app.post("/logout", (c) => {
    const id = getCookie(c, SESSION_COOKIE);
    if (id) deleteSession(id);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
