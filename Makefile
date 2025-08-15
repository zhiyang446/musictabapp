# Music Tab App - CI/CD Scripts
.PHONY: help install fmt fmt-check lint test ci clean

# Default target
help:
	@echo "Music Tab App - Available Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  install     Install all dependencies (Node.js + Python)"
	@echo ""
	@echo "Code Quality:"
	@echo "  fmt         Format all code (Prettier + Black + isort)"
	@echo "  fmt-check   Check code formatting without changes"
	@echo "  lint        Run all linters (ESLint + ruff + mypy)"
	@echo "  test        Run all tests (JavaScript + Python)"
	@echo ""
	@echo "CI/CD:"
	@echo "  ci          Run complete CI pipeline (fmt-check + lint + test)"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean       Clean build artifacts and caches"

# Install dependencies
install:
	@echo "📦 Installing Node.js dependencies..."
	npm install
	@echo "📦 Installing Python dependencies..."
	poetry install
	@echo "✅ All dependencies installed"

# Format code
fmt:
	@echo "🎨 Formatting code..."
	npm run fmt
	@echo "✅ Code formatting complete"

# Check code formatting
fmt-check:
	@echo "🔍 Checking code formatting..."
	npm run fmt:check
	@echo "✅ Code formatting check complete"

# Run linters
lint:
	@echo "🔍 Running linters..."
	@echo "  → ESLint (JavaScript/TypeScript)"
	npm run lint:js
	@echo "  → ruff + mypy (Python)"
	npm run lint:py
	@echo "✅ Linting complete"

# Run tests
test:
	@echo "🧪 Running tests..."
	@echo "  → JavaScript tests"
	npm run test:js
	@echo "  → Python tests"
	npm run test:py
	@echo "✅ Testing complete"

# Run CI pipeline
ci:
	@echo "🚀 Running CI pipeline..."
	@echo ""
	@echo "Step 1/3: Code formatting check"
	@$(MAKE) fmt-check
	@echo ""
	@echo "Step 2/3: Linting"
	@$(MAKE) lint
	@echo ""
	@echo "Step 3/3: Testing"
	@$(MAKE) test
	@echo ""
	@echo "🎉 CI pipeline completed successfully!"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf node_modules/.cache
	rm -rf .pytest_cache
	rm -rf __pycache__
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleanup complete"
