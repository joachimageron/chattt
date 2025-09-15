#!/bin/bash

# Docker Compose development setup script
# This script helps you get started with the development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Chattt Development Environment${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from .env.example${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created. Please review and update the values if needed.${NC}"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Build and start the development environment
echo -e "${GREEN}🔨 Building and starting services...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Run migrations and seeds
echo -e "${GREEN}📊 Setting up database...${NC}"
docker-compose run --rm migrations

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo
echo -e "${GREEN}📱 Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 API:${NC} http://localhost:4000"
echo -e "${GREEN}📧 Mailhog UI:${NC} http://localhost:8025"
echo -e "${GREEN}🗄️ Database:${NC} postgres://postgres:postgres@localhost:5432/chattt"
echo
echo -e "${YELLOW}💡 Useful commands:${NC}"
echo "  docker-compose logs -f [service]  # View logs"
echo "  docker-compose restart [service] # Restart a service"
echo "  docker-compose down              # Stop all services"
echo "  docker-compose down -v          # Stop and remove volumes"