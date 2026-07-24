.DEFAULT_GOAL := help
PG := cd apps/playground &&

.PHONY: help install dev build test typecheck db-up db-down db-push db-reset auth-generate clean

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	pnpm install

dev: db-up ## Start the playground dev server (starts Postgres first)
	$(PG) pnpm dev

build: ## Build every package and the playground app
	pnpm -r build

test: ## Run the full Vitest suite
	pnpm vitest run

typecheck: ## Typecheck every workspace package
	pnpm -r typecheck

db-up: ## Start the Postgres container and wait until healthy
	$(PG) docker compose up -d
	@until [ "$$(docker inspect --format '{{.State.Health.Status}}' filamentjs-pg 2>/dev/null)" = "healthy" ]; do sleep 1; done
	@echo "postgres healthy"

db-down: ## Stop the Postgres container
	$(PG) docker compose down

db-push: db-up ## Push the Drizzle schema to Postgres
	$(PG) pnpm db:push

db-reset: ## Destroy the Postgres volume and re-push a fresh schema
	$(PG) docker compose down -v
	$(MAKE) db-push

auth-generate: ## Regenerate the better-auth Drizzle schema
	$(PG) pnpm auth:generate

clean: ## Remove build output across the workspace
	pnpm -r exec rm -rf dist .output .nitro .tanstack
