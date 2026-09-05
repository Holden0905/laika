#!/usr/bin/env bash
#
# Laika deploy — runs on Defiant, against the deploy clone at /volume1/docker/laika.
#
# The host clone is a deploy artifact, not a working copy: edit on the
# workstation, push, then run this here. A rebuild is required for EVERY change,
# not just env changes, because NEXT_PUBLIC_* bakes in at build time.
#
#   ./deploy.sh              # pull, build, restart, health check
#   ./deploy.sh --dry-run    # print the commands without running them
#   ./deploy.sh --skip-pull  # rebuild what's already checked out
#
# The anon key is never stored in this file. It is resolved, in order, from:
#   1. $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the environment
#   2. .env.deploy   next to this script  (gitignored by the .env* rule)
#   3. .env.local    next to this script  (gitignored; what dev machines use)
#   4. ANON_KEY in Rio's own .env — the canonical source on Defiant
#
# The Supabase URL follows the same order and defaults to the Tailscale address,
# which resolves from home and away. A LAN-IP build works only at home.
#
# Rio's SERVICE role key must never be used here: it bypasses all RLS, and a
# build arg ends up in the client bundle.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Config — override any of these from the environment ────────────────────
APP_DIR="${APP_DIR:-$SCRIPT_DIR}"
DEFAULT_SUPABASE_URL="http://100.106.137.96:8000"   # Tailscale — resolves from home and away
ENV_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"    # an explicit env var always wins
RIO_ENV="${RIO_ENV:-/volume1/docker/supabase/supabase/docker/.env}"
IMAGE="${IMAGE:-laika}"
CONTAINER="${CONTAINER:-laika}"
PORT="${PORT:-3000}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-60}"

DRY_RUN=0
SKIP_PULL=0

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--dry-run)   DRY_RUN=1 ;;
    --skip-pull)    SKIP_PULL=1 ;;
    -h|--help)      awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)              echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

# Docker and the deploy clone are root-owned on Defiant. Skip sudo if we already are.
if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
info() { printf '   %s\n' "$*"; }
die()  { printf '\n\033[31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

# Echo then execute — with --dry-run, echo only.
run() {
  printf '   $ %s\n' "$*"
  [ "$DRY_RUN" -eq 1 ] && return 0
  "$@"
}

# ─── Resolve the anon key ───────────────────────────────────────────────────
KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"
KEY_SOURCE="environment"
FILE_SUPABASE_URL=""

# Source a KEY=value env file in a subshell and lift out the two settings we
# care about, so .env.deploy can carry the whole config, not just the key.
load_from_env_file() {
  local file="$1" pair
  [ -f "$file" ] || return 1
  # shellcheck disable=SC1090
  pair="$(set -a; . "$file" >/dev/null 2>&1; printf '%s\n%s' \
    "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}" "${NEXT_PUBLIC_SUPABASE_URL:-}")"
  local value="${pair%%$'\n'*}"
  local url="${pair#*$'\n'}"
  [ -n "$value" ] || return 1
  KEY="$value"
  KEY_SOURCE="$file"
  [ -n "$url" ] && FILE_SUPABASE_URL="$url"
  return 0
}

if [ -z "$KEY" ]; then load_from_env_file "$APP_DIR/.env.deploy" || true; fi
if [ -z "$KEY" ]; then load_from_env_file "$APP_DIR/.env.local"  || true; fi
if [ -z "$KEY" ] && [ -r "$RIO_ENV" ]; then
  KEY="$(grep -m1 '^ANON_KEY=' "$RIO_ENV" | cut -d= -f2- | tr -d '"'"'"'')"
  KEY_SOURCE="$RIO_ENV"
fi
if [ -z "$KEY" ] && [ -e "$RIO_ENV" ]; then
  # Rio's .env is root-readable only; retry through sudo before giving up.
  KEY="$($SUDO grep -m1 '^ANON_KEY=' "$RIO_ENV" | cut -d= -f2- | tr -d '"'"'"'')"
  KEY_SOURCE="$RIO_ENV (sudo)"
fi

[ -n "$KEY" ] || die "No anon key found. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, create $APP_DIR/.env.deploy, or make $RIO_ENV readable."

case "$KEY" in
  *SERVICE_ROLE*|*service_role*)
    die "That looks like a service role key. It bypasses RLS and must never be built into the client bundle." ;;
esac

SUPABASE_URL="${ENV_SUPABASE_URL:-${FILE_SUPABASE_URL:-$DEFAULT_SUPABASE_URL}}"
MASKED="${KEY:0:6}…${KEY: -4}"

say "Laika deploy"
info "dir        $APP_DIR"
info "supabase   $SUPABASE_URL"
info "anon key   $MASKED  (from $KEY_SOURCE)"
info "image      $IMAGE   container $CONTAINER   port $PORT"
[ "$DRY_RUN" -eq 1 ] && info "MODE       dry run — nothing will be executed"

[ -f "$APP_DIR/package.json" ] || die "$APP_DIR does not look like the Laika repo (no package.json)."
if [ "$DRY_RUN" -eq 0 ] && ! command -v docker >/dev/null 2>&1; then
  die "docker not found on PATH. This script is meant to run on Defiant."
fi
cd "$APP_DIR"

# ─── Pull ───────────────────────────────────────────────────────────────────
if [ "$SKIP_PULL" -eq 0 ]; then
  say "Pulling latest from origin"
  run $SUDO git pull
else
  say "Skipping pull (--skip-pull)"
fi
if [ "$DRY_RUN" -eq 0 ]; then
  info "at $(git log --oneline -1)"
fi

# ─── Build ──────────────────────────────────────────────────────────────────
# Build BEFORE stopping anything: a failed build leaves the running container
# untouched. The previous image is retagged first so a bad deploy can roll back.
say "Building image"
if [ "$DRY_RUN" -eq 0 ] && $SUDO docker image inspect "$IMAGE:latest" >/dev/null 2>&1; then
  run $SUDO docker tag "$IMAGE:latest" "$IMAGE:previous"
  info "previous image kept as $IMAGE:previous"
fi

printf '   $ %s\n' "$SUDO docker build -t $IMAGE --build-arg NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$MASKED ."
if [ "$DRY_RUN" -eq 0 ]; then
  $SUDO docker build -t "$IMAGE" \
    --build-arg "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" \
    --build-arg "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$KEY" \
    . || die "Build failed. The running container was not touched."
fi

# ─── Swap ───────────────────────────────────────────────────────────────────
say "Restarting container"
if [ "$DRY_RUN" -eq 0 ]; then
  # Tolerate a missing container — first deploy, or one already removed.
  $SUDO docker stop "$CONTAINER" >/dev/null 2>&1 && info "stopped $CONTAINER" || info "no running $CONTAINER to stop"
  $SUDO docker rm "$CONTAINER"   >/dev/null 2>&1 && info "removed $CONTAINER" || info "no $CONTAINER to remove"
else
  printf '   $ %s\n' "$SUDO docker stop $CONTAINER && $SUDO docker rm $CONTAINER"
fi

run $SUDO docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "$PORT:3000" \
  "$IMAGE"

# ─── Health check ───────────────────────────────────────────────────────────
if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run complete"
  exit 0
fi

say "Waiting for health check"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
# /login is the one public route — anything else redirects and tells us less.
until curl -fsS -o /dev/null "http://localhost:$PORT/login"; do
  if [ "$(date +%s)" -ge "$deadline" ]; then
    printf '\n'
    $SUDO docker logs --tail 40 "$CONTAINER" || true
    die "Container did not come up within ${HEALTH_TIMEOUT}s. Roll back with: $SUDO docker tag $IMAGE:previous $IMAGE:latest && $0 --skip-pull"
  fi
  sleep 2
done

say "Deployed"
info "$($SUDO docker ps --filter "name=^${CONTAINER}$" --format '{{.Names}}  {{.Status}}  {{.Ports}}')"
info "LAN        http://192.168.4.184:$PORT"
info "Tailscale  http://100.106.137.96:$PORT"
