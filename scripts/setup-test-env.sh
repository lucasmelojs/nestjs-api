#!/bin/bash

# Exit on error
set -e

# Function to wait for container to be healthy
wait_for_healthy() {
  local container_name=$1
  local max_attempts=30
  local attempt=1

  echo "Waiting for $container_name to be healthy..."
  while [ $attempt -le $max_attempts ]; do
    if [ "$(docker inspect -f {{.State.Health.Status}} $container_name)" == "healthy" ]; then
      echo "$container_name is healthy!"
      return 0
    fi
    echo "Attempt $attempt/$max_attempts - $container_name not ready yet..."
    attempt=$((attempt + 1))
    sleep 2
  done

  echo "$container_name failed to become healthy after $max_attempts attempts"
  return 1
}

# Stop and remove existing test containers
docker-compose -f test/docker-compose.test.yml down -v

# Start test database
docker-compose -f test/docker-compose.test.yml up -d

# Wait for container to be healthy
wait_for_healthy nestjs_auth_test_db

# Copy test environment file
cp test/.env.test .env.test

echo "Test environment is ready!"