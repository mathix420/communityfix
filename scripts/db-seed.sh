#!/usr/bin/env bash
set -euo pipefail

SEED_DIR="$(dirname "$0")/../server/database/seed"
TARGET="${1:---local}"

if [[ "$TARGET" != "--local" && "$TARGET" != "--remote" ]]; then
  echo "Usage: $0 [--local|--remote]"
  echo "  --local   Seed the local D1 database (default)"
  echo "  --remote  Seed the remote D1 database"
  exit 1
fi

for f in "$SEED_DIR"/*.sql; do
  echo "Applying $(basename "$f") ($TARGET)..."
  wrangler d1 execute DB "$TARGET" --file="$f"
done

echo "Seed complete."
