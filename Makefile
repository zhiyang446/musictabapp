# Music Tab App - CI/CD Scripts
.PHONY: help install fmt lint test ci clean

# Default target
help:
	@echo "Available commands:"
	@echo "  install  - Install all dependencies (Node.js + Python)"
	@echo "  fmt      - Format all code (Prettier + Black)"
	@echo "  lint     - Lint all code (ESLint + Ruff)"
	@echo "  test     - Run all tests (Jest + Pytest)"
	@echo "  ci       - Run full CI pipeline (fmt + lint + test)"
	@echo "  clean    - Clean build artifacts and dependencies"

# Install dependencies
install:
	@echo "Installing Node.js dependencies..."
	npm install
	@echo "Installing Python dependencies..."
	poetry install
	@echo "Dependencies installed successfully!"

# Format code
fmt:
	@echo "Formatting JavaScript/TypeScript code..."
	npm run format
	@echo "Formatting Python code..."
	poetry run black .
	@echo "Code formatting completed!"

# Lint code
lint:
	@echo "Linting JavaScript/TypeScript code..."
	npm run lint
	@echo "Linting Python code..."
	poetry run ruff check .
	@echo "Code linting completed!"

# Run tests
test:
	@echo "Running JavaScript/TypeScript tests..."
	npm run test
	@echo "Running Python tests..."
	poetry run pytest
	@echo "All tests completed!"

# Full CI pipeline
ci: fmt lint test
	@echo "✅ CI pipeline completed successfully!"

# Clean build artifacts
clean:
	@echo "Cleaning Node.js artifacts..."
	rm -rf node_modules package-lock.json
	@echo "Cleaning Python artifacts..."
	poetry env remove --all || true
	rm -rf .pytest_cache __pycache__ *.pyc
	@echo "Clean completed!"
