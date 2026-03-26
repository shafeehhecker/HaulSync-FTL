# Deployment Guide

## Docker (Recommended)

### One-command start

```bash
cp .env.example .env   # fill in JWT_SECRET at minimum
docker compose up -d
```

The backend container runs `prisma migrate deploy` (using the committed migration), seeds the database, then starts the API — all automatically on first boot. Re-running `docker compose up` on subsequent starts is safe; seed uses upsert so it is idempotent.

**Services started:**

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostgreSQL 15 |
| `backend` | 5001 | Express API + Socket.io |
| `frontend` | 3001 | React SPA via Nginx |

### Environment variables (root `.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_USER` | No | `haulsync` | Postgres username |
| `DB_PASSWORD` | **Yes** | — | Postgres password |
| `DB_NAME` | No | `haulsync_ftl` | Database name |
| `JWT_SECRET` | **Yes** | — | Min 32 chars |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime |
| `VITE_API_URL` | No | `http://localhost:5001` | API URL baked into frontend build |
| `FRONTEND_URL` | No | `http://localhost:3001` | CORS allowed origin |
| `GPS_PROVIDER` | No | `mock` | GPS provider key |
| `GPS_API_KEY` | No | — | GPS provider API key |
| `EWAY_CLIENT_ID` | No | — | NIC e-way bill client ID |
| `EWAY_CLIENT_SECRET` | No | — | NIC e-way bill secret |
| `EWAY_GSTIN` | No | — | Your GSTIN for e-way bill |
| `HAULSYNC_CORE_URL` | No | — | Core instance URL (integrated mode) |
| `HAULSYNC_CORE_API_KEY` | No | — | Core API key (integrated mode) |

### Re-seed after wipe

```bash
docker compose exec backend npx prisma migrate reset --force
docker compose exec backend node prisma/seed.js
```

### View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Manual / VM Deployment

### Requirements

- Node.js 18+
- PostgreSQL 15+
- A reverse proxy (Nginx recommended) to serve frontend and proxy `/api`

### Backend

```bash
cd backend
npm ci --only=production
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js
node server.js
```

Use a process manager for production:

```bash
npm install -g pm2
pm2 start server.js --name haulsync-ftl-api
pm2 save && pm2 startup
```

### Frontend

```bash
cd frontend
npm ci
VITE_API_URL=https://api.yourdomain.com npm run build
# serve dist/ with Nginx or any static host
```

### Nginx config (example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    root /var/www/haulsync-ftl/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }

    # API proxy
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

---

## Production Checklist

- [ ] `JWT_SECRET` is at least 32 random characters
- [ ] `DB_PASSWORD` is strong and not the default
- [ ] `NODE_ENV=production` is set
- [ ] `FRONTEND_URL` matches your actual domain (CORS)
- [ ] `uploads/pods/` directory is on a persistent volume
- [ ] Regular PostgreSQL backups are configured
- [ ] SSL/TLS termination is handled at the proxy layer
- [ ] Default seed credentials are changed or users are deactivated
