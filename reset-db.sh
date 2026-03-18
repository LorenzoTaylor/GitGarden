#!/usr/bin/env bash
set -e

DB_URL="${DATABASE_URL:-postgresql://lorenzotaylor:dev@localhost:5432/gitgarden}"

# Parse db name from URL (last path segment)
DB_NAME="${DB_URL##*/}"
DB_BASE="${DB_URL%/*}"  # everything before the db name

echo "Resetting database: $DB_NAME"

psql "$DB_BASE/postgres" -c "DROP DATABASE IF EXISTS $DB_NAME;"
psql "$DB_BASE/postgres" -c "CREATE DATABASE $DB_NAME;"

echo "Running migrations via cargo..."
cd "$(dirname "$0")/gitgarden-server"
cargo sqlx migrate run --source src/migrations/migrations

echo "Done. Database '$DB_NAME' is clean and migrated."
