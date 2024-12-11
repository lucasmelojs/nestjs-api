#!/bin/bash
set -e

# Function to run SQL files
run_sql_file() {
    local file="$1"
    echo "Running $file..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$file"
    echo "Completed $file"
}

# Wait for PostgreSQL to start
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
    echo "Waiting for PostgreSQL to start..."
    sleep 2
done

echo "PostgreSQL started, running initialization scripts..."

# Create extensions first (these need superuser privileges)
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOSQL

# Run initialization scripts in order
for file in /docker-entrypoint-initdb.d/init-scripts/*.sql; do
    run_sql_file "$file"
done

echo "Database initialization completed."
