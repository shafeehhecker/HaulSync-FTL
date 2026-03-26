# Troubleshooting Guide

## "Login failed. Please check your credentials."

This error has four distinct causes. The error message now tells you which one it is:

---

### 1. "Cannot reach the server" — Backend not running

The frontend can't connect to the API at all.

**If using Docker:**
```bash
# Start everything
docker compose up -d

# Check all three containers are running
docker compose ps

# Should show: db (healthy), backend (running), frontend (running)
# If backend shows "Exit 1", check its logs:
docker compose logs backend
```

**If running manually:**
```bash
# Terminal 1 — start PostgreSQL (must be running first)
# Terminal 2 — start backend
cd backend
cp .env.example .env    # if you haven't already
npm install
npx prisma migrate deploy
node prisma/seed.js
npm run dev             # should print: HaulSync TOS FTL API → http://localhost:5001

# Terminal 3 — start frontend
cd frontend
npm run dev             # should print: Local: http://localhost:5174
```

---

### 2. "Invalid email or password" — Wrong credentials or DB not seeded

The backend is running but the user doesn't exist in the database.

**Fix — re-run the seed:**
```bash
# Docker:
docker compose exec backend node prisma/seed.js

# Manual:
cd backend && node prisma/seed.js
```

**Demo credentials (case-sensitive):**

| Email | Password | Role |
|-------|----------|------|
| `admin@haulsync.local` | `Admin@1234` | SUPER_ADMIN |
| `manager@haulsync.local` | `Mgr@1234` | MANAGER |
| `finance@haulsync.local` | `Finance@1234` | FINANCE |
| `transporter@haulsync.local` | `Trans@1234` | TRANSPORTER |

---

### 3. "Server error" — Missing environment variables

`JWT_SECRET` is not set, or the database connection is broken.

**Fix — check your `.env` file:**
```bash
# In the backend directory:
cat .env

# Must have at minimum:
# DATABASE_URL="postgresql://haulsync:haulsync_secret@localhost:5432/haulsync_ftl"
# JWT_SECRET=any_random_string_at_least_32_chars_long
```

**Common JWT_SECRET mistake:**
```bash
# WRONG — too short, Prisma will throw:
JWT_SECRET=secret

# RIGHT — at least 32 characters:
JWT_SECRET=haulsync_ftl_super_secret_key_2025
```

**Docker DATABASE_URL gotcha:**
Inside Docker, the DB hostname is `db` (the service name), not `localhost`:
```env
# WRONG for Docker:
DATABASE_URL="postgresql://haulsync:haulsync_secret@localhost:5432/haulsync_ftl"

# RIGHT for Docker — use 'db':
DATABASE_URL="postgresql://haulsync:haulsync_secret@db:5432/haulsync_ftl"
```
The `docker-compose.yml` sets this automatically — only matters if you're running the backend container standalone.

---

### 4. CORS error — Frontend on wrong port

If the browser console shows a **CORS** error (not the red login message), the frontend is running on a port the backend doesn't allow.

**Backend allows these origins by default:**
- `http://localhost:5174` (Vite dev server)
- `http://localhost:3001` (Docker Nginx)

**If your frontend is on a different port**, set `FRONTEND_URL` in `backend/.env`:
```env
# Example: Vite chose port 5175 because 5174 was in use
FRONTEND_URL=http://localhost:5175,http://localhost:3001
```
Then restart the backend.

---

## Docker: full reset (nuclear option)

If things are badly broken:
```bash
# Stop everything and wipe volumes
docker compose down -v

# Rebuild from scratch
docker compose up -d --build

# Watch the logs as it migrates and seeds
docker compose logs -f backend
```

---

## Check if the backend API is working

Open your browser or run curl:
```bash
curl http://localhost:5001/health
# Should return: {"status":"ok","service":"HaulSync TOS FTL API","version":"1.0.0"}

curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@haulsync.local","password":"Admin@1234"}'
# Should return: {"token":"eyJ...","user":{...}}
```

If the health check fails, the backend process isn't running.
If the health check works but login fails, it's a database or credentials issue.

---

## Manual setup: step-by-step from zero

```bash
# 1. Extract the archive
tar -xzf haulsync-ftl-v1.0.tar.gz
cd haulsync-ftl

# 2. Set up backend
cd backend
cp .env.example .env
# Edit .env — set JWT_SECRET to any 32+ char string
npm install
npx prisma migrate deploy
node prisma/seed.js
npm run dev
# ✓ Should print: HaulSync TOS FTL API → http://localhost:5001

# 3. Set up frontend (new terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
# ✓ Should print: Local: http://localhost:5174

# 4. Open http://localhost:5174 and log in with admin@haulsync.local / Admin@1234
```

---

## Common error messages from `docker compose logs backend`

| Log message | Cause | Fix |
|------------|-------|-----|
| `connect ECONNREFUSED` | DB not ready yet | Wait 10s and restart: `docker compose restart backend` |
| `relation "users" does not exist` | Migration didn't run | `docker compose exec backend npx prisma migrate deploy` |
| `secretOrPrivateKey must have a value` | JWT_SECRET not set | Add `JWT_SECRET=...` to your `.env` |
| `P1001: Can't reach database` | Wrong DATABASE_URL | Use `@db:5432` in Docker, `@localhost:5432` manually |
| `Invalid prisma.user.findUnique()` | Schema mismatch | `docker compose exec backend npx prisma generate` |
