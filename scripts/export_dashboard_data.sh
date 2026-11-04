#!/usr/bin/env bash
# Exporta la tabla user-level del dashboard desde el Postgres local (contenedor tasknest-postgres).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/app/public/data/users.json"
mkdir -p "$(dirname "$OUT")"
docker exec -i tasknest-postgres psql -U "${DB_USER:-postgres}" -d "${DB_NAME:-tasknest}" -At -q \
  < "$ROOT/sql/04_dashboard_export.sql" > "$OUT"
echo "OK -> $OUT ($(wc -c < "$OUT") bytes)"
