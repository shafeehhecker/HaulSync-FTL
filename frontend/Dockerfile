# ── Build stage ───────────────────────────────────────────────────────────────
# Full install (NOT --only=production): vite, tailwind, postcss, autoprefixer and
# @vitejs/plugin-react are devDependencies and are required to build the site.
FROM node:18-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build          # outputs static assets to /app/dist

# ── Serve stage ───────────────────────────────────────────────────────────────
# Static files served by nginx; nginx also proxies /api + /uploads to the backend.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
