.PHONY: help dev prod up down logs restart clean init-db seed build

help: ## Show this help message
	@echo "YDM CDP & CRM Platform - Docker Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

dev: ## Start in development mode
	docker-compose -f docker-compose.dev.yml up --build

dev-d: ## Start in development mode (detached)
	docker-compose -f docker-compose.dev.yml up -d --build

prod: ## Start in production mode
	docker-compose up -d --build

up: dev ## Alias for dev

down: ## Stop all services
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

down-v: ## Stop and remove volumes
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v

logs: ## View logs
	docker-compose logs -f

logs-dev: ## View development logs
	docker-compose -f docker-compose.dev.yml logs -f

restart: ## Restart all services
	docker-compose restart

clean: ## Remove all containers and volumes
	docker-compose down -v --rmi all
	docker-compose -f docker-compose.dev.yml down -v --rmi all

init-db: ## Initialize database (migrations + seed)
	@bash docker-init.sh

seed: ## Seed database only
	docker-compose exec api npm run db:seed || \
	docker-compose -f docker-compose.dev.yml exec api npm run db:seed

build: ## Build all images
	docker-compose build
	docker-compose -f docker-compose.dev.yml build

prisma-studio: ## Open Prisma Studio (runs as service on port 5555)
	@echo "Prisma Studio is available at http://localhost:5555"
	@echo "Starting Prisma Studio service..."
	docker-compose -f docker-compose.dev.yml up -d prisma-studio || true
	@echo "✅ Prisma Studio started! Open http://localhost:5555 in your browser"

ps: ## Show running containers
	docker-compose ps
	docker-compose -f docker-compose.dev.yml ps

clear-ports: ## Kill processes using ports 3000, 3001, 3002, 5432, 5555
	@echo "Clearing ports 3000, 3001, 3002, 5432, 5555..."
	@lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || echo "Port 3000: cleared"
	@lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || echo "Port 3001: cleared"
	@lsof -ti:3002 2>/dev/null | xargs kill -9 2>/dev/null || echo "Port 3002: cleared"
	@lsof -ti:5432 2>/dev/null | xargs kill -9 2>/dev/null || echo "Port 5432: cleared"
	@lsof -ti:5555 2>/dev/null | xargs kill -9 2>/dev/null || echo "Port 5555: cleared"
	@echo "✅ Ports cleared!"

check-ports: ## Check which ports are in use
	@echo "Checking ports..."
	@lsof -i:3000 -i:3001 -i:3002 -i:5432 -i:5555 2>/dev/null || echo "No processes found on these ports"
