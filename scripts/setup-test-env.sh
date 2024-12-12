#!/bin/bash

# Exit on error
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting test environment setup...${NC}"

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker is not running or not accessible${NC}"
        exit 1
    fi
}

# Function to wait for container to be healthy
wait_for_container() {
    local container_name=$1
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Waiting for $container_name to be ready...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if [ "$(docker ps -q -f name=^/${container_name}$)" ]; then
            local health_status=$(docker inspect -f '{{.State.Health.Status}}' $container_name 2>/dev/null)
            
            if [ "$health_status" = "healthy" ]; then
                echo -e "${GREEN}✓ Container $container_name is healthy!${NC}"
                return 0
            else
                echo -e "${YELLOW}Attempt $attempt/$max_attempts - Container status: $health_status${NC}"
            fi
        else
            echo -e "${RED}Container $container_name is not running!${NC}"
            docker-compose -f test/docker-compose.test.yml logs postgres_test
            exit 1
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done

    echo -e "${RED}Container $container_name failed to become healthy after $max_attempts attempts${NC}"
    docker-compose -f test/docker-compose.test.yml logs postgres_test
    exit 1
}

# Check if Docker is running
check_docker

# Clean up any existing test containers
echo -e "${YELLOW}Cleaning up existing test containers...${NC}"
docker-compose -f test/docker-compose.test.yml down -v

# Start test database
echo -e "${YELLOW}Starting test database container...${NC}"
docker-compose -f test/docker-compose.test.yml up -d

# Wait for container to be healthy
wait_for_container "nestjs_auth_test_db"

# Verify database connection
echo -e "${YELLOW}Verifying database connection...${NC}"
if docker exec nestjs_auth_test_db psql -U postgres_test -d nestjs_auth_test -c '\l' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection verified${NC}"
else
    echo -e "${RED}Failed to connect to database${NC}"
    exit 1
 fi

# Copy test environment file
echo -e "${YELLOW}Setting up test environment variables...${NC}"
cp test/.env.test .env.test

echo -e "${GREEN}✓ Test environment is ready!${NC}"
