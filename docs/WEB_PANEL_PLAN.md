# Web Kontrol Paneli — Plan

Botu bir web uygulamasından yönetmek: Discord ile giriş, çalan şarkı/kuyruk/ses/playlist kontrolü, canlı güncelleme. Bu belge stack'i, güvenlik yaklaşımını, test stratejisini, UI/UX ilkelerini ve fazlı yol haritasını tanımlar.

## Stack

| Katman    | Seçim                                                |
| --------- | ---------------------------------------------------- |
| API       | **Hono** (bota gömülü, TypeScript) + WebSocket       |
| DB        | Botun mevcut **node:sqlite**'ı (paylaşımlı, ham SQL) |
| Auth      | **Discord OAuth2** ([Arctic](https://arcticjs.dev))  |
| Frontend  | **Svelte 5 + Vite** (SPA)                            |
| UI/stil   | **Tailwind CSS + shadcn-svelte**                     |
| Doğrulama | **Valibot** (`@hono/valibot-validator`)              |
| Proxy     | **Caddy** (otomatik HTTPS)                           |

Backend API bota gömülüdür (`src/api/`), player durumuna doğrudan erişir. `web/` yalnızca frontend'i barındırır. Caddy `web/` statiğini sunar ve `/api` + `/ws`'i bota proxy'ler.

## Güvenlik Mimarisi

**Ham SQL:**

- Parametreli sorgular her yerde (`db.prepare` + `?`); kullanıcı girdisi asla SQL'e string olarak girmez.
- Parametrelenemeyen yerler (tablo/kolon adı, `ORDER BY`) için **allowlist** — sabitlerden seçim.
- WAL modu + DB dosyası izinleri (yalnızca bot kullanıcısı).
- Tüm dış girdilerde Valibot şema doğrulama.

**Auth:**

- Arctic ile OAuth2 authorization-code akışı; **`state`** parametresi (OAuth CSRF).
- **Sunucu-taraflı oturum:** tarayıcıya yalnızca opak session ID (`httpOnly` + `Secure` + `SameSite=Lax`); access token asla client'a gitmez, SQLite'ta oturuma bağlı saklanır.
- Oturum süresi + yenileme; least-privilege scope'lar (`identify`, `guilds`).

**Backend (Hono):**

- `secureHeaders()`, `csrf()` (Origin + Sec-Fetch-Site), CORS kendi origin'ine kilitli, rate limiting.
- Kontrol uçları yalnızca izinli kullanıcı(lar) tarafından çağrılabilir (yetkilendirme).
- HTTPS zorunlu (Caddy); sırlar yalnızca `.env` (`DISCORD_CLIENT_SECRET`, `SESSION_SECRET`) — repoya asla girmez.

## Test Stratejisi (TDD)

- **Backend:** Vitest unit (saf mantık) + integration (Hono `app.request()`, in-memory SQLite).
- **Frontend:** vitest-browser-svelte (gerçek tarayıcı modunda component/unit) + Playwright (E2E).
- **Döngü:** önce test (kırmızı) → kod (yeşil) → refactor. Kullanıcının gördüğü davranışı test et, implementasyonu değil.
- CI'a web testleri eklenir.

## UI/UX (2026)

- Baştan hem koyu hem açık tema (semantik renk değişkenleri; shadcn-svelte + Tailwind hazır verir).
- Saf siyah değil derin gri; metin kontrastı ≥ 4.5:1 (WCAG AA).
- Erişilebilir bileşenler, responsive, temiz dashboard düzeni.

## Fazlı Yol Haritası

| Faz | İçerik                                                                                            |
| --- | ------------------------------------------------------------------------------------------------- |
| W1  | Hono API temeli (secureHeaders) + salt-okunur uçlar (now-playing, queue) + testler                |
| W2  | Discord OAuth2 (Arctic) + sunucu-taraflı oturum + yetkilendirme + testler                         |
| W3  | WebSocket ile canlı durum yayını + testler                                                        |
| W4  | Kontrol uçları (play/pause/skip/volume/playlist/settings) — Valibot + CSRF + rate limit + testler |
| W5  | Frontend iskelet + login akışı + panel (now-playing + kontroller) + koyu/açık tema + testler      |
| W6  | Kuyruk/playlist/ayarlar sayfaları + WS canlı senkron + testler                                    |
| W7  | Altyapı: Caddy + domain + HTTPS + compose + deploy; güvenlik sertleştirme turu                    |

## Ön Koşullar

- Domain (VPS IP'sine A kaydı).
- Discord Developer Portal'da OAuth2 redirect URI kaydı.
- Yeni sırlar: `DISCORD_CLIENT_SECRET`, `SESSION_SECRET` (VPS `.env`; repoya girmez).
