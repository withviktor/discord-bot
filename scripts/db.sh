#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Load .env
if [ ! -f .env ]; then
  echo "Error: .env file not found. Copy .env.example and fill in your values."
  exit 1
fi

set -a
# shellcheck source=../.env
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set in .env"
  exit 1
fi

# Parse DATABASE_URL: postgresql://user:password@host:port/dbname
POSTGRES_USER=$(echo "$DATABASE_URL" | sed -E 's|^[^:]+://([^:]+):.*|\1|')
POSTGRES_PASSWORD=$(echo "$DATABASE_URL" | sed -E 's|^[^:]+://[^:]+:([^@]+)@.*|\1|')
POSTGRES_HOST=$(echo "$DATABASE_URL" | sed -E 's|^[^:]+://[^@]+@([^:/]+).*|\1|')
POSTGRES_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+)/.*|\1|')
POSTGRES_DB=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+)(\?.*)?$|\1|')

export POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_PORT

echo "Starting PostgreSQL..."
echo "  Host:     $POSTGRES_HOST:$POSTGRES_PORT"
echo "  Database: $POSTGRES_DB"
echo "  User:     $POSTGRES_USER"
echo ""

docker compose up -d postgres

echo "Waiting for database to be ready..."
until docker compose exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do
  sleep 1
done

echo "Database is ready."
