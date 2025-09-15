#!/bin/bash

# Validation script for Docker Compose setup
# This script validates that all configurations are correct

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Validating Docker Compose Setup${NC}"

# Check if required files exist
echo -e "${YELLOW}📁 Checking required files...${NC}"

required_files=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    ".env.example"
    "api/Dockerfile"
    "front/Dockerfile"
    "scripts/dev-setup.sh"
    "scripts/prod-deploy.sh"
    "Makefile"
    "DOCKER.md"
    "README.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ✅ $file"
    else
        echo -e "  ❌ $file ${RED}(missing)${NC}"
        exit 1
    fi
done

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env from .env.example${NC}"
    cp .env.example .env
fi

# Validate Docker Compose configuration
echo -e "${YELLOW}🔧 Validating Docker Compose configuration...${NC}"
if docker compose config > /dev/null 2>&1; then
    echo -e "  ✅ docker-compose.yml is valid"
else
    echo -e "  ❌ docker-compose.yml has errors"
    exit 1
fi

# Validate production configuration
echo -e "${YELLOW}🏭 Validating production configuration...${NC}"
if docker compose -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "  ✅ Production configuration is valid"
else
    echo -e "  ❌ Production configuration has errors"
    exit 1
fi

# Check script permissions
echo -e "${YELLOW}🔐 Checking script permissions...${NC}"
scripts=(
    "scripts/dev-setup.sh"
    "scripts/prod-deploy.sh"
)

for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo -e "  ✅ $script is executable"
    else
        echo -e "  ⚠️  $script is not executable, fixing..."
        chmod +x "$script"
        echo -e "  ✅ $script is now executable"
    fi
done

# Check if Docker is available
echo -e "${YELLOW}🐳 Checking Docker availability...${NC}"
if command -v docker > /dev/null 2>&1; then
    echo -e "  ✅ Docker is installed"
    if docker info > /dev/null 2>&1; then
        echo -e "  ✅ Docker daemon is running"
    else
        echo -e "  ⚠️  Docker daemon is not running"
    fi
else
    echo -e "  ❌ Docker is not installed"
fi

# Check if Docker Compose is available
if docker compose version > /dev/null 2>&1; then
    echo -e "  ✅ Docker Compose is available"
else
    echo -e "  ❌ Docker Compose is not available"
fi

echo
echo -e "${GREEN}🎉 Validation complete!${NC}"
echo
echo -e "${GREEN}📋 Next steps:${NC}"
echo -e "  1. Review and update .env file with your settings"
echo -e "  2. Run ${YELLOW}make setup${NC} or ${YELLOW}./scripts/dev-setup.sh${NC} to start development"
echo -e "  3. Access the application at http://localhost:3000"
echo
echo -e "${GREEN}📖 Documentation:${NC}"
echo -e "  • Quick start: ${YELLOW}README.md${NC}"
echo -e "  • Detailed setup: ${YELLOW}DOCKER.md${NC}"
echo -e "  • Available commands: ${YELLOW}make help${NC}"