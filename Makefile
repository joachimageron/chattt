.PHONY: help dev dev-build dev-down dev-logs prod prod-build prod-down setup clean health

# Colors for help
YELLOW := \033[33m
GREEN := \033[32m
RESET := \033[0m

# Default target
help: ## Show this help message
	@echo "$(GREEN)Chattt Docker Commands$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(YELLOW)  %-15s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
dev: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(RESET)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file from .env.example"; fi
	docker compose up -d --build

dev-build: ## Build development images
	docker compose build

dev-down: ## Stop development environment
	docker compose down

dev-logs: ## Show development logs
	docker compose logs -f

dev-clean: ## Stop and remove all containers, networks, and volumes
	docker compose down -v --remove-orphans

# Production commands
prod: ## Start production environment
	@echo "$(GREEN)Starting production environment...$(RESET)"
	@if [ ! -f .env ]; then echo "Please create .env file first"; exit 1; fi
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

prod-build: ## Build production images
	docker compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-down: ## Stop production environment
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down

prod-logs: ## Show production logs
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Database commands
migrate: ## Run database migrations
	docker compose run --rm migrations

db-reset: ## Reset database
	docker compose exec api npm run db:reset

db-seed: ## Seed database
	docker compose exec api npm run db:seed

db-shell: ## Access database shell
	docker compose exec database psql -U postgres -d chattt

# Utility commands
setup: ## Initial setup with migrations
	@echo "$(GREEN)Setting up development environment...$(RESET)"
	@./scripts/dev-setup.sh

health: ## Check service health
	@echo "$(GREEN)Checking service health...$(RESET)"
	@docker compose ps
	@echo ""
	@echo "API Health:"
	@curl -f http://localhost:4000/health 2>/dev/null || echo "API not responding"
	@echo ""
	@echo "Frontend Health:"
	@curl -f http://localhost:3000 2>/dev/null || echo "Frontend not responding"

clean: ## Clean up Docker resources
	docker system prune -f
	docker volume prune -f

# Install dependencies
install-api: ## Install API dependencies
	docker compose exec api npm install
	docker compose restart api

install-frontend: ## Install frontend dependencies
	docker compose exec frontend npm install
	docker compose restart frontend

# Testing
test-api: ## Run API tests
	docker compose exec api npm test

test-frontend: ## Run frontend tests
	docker compose exec frontend npm test

# Restart services
restart-api: ## Restart API service
	docker compose restart api

restart-frontend: ## Restart frontend service
	docker compose restart frontend

restart-db: ## Restart database service
	docker compose restart database