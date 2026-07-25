# syntax=docker/dockerfile:1

# ---- Aşama 1: Svelte uygulamasını derle ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# ---- Aşama 2: Caddy — statik SPA'yı sun + API'yi proxy'le (otomatik HTTPS) ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
