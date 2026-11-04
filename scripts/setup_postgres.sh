#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=================================================="
echo "🚀 TaskNest PostgreSQL Setup & Data Ingestion"
echo "=================================================="

# 1. Check Docker / Colima
if ! docker info > /dev/null 2>&1; then
    echo "⚠️ Docker is not running. Attempting to start Colima..."
    colima start
fi

# 0. Crea .env con una contraseña aleatoria si no existe (el .env no se versiona)
if [ ! -f .env ]; then
    cp .env.example .env
    sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env && rm -f .env.bak
    echo "🔑 Created .env with a random database password"
fi

echo "📦 Starting PostgreSQL container via Docker Compose..."
docker compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec tasknest-postgres pg_isready -U postgres -d tasknest > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL is accepting connections!"

# 2. Run Schema Definition
echo "🔨 Applying Schema (sql/01_schema.sql)..."
docker exec -i tasknest-postgres psql -U postgres -d tasknest -f /sql/01_schema.sql

# 3. Load Data from CSV
echo "📥 Loading CSV Data (sql/02_load_data.sql)..."
docker exec -i tasknest-postgres psql -U postgres -d tasknest -f /sql/02_load_data.sql

# 4. Create Analytical Views
echo "📊 Creating Analytical Views (sql/03_analytical_views.sql)..."
docker exec -i tasknest-postgres psql -U postgres -d tasknest -f /sql/03_analytical_views.sql

echo "=================================================="
echo "🎉 Setup completed successfully!"
echo "Database: tasknest"
echo "Host: localhost | Port: 5432 | User: postgres | Password: see DB_PASSWORD in .env"
echo "=================================================="
