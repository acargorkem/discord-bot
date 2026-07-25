# syntax=docker/dockerfile:1

# ---- Aşama 1: Derleme (TypeScript -> JavaScript) ----
FROM node:26-alpine AS build
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
# --ignore-scripts: Docker'da git yok, husky "prepare" adımını atla.
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Aşama 2: Yalnızca üretim bağımlılıkları ----
FROM node:26-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ---- Aşama 3: Çalışma zamanı (küçük, root olmayan imaj) ----
FROM node:26-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# SQLite veritabanı dizini — volume mount'unda node kullanıcısı yazabilsin.
RUN mkdir -p /app/data && chown node:node /app/data

# Sağlık kontrolü: bot Discord'a bağlıysa /health 200 döner.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- http://localhost:3000/health || exit 1

# Güvenlik: root yerine yerleşik "node" kullanıcısıyla çalış.
USER node
CMD ["node", "dist/index.js"]
