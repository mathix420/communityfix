# CommunityFix — local dev environment (https://just.systems)
#
# Spins up the local Docker Postgres (postgis + pgvector), applies the LATEST
# migrations (drizzle + custom, including the `revisions` table), and runs the
# Nuxt dev server — WITHOUT Doppler, so it works even where the Doppler token
# can't reach the `communityfix` project.
#
# Quick start:
#   just setup     # Postgres up + latest migrations applied
#   just dev       # run the dev server  → http://localhost:3000
#   just up        # setup + dev in one go
#
# The project's canonical flow uses Doppler (`bun run db:migrate`, `bun run dev`).
# If your Doppler IS configured, those still work; this Justfile is the
# Doppler-free path used for local review.
#
# Override any value inline, e.g.:
#   just db_url='postgres://user:pass@host:5432/db' migrate
#   just admin_emails='me@example.com' dev

set shell := ["bash", "-c"]

# --- Config (env var wins, then these defaults) ---
db_url           := env_var_or_default("NUXT_DATABASE_URL", "postgres://communityfix:communityfix@localhost:5432/communityfix")
session_password := env_var_or_default("NUXT_SESSION_PASSWORD", "dev-local-review-session-password-0123456789abcdef")
admin_emails     := env_var_or_default("NUXT_ADMIN_EMAILS", "communityfix@mathix.dev")
email_from       := env_var_or_default("NUXT_EMAIL_FROM", "CommunityFix <noreply@communityfix.org>")

# List available recipes (default).
default:
    @just --list

# Full local setup: Postgres up + latest migrations applied.
setup: db-up migrate
    @echo "✅ Dev env ready — latest migrations applied. Run 'just dev' (login via /login with {{admin_emails}}; the PIN prints to this terminal)."

# Setup, then run the dev server.
up: setup dev

# Ensure Postgres is reachable on :5432 — reuse an existing instance (e.g. the
# main checkout's container) or start this project's docker-compose service.
db-up:
    #!/usr/bin/env bash
    set -euo pipefail
    if (exec 3<>/dev/tcp/localhost/5432) 2>/dev/null; then
      echo "ℹ Postgres already listening on :5432 — reusing it (not starting docker-compose)."
    else
      echo "▶ Starting Docker Postgres (postgis + pgvector)…"
      docker compose up -d
    fi
    printf "⏳ Waiting for Postgres"
    for i in $(seq 1 60); do
      if psql "{{db_url}}" -tAc 'select 1' >/dev/null 2>&1; then echo " ✔ ready"; exit 0; fi
      printf "."; sleep 1
    done
    echo " ✖ timed out waiting for Postgres" >&2; exit 1

# Apply drizzle + custom migrations (extensions, CHECKs, indexes, revisions).
migrate:
    @echo "▶ Applying migrations to {{db_url}}"
    NUXT_DATABASE_URL="{{db_url}}" bun run server/database/migrate.ts

# Generate a new drizzle migration from schema changes (no Doppler).
generate:
    NUXT_DATABASE_URL="{{db_url}}" bunx drizzle-kit generate

# Seed the database (numbered SQL files, in order). Safe to skip if already seeded.
seed:
    #!/usr/bin/env bash
    set -uo pipefail
    for f in server/database/seed/*.sql; do
      echo "▶ seeding $(basename "$f")"
      psql "{{db_url}}" -f "$f"
    done

# Run the Nuxt dev server with inline env (bypasses Doppler) → http://localhost:3000
dev:
    #!/usr/bin/env bash
    NUXT_DATABASE_URL="{{db_url}}" \
    NUXT_SESSION_PASSWORD="{{session_password}}" \
    NUXT_ADMIN_EMAILS="{{admin_emails}}" \
    NUXT_EMAIL_FROM="{{email_from}}" \
    exec bunx nuxt dev

# --- Quality / inspection ---

# Typecheck the app and the moderation worker.
typecheck:
    bunx vue-tsc --noEmit
    bunx tsc --noEmit -p workers/moderation/tsconfig.json

# Run the unit test suite (no DB required).
test:
    SKIP_DB_SETUP=1 bunx vitest run tests/unit

# Open Drizzle Studio against the local DB.
studio:
    NUXT_DATABASE_URL="{{db_url}}" bunx drizzle-kit studio

# Open a psql shell on the local DB.
psql:
    psql "{{db_url}}"

# Show the `revisions` table definition (verify the migration landed).
show-revisions:
    psql "{{db_url}}" -c "\d revisions"

# --- Lifecycle ---

# Stop this project's Postgres container (keeps data volume).
down:
    docker compose down

# DESTRUCTIVE: drop the data volume, recreate Postgres, re-migrate, re-seed.
reset:
    docker compose down -v
    just setup
    just seed
