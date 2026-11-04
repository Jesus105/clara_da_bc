#!/usr/bin/env bash
# Arranca el MCP de PostgreSQL leyendo la contraseña del .env (que no se versiona).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
set -a; [ -f "$ROOT/.env" ] && . "$ROOT/.env"; set +a
: "${DB_PASSWORD:?Falta .env: corre ./scripts/setup_postgres.sh primero}"
exec npx -y @modelcontextprotocol/server-postgres \
  "postgresql://${DB_USER:-postgres}:${DB_PASSWORD}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-tasknest}"
