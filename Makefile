.DEFAULT_GOAL := help

# ====================================================================================
# Development
# ====================================================================================

.PHONY: install
install: bun-install ## Install dependencies

.PHONY: build
build: bun-build ## Build the project

.PHONY: setup
setup: install build ## Install dependencies and build the project

# ====================================================================================
# Bun
# ====================================================================================

.PHONY: bun-install
bun-install: ## Install dependencies using bun
	bun install

.PHONY: bun-build
bun-build: ## Build the project using bun
	bun run build

.PHONY: bun-setup
bun-setup: bun-install bun-build ## Install dependencies and build the project

# ====================================================================================
# HELP
# ====================================================================================

.PHONY: help
help: ## Show this help message.
	@echo "Usage: make <target>"
	@echo
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
