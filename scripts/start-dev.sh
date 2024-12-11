#!/bin/bash

# Start development environment with Docker
docker-compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run database initialization script
npm run db:check