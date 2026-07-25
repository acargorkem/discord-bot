# Web Paneli — Yayına Alma Rehberi

Bu rehber, web panelini domain'inle canlıya almanı anlatır. Altyapı (Caddy + otomatik HTTPS, web imajı, compose servisi) hazır; sen aşağıdaki adımları izle.

Yer tutucular: `<DOMAIN>` (ör. `panel.ornek.com`), `<SUNUCU_IP>`, `<KULLANICI>` (GitHub, küçük harf), `<REPO>`.

## Nasıl çalışıyor

- **Caddy** servisi statik paneli (Svelte) sunar ve `/api` + `/ws` isteklerini bota (iç ağ, port 3000) proxy'ler.
- Caddy, `<DOMAIN>` için **Let's Encrypt** ile otomatik HTTPS alır.
- Botun API portu dışarı **açılmaz**; yalnızca Caddy üzerinden erişilir.

---

## 1. DNS — domain'i sunucuya yönlendir

Domain sağlayıcında bir **A kaydı** oluştur:

| Tür | Ad         | Değer         |
| --- | ---------- | ------------- |
| A   | `<DOMAIN>` | `<SUNUCU_IP>` |

Yayılması birkaç dakika–saat sürebilir. Kontrol: `ping <DOMAIN>` sunucu IP'sini göstermeli.

## 2. Güvenlik duvarı — HTTP/HTTPS portlarını aç (🖥️ sunucuda)

Caddy'nin sertifika alması ve paneli sunması için 80 ve 443 gerekir:

```bash
sudo ufw allow 80,443/tcp
```

## 3. Discord OAuth2 — redirect URI + client secret

[Discord Developer Portal](https://discord.com/developers/applications) → uygulaman → **OAuth2**:

- **Redirects** bölümüne şunu ekle: `https://<DOMAIN>/api/auth/callback`
- **Client Secret**'i **Reset/Copy** ile al (bir sonraki adımda `.env`'e gidecek).

Kendi **Discord kullanıcı ID'ni** de not al (yalnızca sen panele girebilesin diye): Discord → Ayarlar → Gelişmiş → Geliştirici Modu aç → kendine sağ tık → **Kullanıcı Kimliğini Kopyala**.

## 4. VPS `.env`'e panel değişkenlerini ekle (🖥️ sunucuda)

`~/discord-bot/.env` dosyasına ekle:

```
DISCORD_CLIENT_SECRET=portaldan_aldigin_secret
PANEL_ALLOWED_USER_IDS=senin_discord_user_id
PANEL_ORIGIN=https://<DOMAIN>
PANEL_COOKIE_SECURE=true
PANEL_DOMAIN=<DOMAIN>
OAUTH_REDIRECT_URI=https://<DOMAIN>/api/auth/callback
WEB_IMAGE=ghcr.io/<KULLANICI>/<REPO>-web:latest
```

> Bu dosya repoya **girmez**; sırlar yalnızca sunucuda durur.

## 5. GHCR — web paketini public yap

Deploy ilk kez çalıştıktan sonra `-web` imajı GHCR'a itilir (private). Botta yaptığın gibi public yap: GitHub profilin → **Packages** → `<REPO>-web` → **Package settings → Change visibility → Public**.

## 6. Deploy et

`dev → main` PR'ını merge et (ya da Actions → **Deploy** → Run workflow). CI **bot + web** imajlarını derler, iter ve VPS'e deploy eder (`docker compose pull && up -d`). İlk turda `-web` paketi private olduğu için Caddy çekemezse: 5. adımı yap ve deploy'u yeniden çalıştır.

## 7. Doğrula (🖥️ sunucuda)

```bash
cd ~/discord-bot
docker compose ps
docker compose logs -f caddy
```

`caddy` ayakta olmalı; loglarda sertifika alımını görürsün. Ardından tarayıcıda **`https://<DOMAIN>`** → **Discord ile giriş yap** → panel açılır.

---

## Sorun giderme

- **Sertifika alınamıyor:** DNS henüz yayılmamış olabilir; 80/443 portları açık mı (2. adım) ve domain sunucuya işaret ediyor mu kontrol et.
- **Giriş sonrası "forbidden":** `PANEL_ALLOWED_USER_IDS` senin gerçek Discord ID'in mi?
- **CSRF/oturum sorunları:** `PANEL_ORIGIN` tam olarak `https://<DOMAIN>` mi, `PANEL_COOKIE_SECURE=true` mi?
- **Panel yükleniyor ama kontroller çalışmıyor:** botun ayakta ve NodeLink'e bağlı olduğundan emin ol (`docker compose logs bot`).
