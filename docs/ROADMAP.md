# Yol Haritası

Bu botun geldiği nokta ve buradan sonrası. Öncelikler değişebilir; bu yaşayan bir belgedir.

**Efor etiketleri:** ⚡ hızlı · 🟡 orta · 🔴 büyük

---

## ✅ Tamamlandı (v1.0 — canlı)

- Bot iskeleti: discord.js v14 + TypeScript (ESM, strict)
- NodeLink ses sunucusu entegrasyonu (Docker imajından)
- Komutlar: `/play`, `/skip`, `/pause`, `/resume`, `/stop`, `/queue`, `/nowplaying`
- "Şimdi çalıyor" mesajında kontrol butonları (duraklat/geç/durdur)
- Kanal boşalınca otomatik ayrılma; playlist/Spotify link desteği
- Kod kalitesi: ESLint + Prettier + Husky + lint-staged + commitlint
- Dockerize (bot + NodeLink compose) ve GitHub Actions CI/CD → Hetzner VPS'te 7/24
- Public repo, branch koruması, `docs/DEPLOY.md`

---

## 🎯 Yakın Vade (seçilen öncelikler)

Her madde `dev → PR → main` akışından geçer (her biri kendi PR'ı + otomatik deploy).

### Aşama A — Oynatma kontrolleri ⚡

Mevcut player API'siyle küçük komutlar; yeni altyapı yok.

- **A1:** `/volume`, `/loop` (kapalı/şarkı/kuyruk), `/shuffle`, `/seek`
- **A2:** `/remove`, `/clear`, `/skipto`, `/move`, `/previous`

### Aşama B — Sağlam temel 🟡

Yeni özelliklerden önce zemini güçlendir.

- **Yapılandırılmış loglama** (pino) — `console.log` yerine JSON logger
- **Vitest** birim testleri (`format`, `guards`, komut mantığı) + CI'a `test` adımı
- **Docker healthcheck** + otomatik toparlanma
- Komut **cooldown**'u (spam koruması)
- **Dependabot** — npm/Docker/Actions için otomatik güncelleme PR'ları

### Aşama C — Kalıcılık + playlistler 🟡 (kilit açıcı)

- **SQLite** (`better-sqlite3`) + Docker named volume (kalıcı)
- Şema: `playlists`, `guild_settings`, `play_history`
- Komutlar: `/playlist save|load|list|delete`, `/settings`, `/stats`
- Sunucu ayarlarını oynatmaya bağla (ör. varsayılan ses)

### Aşama D — Oturum kurtarma 🟡

- Çalan parça + kuyruk + konum periyodik olarak DB'ye yazılır
- Bot/deploy restart'ında kanala dönüp **kaldığı yerden devam eder**

---

## 🌐 Büyük Hedef: Web Kontrol Paneli 🔴

Botu bir web uygulamasından yönetmek: giriş yap, çalan şarkıyı/kuyruğu gör, ses/playlist/tüm kontroller. Botun üstüne tam bir full-stack uygulama — en büyük tek özellik. **Kalıcılık (Aşama C) sonrası** yapılması önerilir.

> Detaylı plan (stack, güvenlik, test, UI/UX, fazlar): **[WEB_PANEL_PLAN.md](WEB_PANEL_PLAN.md)**

### Mimari

- **Giriş:** Discord OAuth2 ("Discord ile giriş"); kimlik + sunucu üyeliği ile yetkilendirme.
- **API katmanı:** Bot süreci içine gömülü REST + WebSocket sunucusu (ör. Fastify). Player durumunu okur ve kontrol eder; slash komutlarıyla aynı mantığı paylaşır.
- **Canlı güncelleme:** WebSocket ile çalan şarkı/kuyruk/konum/ses anlık yansır.
- **Frontend:** React (Vite) SPA — Login → Panel → Kuyruk → Playlistler → Ayarlar.
- **Altyapı:** Domain + otomatik HTTPS (Caddy reverse proxy). Yalnızca web/API dışarı açılır; NodeLink iç ağda gizli kalır.

### Alt adımlar

- **W1** — Bot API katmanı (REST + WebSocket); kontrol mantığını komutlarla paylaş
- **W2** — Discord OAuth2 girişi + oturum yönetimi + yetkilendirme
- **W3** — Frontend SPA (çalan şarkı + temel kontroller)
- **W4** — WebSocket ile gerçek zamanlı senkron
- **W5** — Playlist & ayar sayfaları (Aşama C'ye bağlı)
- **W6** — Altyapı: domain + Caddy + HTTPS + deploy; güvenlik sertleştirme (oturum güvenliği, CSRF, rate limit, yetki kontrolü)

### Bağımlılıklar / notlar

- **Aşama C (SQLite)** panelde playlist/ayar göstermek için önce gelmeli.
- API katmanı, Aşama B'deki healthcheck HTTP ucundan büyüyebilir.
- Discord OAuth `client secret` ve oturum anahtarı → yalnızca `.env` (repoya asla girmez).

---

## 💡 İleride / Opsiyonel

- **Ses filtreleri** ⚡ — bassboost, nightcore, vaporwave, 8D, equalizer (NodeLink'te hazır)
- **Şarkı sözleri** ⚡ — `/lyrics` (NodeLink: genius/musixmatch/lrclib)
- **Keşif** 🟡 — autoplay/radyo modu, `/playnext`, `/playtop`, öneriler
- **Sosyal** 🟡 — DJ rolü/izinler, çok kişili sunucular için vote-skip
- **Zengin UX** 🟡 — canlı ilerleyen now-playing, genişletilmiş butonlar, sayfalı kuyruk, `/search` seçim menüsü
