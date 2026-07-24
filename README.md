# Discord Müzik Botu

Kişisel kullanım için, kendi sunucunda çalışan bir Discord müzik botu.

**Teknoloji:** Node.js + TypeScript + [discord.js](https://discord.js.org) v14 + [lavalink-client](https://github.com/Tomato6966/lavalink-client) → [NodeLink](https://github.com/PerformanC/NodeLink) (ses sunucusu)

---

## Kurulum

1. **Bağımlılıkları yükle:**

   ```bash
   npm install
   ```

2. **Ortam değişkenlerini ayarla:** `.env.example` dosyasını `.env` olarak kopyala ve doldur.

   ```bash
   cp .env.example .env
   ```
   - `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID` — nasıl alınacağı `.env.example` içinde açıklandı.

3. **Botu çalıştır (geliştirme modu):**
   ```bash
   npm run dev
   ```
   Discord'da `/ping` yazarak test et.

---

## Komutlar (scripts)

| Komut               | Açıklama                                                  |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Geliştirme modu (dosya değişince otomatik yeniden başlar) |
| `npm run build`     | TypeScript'i `dist/` içine derler                         |
| `npm start`         | Derlenmiş botu çalıştırır (`dist/`)                       |
| `npm run typecheck` | Tip kontrolü (kod yazmadan hataları yakalar)              |
| `npm run lint`      | ESLint ile kod hatalarını kontrol eder                    |
| `npm run lint:fix`  | Düzeltilebilir lint hatalarını otomatik düzeltir          |
| `npm run format`    | Prettier ile tüm dosyaları biçimlendirir                  |

---

## Kod Kalitesi (Tooling)

Proje standart bir kalite zinciriyle geliyor:

- **ESLint** — kod hatalarını ve kötü kalıpları yakalar (`eslint.config.js`)
- **Prettier** — tutarlı biçimlendirme (`.prettierrc.json`)
- **Husky** — git hook'ları (`.husky/`)
- **lint-staged** — commit'te yalnızca değişen dosyaları kontrol eder
- **commitlint** — commit mesajlarını [Conventional Commits](https://www.conventionalcommits.org/) formatına zorlar

**Her commit'te otomatik olarak:** değişen dosyalar lint + format'tan geçer, commit mesajı formatı doğrulanır. Mesaj örneği: `feat: /skip komutu eklendi` veya `fix: kuyruk boşken çökme düzeltildi`.

---

## NodeLink (Ses Sunucusu)

Bot çalışmadan önce NodeLink'in ayakta olması gerekir. Ayrı bir terminalde:

```bash
cd nodelink
npm start
```

NodeLink `4000` portunda çalışır (bkz. `nodelink/config.js`). Bot ona `localhost:4000` üzerinden bağlanır; farklı bir port/şifre istersen `.env` içinde `LAVALINK_HOST`, `LAVALINK_PORT`, `LAVALINK_PASSWORD` ile geçebilirsin.

---

## Yol Haritası

- [x] **Faz 0 — Ortam & proje iskeleti:** git, TypeScript, klasör yapısı
- [x] **Faz 1 — Bot iskeleti:** slash komut altyapısı, `/ping`
- [x] **Faz 2 — NodeLink entegrasyonu:** ses sunucusu kurulumu, ses kanalına bağlanma, `/play`
- [ ] **Faz 3 — Çekirdek müzik:** `/play`, kuyruk, `/skip`, `/pause`, `/stop`, `/queue`
- [ ] **Faz 4 — Kullanıcı deneyimi:** butonlar, playlist desteği, otomatik ayrılma
- [ ] **Faz 5 — Süreklilik:** 7/24 çalışma, loglama, dayanıklılık

---

## Proje Yapısı

```
src/
├── index.ts          # Giriş noktası: client kurulumu, komut kaydı, olay yönlendirme
├── config.ts         # .env okuma ve doğrulama
├── types.ts          # Ortak tipler (Command arayüzü)
└── commands/
    ├── index.ts      # Komut kayıt listesi
    └── ping.ts       # Örnek komut
```
