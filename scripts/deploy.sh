#!/bin/bash
# OrcaBot Deploy Script
# Usage:
#   ./scripts/deploy.sh              # deploy tudo (frontend + backend + migrations)
#   ./scripts/deploy.sh frontend     # só frontend (Vercel)
#   ./scripts/deploy.sh backend      # só backend (W5)
#   ./scripts/deploy.sh migrations   # só migrations (Supabase)
#   ./scripts/deploy.sh commit "msg" # commit + push + deploy tudo

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
W5_USER="orcabot"
W5_HOST="100.66.83.22"
VERCEL_SCOPE="andre-fogelmans-projects"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[orcabot]${NC} $1"; }
ok() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err() { echo -e "${RED}❌ $1${NC}"; exit 1; }

deploy_migrations() {
  log "Pushing migrations to Supabase..."
  cd "$REPO_DIR"
  echo "Y" | supabase db push 2>&1 | tail -3
  ok "Migrations applied"
}

deploy_frontend() {
  log "Building frontend..."
  cd "$REPO_DIR/frontend"
  bun run build || err "Frontend build failed"

  log "Deploying to Vercel..."
  npx vercel --prod --scope "$VERCEL_SCOPE" --yes 2>&1 | grep -E "Production:|READY" | head -2
  ok "Frontend deployed"
}

deploy_backend() {
  log "Syncing to W5 ($W5_HOST)..."
  rsync -avz --quiet \
    --exclude node_modules \
    --exclude .git \
    --exclude dist \
    --exclude frontend/node_modules \
    --exclude frontend/dist \
    --exclude frontend/.vercel \
    "$REPO_DIR/" "$W5_USER@$W5_HOST:~/orcabot/"

  log "Building and restarting on W5..."
  ssh "$W5_USER@$W5_HOST" 'export PATH="$HOME/.local/share/fnm/aliases/default/bin:$HOME/.local/bin:$PATH" && cd ~/orcabot && npm install --silent 2>&1 | tail -1 && rm -rf dist && npx tsc 2>&1 | tail -2 && systemctl --user restart orcabot && sleep 3 && systemctl --user is-active orcabot'

  # Build dwg-pipeline Docker image on W5
  log "Building dwg-pipeline Docker image on W5..."
  ssh "$W5_USER@$W5_HOST" 'cd ~/orcabot && docker build -f container/Dockerfile.dwg-pipeline -t orcabot-dwg-pipeline:latest ./container 2>&1 | tail -5' \
    && ok "dwg-pipeline image built" \
    || warn "dwg-pipeline image build failed (DXF processing will not work)"

  # Verify endpoints
  local health=$(ssh "$W5_USER@$W5_HOST" 'curl -s localhost:8300/api/health 2>/dev/null' || echo "")
  if echo "$health" | grep -q '"ok"'; then
    ok "Backend deployed and healthy"
  else
    warn "Backend deployed but health check failed"
  fi
}

do_commit() {
  local msg="${1:-update}"
  log "Committing: $msg"
  cd "$REPO_DIR"
  git add -A
  git commit -m "$msg" || warn "Nothing to commit"
  git push origin-fork main 2>&1 | tail -2
  ok "Pushed to GitHub"
}

# Main
case "${1:-all}" in
  frontend|f)
    deploy_frontend
    ;;
  backend|b)
    deploy_backend
    ;;
  migrations|m|migrate)
    deploy_migrations
    ;;
  commit|c)
    do_commit "${2:-chore: update}"
    deploy_migrations
    deploy_frontend
    deploy_backend
    ;;
  all|"")
    deploy_migrations
    deploy_frontend
    deploy_backend
    ;;
  *)
    echo "Usage: $0 [frontend|backend|migrations|commit \"msg\"|all]"
    exit 1
    ;;
esac

echo ""
ok "Deploy complete!"
