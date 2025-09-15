#!/bin/bash

# Production deployment script
# This script helps deploy the application in production mode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying Chattt Production Environment${NC}"

# Check if .env file exists and has production settings
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found. Please create one from .env.example${NC}"
    exit 1
fi

# Set production environment variables
export NODE_ENV=production
export BUILD_TARGET=production

# Build production images
echo -e "${GREEN}🔨 Building production images...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

# Start production environment
echo -e "${GREEN}🚀 Starting production services...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Run migrations (only if needed)
echo -e "${GREEN}📊 Running database migrations...${NC}"
docker-compose -f docker-compose.yml -f docker-compose.prod.yml run --rm migrations

echo -e "${GREEN}🎉 Production environment is ready!${NC}"
echo
echo -e "${GREEN}📱 Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 API:${NC} http://localhost:4000"
echo
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart [service]"
echo "  docker-compose -f docker-compose.yml -f docker-compose.prod.yml down"