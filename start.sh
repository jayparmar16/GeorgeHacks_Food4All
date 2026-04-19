#!/bin/bash
# Resilient Food Systems — Local Start Script
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Resilient Food Systems — Local Start   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Backend setup ─────────────────────────────────────────────────────────
echo "→ Setting up Python backend…"
cd "$BACKEND"

if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
  echo "MONGODB_URI=mongodb://localhost:27017/resilient_food" >> .env
  echo "JWT_SECRET=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" >> .env
  echo "  Created .env with local defaults"
fi

if [ ! -d .venv ]; then
  echo "  Creating Python venv (this takes ~60s first time)…"
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
  echo "  Python deps installed"
fi

echo "→ Starting FastAPI backend on port 8000…"
.venv/bin/uvicorn main:app --reload --port 8000 --host 0.0.0.0 &
BACKEND_PID=$!

# Wait for backend
for i in $(seq 1 10); do
  sleep 1
  if curl -s http://localhost:8000/ >/dev/null 2>&1; then break; fi
done

echo "  Seeding demo data…"
curl -s -X POST http://localhost:8000/api/admin/seed-demo >/dev/null && echo "  Demo data ready" || true

# ── Frontend setup ─────────────────────────────────────────────────────────
echo ""
echo "→ Starting React frontend on port 5173…"
cd "$FRONTEND"

if [ ! -d node_modules ]; then
  echo "  Installing npm deps…"
  npm install --silent
fi

npm run dev &
FRONTEND_PID=$!

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  ✓ App:    http://localhost:5173          ║"
echo "  ║  ✓ API:    http://localhost:8000/docs     ║"
echo "  ╠══════════════════════════════════════════╣"
echo "  ║  Note: Using mongomock (in-memory DB)    ║"
echo "  ║  Set MONGODB_URI in backend/.env for     ║"
echo "  ║  persistent storage (MongoDB Atlas free) ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

trap "echo 'Stopping…'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
