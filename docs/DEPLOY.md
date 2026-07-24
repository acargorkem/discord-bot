# Deploy Rehberi

Bu bot bir Linux VPS üzerinde **Docker** ile çalışır ve **GitHub Actions** ile `main` dalına her merge'de **otomatik** yayınlanır. Bu rehber sıfırdan kurulumu anlatır.

Aşağıdaki yer tutucuları kendi değerlerinle değiştir:

- `<KULLANICI>` — GitHub kullanıcı adın (GHCR için küçük harf)
- `<REPO>` — repo adın (ör. `discord-bot`)
- `<SUNUCU_IP>` — VPS'inin IP adresi

---

## Genel Bakış

- **Bot + NodeLink**, `docker-compose.yml` ile birlikte çalışır. NodeLink resmi imajdan (`performanc/nodelink`) gelir.
- Akış: `main`'e merge → Actions imajı derler → GHCR'a (`ghcr.io`) iter → VPS'e SSH ile bağlanıp yeni sürümü yayınlar.
- **Sırlar** (Discord token, SSH özel anahtarı) yalnızca **GitHub Secrets** ve **VPS'teki `.env`** içinde durur — repoya asla girmez.

---

## Gereksinimler

- Bir VPS (2 vCPU / 4 GB, Ubuntu 24.04 fazlasıyla yeter)
- Discord uygulaması: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` ve bir test sunucusu (`GUILD_ID`)
- GitHub hesabı

---

## 1. SSH Anahtarları (yerel makine)

İki anahtar: biri sunucuya senin girmen, biri GitHub Actions'ın deploy için kullanması içindir.

```bash
# Kişisel (sunucuya giriş)
ssh-keygen -t ed25519 -C "vps-kisisel" -f "$HOME/.ssh/vps-kisisel"

# Deploy (GitHub Actions -> VPS). Parolasız olmalı: sorulunca iki kez Enter.
ssh-keygen -t ed25519 -C "github-deploy" -f "$HOME/.ssh/github-deploy"
```

> Windows PowerShell'de parolayı boş bırakmak için `-N ""` **yazma**; komutu çalıştırıp sorulunca Enter'la (PowerShell boş string argümanını düşürür).

Açık anahtarı görüntüle:

```bash
cat "$HOME/.ssh/vps-kisisel.pub"
```

---

## 2. Sunucu ve Temel Güvenlik

VPS'i Ubuntu 24.04 ile oluştur ve kurulum sırasında kişisel **açık** anahtarını ekle.

İlk giriş (root):

```bash
ssh -i "$HOME/.ssh/vps-kisisel" root@<SUNUCU_IP>
```

Sunucuda — güncelle, sudo'lu `deploy` kullanıcısı aç, SSH anahtarlarını taşı:

```bash
apt update && apt upgrade -y
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

GitHub deploy **açık** anahtarını (`github-deploy.pub` içeriği) `deploy` kullanıcısına ekle:

```bash
echo "SSH_ED25519_ACIK_ANAHTAR_ICERIGI" >> /home/deploy/.ssh/authorized_keys
```

Güvenlik duvarı + SSH sertleştirme (önce yeni kullanıcıyla girişi doğrula, sonra parolayı kapat):

```bash
ufw allow OpenSSH && ufw --force enable
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh
```

---

## 3. Docker Kurulumu (sunucuda)

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Çık ve bundan sonra **`deploy` ile** gir (docker grubunun aktifleşmesi için):

```bash
ssh -i "$HOME/.ssh/vps-kisisel" deploy@<SUNUCU_IP>
docker --version && docker compose version
```

---

## 4. GitHub: Repo, Secrets ve Paket

### 4.1. Kodu ite (yerel)

```bash
git remote add origin https://github.com/<KULLANICI>/<REPO>.git
git push -u origin main
```

### 4.2. Secrets ekle

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret        | Değer                                            |
| ------------- | ------------------------------------------------ |
| `VPS_HOST`    | Sunucu IP'si                                     |
| `VPS_USER`    | `deploy`                                         |
| `VPS_SSH_KEY` | `github-deploy` **özel** anahtarının tam içeriği |
| `VPS_PORT`    | `22` (opsiyonel)                                 |

### 4.3. GHCR paketini public yap

İlk deploy workflow'u çalıştıktan sonra imaj GHCR'a itilir ama **private** gelir. Sunucunun şifresiz çekebilmesi için: GitHub profilin → **Packages** → `<REPO>` paketi → **Package settings → Change visibility → Public**.

_(Alternatif: paketi private tutup VPS'te `read:packages` yetkili bir token ile `docker login ghcr.io` yapabilirsin.)_

---

## 5. Sunucuda Repo ve `.env` (deploy kullanıcısıyla)

```bash
cd ~ && git clone https://github.com/<KULLANICI>/<REPO>.git <REPO>
cd <REPO>
nano .env
```

`.env` içeriği (kendi değerlerinle doldur — bu dosya repoya **girmez**):

```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
GUILD_ID=...
NODELINK_PASSWORD=...        # güçlü rastgele bir değer: openssl rand -hex 24
BOT_IMAGE=ghcr.io/<KULLANICI>/<REPO>:latest
```

---

## 6. Dallanma ve Deploy Akışı

- **`dev`** → günlük çalışma. Her push'ta **CI** (tip kontrolü, lint, biçim, build) çalışır; **deploy olmaz**.
- **`main`** → üretim. Buraya yalnızca **PR merge** ile girer ve bu **otomatik deploy'u** tetikler.

Tipik döngü:

```bash
git checkout dev
# ... değişiklikler + commit ...
git push origin dev          # CI çalışır
# GitHub'da dev -> main PR aç, CI yeşilse merge et -> otomatik deploy
```

### Önerilen korumalar (Settings → ...)

- **Branches → `main` için kural:** _Require a pull request before merging_ + _Require status checks to pass_ (CI `check` işi). Doğrudan push'u ve CI kırmızıyken merge'i engeller.
- **Actions → General → Fork pull request workflows:** _Require approval for all outside collaborators_. Dışarıdan gelen PR'lar sen onaylamadan workflow çalıştıramaz.

---

## 7. İlk Deploy ve Doğrulama

5. ve 6. adımlar (repo + `.env`, paket public) hazırsa: `main`'e bir merge yap (veya Actions → **Deploy** → **Run workflow**). Deploy işi imajı çekip `docker compose up -d` çalıştırır.

Sunucuda doğrula:

```bash
cd ~/<REPO>
docker compose ps
docker compose logs -f bot
```

Loglarda giriş ve NodeLink bağlantısını görmelisin. Ardından Discord'da `/play` ile test et.

---

## 8. Günlük Kullanım ve Sorun Giderme

| İşlem           | Komut (sunucuda, `~/<REPO>` içinde)                            |
| --------------- | -------------------------------------------------------------- |
| Log izle        | `docker compose logs -f bot` (veya `nodelink`)                 |
| Yeniden başlat  | `docker compose restart bot`                                   |
| Durum           | `docker compose ps`                                            |
| Elle güncelle   | `docker compose pull && docker compose up -d`                  |
| NodeLink sürümü | `docker-compose.yml`'deki imaj etiketini değiştir → PR → merge |

**Güncelleme:** Kod değiştir → `dev`'e push → PR → `main`'e merge. Gerisi otomatik; sunucuya elle dokunmana gerek yok. Tek istisna: `.env` (sır) değişikliği — onu sunucuda elle güncellersin.
