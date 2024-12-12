#!/bin/bash

# Exit on error
set -e

# Change to the test directory
cd "$(dirname "$0")/../test"

# Start test database
docker-compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "Waiting for test database to be ready..."
sleep 10

# Copy test environment file
cp .env.test ../.env.test

# Run e2e tests
cd ..
NODE_ENV=test npm run test:e2e

# Cleanup
docker-compose -f test/docker-compose.test.yml down
rm .env.test