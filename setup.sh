#!/bin/bash
# HaulSync TOS FTL — Manual setup script
# Run from the repo root: bash setup.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${YELLOW}▶${NC} $1"; }

echo ""
echo "🚛  HaulSync TOS FTL — Setup"
echo "================================"

# ── Check prerequisites ───────────────────────────────────────────────────────
step "Checking prerequisites"

command -v node >/dev/null 2>&1 || err "Node.js not found. Install from https://nodejs.org (v18+)"
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
[ "$NODE_VER" -ge 18 ] || err "Node.js v18+ required. You have $(node -v)"
log "Node.js $(node -v)"

command -v npm >/dev/null 2>&1 || err "npm not found"
log "npm $(npm -v)"

command -v psql >/dev/null 2>&1 || warn "psql not found — make sure PostgreSQL 15 is running"

# ── Backend setup ─────────────────────────────────────────────────────────────
step "Setting up backend"

cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  # Generate a random JWT_SECRET
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i.bak "s|change_this_to_a_long_random_secret_minimum_32_chars|${JWT_SECRET}|" .env
  rm -f .env.bak
  log "Created backend/.env with random JWT_SECRET"
else
  warn "backend/.env already exists — skipping"
fi

npm install --silent
log "Backend dependencies installed"

echo ""
echo "  Running database migrations..."
npx prisma migrate deploy 2>&1 | tail -3
log "Database migrated"

echo ""
echo "  Seeding database..."
node prisma/seed.js 2>&1 | grep -E "✅|✓|Error" || true
log "Database seeded"

cd ..

# ── Frontend setup ────────────────────────────────────────────────────────────
step "Setting up frontend"

cd frontend

if [ ! -f ".env" ]; then
  cp .env.example .env
  log "Created frontend/.env"
else
  warn "frontend/.env already exists — skipping"
fi

npm install --silent
log "Frontend dependencies installed"

cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "================================"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Start the backend:"
echo "  cd backend && npm run dev"
echo ""
echo "Start the frontend (new terminal):"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:5174"
echo ""
echo "Login with:"
echo "  admin@haulsync.local  /  Admin@1234"
echo ""
